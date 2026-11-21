/**
 * Prints a report of the question bank: total, and count and share per category and per
 * difficulty.
 *
 *   npm run questions:stats              active questions (the ones the game serves)
 *   npm run questions:stats -- --all     also count the disabled ones
 */
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { CATEGORIES, DIFFICULTIES } from '../core'
import { listQuestionFiles, loadQuestionFiles } from './lib/question-files'

const { values } = parseArgs({
  options: {
    dir: { type: 'string', default: 'data/questions' },
    all: { type: 'boolean', default: false },
  },
})

const files = listQuestionFiles(resolve(values.dir))
const { entries, problems } = loadQuestionFiles(files)

if (problems.length > 0) {
  for (const problem of problems) console.error(`error   ${problem.file}: ${problem.message}`)
  console.error(
    '\n✖ Fix the files above first (npm run questions:validate); the report would be wrong.',
  )
  process.exit(1)
}

const everything = entries.map((entry) => entry.question)
const disabled = everything.filter((question) => question.status === 'disabled').length
const questions = values.all ? everything : everything.filter((q) => q.status === 'active')
const total = questions.length

const BAR_WIDTH = 20

function table(title: string, rows: readonly [string, number][]): string {
  const labelWidth = Math.max(title.length, ...rows.map(([label]) => label.length))
  const lines = [`${title.padEnd(labelWidth)}  ${'Preguntas'.padStart(9)}  ${'%'.padStart(6)}`]
  lines.push('-'.repeat(labelWidth + 2 + 9 + 2 + 6 + 2 + BAR_WIDTH))
  for (const [label, count] of rows) {
    const share = total === 0 ? 0 : (count / total) * 100
    const bar = '█'.repeat(Math.round((share / 100) * BAR_WIDTH))
    lines.push(
      `${label.padEnd(labelWidth)}  ${String(count).padStart(9)}  ${`${share.toFixed(1)}%`.padStart(6)}  ${bar}`,
    )
  }
  lines.push(`${'Total'.padEnd(labelWidth)}  ${String(total).padStart(9)}  ${'100.0%'.padStart(6)}`)
  return lines.join('\n')
}

const byCategory = CATEGORIES.map((category): [string, number] => [
  category,
  questions.filter((q) => q.category === category).length,
])
const byDifficulty = DIFFICULTIES.map((difficulty): [string, number] => [
  difficulty,
  questions.filter((q) => q.difficulty === difficulty).length,
])

console.log(`Banco de preguntas (${files.length} archivos)`)
console.log(
  values.all
    ? `Total: ${total} (activas: ${total - disabled}, desactivadas: ${disabled})`
    : `Total: ${total} activas` +
        (disabled > 0
          ? ` (no se cuentan ${disabled} desactivadas; usa --all para incluirlas)`
          : ''),
)
console.log(`\n${table('Categoría', byCategory)}`)
console.log(`\n${table('Dificultad', byDifficulty)}`)
