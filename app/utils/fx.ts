import type { AnswerFeedback } from '~/composables/useGameSession'

/** From this streak on the game cheers; the first combo bonus is at 3 in a row. */
export const STREAK_CHEER_FROM = 3

/** What the celebration shows after a right answer that extends a long streak. */
export interface StreakFx {
  readonly streak: number
  readonly bonus: number
  /** A combo bonus was just earned: confetti and a big banner instead of a small pill. */
  readonly big: boolean
}

/** The streak celebration for an answer, or null when there is nothing to celebrate. */
export function streakFx(feedback: AnswerFeedback | null, streak: number): StreakFx | null {
  if (!feedback?.correct || streak < STREAK_CHEER_FROM) return null
  return { streak, bonus: feedback.bonus, big: feedback.bonus > 0 }
}

/** Short vibration on phones that support it; skipped for users who ask for less motion. */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  navigator.vibrate(pattern)
}
