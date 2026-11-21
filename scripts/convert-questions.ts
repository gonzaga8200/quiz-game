/**
 * Turns ready-made question files into bank files, one file per category.
 *
 *   npm run questions:convert                        every NEW .json in question-sources/
 *   npm run questions:convert -- --input f.json      only that file (repeatable)
 *   npm run questions:convert -- --dry-run           show what would be written
 *   npm run questions:convert -- --force             convert files already converted before
 *   npm run questions:convert -- --skip-invalid      convert the valid questions, list the rest
 *
 * Without --skip-invalid it is all or nothing. With it, a question that breaks the schema
 * is left out (and listed), the others are converted, and it still fails if nothing could be
 * converted. A skipped question is not retried: its file counts as converted.
 *
 * A file counts as already converted when a question in the bank has its name as `source`;
 * those are skipped (and listed) so running it again never duplicates questions.
 *
 * Each source question carries its own category, difficulty and explanation; nothing is
 * calculated or rewritten. It is all or nothing: if any question cannot be converted,
 * nothing is written and the problems are listed. Run `npm run questions:validate` after.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { DIFFICULTIES } from '../core'
import type { Category, Question } from '../core'
import { categoryFileSlug, convertQuestions, splitProcessed } from './lib/convert'
import { listQuestionFiles, loadQuestionFiles } from './lib/question-files'

const { values } = parseArgs({
  options: {
    input: { type: 'string', multiple: true, default: [] },
    dir: { type: 'string', default: 'data/questions' },
    from: { type: 'string', default: 'question-sources' },
    'dry-run': { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
    'skip-invalid': { type: 'boolean', default: false },
  },
})

const dir = resolve(values.dir)
const inputs =
  (values.input ?? []).length > 0
    ? (values.input ?? []).map((path) => resolve(path))
    : existsSync(values.from)
      ? readdirSync(values.from)
          .filter((name) => name.toLowerCase().endsWith('.json'))
          .sort()
          .map((name) => join(resolve(values.from), name))
      : []

if (inputs.length === 0) {
  console.error(`No .json file to convert in ${values.from}/ (or none given with --input).`)
  process.exit(2)
}

const bank = loadQuestionFiles(listQuestionFiles(dir)).entries
const processedSources = new Set(
  bank.flatMap((entry) => (entry.question.source ? [entry.question.source] : [])),
)
const split = values.force
  ? { pending: inputs, processed: [] as string[] }
  : splitProcessed(inputs, processedSources)

for (const path of split.processed) console.log(`skipped  ${basename(path)} (already converted)`)
if (split.pending.length === 0) {
  console.error(
    `Nothing new to convert: ${split.processed.length} file(s) already converted (use --force to convert one again).`,
  )
  process.exit(2)
}

const now = new Date()
const createdAt = now.toISOString().replace(/\.\d{3}Z$/, 'Z')
const date = createdAt.slice(0, 10)

const takenIds = new Set(bank.map((entry) => entry.question.id))

const planned = new Map<string, { category: Category; questions: Question[]; source: string }>()
const problems: string[] = []
let invalid = 0

/** `<date>-<category>.json`, with `-2`, `-3`... if the name is taken (never overwrites). */
function freeFileName(category: Category): string {
  const base = `${date}-${categoryFileSlug(category)}`
  let name = `${base}.json`
  for (let n = 2; existsSync(join(dir, name)) || planned.has(name); n++) name = `${base}-${n}.json`
  return name
}

for (const input of split.pending) {
  const file = basename(input)
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(input, 'utf8'))
  } catch (error) {
    problems.push(`${file}: cannot read as JSON: ${(error as Error).message}`)
    continue
  }
  const result = convertQuestions(raw, { source: file, createdAt, takenIds })
  problems.push(...result.problems.map((problem) => `${file} ${problem}`))
  invalid += result.invalid
  for (const [category, questions] of result.byCategory) {
    for (const question of questions) takenIds.add(question.id)
    planned.set(freeFileName(category), { category, questions, source: file })
  }
}

if (problems.length > 0 && (!values['skip-invalid'] || planned.size === 0)) {
  for (const problem of problems) console.error(`error   ${problem}`)
  console.error(`\n✖ ${problems.length} problem(s): nothing was written`)
  process.exit(1)
}
if (problems.length > 0) {
  for (const problem of problems) console.warn(`skipped ${problem}`)
  console.warn(`\n⚠ ${invalid} question(s) left out (see above); the rest are converted`)
}

let total = 0
for (const [name, { category, questions }] of planned) {
  total += questions.length
  const perDifficulty = DIFFICULTIES.map(
    (difficulty) => `${difficulty} ${questions.filter((q) => q.difficulty === difficulty).length}`,
  ).join(' · ')
  console.log(`${name}  [${category}]  ${questions.length} question(s): ${perDifficulty}`)
  if (!values['dry-run']) {
    writeFileSync(join(dir, name), `${JSON.stringify(questions, null, 2)}\n`)
  }
}
console.log(
  values['dry-run']
    ? `\nDry run: ${total} question(s) would be written, nothing was.`
    : `\n✔ Wrote ${total} question(s) in ${planned.size} file(s). Now run: npm run questions:validate`,
)
