/**
 * Zod schemas shared by the app, the import script and the add-questions skill.
 * Defined once here; everything else derives its types from them.
 */
import { z } from 'zod'
import {
  CATEGORIES,
  DIFFICULTIES,
  DIFFICULTY_FILTERS,
  DURATIONS,
  MAX_POINTS_PER_CORRECT,
  QUESTION_STATUSES,
} from './constants'

const option = z.string().trim().min(1).max(120)

export const QuestionIdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{2,79}$/, 'id must be a lowercase slug (a-z, 0-9, "-"), 3-80 chars')

/**
 * A quiz question as stored in `data/questions/*.json` and in Firestore.
 * `createdAt` is an ISO-8601 UTC string here; the import script converts it to a
 * Firestore Timestamp and the app converts it back.
 */
export const QuestionSchema = z
  .strictObject({
    id: QuestionIdSchema,
    text: z.string().trim().min(10).max(300),
    options: z.tuple([option, option, option, option]),
    correctIndex: z.number().int().min(0).max(3),
    category: z.enum(CATEGORIES),
    difficulty: z.enum(DIFFICULTIES),
    explanation: z.string().trim().min(10).max(300),
    source: z.string().trim().min(1).max(500).optional(),
    createdAt: z.iso.datetime(),
    status: z.enum(QUESTION_STATUSES),
  })
  .superRefine((question, ctx) => {
    const seen = new Set<string>()
    question.options.forEach((value, index) => {
      const key = value.toLocaleLowerCase('es')
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['options', index],
          message: 'options must be distinct',
        })
      }
      seen.add(key)
    })
  })
export type Question = z.infer<typeof QuestionSchema>

export const QuestionFileSchema = z.array(QuestionSchema).min(1)

const scoreShape = {
  uid: z.string().min(1).max(128),
  displayName: z.string().trim().min(1).max(60),
  photoURL: z
    .string()
    .max(500)
    .regex(/^https:\/\//, 'photoURL must be an https URL')
    .nullable(),
  points: z.number().int().min(0),
  correct: z.number().int().min(0),
  wrong: z.number().int().min(0),
  skipped: z.number().int().min(0),
  duration: z.literal(DURATIONS),
  difficultyFilter: z.enum(DIFFICULTY_FILTERS),
  /** Only when the game was limited to one category; absent when it mixed them all. */
  category: z.enum(CATEGORIES).optional(),
}

type ScoreShape = z.infer<z.ZodObject<typeof scoreShape>>

/** Cross-field sanity checks. The Firestore rules enforce the same bounds. */
function checkScoreRanges(score: ScoreShape, ctx: z.RefinementCtx): void {
  if (score.correct + score.wrong + score.skipped > score.duration) {
    ctx.addIssue({
      code: 'custom',
      path: ['correct'],
      message: 'more answered questions than seconds in the game',
    })
  }
  if (score.points > score.correct * MAX_POINTS_PER_CORRECT) {
    ctx.addIssue({
      code: 'custom',
      path: ['points'],
      message: 'points exceed what the correct answers can yield',
    })
  }
}

/** What a client sends to the ranking after a competitive game. */
export const ScoreSubmissionSchema = z.strictObject(scoreShape).superRefine(checkScoreRanges)
export type ScoreSubmission = z.infer<typeof ScoreSubmissionSchema>

/** A ranking entry as stored in Firestore (adds the server-side timestamp). */
export const RankingEntrySchema = z
  .strictObject({ ...scoreShape, createdAt: z.iso.datetime() })
  .superRefine(checkScoreRanges)
export type RankingEntry = z.infer<typeof RankingEntrySchema>
