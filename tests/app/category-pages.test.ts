import { describe, expect, it } from 'vitest'
import { buildCategoryPage, buildHubPage, SHOWCASE_SIZE } from '../../app/utils/category-pages'
import { CATEGORIES, DIFFICULTIES } from '../../core'
import { makeQuestion } from '../core/helpers'

const deportes = DIFFICULTIES.flatMap((difficulty) =>
  Array.from({ length: 8 }, (_, i) =>
    makeQuestion({
      id: `dep-${difficulty.replace(/\s/g, '-')}-${i}`,
      text: `Pregunta ${i} de deportes (${difficulty})`,
      options: ['Correcta', 'Falsa uno', 'Falsa dos', 'Falsa tres'],
      correctIndex: 0,
      category: 'Deportes',
      difficulty,
      explanation: 'Una explicación suficientemente larga.',
    }),
  ),
)

describe('buildCategoryPage', () => {
  it('shows a fixed number of questions and counts the whole category', () => {
    const page = buildCategoryPage(deportes, 'Deportes')
    expect(page.items).toHaveLength(SHOWCASE_SIZE)
    expect(page.total).toBe(deportes.length)
  })

  it('exposes only what the page prints, with the right answer resolved', () => {
    const [first] = buildCategoryPage(deportes, 'Deportes').items
    expect(Object.keys(first ?? {}).sort()).toEqual([
      'answer',
      'difficulty',
      'explanation',
      'id',
      'text',
    ])
    expect(first?.answer).toBe('Correcta')
  })

  it('counts only active questions', () => {
    const some = deportes.map((q, i) => (i < 5 ? { ...q, status: 'disabled' as const } : q))
    expect(buildCategoryPage(some, 'Deportes').total).toBe(deportes.length - 5)
  })

  it('is empty for a category without questions', () => {
    expect(buildCategoryPage(deportes, 'Ciencias')).toEqual({ total: 0, items: [] })
  })
})

describe('buildHubPage', () => {
  it('lists every category in the game order with its active count', () => {
    const hub = buildHubPage(deportes)
    expect(hub.map((entry) => entry.category)).toEqual([...CATEGORIES])
    expect(hub.find((entry) => entry.category === 'Deportes')?.total).toBe(deportes.length)
    expect(hub.find((entry) => entry.category === 'Ciencias')?.total).toBe(0)
  })
})
