import {
  COMBO_BONUSES,
  FREE_SKIPS,
  PAID_SKIP_PENALTY,
  POINTS_BY_DIFFICULTY,
  WRONG_PENALTY_BY_DIFFICULTY,
} from './constants'
import type { Category, DifficultyFilter, Duration } from './constants'
import { buildReport } from './report'
import type { GameReport } from './report'
import type { Rng } from './rng'
import type { Question } from './schema'
import { buildQueue } from './selection'
import type { PlayableQuestion } from './selection'

export type GameStatus = 'ready' | 'question' | 'feedback' | 'finished'
export type FinishReason = 'time' | 'exhausted'
export type ResultKind = 'correct' | 'wrong' | 'skipped'

export interface GameConfig {
  readonly questions: readonly Question[]
  readonly filter: DifficultyFilter
  readonly duration: Duration
  /** Only serve questions of this category (arcade mode). Omitted = every category. */
  readonly category?: Category
  /** Random source; pass `Math.random` in the app and a seeded PRNG in tests. */
  readonly rng: Rng
  /** Monotonic clock in milliseconds; pass `performance.now` in the app. */
  readonly now: () => number
}

/** One question the player actually handled. Discarded questions never appear. */
export interface QuestionResult {
  readonly question: PlayableQuestion
  readonly result: ResultKind
  readonly chosenIndex: number | null
  readonly timeMs: number
  /** Base points earned (correct answers only). */
  readonly points: number
  /** Combo bonus earned by this answer. */
  readonly bonus: number
  /** Points actually deducted, after the score floor (never more than the score held). */
  readonly penalty: number
  readonly streakAfter: number
}

export type Outcome =
  | {
      readonly kind: 'answered'
      readonly result: 'correct' | 'wrong'
      readonly chosenIndex: number
      readonly correctIndex: number
      readonly points: number
      readonly bonus: number
      readonly penalty: number
      readonly streak: number
    }
  | {
      readonly kind: 'skipped'
      readonly free: boolean
      readonly penalty: number
      readonly freeSkipsLeft: number
    }
  /** The timer ran out first: the question in flight was discarded and the game is over. */
  | { readonly kind: 'expired' }
  /** The call does not apply in the current state (double tap, bad index...). */
  | { readonly kind: 'ignored' }

export interface GameSnapshot {
  readonly status: GameStatus
  readonly current: PlayableQuestion | null
  readonly score: number
  readonly streak: number
  readonly bestStreak: number
  readonly correct: number
  readonly wrong: number
  readonly skipped: number
  readonly freeSkipsLeft: number
  /** Points the next skip would cost: 0 while free skips remain. */
  readonly skipCost: number
  readonly remainingMs: number
  readonly finishReason: FinishReason | null
}

type Phase =
  | { readonly status: 'ready' }
  | {
      readonly status: 'question'
      readonly question: PlayableQuestion
      readonly presentedAt: number
    }
  | { readonly status: 'feedback' }
  | { readonly status: 'finished'; readonly reason: FinishReason }

const IGNORED: Outcome = { kind: 'ignored' }
const EXPIRED: Outcome = { kind: 'expired' }

/**
 * The game state machine. Framework-agnostic and deterministic: all randomness and
 * time come from the injected `rng` and `now`.
 *
 *   ready --start()--> question --answer()/skip()--> feedback --next()--> question ...
 *   any state --(timer reaches 0)--> finished   (the question in flight is discarded)
 *   next() with no questions left --> finished ('exhausted')
 *
 * The clock keeps running during `feedback`. The UI calls `tick()` regularly so the
 * game ends on time even if the player does nothing.
 */
export class Game {
  readonly #config: GameConfig
  readonly #durationMs: number
  readonly #queue: readonly PlayableQuestion[]
  readonly #results: QuestionResult[] = []
  #phase: Phase = { status: 'ready' }
  #startedAt = 0
  #nextIndex = 0
  #score = 0
  #streak = 0
  #bestStreak = 0
  #freeSkipsLeft = FREE_SKIPS

  constructor(config: GameConfig) {
    this.#config = config
    this.#durationMs = config.duration * 1000
    this.#queue = buildQueue(config.questions, config.filter, config.rng, config.category)
  }

