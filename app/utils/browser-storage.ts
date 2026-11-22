import type { StorageLike } from './question-cache'

/** The browser's `localStorage`, or null when it is blocked (private mode, site settings). */
export function browserStorage(): StorageLike | null {
  try {
    return window.localStorage
  } catch {
    return null // storage blocked
  }
}
