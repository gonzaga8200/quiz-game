import { describe, expect, it } from 'vitest'
import type { AnswerFeedback } from '../../app/composables/useGameSession'
import { STREAK_CHEER_FROM, streakFx } from '../../app/utils/fx'

const feedback = (overrides: Partial<AnswerFeedback> = {}): AnswerFeedback => ({
  chosenIndex: 0,
  correctIndex: 0,
  correct: true,
  points: 5,
  bonus: 0,
  penalty: 0,
  ...overrides,
})

describe('streakFx', () => {
  it('stays quiet without feedback, after a mistake or on a short streak', () => {
    expect(streakFx(null, 5)).toBeNull()
    expect(streakFx(feedback({ correct: false }), 5)).toBeNull()
    expect(streakFx(feedback(), STREAK_CHEER_FROM - 1)).toBeNull()
  })

  it('gives a small cheer for a streak without bonus', () => {
    expect(streakFx(feedback(), 4)).toEqual({ streak: 4, bonus: 0, big: false })
  })

  it('gives the big celebration when a combo bonus was earned', () => {
    expect(streakFx(feedback({ bonus: 2 }), 3)).toEqual({ streak: 3, bonus: 2, big: true })
  })
})
