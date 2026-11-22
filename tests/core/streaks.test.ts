import { describe, expect, it } from 'vitest'
import {
  CATEGORIES,
  DIFFICULTIES,
  MAX_SAME_CATEGORY_IN_A_ROW,
  MAX_SAME_IN_A_ROW,
} from '../../core/constants'
import type { Difficulty } from '../../core/constants'
import { mulberry32 } from '../../core/rng'
import type { Question } from '../../core/schema'
import { buildQueue, spreadRuns } from '../../core/selection'
import { makeQuestion } from './helpers'

/** Longest run of equal values in a sequence. */
function longestRun(values: readonly string[]): number {
  let best = 0
  let run = 0
  values.forEach((value, i) => {
    run = i > 0 && value === values[i - 1] ? run + 1 : 1
    best = Math.max(best, run)
  })
  return best
}

/**
 * A bank shaped like the real one: a few big categories and small ones, and most
 * questions at "medio". That skew is what makes long runs likely in a plain shuffle.
 */
function skewedBank(): Question[] {
  const sizes = [60, 50, 40, 15, 10, 5]
  const spread: Difficulty[] = [
    'medio',
    'medio',
    'medio',
    'medio',
    'medio',
    'medio',
    'fácil',
    'difícil',
    'muy fácil',
    'muy difícil',
  ]
  return CATEGORIES.flatMap((category, c) =>
    Array.from({ length: sizes[c] ?? 0 }, (_, i) =>
      makeQuestion({
        id: `q-${c}-${i}`,
        text: `Pregunta de prueba ${c}-${i} sobre ${category}`,
        options: [`a${i}`, `b${i}`, `c${i}`, `d${i}`],
        category,
        difficulty: spread[(i + c) % spread.length] ?? 'medio',
      }),
    ),
  )
}

describe('spreadRuns', () => {
  const key = (item: string) => item
  const rule = { key, max: 2 }

  it('moves an item forward when it would be the third in a row', () => {
    expect(spreadRuns(['a', 'a', 'a', 'b'], [rule])).toEqual(['a', 'a', 'b', 'a'])
  })

  it('leaves an order that already respects the limit untouched', () => {
    const order = ['a', 'a', 'b', 'a', 'b', 'b', 'c']
    expect(spreadRuns(order, [rule])).toEqual(order)
  })

  it('keeps every item, even when the limit cannot be met', () => {
    const out = spreadRuns(['a', 'a', 'a', 'a', 'b'], [rule])
    expect([...out].sort()).toEqual(['a', 'a', 'a', 'a', 'b'])
    expect(out.slice(0, 3)).toEqual(['a', 'a', 'b']) // b comes in as soon as it is needed
  })

  it('satisfies several keys at once', () => {
    const items = [
      { c: 'x', d: 1 },
      { c: 'x', d: 2 },
      { c: 'x', d: 1 },
      { c: 'y', d: 1 },
      { c: 'y', d: 2 },
      { c: 'z', d: 2 },
    ]
    const out = spreadRuns(items, [
      { key: (i) => i.c, max: 2 },
      { key: (i) => String(i.d), max: 2 },
    ])
    expect(out).toHaveLength(items.length)
    expect(longestRun(out.map((i) => i.c))).toBeLessThanOrEqual(2)
    expect(longestRun(out.map((i) => String(i.d)))).toBeLessThanOrEqual(2)
  })

  it('applies a different limit to each rule', () => {
    const items = [
      { c: 'x', d: 1 },
      { c: 'x', d: 1 },
      { c: 'y', d: 1 },
      { c: 'y', d: 2 },
      { c: 'z', d: 2 },
      { c: 'z', d: 2 },
      { c: 'x', d: 1 },
      { c: 'y', d: 2 },
    ]
    const out = spreadRuns(items, [
      { key: (i) => i.c, max: 1 },
      { key: (i) => String(i.d), max: 2 },
    ])
    expect(out).toHaveLength(items.length)
    expect(longestRun(out.map((i) => i.c))).toBeLessThanOrEqual(1)
    expect(longestRun(out.map((i) => String(i.d)))).toBeLessThanOrEqual(2)
  })

  it('does not mutate its input', () => {
    const input = ['a', 'a', 'a', 'b']
    spreadRuns(input, [rule])
    expect(input).toEqual(['a', 'a', 'a', 'b'])
  })

  it('handles empty and single-item lists', () => {
    expect(spreadRuns([], [rule])).toEqual([])
    expect(spreadRuns(['a'], [rule])).toEqual(['a'])
  })
})

