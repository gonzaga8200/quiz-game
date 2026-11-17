import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../../core'
import { categorySlug } from '../../app/utils/category'

describe('categorySlug', () => {
  it('gives every category its own short slug', () => {
    const slugs = CATEGORIES.map(categorySlug)
    expect(new Set(slugs).size).toBe(CATEGORIES.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z]+$/)
  })

  it('uses the slugs the stylesheet knows about', () => {
    expect(categorySlug('Arte y Literatura')).toBe('arte')
    expect(categorySlug('Historia y Geografía')).toBe('historia')
    expect(categorySlug('Lengua e Idiomas')).toBe('lengua')
  })
})
