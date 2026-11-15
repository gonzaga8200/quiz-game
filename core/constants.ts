/**
 * Game constants. Single source of truth for categories, difficulties and the
 * scoring tables. Pure data: no framework, platform or Firebase imports.
 */

export const CATEGORIES = [
  'Arte y Literatura',
  'Historia y Geografía',
  'Deportes',
  'Cine y televisión',
  'Ciencias',
] as const
export type Category = (typeof CATEGORIES)[number]

/** Ordered from easiest to hardest. */
export const DIFFICULTIES = ['muy fácil', 'fácil', 'medio', 'difícil', 'muy difícil'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

/** What the player picks in competitive mode ("Aleatorio" also drives arcade mode). */
export const DIFFICULTY_FILTERS = ['Aleatorio', 'Fácil', 'Medio', 'Difícil'] as const
export type DifficultyFilter = (typeof DIFFICULTY_FILTERS)[number]

export const DURATIONS = [60, 120] as const
export type Duration = (typeof DURATIONS)[number]

export const QUESTION_STATUSES = ['active', 'disabled'] as const
export type QuestionStatus = (typeof QUESTION_STATUSES)[number]

export const OPTIONS_PER_QUESTION = 4

/** Arcade mode is always 60 s with random difficulty. */
export const ARCADE_DURATION: Duration = 60
export const ARCADE_FILTER: DifficultyFilter = 'Aleatorio'

export const POINTS_BY_DIFFICULTY: Readonly<Record<Difficulty, number>> = {
  'muy fácil': 3,
  fácil: 5,
  medio: 7,
  difícil: 10,
  'muy difícil': 15,
}

/** Points lost for a wrong answer (before the score floor is applied). */
export const WRONG_PENALTY_BY_DIFFICULTY: Readonly<Record<Difficulty, number>> = {
  'muy fácil': 2,
  fácil: 1,
  medio: 0,
  difícil: 0,
  'muy difícil': 0,
}

/**
 * Combo bonus, keyed by the streak length that triggers it. Each bonus is awarded
 * once, at the moment the streak reaches that exact length.
 */
export const COMBO_BONUSES: Readonly<Record<number, number>> = {
  3: 2,
  5: 4,
  10: 8,
}

export const FREE_SKIPS = 2
export const PAID_SKIP_PENALTY = 1

/**
 * Upper bound of points per correct answer, used to sanity-check submitted scores
 * (base 15 + at most 1.4 bonus per correct answer in a perfect 10-streak, rounded up).
 */
export const MAX_POINTS_PER_CORRECT = 17

/** Number of entries shown per ranking board. */
export const RANKING_SIZE = 50
