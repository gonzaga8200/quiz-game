import { z } from 'zod'
import { CATEGORIES, DIFFICULTIES, QuestionSchema } from '../../core'
import type { Category, Difficulty, Question } from '../../core'

/**
 * Converts a ready-made question file (the format the user drops in `question-sources/`,
 * with Spanish keys, its own category and difficulty per question) into schema questions.
 * Nothing is rewritten: the text, options, answer, category, difficulty and explanation
 * come straight from the source.
 */

/** One question as it comes in the source file. Extra keys (id, nivel, ...) are ignored. */
const SourceQuestionSchema = z.object({
  categoria: z.string(),
  dificultad: z.string(),
  pregunta: z.string(),
  opciones: z.array(z.string()).length(4),
  respuesta_correcta: z.number().int().min(0).max(3),
  respuesta_texto: z.string().optional(),
  explicacion: z.string(),
  nivel: z.number().int().optional(),
  id: z.union([z.number(), z.string()]).optional(),
})

/** Lower case, no accents, single spaces; `muy_facil` and `Muy fácil` both become `muy facil`. */
export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .trim()
}

const CATEGORY_ALIASES = new Map<string, Category>([
  ...CATEGORIES.map((category): [string, Category] => [fold(category), category]),
  ['ciencia', 'Ciencias'],
  ['arte', 'Arte y Literatura'],
  ['literatura', 'Arte y Literatura'],
  ['historia', 'Historia y Geografía'],
  ['geografia', 'Historia y Geografía'],
  ['deporte', 'Deportes'],
  ['cine', 'Cine y televisión'],
  ['television', 'Cine y televisión'],
  ['lengua', 'Lengua e Idiomas'],
  ['idiomas', 'Lengua e Idiomas'],
  ['musical', 'Música'],
])

const DIFFICULTY_BY_FOLDED = new Map<string, Difficulty>(
  DIFFICULTIES.map((difficulty): [string, Difficulty] => [fold(difficulty), difficulty]),
)

const ID_PREFIX: Readonly<Record<Category, string>> = {
  'Arte y Literatura': 'arte',
  'Historia y Geografía': 'hist',
  Deportes: 'dep',
  'Cine y televisión': 'cine',
  Ciencias: 'cien',
  'Lengua e Idiomas': 'leng',
  Música: 'mus',
}

const STOPWORDS = new Set(
  (
    'que cual cuales quien quienes como cuando donde cuanto cuantos cuanta cuantas ' +
    'de del la el los las un una unos unas en con por para se es son al y o a su sus lo no ' +
    'mas tiene tienen hay tambien'
  ).split(' '),
)

/** `<prefix>-<up to four keywords of the question>`, e.g. `cien-huesos-adulto`. */
export function baseId(category: Category, text: string): string {
  const words = fold(text)
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(' ')
    .filter((word) => word.length > 1 && !STOPWORDS.has(word))
    .slice(0, 4)
  return `${ID_PREFIX[category]}-${words.length > 0 ? words.join('-') : 'pregunta'}`.slice(0, 74)
}

/** Slug used in the file name: `Arte y Literatura` -> `arte-y-literatura`. */
export function categoryFileSlug(category: Category): string {
  return fold(category).replace(/ /g, '-')
}

export interface ConvertContext {
  /** Goes in every `source` field: the file name only, never a local path. */
  readonly source: string
  /** ISO 8601 UTC. */
  readonly createdAt: string
  /** Ids already in the bank, so new ids never collide with them. */
  readonly takenIds: ReadonlySet<string>
}

export interface ConvertResult {
  readonly byCategory: ReadonlyMap<Category, Question[]>
  /** Human-readable, one per problem found. Empty when all is well. */
  readonly problems: string[]
  /** How many source questions could not be converted (a question may have several problems). */
  readonly invalid: number
}

export function convertQuestions(raw: unknown, context: ConvertContext): ConvertResult {
  const problems: string[] = []
  const byCategory = new Map<Category, Question[]>()

  if (!Array.isArray(raw) || raw.length === 0) {
    return {
      byCategory,
      problems: ['the file must be a non-empty JSON array of questions'],
      invalid: 0,
    }
  }

  const usedIds = new Set(context.takenIds)
  const failed = new Set<number>()

  raw.forEach((item: unknown, position) => {
    const fail = (message: string) => {
      problems.push(message)
      failed.add(position)
    }
    const parsed = SourceQuestionSchema.safeParse(item)
    const sourceId = (item as { id?: unknown } | null)?.id
    const label = `#${position + 1}${sourceId !== undefined ? ` (id ${String(sourceId)})` : ''}`
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        fail(`${label}: ${issue.path.join('.') || '(question)'}: ${issue.message}`)
      }
      return
    }
    const source = parsed.data

    const category = CATEGORY_ALIASES.get(fold(source.categoria))
    if (!category) {
      fail(`${label}: unknown category "${source.categoria}"`)
      return
    }
    const difficulty = DIFFICULTY_BY_FOLDED.get(fold(source.dificultad))
    if (!difficulty) {
      fail(`${label}: unknown difficulty "${source.dificultad}"`)
      return
    }
    if (source.nivel !== undefined && DIFFICULTIES.indexOf(difficulty) + 1 !== source.nivel) {
      fail(`${label}: "nivel" ${source.nivel} does not match difficulty "${source.dificultad}"`)
      return
    }
    if (
      source.respuesta_texto !== undefined &&
      source.opciones[source.respuesta_correcta] !== source.respuesta_texto
    ) {
      fail(`${label}: respuesta_correcta does not point to respuesta_texto`)
      return
    }

    const base = baseId(category, source.pregunta)
    let id = base
    for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`
    usedIds.add(id)

    const question = QuestionSchema.safeParse({
      id,
      text: source.pregunta,
      options: source.opciones,
      correctIndex: source.respuesta_correcta,
      category,
      difficulty,
      explanation: source.explicacion,
      source: context.source,
      createdAt: context.createdAt,
      status: 'active',
    })
    if (!question.success) {
      for (const issue of question.error.issues) {
        fail(`${label}: ${issue.path.join('.') || '(question)'}: ${issue.message}`)
      }
      return
    }
    byCategory.set(category, [...(byCategory.get(category) ?? []), question.data])
  })

  return { byCategory, problems, invalid: failed.size }
}

export interface InputSplit {
  readonly pending: string[]
  /** Already converted: some question in the bank has this file name as its `source`. */
  readonly processed: string[]
}

/**
 * Splits the input files into new ones and ones already converted. The bank itself is the
 * record: every converted question keeps the name of its file in `source`, so there is no
 * separate list to keep in sync (and it works the same on any machine).
 */
export function splitProcessed(
  inputs: readonly string[],
  processedSources: ReadonlySet<string>,
): InputSplit {
  const name = (path: string) => path.split('/').at(-1) ?? path
  return {
    pending: inputs.filter((path) => !processedSources.has(name(path))),
    processed: inputs.filter((path) => processedSources.has(name(path))),
  }
}
