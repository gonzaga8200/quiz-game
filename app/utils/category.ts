import type { Category } from '~~/core'

/**
 * A short, CSS-friendly name for each category. The question card carries it as
 * `data-category` and the stylesheet colours the card's bookmark from it. Typing the
 * record by `Category` makes the compiler flag a new category that has no colour yet.
 */
const SLUGS: Record<Category, string> = {
  'Arte y Literatura': 'arte',
  'Historia y Geografía': 'historia',
  Deportes: 'deportes',
  'Cine y televisión': 'cine',
  Ciencias: 'ciencias',
  'Lengua e Idiomas': 'lengua',
  Música: 'musica',
}

export function categorySlug(category: Category): string {
  return SLUGS[category]
}
