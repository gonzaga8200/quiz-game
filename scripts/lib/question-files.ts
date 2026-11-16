import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATEGORIES, DIFFICULTIES, QuestionFileSchema, findQuestionIssues } from '../../core'
import type { Question, QuestionEntry, QuestionIssue } from '../../core'

/** `<YYYY-MM-DD>-<category-or-topic>.json`, as written by the add-questions skill. */
export const FILE_NAME_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.json$/

export interface FileProblem {
  readonly file: string
  readonly message: string
}

export interface LoadedQuestions {
  readonly entries: QuestionEntry[]
  readonly problems: FileProblem[]
}

export function listQuestionFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => join(dir, name))
}

/**
 * Reads question files. Files that cannot be parsed, or whose content breaks the schema,
 * become `problems`; valid questions of the other files are still returned.
 */
export function loadQuestionFiles(paths: readonly string[]): LoadedQuestions {
  const entries: QuestionEntry[] = []
  const problems: FileProblem[] = []

  for (const path of paths) {
    const file = path.split('/').at(-1) ?? path
    let raw: unknown
    try {
      raw = JSON.parse(readFileSync(path, 'utf8'))
    } catch (error) {
      problems.push({ file, message: `cannot read as JSON: ${(error as Error).message}` })
      continue
    }

    if (!Array.isArray(raw) || raw.length === 0) {
      problems.push({ file, message: 'must be a non-empty JSON array of questions' })
      continue
    }

    const parsed = QuestionFileSchema.safeParse(raw)
    if (parsed.success) {
      for (const question of parsed.data) entries.push({ file, question })
    } else {
      for (const issue of parsed.error.issues) {
        const where = issue.path.length > 0 ? issue.path.join('.') : '(file)'
        problems.push({ file, message: `${where}: ${issue.message}` })
      }
    }
  }

  return { entries, problems }
}

export interface ValidationReport {
  readonly entries: readonly QuestionEntry[]
  readonly problems: readonly FileProblem[]
  readonly issues: readonly QuestionIssue[]
  readonly ok: boolean
}

export function fileNameProblems(paths: readonly string[]): FileProblem[] {
  return paths
    .map((path) => path.split('/').at(-1) ?? path)
    .filter((file) => !FILE_NAME_PATTERN.test(file))
    .map((file) => ({ file, message: 'file name must look like YYYY-MM-DD-topic.json' }))
}

/** Schema problems plus cross-file duplicate and quality checks. */
export function validateQuestionFiles(
  paths: readonly string[],
  options: { checkNames?: boolean } = {},
): ValidationReport {
  const { entries, problems } = loadQuestionFiles(paths)
  const allProblems = [...problems, ...(options.checkNames ? fileNameProblems(paths) : [])]
  const issues = findQuestionIssues(entries)
  return {
    entries,
    problems: allProblems,
    issues,
    ok: allProblems.length === 0 && !issues.some((issue) => issue.level === 'error'),
  }
}

/** How many questions there are per category and difficulty, to keep the bank balanced. */
export function summarize(questions: readonly Question[]): string {
  const width = Math.max(...CATEGORIES.map((c) => c.length))
  const header = [
    'category'.padEnd(width),
    ...DIFFICULTIES.map((d) => d.padStart(11)),
    'total'.padStart(6),
  ]
  const lines = [header.join('  ')]
  for (const category of CATEGORIES) {
    const inCategory = questions.filter((q) => q.category === category)
    const cells = DIFFICULTIES.map((d) =>
      String(inCategory.filter((q) => q.difficulty === d).length).padStart(11),
    )
    lines.push([category.padEnd(width), ...cells, String(inCategory.length).padStart(6)].join('  '))
  }
  lines.push(
    `${'total'.padEnd(width)}  ${' '.repeat(11 * DIFFICULTIES.length + 2 * (DIFFICULTIES.length - 1))}  ${String(questions.length).padStart(6)}`,
  )
  return lines.join('\n')
}
