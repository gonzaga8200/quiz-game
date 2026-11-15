import type { Difficulty, DifficultyFilter, Duration } from './constants'
import { DIFFICULTIES, DIFFICULTY_FILTERS, DURATIONS } from './constants'

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
}

/** One ranking per duration + difficulty filter combination. */
export function boardId(duration: Duration, filter: DifficultyFilter): BoardId {
  return `${duration}_${FILTER_SLUGS[filter]}`
}

/** All 8 boards (2 durations x 4 filters), in display order. */
export const BOARDS: readonly Board[] = DURATIONS.flatMap((duration) =>
  DIFFICULTY_FILTERS.map((filter) => ({ id: boardId(duration, filter), duration, filter })),
)

/** Whether a finished game improves on the player's stored best for a board. */
export function isPersonalBest(previousBest: number | null, points: number): boolean {
  return previousBest === null || points > previousBest
}
