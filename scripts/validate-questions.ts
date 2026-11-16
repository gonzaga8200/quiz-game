/**
 * Validates the question bank: schema, duplicates and quality checks.
 *
 *   npm run questions:validate                       all of data/questions
 *   npm run questions:validate -- --summary          also print counts per category/difficulty
 *   npm run questions:validate -- --candidate f.json check a new file against the bank
 *
 * Exits with 1 if anything is wrong, so CI can fail on it.
 */
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import {
  fileNameProblems,
  listQuestionFiles,
  summarize,
  validateQuestionFiles,
} from './lib/question-files'

const { values } = parseArgs({
  options: {
    dir: { type: 'string', default: 'data/questions' },
    candidate: { type: 'string', multiple: true, default: [] },
    summary: { type: 'boolean', default: false },
  },
})

const dir = resolve(values.dir)
const bankFiles = listQuestionFiles(dir)
const candidates = (values.candidate ?? []).map((path) => resolve(path))

// Candidates are checked against the whole bank, so a new question that repeats an
// existing one is caught. File names are only enforced for files inside the bank.
const all = validateQuestionFiles([...bankFiles, ...candidates])
const problems = [...all.problems, ...fileNameProblems(bankFiles)]
const issues = all.issues

for (const problem of problems) console.error(`error   ${problem.file}: ${problem.message}`)
for (const issue of issues) {
  const log = issue.level === 'error' ? console.error : console.warn
  log(`${issue.level.padEnd(7)} ${issue.file} [${issue.id}]: ${issue.message}`)
}

const errors = problems.length + issues.filter((i) => i.level === 'error').length
const warnings = issues.filter((i) => i.level === 'warning').length
const files = bankFiles.length + candidates.length

if (values.summary) console.log(`\n${summarize(all.entries.map((e) => e.question))}\n`)

if (errors > 0) {
  console.error(`\n✖ ${errors} error(s), ${warnings} warning(s) in ${files} file(s)`)
  process.exit(1)
}
console.log(
  `✔ ${all.entries.length} questions in ${files} file(s) are valid (${warnings} warning(s))`,
)
