import type { Question } from '~~/core'
import { browserStorage } from '~/utils/browser-storage'
import { readSeen, recordSeen } from '~/utils/seen-questions'

/**
 * The device's memory of which questions it has shown, kept in `localStorage`. Reading or
 * writing never fails: if storage is blocked the memory is simply empty.
 */
export function useSeenQuestions() {
  return {
    /** How many times each question has been shown on this device. */
    read(): ReadonlyMap<string, number> {
      return readSeen(browserStorage())
    },
    /** Counts the shown questions once more, forgetting ids that are no longer in `bank`. */
    save(shownIds: readonly string[], bank: readonly Question[]): void {
      recordSeen(browserStorage(), shownIds, new Set(bank.map((question) => question.id)))
    },
  }
}
