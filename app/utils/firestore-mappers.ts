import { QuestionSchema, RankingEntrySchema } from '~~/core'
import type { Question, RankingEntry } from '~~/core'

interface TimestampLike {
  toDate(): Date
}

function isTimestamp(value: unknown): value is TimestampLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  )
}

/** Firestore stores dates as Timestamps; the shared schemas use ISO strings. */
function withIsoDates(data: Record<string, unknown>): Record<string, unknown> {
  const { createdAt } = data
  return isTimestamp(createdAt) ? { ...data, createdAt: createdAt.toDate().toISOString() } : data
}

/** Validates a Firestore question document. Returns null for malformed documents. */
export function toQuestion(id: string, data: Record<string, unknown>): Question | null {
  const parsed = QuestionSchema.safeParse({ ...withIsoDates(data), id })
  return parsed.success ? parsed.data : null
}

/** Validates a ranking entry document. Returns null for malformed documents. */
export function toRankingEntry(data: Record<string, unknown>): RankingEntry | null {
  const parsed = RankingEntrySchema.safeParse(withIsoDates(data))
  return parsed.success ? parsed.data : null
}
