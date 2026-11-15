import { describe, expect, it } from 'vitest'
import { DIFFICULTY_FILTERS, DIFFICULTIES } from '../../core/constants'
import type { Difficulty, DifficultyFilter } from '../../core/constants'
import { FILTER_DIFFICULTIES, difficultiesFor } from '../../core/filters'
import { mulberry32, shuffled } from '../../core/rng'
import { buildQueue, toPlayable } from '../../core/selection'
import { makeBank, makeQuestion } from './helpers'

describe('mulberry32', () => {
  it('is deterministic for a given seed and stays inside [0, 1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const seqA = Array.from({ length: 50 }, () => a())
    const seqB = Array.from({ length: 50 }, () => b())

    expect(seqA).toEqual(seqB)
    expect(seqA.every((n) => n >= 0 && n < 1)).toBe(true)
  })

  it('gives different sequences for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })
})

describe('shuffled', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8]

  it('returns a permutation and leaves the input untouched', () => {
    const copy = [...input]
    const out = shuffled(input, mulberry32(7))

    expect(input).toEqual(copy)
    expect([...out].sort()).toEqual(copy)
  })

  it('actually reorders for at least some seeds', () => {
    const orders = new Set(
      Array.from({ length: 20 }, (_, s) => shuffled(input, mulberry32(s)).join()),
    )
    expect(orders.size).toBeGreaterThan(10)
  })

  it('handles empty and single-item arrays', () => {
    expect(shuffled([], mulberry32(1))).toEqual([])
    expect(shuffled(['x'], mulberry32(1))).toEqual(['x'])
  })

  it('copes with extreme rng values', () => {
    expect(shuffled(input, () => 0).sort()).toEqual(input)
    expect(shuffled(input, () => 0.999999).sort()).toEqual(input)
  })
})

describe('toPlayable', () => {
  it('keeps the same four options and points correctIndex at the right one', () => {
    const question = makeQuestion({ correctIndex: 2, options: ['uno', 'dos', 'tres', 'cuatro'] })
    for (let seed = 1; seed <= 60; seed++) {
      const playable = toPlayable(question, mulberry32(seed))

      expect([...playable.options].sort()).toEqual(['cuatro', 'dos', 'tres', 'uno'])
      expect(playable.options[playable.correctIndex]).toBe('tres')
    }
  })

  it('does not mutate the source question', () => {
    const question = makeQuestion()
    const snapshot = JSON.stringify(question)
    toPlayable(question, mulberry32(3))
    expect(JSON.stringify(question)).toBe(snapshot)
  })

  it('spreads the right answer over all four positions', () => {
    const counts = [0, 0, 0, 0]
    for (let seed = 1; seed <= 400; seed++) {
      const { correctIndex } = toPlayable(makeQuestion(), mulberry32(seed))
      counts[correctIndex] = (counts[correctIndex] ?? 0) + 1
    }
    expect(counts.every((n) => n > 50)).toBe(true)
  })

  it('carries over the metadata the UI and the report need', () => {
    const playable = toPlayable(makeQuestion({ source: 'https://example.org/dato' }), mulberry32(1))
    expect(playable).toMatchObject({
      id: 'pregunta-ejemplo',
      category: 'Historia y Geografía',
      difficulty: 'medio',
      source: 'https://example.org/dato',
    })
    expect(playable.explanation).toContain('París')
  })
})

describe('difficulty filter mapping', () => {
  const expected: Record<DifficultyFilter, Difficulty[]> = {
    Aleatorio: ['muy fácil', 'fácil', 'medio', 'difícil', 'muy difícil'],
    Fácil: ['muy fácil', 'fácil'],
    Medio: ['medio'],
    Difícil: ['difícil', 'muy difícil'],
  }

  it.each(DIFFICULTY_FILTERS)('%s lets through the right difficulties', (filter) => {
    expect(difficultiesFor(filter)).toEqual(expected[filter])
    expect(FILTER_DIFFICULTIES[filter]).toEqual(expected[filter])
  })
})

describe('buildQueue', () => {
  const bank = DIFFICULTIES.flatMap((d) => makeBank(d, 4))

  it.each(DIFFICULTY_FILTERS)('with filter %s only includes allowed difficulties', (filter) => {
    const allowed = new Set<Difficulty>(difficultiesFor(filter))
    const queue = buildQueue(bank, filter, mulberry32(5))

    expect(queue.length).toBe(bank.filter((q) => allowed.has(q.difficulty)).length)
    expect(queue.every((q) => allowed.has(q.difficulty))).toBe(true)
  })

  it('drops disabled questions', () => {
    const questions = [
      ...makeBank('medio', 3),
      makeQuestion({ id: 'apagada-1', status: 'disabled' }),
    ]
    const queue = buildQueue(questions, 'Aleatorio', mulberry32(1))

    expect(queue.map((q) => q.id)).not.toContain('apagada-1')
    expect(queue).toHaveLength(3)
  })

  it('never contains the same question twice', () => {
    const queue = buildQueue([...bank, ...bank], 'Aleatorio', mulberry32(9))
    expect(new Set(queue.map((q) => q.id)).size).toBe(queue.length)
    expect(queue).toHaveLength(bank.length)
  })

  it('orders questions differently for different seeds', () => {
    const orders = new Set(
      Array.from({ length: 10 }, (_, s) =>
        buildQueue(bank, 'Aleatorio', mulberry32(s + 1))
          .map((q) => q.id)
          .join(),
      ),
    )
    expect(orders.size).toBeGreaterThan(5)
  })

  it('returns an empty queue for an empty bank', () => {
    expect(buildQueue([], 'Aleatorio', mulberry32(1))).toEqual([])
  })
})
