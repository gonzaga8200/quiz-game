import { DIFFICULTIES, MAX_SAME_CATEGORY_IN_A_ROW, MAX_SAME_IN_A_ROW } from './constants'
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

/** A limit on how many consecutive items may share the same `key` value. */
export interface SpreadRule<T> {
  readonly key: (item: T) => string
  readonly max: number
}

/**
 * Reorders `items` so that no more than `rule.max` consecutive items share the same `key`
 * value, for every rule. The original order is kept as much as possible: at each position
 * it takes the first remaining item that does not extend a run past a limit, so a random
 * input stays random.
 *
 * Nothing is ever dropped. If the items left cannot meet the limits (for example only one
 * category remains) it takes the one that breaks the fewest rules, so the list degrades
 * gracefully at the end instead of failing.
 */
export function spreadRuns<T>(items: readonly T[], rules: readonly SpreadRule<T>[]): T[] {
  const remaining = [...items]
  const out: T[] = []

  /** How many rules this item would break if placed next. */
  const violations = (item: T): number =>
    rules.filter(({ key, max }) => {
      if (out.length < max) return false
      return out.slice(-max).every((placed) => key(placed) === key(item))
    }).length

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
 * Orders `pool` so the questions shown the fewest times come first. The sort is stable, so
 * the order the pool already has (a shuffle) breaks ties at random.
 *
 * Counts are compared inside each difficulty: a question's rank is its count minus the lowest
 * count at its level. Otherwise what a device played at one level (say, a lot of `fácil`)
 * would push that level out of the next random games, changing the points on offer.
 */
function leastShownFirst(pool: readonly Question[], seen: ReadonlyMap<string, number>): Question[] {
  const shown = (question: Question): number => seen.get(question.id) ?? 0
  const floor = Object.fromEntries(DIFFICULTIES.map((level) => [level, Infinity])) as Record<
    Difficulty,
    number
  >
  for (const question of pool) {
    floor[question.difficulty] = Math.min(floor[question.difficulty], shown(question))
  }
  const rank = (question: Question): number => shown(question) - floor[question.difficulty]
  return [...pool].sort((a, b) => rank(a) - rank(b))
}

/**
 * Builds the whole question order for a game up front: only active questions that
 * match the filter, duplicates (same id) dropped, randomly ordered. Walking the
 * queue once guarantees a question is never repeated within a game.
 *
 * The order is also spread out. Without a `category`, in every filter, never more than
 * `MAX_SAME_CATEGORY_IN_A_ROW` questions in a row of the same category. In random mode
 * (`Aleatorio`), never more than `MAX_SAME_IN_A_ROW` in a row of the same difficulty (the
 * other filters already narrow the difficulty).
 *
 * With a `category` only that category is served, so there is no category rule and the
 * spreading only looks at the difficulty (random mode).
 *
 * `seen` maps a question id to how many times this device has shown it. Questions shown
 * fewer times come first (ties stay random, counts are compared within each difficulty so the
 * mix of levels is not skewed), so a player meets repeats as late as possible. Ids that are
 * not in the bank are ignored. Without `seen` the order is purely random.
 */
export function buildQueue(
  questions: readonly Question[],
  filter: DifficultyFilter,
  rng: Rng,
  category?: Category,
  seen?: ReadonlyMap<string, number>,
): PlayableQuestion[] {
  const allowed = new Set<Difficulty>(difficultiesFor(filter))
  const included = new Set<string>()
  const pool = questions.filter((question) => {
    if (question.status !== 'active' || !allowed.has(question.difficulty)) return false
    if (category !== undefined && question.category !== category) return false
    if (included.has(question.id)) return false
    included.add(question.id)
    return true
  })
  const shuffledPool = shuffled(pool, rng)
  const order =
    seen !== undefined && seen.size > 0 ? leastShownFirst(shuffledPool, seen) : shuffledPool
  const rules: SpreadRule<Question>[] = []
  if (category === undefined) {
    rules.push({ key: (question) => question.category, max: MAX_SAME_CATEGORY_IN_A_ROW })
  }
  if (filter === 'Aleatorio') {
    rules.push({ key: (question) => question.difficulty, max: MAX_SAME_IN_A_ROW })
  }
  const ordered = rules.length > 0 ? spreadRuns(order, rules) : order
  return ordered.map((question) => toPlayable(question, rng))
}
