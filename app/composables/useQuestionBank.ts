import type { Question } from '~~/core'
import { loadBundledQuestions } from '~/utils/bundled-questions'

/** Where the questions for a game come from. Firestore is added in the next phase. */
export function useQuestionBank() {
  function load(): Promise<Question[]> {
    return loadBundledQuestions()
  }
  return { load }
}
