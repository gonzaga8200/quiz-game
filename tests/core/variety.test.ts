import { describe, expect, it } from 'vitest'
import { CATEGORIES, MAX_SAME_CATEGORY_IN_A_ROW } from '../../core/constants'
import { Game } from '../../core/game'
import { mulberry32 } from '../../core/rng'
import type { Question } from '../../core/schema'
import { buildQueue } from '../../core/selection'
import {
  current,
  makeBank,
  makeClock,
  makeQuestion,
  skipOne,
  startGame,
  answerRight,
} from './helpers'

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

/** `count` 'medio' questions of one category with ids `v-0`, `v-1`... */
function oneCategoryBank(count: number): Question[] {
  return Array.from({ length: count }, (_, i) =>
    makeQuestion({ id: `v-${i}`, text: `Pregunta de variedad ${i}`, category: 'Ciencias' }),
  )
}

/** Six categories with `perCategory` 'medio' questions each. */
function balancedMedioBank(perCategory: number): Question[] {
  return CATEGORIES.flatMap((category, c) =>
    Array.from({ length: perCategory }, (_, i) =>
      makeQuestion({ id: `b-${c}-${i}`, text: `Pregunta equilibrada ${c}-${i}`, category }),
    ),
  )
}

const ids = (queue: readonly { id: string }[]) => queue.map((q) => q.id)

describe('buildQueue with a memory of what was shown', () => {
  it('serves the questions seen the fewest times first', () => {
    const bank = oneCategoryBank(30)
    const seen = new Map<string, number>()
    for (let i = 0; i < 10; i++) seen.set(`v-${i}`, 1)
    for (let i = 10; i < 15; i++) seen.set(`v-${i}`, 3)

    const queue = buildQueue(bank, 'Medio', mulberry32(5), 'Ciencias', seen)

    const counts = queue.map((q) => seen.get(q.id) ?? 0)
    expect(counts).toEqual([...counts].sort((a, b) => a - b))
    expect(counts.slice(0, 15)).toEqual(Array(15).fill(0))
  })

  it('breaks ties at random: the same seed repeats and different seeds differ', () => {
    const bank = oneCategoryBank(20)
    const seen = new Map(bank.map((q) => [q.id, 2] as const))
    const order = (seed: number) =>
      ids(buildQueue(bank, 'Medio', mulberry32(seed), 'Ciencias', seen)).join()

    expect(new Set([1, 2, 3, 4, 5, 6].map(order)).size).toBeGreaterThan(4)
    expect(order(9)).toBe(order(9))
  })

  it('ignores ids that are not in the bank', () => {
    const bank = oneCategoryBank(10)
    const seen = new Map([
      ['fantasma', 7],
      ['v-0', 1],
    ])
    const queue = buildQueue(bank, 'Medio', mulberry32(2), 'Ciencias', seen)
    expect(queue).toHaveLength(10)
    expect(ids(queue)).not.toContain('fantasma')
  })

  it('an empty memory changes nothing', () => {
    const bank = balancedMedioBank(8)
    for (const filter of ['Aleatorio', 'Medio'] as const) {
      const plain = ids(buildQueue(bank, filter, mulberry32(4)))
      const empty = ids(buildQueue(bank, filter, mulberry32(4), undefined, new Map()))
      expect(empty).toEqual(plain)
    }
  })

  it('keeps the category rule and serves every question exactly once', () => {
    const bank = balancedMedioBank(10)
    const seen = new Map(bank.filter((_, i) => i % 2 === 0).map((q) => [q.id, 1] as const))

    for (let seed = 1; seed <= 20; seed++) {
      const queue = buildQueue(bank, 'Medio', mulberry32(seed), undefined, seen)
      expect(longestRun(queue.slice(0, 30).map((q) => q.category))).toBeLessThanOrEqual(
        MAX_SAME_CATEGORY_IN_A_ROW,
      )
      expect(ids(queue).sort()).toEqual(ids(bank).sort())
    }
  })
})

describe('buildQueue memory and the difficulty mix', () => {
  /** 30 questions each of fácil, medio and difícil, spread over every category. */
  const bank = CATEGORIES.flatMap((category, c) =>
    (['fácil', 'medio', 'difícil'] as const).flatMap((difficulty) =>
      Array.from({ length: 5 }, (_, i) =>
        makeQuestion({
          id: `mix-${c}-${difficulty}-${i}`,
          text: `Pregunta de mezcla ${c}-${difficulty}-${i}`,
          category,
          difficulty,
        }),
      ),
    ),
  )

  it('does not drop a level from random games because the device already saw all of it', () => {
    // A device that has played a lot of "fácil": every fácil question was shown once.
    const seen = new Map(
      bank.filter((q) => q.difficulty === 'fácil').map((q) => [q.id, 1] as const),
    )

    let facil = 0
    for (let seed = 1; seed <= 10; seed++) {
      const first = buildQueue(bank, 'Aleatorio', mulberry32(seed), undefined, seen).slice(0, 30)
      facil += first.filter((q) => q.difficulty === 'fácil').length
    }
    // Without the memory a third of 30 questions is fácil (about 100 over 10 games).
    expect(facil).toBeGreaterThan(60)
  })

  it('still serves the least seen first inside each level', () => {
    const level = bank.filter((q) => q.difficulty === 'medio')
    const seen = new Map(level.slice(0, 10).map((q) => [q.id, 2] as const))
    const queue = buildQueue(bank, 'Aleatorio', mulberry32(3), undefined, seen)
    const medio = queue.filter((q) => q.difficulty === 'medio').map((q) => seen.get(q.id) ?? 0)
    expect(medio).toEqual([...medio].sort((a, b) => a - b))
  })
})

describe('Game memory', () => {
  const bank = makeBank('medio', 10)

  it('lists nothing before the game starts', () => {
    const game = new Game({
      questions: bank,
      filter: 'Aleatorio',
      duration: 60,
      rng: mulberry32(1),
      now: makeClock().now,
    })
    expect(game.shownIds()).toEqual([])
  })

  it('lists what was presented: answered, skipped and the one on screen', () => {
    const { game } = startGame(bank)
    expect(game.shownIds()).toHaveLength(1)

    answerRight(game)
    skipOne(game)

    const shown = game.shownIds()
    expect(shown).toHaveLength(3)
    expect(shown).toEqual([...game.results().map((r) => r.question.id), current(game).id])
  })

  it('serves first the question the memory has not seen', () => {
    const seen = new Map(bank.slice(1).map((q) => [q.id, 4] as const))
    const game = new Game({
      questions: bank,
      filter: 'Aleatorio',
      duration: 60,
      rng: mulberry32(1),
      now: makeClock().now,
      seen,
    })
    game.start()
    expect(current(game).id).toBe((bank[0] as Question).id)
  })
})
