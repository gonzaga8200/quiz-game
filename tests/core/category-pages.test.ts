import { describe, expect, it } from 'vitest'
import { CATEGORIES, DIFFICULTIES } from '../../core/constants'
import type { Category, Difficulty } from '../../core/constants'
import { categoryFromSlug, categoryUrlSlug } from '../../core/categories'
import { Game } from '../../core/game'
import { mulberry32 } from '../../core/rng'
import { buildQueue } from '../../core/selection'
import { countActiveByCategory, pickShowcase } from '../../core/showcase'
import { makeQuestion } from './helpers'

/** `count` questions of one category and difficulty, with ids that sort predictably. */
function bank(category: Category, difficulty: Difficulty, count: number) {
  return Array.from({ length: count }, (_, i) =>
    makeQuestion({
      id: `${category.slice(0, 3).toLowerCase()}-${difficulty.replace(/\s/g, '-')}-${i}`,
      text: `Pregunta ${i} de ${category} (${difficulty})`,
      category,
      difficulty,
    }),
  )
}

describe('category URL slugs', () => {
  it('gives every category a distinct, URL-safe slug', () => {
    const slugs = CATEGORIES.map(categoryUrlSlug)
    expect(new Set(slugs).size).toBe(CATEGORIES.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z]+(-[a-z]+)*$/)
  })

  it('uses the words people search for', () => {
    expect(categoryUrlSlug('Deportes')).toBe('deportes')
    expect(categoryUrlSlug('Historia y Geografía')).toBe('historia-y-geografia')
    expect(categoryUrlSlug('Cine y televisión')).toBe('cine-y-television')
  })

  it.each(CATEGORIES)('round-trips %s', (category) => {
    expect(categoryFromSlug(categoryUrlSlug(category))).toBe(category)
  })

  it.each([undefined, null, '', 'nope', 'DEPORTES', 'Deportes', 42, ['deportes']])(
    'rejects %j',
    (value) => {
      expect(categoryFromSlug(value)).toBeNull()
    },
  )
})

describe('buildQueue with a category', () => {
  const all = CATEGORIES.flatMap((c) => DIFFICULTIES.flatMap((d) => bank(c, d, 3)))

  it('only serves questions of that category', () => {
    const queue = buildQueue(all, 'Aleatorio', mulberry32(1), 'Deportes')
    expect(queue.length).toBe(DIFFICULTIES.length * 3)
    expect(queue.every((q) => q.category === 'Deportes')).toBe(true)
  })

  it('still honours the difficulty filter', () => {
    const queue = buildQueue(all, 'Fácil', mulberry32(1), 'Ciencias')
    expect(queue.length).toBe(2 * 3)
    expect(queue.every((q) => q.category === 'Ciencias')).toBe(true)
    expect(queue.every((q) => q.difficulty === 'fácil' || q.difficulty === 'muy fácil')).toBe(true)
  })

  it('keeps today’s behaviour when no category is given', () => {
    const withoutCategory = buildQueue(all, 'Aleatorio', mulberry32(9))
    const withUndefined = buildQueue(all, 'Aleatorio', mulberry32(9), undefined)
    expect(withUndefined.map((q) => q.id)).toEqual(withoutCategory.map((q) => q.id))
    expect(new Set(withoutCategory.map((q) => q.category)).size).toBe(CATEGORIES.length)
  })

  it('never drops a question because every one shares the category', () => {
    const only = [...bank('Deportes', 'medio', 12), ...bank('Deportes', 'difícil', 12)]
    const queue = buildQueue(only, 'Aleatorio', mulberry32(3), 'Deportes')
    expect(queue.length).toBe(24)
  })

  it('still spreads difficulties when a single category is chosen', () => {
    const only = [...bank('Deportes', 'medio', 12), ...bank('Deportes', 'difícil', 12)]
    const queue = buildQueue(only, 'Aleatorio', mulberry32(3), 'Deportes')
    let run = 1
    let longest = 1
    for (let i = 1; i < queue.length; i++) {
      run = queue[i]?.difficulty === queue[i - 1]?.difficulty ? run + 1 : 1
      longest = Math.max(longest, run)
    }
    expect(longest).toBeLessThanOrEqual(2)
  })

  it('is empty when the category has no active questions', () => {
    const queue = buildQueue(bank('Ciencias', 'medio', 5), 'Aleatorio', mulberry32(1), 'Deportes')
    expect(queue).toEqual([])
  })
})

