import { celebrationFor } from './celebration'
import type { Celebration } from './celebration'
import type { Category, Difficulty, DifficultyFilter, Duration } from './constants'
import type { FinishReason, QuestionResult, ResultKind } from './game'

export interface ReportRow {
  readonly id: string
  readonly text: string
  readonly category: Category
  readonly difficulty: Difficulty
  readonly timeMs: number
  readonly result: ResultKind
  /** The option the player picked; null when skipped. */
  readonly chosenAnswer: string | null
  readonly correctAnswer: string
  readonly explanation: string
  /** Net points this question changed the score by (base + bonus - penalty). */
  readonly net: number
}

export interface ComboBonusLine {
  /** Streak length that triggered the bonus (3, 5 or 10). */
  readonly streak: number
  /** How many times it was earned during the game. */
  readonly count: number
  readonly points: number
}

export interface ReportBreakdown {
  readonly correctPoints: number
  readonly comboBonuses: readonly ComboBonusLine[]
  readonly comboBonusTotal: number
  readonly wrongPenalty: number
  readonly skipPenalty: number
  readonly penaltyTotal: number
}

export interface GameReport {
  /** Final score: correctPoints + comboBonusTotal - penaltyTotal. */
  readonly points: number
  readonly correct: number
  readonly wrong: number
  readonly skipped: number
  readonly bestStreak: number
  readonly breakdown: ReportBreakdown
  readonly rows: readonly ReportRow[]
  readonly finishReason: FinishReason
  readonly duration: Duration
  readonly filter: DifficultyFilter
  /** Set when the game was limited to one category. */
  readonly category?: Category
  readonly celebration: Celebration
}

export interface ReportInput {
  readonly results: readonly QuestionResult[]
  readonly bestStreak: number
  readonly finishReason: FinishReason
  readonly duration: Duration
  readonly filter: DifficultyFilter
  readonly category?: Category
}

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0)

function toRow(entry: QuestionResult): ReportRow {
  const { question } = entry
  return {
    id: question.id,
    text: question.text,
    category: question.category,
    difficulty: question.difficulty,
    timeMs: entry.timeMs,
    result: entry.result,
    chosenAnswer:
      entry.chosenIndex === null ? null : (question.options[entry.chosenIndex] as string),
    correctAnswer: question.options[question.correctIndex] as string,
    explanation: question.explanation,
    net: entry.points + entry.bonus - entry.penalty,
  }
}

/** Groups combo bonuses by the streak length that triggered them, ascending. */
function bonusLines(results: readonly QuestionResult[]): ComboBonusLine[] {
  const byStreak = new Map<number, ComboBonusLine>()
  for (const entry of results) {
    if (entry.bonus === 0) continue
    const previous = byStreak.get(entry.streakAfter)
    byStreak.set(entry.streakAfter, {
      streak: entry.streakAfter,
      count: (previous?.count ?? 0) + 1,
      points: (previous?.points ?? 0) + entry.bonus,
    })
  }
  return [...byStreak.values()].sort((a, b) => a.streak - b.streak)
}

/**
 * Builds the end-of-game report. The score is derived from the per-question results
 * so the breakdown always adds up to the total.
 */
export function buildReport(input: ReportInput): GameReport {
  const { results } = input
  const count = (kind: ResultKind) => results.filter((entry) => entry.result === kind).length
  const penaltyOf = (kind: ResultKind) =>
    sum(results.filter((entry) => entry.result === kind).map((entry) => entry.penalty))

  const correctPoints = sum(results.map((entry) => entry.points))
  const comboBonuses = bonusLines(results)
  const comboBonusTotal = sum(comboBonuses.map((line) => line.points))
  const wrongPenalty = penaltyOf('wrong')
  const skipPenalty = penaltyOf('skipped')
  const penaltyTotal = wrongPenalty + skipPenalty
  const points = correctPoints + comboBonusTotal - penaltyTotal

  return {
    points,
    correct: count('correct'),
    wrong: count('wrong'),
    skipped: count('skipped'),
    bestStreak: input.bestStreak,
    breakdown: {
      correctPoints,
      comboBonuses,
      comboBonusTotal,
      wrongPenalty,
      skipPenalty,
      penaltyTotal,
    },
    rows: results.map(toRow),
    finishReason: input.finishReason,
    duration: input.duration,
    filter: input.filter,
    ...(input.category ? { category: input.category } : {}),
    celebration: celebrationFor(points, input.duration),
  }
}
