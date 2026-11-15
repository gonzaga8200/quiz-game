import { QuestionFileSchema } from '~~/core'
import type { Question } from '~~/core'

/**
 * Questions shipped inside the app (`data/questions/*.json`). They keep the game
 * playable without Firebase (local development, offline, Firestore unreachable).
 * Loaded lazily: each file becomes its own chunk, fetched only when a game starts.
 */
const files = import.meta.glob<unknown>('~~/data/questions/*.json', { import: 'default' })

let cached: Promise<Question[]> | null = null

export function loadBundledQuestions(): Promise<Question[]> {
  cached ??= Promise.all(Object.values(files).map((load) => load())).then((raw) =>
    // Fails loudly if a file drifts from the schema; CI validates them too.
    raw.flatMap((content) => QuestionFileSchema.parse(content)),
  )
  return cached
}