describe('buildQueue in random mode', () => {
  const bank = skewedBank()
  /** A typical game asks well under 60 questions; the guarantee must hold for all of them. */
  const PLAYED = 60

  it('never serves more than one question in a row of the same category', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const queue = buildQueue(bank, 'Aleatorio', mulberry32(seed)).slice(0, PLAYED)
      expect(longestRun(queue.map((q) => q.category))).toBeLessThanOrEqual(
        MAX_SAME_CATEGORY_IN_A_ROW,
      )
    }
  })

  it('never serves more than two questions in a row of the same difficulty', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const queue = buildQueue(bank, 'Aleatorio', mulberry32(seed)).slice(0, PLAYED)
      expect(longestRun(queue.map((q) => q.difficulty))).toBeLessThanOrEqual(MAX_SAME_IN_A_ROW)
    }
  })

  it('still contains every active question exactly once', () => {
    const queue = buildQueue(bank, 'Aleatorio', mulberry32(3))
    expect(queue.map((q) => q.id).sort()).toEqual(bank.map((q) => q.id).sort())
  })

  it('stays random: different seeds give different orders, and the same seed repeats', () => {
    const order = (seed: number) =>
      buildQueue(bank, 'Aleatorio', mulberry32(seed))
        .map((q) => q.id)
        .join()
    expect(new Set([1, 2, 3, 4, 5, 6].map(order)).size).toBeGreaterThan(4)
    expect(order(7)).toBe(order(7))
  })

  it('does not break when the bank has a single category and difficulty', () => {
    const flat = Array.from({ length: 10 }, (_, i) =>
      makeQuestion({ id: `plana-${i}`, text: `Pregunta plana número ${i}` }),
    )
    expect(buildQueue(flat, 'Aleatorio', mulberry32(1))).toHaveLength(10)
  })

  it('mixes categories and difficulties across the first questions', () => {
    const first = buildQueue(bank, 'Aleatorio', mulberry32(11)).slice(0, 20)
    expect(new Set(first.map((q) => q.category)).size).toBeGreaterThan(2)
    expect(new Set(first.map((q) => q.difficulty)).size).toBeGreaterThan(2)
    expect(DIFFICULTIES.length).toBe(5)
  })
})

describe('buildQueue with a difficulty filter', () => {
  it('is not reordered: the rule only applies to random mode', () => {
    const same = Array.from({ length: 8 }, (_, i) =>
      makeQuestion({ id: `medio-${i}`, text: `Pregunta de nivel medio ${i}` }),
    )
    // Every question shares category and difficulty, so any run rule would be unmeetable;
    // the queue must simply be the shuffled pool.
    const queue = buildQueue(same, 'Medio', mulberry32(4))
    expect(queue).toHaveLength(8)
    expect(longestRun(queue.map((q) => q.difficulty))).toBe(8)
  })
})

/** `perCategory` questions of one difficulty in every category, with unique ids. */
function balancedBank(difficulty: Difficulty, perCategory: number): Question[] {
  return CATEGORIES.flatMap((category, c) =>
    Array.from({ length: perCategory }, (_, i) =>
      makeQuestion({
        id: `eq-${difficulty.replace(/\s/g, '-')}-${c}-${i}`,
        text: `Pregunta equilibrada ${c}-${i} (${difficulty})`,
        options: [`a${i}`, `b${i}`, `c${i}`, `d${i}`],
        category,
        difficulty,
      }),
    ),
  )
}

describe('buildQueue category rule outside random mode', () => {
  it.each([
    ['Fácil', 'fácil'],
    ['Medio', 'medio'],
    ['Difícil', 'difícil'],
  ] as const)('never serves two questions of one category in a row with %s', (filter, level) => {
    const bank = balancedBank(level, 10)
    for (let seed = 1; seed <= 30; seed++) {
      const queue = buildQueue(bank, filter, mulberry32(seed)).slice(0, 40)
      expect(longestRun(queue.map((q) => q.category))).toBeLessThanOrEqual(
        MAX_SAME_CATEGORY_IN_A_ROW,
      )
    }
  })

  it('arcade (one category) is not blocked by the category rule', () => {
    const bank = [...balancedBank('medio', 8), ...balancedBank('fácil', 8)]
    const queue = buildQueue(bank, 'Aleatorio', mulberry32(1), 'Ciencias')
    const expected = bank.filter((q) => q.category === 'Ciencias').map((q) => q.id)
    expect(queue.map((q) => q.id).sort()).toEqual(expected.sort())
  })
})
