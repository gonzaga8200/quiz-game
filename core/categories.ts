import { CATEGORIES } from './constants'
import type { Category } from './constants'

/**
 * Slugs used in public URLs (`/preguntas/<slug>` and `?categoria=<slug>`): ASCII, lowercase and
 * made of the words people actually search for.
 * Typing the record by `Category` makes the compiler flag a new category that has no slug yet.
 */
const URL_SLUGS: Readonly<Record<Category, string>> = {
  'Arte y Literatura': 'arte-y-literatura',
  'Historia y Geografía': 'historia-y-geografia',
  Deportes: 'deportes',
  'Cine y televisión': 'cine-y-television',
  Ciencias: 'ciencias',
  'Lengua e Idiomas': 'lengua-e-idiomas',
}

export function categoryUrlSlug(category: Category): string {
  return URL_SLUGS[category]
}

/** The category for a URL slug, or null for anything that is not exactly one of them. */
export function categoryFromSlug(value: unknown): Category | null {
  if (typeof value !== 'string') return null
  return CATEGORIES.find((category) => URL_SLUGS[category] === value) ?? null
}
