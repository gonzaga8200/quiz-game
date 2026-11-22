import { z } from 'zod'
import type { StorageLike } from './question-cache'

/**
 * What this device has already been shown: question id to how many times. It lets the game
 * serve the questions seen the fewest times first, so a player meets repeats as late as
 * possible. It lives only in this browser; nothing is sent anywhere and it holds no personal
 * data. If it cannot be read or written the game just behaves as if the memory were empty.
 */
export const SEEN_KEY = 'contrarreloj.seen.v1'

const SeenSchema = z.record(z.string(), z.number().int().positive())

/** The stored counts, or an empty map if missing, corrupt or unreadable. */
export function readSeen(storage: StorageLike | null): Map<string, number> {
  if (!storage) return new Map()
  try {
    const raw = storage.getItem(SEEN_KEY)
    if (raw === null) return new Map()
    const parsed = SeenSchema.safeParse(JSON.parse(raw))
    return parsed.success ? new Map(Object.entries(parsed.data)) : new Map()
  } catch {
    return new Map()
  }
}

/**
 * Adds one to the count of every id in `shownIds` and saves. Ids that are not in the bank
 * (`bankIds`) are dropped, so the memory cannot grow with questions that no longer exist.
 */
export function recordSeen(
  storage: StorageLike | null,
  shownIds: readonly string[],
  bankIds: ReadonlySet<string>,
): void {
  if (!storage) return
  const counts = readSeen(storage)
  for (const id of shownIds) counts.set(id, (counts.get(id) ?? 0) + 1)
  for (const id of [...counts.keys()]) if (!bankIds.has(id)) counts.delete(id)
  try {
    storage.setItem(SEEN_KEY, JSON.stringify(Object.fromEntries(counts)))
  } catch {
    // Storage full or blocked: the memory simply is not updated.
  }
}
