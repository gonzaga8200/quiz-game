import { MAX_SAME_IN_A_ROW } from './constants'
import type { Category, Difficulty, DifficultyFilter } from './constants'
import { difficultiesFor } from './filters'
import type { Rng } from './rng'
import { shuffled } from './rng'
import type { Question } from './schema'

/** A question ready to be shown: options shuffled, `correctIndex` remapped. */
export interface PlayableQuestion {
  readonly id: string
  readonly text: string
  readonly options: readonly string[]
  readonly correctIndex: number
  readonly category: Category
  readonly difficulty: Difficulty
  readonly explanation: string
  readonly source: string | undefined
}

/** Shuffles the options so the right answer's position is not fixed. */
export function toPlayable(question: Question, rng: Rng): PlayableQuestion {
  const tagged = question.options.map((text, index) => ({
    text,
    correct: index === question.correctIndex,
  }))
  const mixed = shuffled(tagged, rng)
  return {
    id: question.id,
    text: question.text,
    options: mixed.map((entry) => entry.text),
    correctIndex: mixed.findIndex((entry) => entry.correct),
    category: question.category,
    difficulty: question.difficulty,
    explanation: question.explanation,
    source: question.source,
  }
}

/**
 * Reorders `items` so that no more than `maxRun` consecutive items share the same value
 * for any of the `keys`. The original order is kept as much as possible: at each position
 * it takes the first remaining item that does not extend a run past the limit, so a random
 * input stays random.
 *
 * Nothing is ever dropped. If the items left cannot meet the limit (for example only one
 * category remains) it takes the one that breaks the fewest keys, so the list degrades
 * gracefully at the end instead of failing.
 */
export function spreadRuns<T>(
  items: readonly T[],
  keys: readonly ((item: T) => string)[],
  maxRun: number,
): T[] {
  const remaining = [...items]
  const out: T[] = []

  /** How many keys this item would push past the limit if placed next. */
  const violations = (item: T): number => {
    if (out.length < maxRun) return 0
    const tail = out.slice(-maxRun)
    return keys.filter((key) => tail.every((placed) => key(placed) === key(item))).length
  }

  while (remaining.length > 0) {
    let best = 0
    let bestViolations = Infinity
    for (let i = 0; i < remaining.length && bestViolations > 0; i++) {
      const count = violations(remaining[i] as T)
      if (count < bestViolations) {
        best = i
        bestViolations = count
      }
    }
    out.push(remaining.splice(best, 1)[0] as T)
  }
  return out
}

/**
 * Builds the whole question order for a game up front: only active questions that
 * match the filter, duplicates (same id) dropped, randomly ordered. Walking the
 * queue once guarantees a question is never repeated within a game.
 *
 * In random mode (`Aleatorio`) the order is also spread out: never more than
 * `MAX_SAME_IN_A_ROW` questions in a row of the same category or the same difficulty.
 * The other filters already narrow the difficulty, so they are left as shuffled.
 */
export function buildQueue(
  questions: readonly Question[],
  filter: DifficultyFilter,
  rng: Rng,
): PlayableQuestion[] {
  const allowed = new Set<Difficulty>(difficultiesFor(filter))
  const seen = new Set<string>()
  const pool = questions.filter((question) => {
    if (question.status !== 'active' || !allowed.has(question.difficulty)) return false
    if (seen.has(question.id)) return false
    seen.add(question.id)
    return true
  })
  const order = shuffled(pool, rng)
  const ordered =
    filter === 'Aleatorio'
      ? spreadRuns(
          order,
          [(question) => question.category, (question) => question.difficulty],
          MAX_SAME_IN_A_ROW,
        )
      : order
  return ordered.map((question) => toPlayable(question, rng))
}
