import type { Question } from '~~/core'
import { browserStorage } from '~/utils/browser-storage'
import { loadBundledQuestions } from '~/utils/bundled-questions'
import { readCachedQuestions, writeCachedQuestions } from '~/utils/question-cache'
import { withTimeout } from '~/utils/with-timeout'

const FIRESTORE_TIMEOUT_MS = 6000

/**
 * Where the questions for a game come from. Firestore is the source of truth, with a
 * one-hour local cache to stay inside the free plan's read quota. If Firebase is not
 * configured, is unreachable, or has no active questions yet, the questions bundled
 * with the app are used, so the game is always playable.
 */
export function useQuestionBank() {
  const { configured, load: loadFirebase } = useFirebase()

  async function load(): Promise<Question[]> {
    if (configured) {
      const storage = browserStorage()
      const cached = readCachedQuestions(storage, Date.now())
      if (cached) return cached

      try {
        const questions = await withTimeout(
          loadFirebase().then(({ lib, services }) => lib.fetchActiveQuestions(services.db)),
          FIRESTORE_TIMEOUT_MS,
        )
        if (questions.length > 0) {
          writeCachedQuestions(storage, questions, Date.now())
          return questions
        }
      } catch {
        // Offline, blocked or misconfigured: fall back to the bundled questions.
      }
    }
    return loadBundledQuestions()
  }

  return { load }
}
