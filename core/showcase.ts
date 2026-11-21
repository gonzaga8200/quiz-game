import { CATEGORIES, DIFFICULTIES } from './constants'
import type { Category, Difficulty } from './constants'
import type { Question } from './schema'

/** FNV-1a: a tiny, stable string hash, so the same ids always sort the same way. */
function hash(value: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** A fixed order for questions: by hash of the id, and by the id itself if two hashes collide. */
function stableOrder(a: Question, b: Question): number {
  return hash(a.id) - hash(b.id) || a.id.localeCompare(b.id)
}

/**
 * The questions a category page shows. Stable (no randomness, no dependence on input order),
 * so the page does not change between builds unless the bank changes.
 *
 * It takes questions from each difficulty in turn, so a category whose bank is mostly one
 * level still shows a mix. The result is listed from easiest to hardest.
 */
export function pickShowcase(
  questions: readonly Question[],
  category: Category,
  count: number,
): Question[] {
  const seen = new Set<string>()
  const buckets = new Map<Difficulty, Question[]>(DIFFICULTIES.map((d) => [d, []]))

  for (const question of questions) {
    if (question.category !== category || question.status !== 'active') continue
    if (seen.has(question.id)) continue
    seen.add(question.id)
    buckets.get(question.difficulty)?.push(question)
  }
  for (const bucket of buckets.values()) {
    bucket.sort(stableOrder)
  }

  const picked: Question[] = []
  for (let round = 0; picked.length < count; round++) {
    let tookAny = false
    for (const difficulty of DIFFICULTIES) {
      const next = buckets.get(difficulty)?.[round]
      if (next && picked.length < count) {
        picked.push(next)
        tookAny = true
      }
    }
    if (!tookAny) break
  }

  return picked.sort(
    (a, b) =>
      DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty) || stableOrder(a, b),
  )
}

/** How many active questions each category has (a repeated id counts once). */
export function countActiveByCategory(questions: readonly Question[]): Record<Category, number> {
  const counts = Object.fromEntries(CATEGORIES.map((category) => [category, 0])) as Record<
    Category,
    number
  >
  const seen = new Set<string>()
  for (const question of questions) {
    if (question.status !== 'active' || seen.has(question.id)) continue
    seen.add(question.id)
    counts[question.category] += 1
  }
  return counts
}