  /** Starts the clock and shows the first question. Does nothing if already started. */
  start(): void {
    if (this.#phase.status !== 'ready') return
    this.#startedAt = this.#config.now()
    this.#present()
  }

  /** Ends the game if time is up. Returns the (possibly new) status. */
  tick(): GameStatus {
    this.#expireIfTimeUp()
    return this.#phase.status
  }

  answer(chosenIndex: number): Outcome {
    const phase = this.#phase
    if (phase.status !== 'question') return IGNORED
    if (this.#expireIfTimeUp()) return EXPIRED
    const { question } = phase
    if (
      !Number.isInteger(chosenIndex) ||
      chosenIndex < 0 ||
      chosenIndex >= question.options.length
    ) {
      return IGNORED
    }

    const correct = chosenIndex === question.correctIndex
    let points = 0
    let bonus = 0
    let penalty = 0
    if (correct) {
      this.#streak += 1
      this.#bestStreak = Math.max(this.#bestStreak, this.#streak)
      points = POINTS_BY_DIFFICULTY[question.difficulty]
      bonus = COMBO_BONUSES[this.#streak] ?? 0
      this.#score += points + bonus
    } else {
      this.#streak = 0
      penalty = this.#deduct(WRONG_PENALTY_BY_DIFFICULTY[question.difficulty])
    }

    const result: 'correct' | 'wrong' = correct ? 'correct' : 'wrong'
    this.#record(phase, result, chosenIndex, points, bonus, penalty)
    return {
      kind: 'answered',
      result,
      chosenIndex,
      correctIndex: question.correctIndex,
      points,
      bonus,
      penalty,
      streak: this.#streak,
    }
  }

  /** Skips the current question. The combo is kept. Costs points once free skips run out. */
  skip(): Outcome {
    const phase = this.#phase
    if (phase.status !== 'question') return IGNORED
    if (this.#expireIfTimeUp()) return EXPIRED

    const free = this.#freeSkipsLeft > 0
    if (free) this.#freeSkipsLeft -= 1
    const penalty = this.#deduct(free ? 0 : PAID_SKIP_PENALTY)
    this.#record(phase, 'skipped', null, 0, 0, penalty)
    return { kind: 'skipped', free, penalty, freeSkipsLeft: this.#freeSkipsLeft }
  }

  /** Moves from `feedback` to the next question (or ends the game). */
  next(): GameStatus {
    if (this.#phase.status === 'feedback' && !this.#expireIfTimeUp()) this.#present()
    return this.#phase.status
  }

  remainingMs(): number {
    if (this.#phase.status === 'ready') return this.#durationMs
    return Math.max(0, this.#durationMs - (this.#config.now() - this.#startedAt))
  }

  /** Handled questions in order. Safe to read at any time. */
  results(): readonly QuestionResult[] {
    return [...this.#results]
  }

  /** The end-of-game report, or null while the game is still running. */
  report(): GameReport | null {
    const phase = this.#phase
    if (phase.status !== 'finished') return null
    return buildReport({
      results: this.#results,
      bestStreak: this.#bestStreak,
      finishReason: phase.reason,
      duration: this.#config.duration,
      filter: this.#config.filter,
    })
  }

  snapshot(): GameSnapshot {
    const phase = this.#phase
    const count = (kind: ResultKind) => this.#results.filter((r) => r.result === kind).length
    return {
      status: phase.status,
      current: phase.status === 'question' ? phase.question : null,
      score: this.#score,
      streak: this.#streak,
      bestStreak: this.#bestStreak,
      correct: count('correct'),
      wrong: count('wrong'),
      skipped: count('skipped'),
      freeSkipsLeft: this.#freeSkipsLeft,
      skipCost: this.#freeSkipsLeft > 0 ? 0 : PAID_SKIP_PENALTY,
      remainingMs: this.remainingMs(),
      finishReason: phase.status === 'finished' ? phase.reason : null,
    }
  }

  #present(): void {
    const question = this.#queue[this.#nextIndex]
    if (question === undefined) {
      this.#phase = { status: 'finished', reason: 'exhausted' }
      return
    }
    this.#nextIndex += 1
    this.#phase = { status: 'question', question, presentedAt: this.#config.now() }
  }

  /** Finishes the game when the clock has run out. Returns true if it just did. */
  #expireIfTimeUp(): boolean {
    const status = this.#phase.status
    if (status === 'ready' || status === 'finished' || this.remainingMs() > 0) return false
    this.#phase = { status: 'finished', reason: 'time' }
    return true
  }

  /** Deducts up to `requested` points but never takes the score below zero. */
  #deduct(requested: number): number {
    const applied = Math.min(requested, this.#score)
    this.#score -= applied
    return applied
  }

  #record(
    phase: Extract<Phase, { status: 'question' }>,
    result: ResultKind,
    chosenIndex: number | null,
    points: number,
    bonus: number,
    penalty: number,
  ): void {
    this.#results.push({
      question: phase.question,
      result,
      chosenIndex,
      timeMs: this.#config.now() - phase.presentedAt,
      points,
      bonus,
      penalty,
      streakAfter: this.#streak,
    })
    this.#phase = { status: 'feedback' }
  }
}