describe('Game with a category', () => {
  it('presents only questions of the chosen category', () => {
    const questions = CATEGORIES.flatMap((c) => bank(c, 'medio', 4))
    const game = new Game({
      questions,
      filter: 'Aleatorio',
      duration: 60,
      rng: mulberry32(2),
      now: () => 0,
      category: 'Cine y televisión',
    })
    game.start()
    expect(game.snapshot().current?.category).toBe('Cine y televisión')
  })
})

describe('pickShowcase', () => {
  const deportes = DIFFICULTIES.flatMap((d) => bank('Deportes', d, 12))
  const others = bank('Ciencias', 'medio', 30)

  it('takes the requested number of questions, all from the category', () => {
    const picked = pickShowcase([...deportes, ...others], 'Deportes', 20)
    expect(picked).toHaveLength(20)
    expect(picked.every((q) => q.category === 'Deportes')).toBe(true)
  })

  it('mixes every difficulty evenly instead of following the bank’s skew', () => {
    const skewed = [
      ...bank('Arte y Literatura', 'muy fácil', 2),
      ...bank('Arte y Literatura', 'medio', 100),
    ]
    const picked = pickShowcase(skewed, 'Arte y Literatura', 20)
    expect(picked.filter((q) => q.difficulty === 'muy fácil')).toHaveLength(2)
    expect(picked).toHaveLength(20)
  })

  it('lists them from easiest to hardest', () => {
    const picked = pickShowcase(deportes, 'Deportes', 20)
    const ranks = picked.map((q) => DIFFICULTIES.indexOf(q.difficulty))
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it('is deterministic and does not depend on the input order', () => {
    const a = pickShowcase(deportes, 'Deportes', 20).map((q) => q.id)
    const b = pickShowcase([...deportes].reverse(), 'Deportes', 20).map((q) => q.id)
    expect(b).toEqual(a)
  })

  it('breaks a hash tie by id, so two colliding ids keep the same order whatever the input', () => {
    // These two ids have the same FNV-1a hash (3611885259): only the id can tell them apart.
    const a = makeQuestion({ id: 'dep-colision-412789', category: 'Deportes', difficulty: 'medio' })
    const b = makeQuestion({ id: 'dep-colision-649192', category: 'Deportes', difficulty: 'medio' })
    const forward = pickShowcase([a, b], 'Deportes', 2).map((q) => q.id)
    const backward = pickShowcase([b, a], 'Deportes', 2).map((q) => q.id)
    expect(forward).toEqual(['dep-colision-412789', 'dep-colision-649192'])
    expect(backward).toEqual(forward)
  })

  it('skips disabled questions', () => {
    const disabled = deportes.map((q) => ({ ...q, status: 'disabled' as const }))
    expect(pickShowcase(disabled, 'Deportes', 20)).toEqual([])
  })

  it('returns everything when the category has fewer questions than asked', () => {
    const few = bank('Deportes', 'medio', 5)
    expect(pickShowcase(few, 'Deportes', 20)).toHaveLength(5)
  })

  it('never repeats a question', () => {
    const picked = pickShowcase([...deportes, ...deportes], 'Deportes', 20)
    expect(new Set(picked.map((q) => q.id)).size).toBe(picked.length)
  })
})

describe('countActiveByCategory', () => {
  it('counts active questions per category, with zero for the empty ones', () => {
    const counts = countActiveByCategory([
      ...bank('Deportes', 'medio', 3),
      ...bank('Ciencias', 'medio', 2),
      ...bank('Ciencias', 'fácil', 2).map((q) => ({ ...q, status: 'disabled' as const })),
    ])
    expect(counts.Deportes).toBe(3)
    expect(counts.Ciencias).toBe(2)
    expect(counts['Cine y televisión']).toBe(0)
    expect(Object.keys(counts).sort()).toEqual([...CATEGORIES].sort())
  })

  it('does not count a repeated id twice', () => {
    const one = bank('Deportes', 'medio', 2)
    expect(countActiveByCategory([...one, ...one]).Deportes).toBe(2)
  })
})
