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
 * Builds the whole question order for a game up front: only active questions that
 * match the filter, duplicates (same id) dropped, randomly ordered. Walking the
 * queue once guarantees a question is never repeated within a game.
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
  return shuffled(pool, rng).map((question) => toPlayable(question, rng))
}
