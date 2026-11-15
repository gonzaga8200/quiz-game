import { z } from 'zod'
import { QuestionFileSchema } from '~~/core'
import type { Question } from '~~/core'

/**
 * Short-lived local copy of the question bank. Every game would otherwise read every
 * question from Firestore, and the free (Spark) plan allows 50,000 reads per day.
 * This is a purely technical cache; it holds public quiz content, nothing personal.
 */
export const QUESTION_CACHE_KEY = 'contrarreloj.questions.v1'
export const QUESTION_CACHE_TTL_MS = 60 * 60 * 1000

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const CacheSchema = z.object({
  savedAt: z.number(),
  questions: QuestionFileSchema,
})

/** Returns the cached questions, or null if missing, expired, corrupt or unreadable. */
export function readCachedQuestions(storage: StorageLike | null, now: number): Question[] | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(QUESTION_CACHE_KEY)
    if (raw === null) return null
    const parsed = CacheSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null
    const age = now - parsed.data.savedAt
    return age >= 0 && age < QUESTION_CACHE_TTL_MS ? parsed.data.questions : null
  } catch {
    return null
  }
}

export function writeCachedQuestions(
  storage: StorageLike | null,
  questions: readonly Question[],
  now: number,
): void {
  if (!storage) return
  try {
    storage.setItem(QUESTION_CACHE_KEY, JSON.stringify({ savedAt: now, questions }))
  } catch {
    // Storage full or blocked: the game just fetches again next time.
  }
}
