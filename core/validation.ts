import type { Question } from './schema'

/**
 * Content checks that go beyond the schema: duplicates across the whole question bank
 * and a few quality smells. Pure functions, shared by `questions:validate` (CI), the
 * import script and the add-questions skill.
 */

export interface QuestionEntry {
  /** Where the question came from (file name); only used in messages. */
  readonly file: string
  readonly question: Question
}

export interface QuestionIssue {
  /** Errors fail validation; warnings are for a human to look at. */
  readonly level: 'error' | 'warning'
  readonly file: string
  readonly id: string
  readonly message: string
}

/** Text with accents, case, punctuation and extra spaces removed, for comparisons. */
export function normalizeForComparison(text: string): string {
  return text
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The distinct words of an already normalised text. */
function wordsOf(normalized: string): Set<string> {
  return new Set(normalized.split(' '))
}

/** Share of words two sets have in common, 0 (nothing) to 1 (same words). */
function overlapOfSets(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  let shared = 0
  for (const word of a) if (b.has(word)) shared += 1
  // Never zero: even an empty text normalises to a set holding one empty word.
  return shared / (a.size + b.size - shared)
}

/** Share of words two texts have in common, 0 (nothing) to 1 (same words). */
export function wordOverlap(a: string, b: string): number {
  return overlapOfSets(wordsOf(normalizeForComparison(a)), wordsOf(normalizeForComparison(b)))
}

/**
 * Whether `wordOverlap` of two sets reaches `threshold`, decided without counting every
 * shared word: it works out how many words must be shared, and gives up on the pair as soon
 * as that is out of reach. A bank of thousands of questions is compared pair by pair, and
 * almost every pair has nothing in common.
 */
function reachesOverlap(
  a: ReadonlySet<string>,
  b: ReadonlySet<string>,
  threshold: number,
): boolean {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  const total = a.size + b.size
  const reaches = (shared: number): boolean => shared / (total - shared) >= threshold

  // Smallest number of shared words that reaches the threshold.
  let needed = Math.max(0, Math.floor((threshold * total) / (1 + threshold)) - 1)
  while (needed <= small.size && !reaches(needed)) needed += 1
  if (needed > small.size) return false

  let shared = 0
  let left = small.size
  for (const word of small) {
    if (shared + left < needed) return false
    if (large.has(word)) shared += 1
    left -= 1
  }
  return shared >= needed
}

/** Questions this similar to an existing one are flagged as probable duplicates. */
export const SIMILAR_TEXT_THRESHOLD = 0.8

/** Longest option more than this many times the shortest looks like a mismatched distractor. */
export const OPTION_LENGTH_RATIO = 4

/**
 * Readability limits, for a phone screen and a game played against the clock. The schema
 * allows more on purpose; going over is only a warning, so a human decides.
 * 65 characters is two lines of the question card on a 360 px wide phone.
 */
export const MAX_TEXT_LENGTH_HINT = 65
export const MAX_OPTION_LENGTH_HINT = 40

function qualityWarnings(entry: QuestionEntry): QuestionIssue[] {
  const { file, question } = entry
  const warn = (message: string): QuestionIssue => ({
    level: 'warning',
    file,
    id: question.id,
    message,
  })
  const warnings: QuestionIssue[] = []

  if (question.text.includes('¿') !== question.text.includes('?')) {
    warnings.push(warn('unbalanced question marks (¿ and ? must come together)'))
  }

  if (question.text.length > MAX_TEXT_LENGTH_HINT) {
    warnings.push(
      warn(
        `question text has ${question.text.length} characters; keep it to ${MAX_TEXT_LENGTH_HINT} (two lines on a phone)`,
      ),
    )
  }
  const longOption = question.options.find((option) => option.length > MAX_OPTION_LENGTH_HINT)
  if (longOption !== undefined) {
    warnings.push(
      warn(
        `an option has ${longOption.length} characters; keep options to ${MAX_OPTION_LENGTH_HINT}`,
      ),
    )
  }

  const lengths = question.options.map((option) => option.length)
  const longest = Math.max(...lengths)
  const shortest = Math.min(...lengths)
  if (longest > shortest * OPTION_LENGTH_RATIO && longest >= 20) {
    warnings.push(warn('options differ a lot in length; distractors should look alike'))
  }

  const answer = normalizeForComparison(question.options[question.correctIndex] as string)
  if (answer.length >= 4 && ` ${normalizeForComparison(question.text)} `.includes(` ${answer} `)) {
    warnings.push(warn('the correct answer already appears in the question text'))
  }

  return warnings
}

/**
 * Checks a set of questions as a whole.
 * Errors: repeated ids, and questions with the same text once accents, case and
 * punctuation are ignored. Warnings: probable duplicates and quality smells.
 */
export function findQuestionIssues(entries: readonly QuestionEntry[]): QuestionIssue[] {
  const issues: QuestionIssue[] = []
  const byId = new Map<string, QuestionEntry>()
  const byText = new Map<string, QuestionEntry>()
  const kept: { entry: QuestionEntry; words: ReadonlySet<string> }[] = []

  for (const entry of entries) {
    const { file, question } = entry
    const text = normalizeForComparison(question.text)

    const sameId = byId.get(question.id)
    const sameText = byText.get(text)
    if (sameId) {
      issues.push({
        level: 'error',
        file,
        id: question.id,
        message: `duplicate id (already used in ${sameId.file})`,
      })
    } else if (sameText) {
      issues.push({
        level: 'error',
        file,
        id: question.id,
        message: `same question text as ${sameText.question.id} (${sameText.file})`,
      })
    } else {
      const words = wordsOf(text)
      for (const other of kept) {
        if (reachesOverlap(words, other.words, SIMILAR_TEXT_THRESHOLD)) {
          issues.push({
            level: 'warning',
            file,
            id: question.id,
            message: `very similar to ${other.entry.question.id} (${other.entry.file}); is it a duplicate?`,
          })
        }
      }
      byId.set(question.id, entry)
      byText.set(text, entry)
      kept.push({ entry, words })
    }

    issues.push(...qualityWarnings(entry))
  }

  return issues
}
