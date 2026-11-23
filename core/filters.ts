import { categoryUrlSlug } from './categories'
import type { Category, Difficulty, DifficultyFilter, Duration } from './constants'
import { CATEGORIES, DIFFICULTIES, DIFFICULTY_FILTERS, DURATIONS } from './constants'

/** Which question difficulties each filter lets through. */
export const FILTER_DIFFICULTIES: Readonly<Record<DifficultyFilter, readonly Difficulty[]>> = {
  Aleatorio: DIFFICULTIES,
  Fácil: ['muy fácil', 'fácil'],
  Medio: ['medio'],
  Difícil: ['difícil', 'muy difícil'],
}

export function difficultiesFor(filter: DifficultyFilter): readonly Difficulty[] {
  return FILTER_DIFFICULTIES[filter]
}

/** ASCII slugs used in ranking board ids (document paths avoid accents). */
export const FILTER_SLUGS: Readonly<Record<DifficultyFilter, string>> = {
  Aleatorio: 'aleatorio',
  Fácil: 'facil',
  Medio: 'medio',
  Difícil: 'dificil',
}

export type BoardId = `${Duration}_${string}`

export interface Board {
  readonly id: BoardId
  readonly duration: Duration
  readonly filter: DifficultyFilter
  /** Absent on the boards of games that mix every category. */
  readonly category?: Category
}

/**
 * One ranking per duration + difficulty filter + category combination. Games that mix every
 * category keep the original ids (`60_aleatorio`), so the scores saved before categories
 * existed stay where they were; a single category adds its slug (`60_aleatorio_ciencias`).
 */
export function boardId(
  duration: Duration,
  filter: DifficultyFilter,
  category?: Category,
): BoardId {
  const base = `${duration}_${FILTER_SLUGS[filter]}` as const
  return category === undefined ? base : `${base}_${categoryUrlSlug(category)}`
}

/** All 56 boards (2 durations x 4 filters x 7 category choices), in display order. */
export const BOARDS: readonly Board[] = DURATIONS.flatMap((duration) =>
  DIFFICULTY_FILTERS.flatMap((filter) => [
    { id: boardId(duration, filter), duration, filter },
    ...CATEGORIES.map((category) => ({
      id: boardId(duration, filter, category),
      duration,
      filter,
      category,
    })),
  ]),
)

/** Whether a finished game improves on the player's stored best for a board. */
export function isPersonalBest(previousBest: number | null, points: number): boolean {
  return previousBest === null || points > previousBest
}
