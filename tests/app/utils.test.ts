import { describe, expect, it } from 'vitest'
import { formatClock, formatSeconds, formatSigned } from '../../app/utils/format'
import { actionForKey } from '../../app/utils/keyboard'

describe('formatClock', () => {
  it.each([
    [120_000, '2:00'],
    [65_000, '1:05'],
    [60_000, '1:00'],
    [59_999, '1:00'], // rounds up: 0:00 only appears when time is really out
    [59_000, '0:59'],
    [9_001, '0:10'],
    [1, '0:01'],
    [0, '0:00'],
    [-500, '0:00'],
  ])('%i ms -> %s', (ms, text) => {
    expect(formatClock(ms)).toBe(text)
  })
})

describe('formatSeconds', () => {
  it('uses a decimal comma and never goes negative', () => {
    expect(formatSeconds(4_200)).toBe('4,2 s')
    expect(formatSeconds(0)).toBe('0,0 s')
    expect(formatSeconds(-100)).toBe('0,0 s')
  })
})

describe('formatSigned', () => {
  it('prefixes + for gains and a real minus sign for losses', () => {
    expect(formatSigned(7)).toBe('+7')
    expect(formatSigned(-2)).toBe('−2')
    expect(formatSigned(0)).toBe('0')
  })
})

describe('actionForKey', () => {
  it.each([
    ['1', 0],
    ['2', 1],
    ['3', 2],
    ['4', 3],
    ['a', 0],
    ['B', 1],
    ['c', 2],
    ['D', 3],
  ])('"%s" answers option %i', (key, index) => {
    expect(actionForKey(key, 4)).toEqual({ type: 'answer', index })
  })

  it('maps p and P to skip', () => {
    expect(actionForKey('p', 4)).toEqual({ type: 'skip' })
    expect(actionForKey('P', 4)).toEqual({ type: 'skip' })
  })

  it.each(['5', '0', 'e', 'Enter', 'Escape', ' ', 'ArrowDown'])('ignores "%s"', (key) => {
    expect(actionForKey(key, 4)).toBeNull()
  })

  it('ignores options beyond the number the question has', () => {
    expect(actionForKey('4', 3)).toBeNull()
    expect(actionForKey('d', 3)).toBeNull()
    expect(actionForKey('a', 0)).toBeNull()
  })
})
