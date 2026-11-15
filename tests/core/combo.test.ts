import { describe, expect, it } from 'vitest'
import { nextComboMilestone } from '../../core/combo'

describe('nextComboMilestone', () => {
  it.each([
    [0, { at: 3, bonus: 2 }],
    [2, { at: 3, bonus: 2 }],
    [3, { at: 5, bonus: 4 }],
    [4, { at: 5, bonus: 4 }],
    [5, { at: 10, bonus: 8 }],
    [9, { at: 10, bonus: 8 }],
  ])('after a streak of %i the next bonus is %o', (streak, expected) => {
    expect(nextComboMilestone(streak)).toEqual(expected)
  })

  it.each([10, 11, 50])('has nothing left to earn after a streak of %i', (streak) => {
    expect(nextComboMilestone(streak)).toBeNull()
  })
})
