import { onScopeDispose, ref, shallowRef } from 'vue'
import { Game } from '~~/core'
import type {
  Category,
  DifficultyFilter,
  Duration,
  GameReport,
  GameSnapshot,
  PlayableQuestion,
  Question,
  Rng,
} from '~~/core'

/** What the UI shows for the ~600 ms after an answer. */
export interface AnswerFeedback {
  readonly chosenIndex: number
  readonly correctIndex: number
  readonly correct: boolean
  readonly points: number
  readonly bonus: number
  readonly penalty: number
}

export interface SessionEffects {
  onCorrect?: () => void
  onWrong?: () => void
  /** Points the skip cost (0 while free skips remain). */
  onSkip?: (penalty: number) => void
  onFinish?: (report: GameReport) => void
}

export interface SessionOptions {
  questions: readonly Question[]
  filter: DifficultyFilter
  duration: Duration
  /** Only serve questions of this category (arcade mode). */
  category?: Category
  effects?: SessionEffects
  rng?: Rng
  /** Monotonic clock in ms. Defaults to `performance.now`. */
  now?: () => number
  /** How long the feedback stays on screen before the next question. */
  feedbackMs?: number
  /** How often the countdown refreshes. */
  tickMs?: number
}

/**
 * Connects the framework-agnostic `Game` to Vue: reactive state, the countdown timer
 * and the short feedback pause after each answer. All game rules stay in `core/`.
 */
export function useGameSession(options: SessionOptions) {
  const feedbackMs = options.feedbackMs ?? 600
  const tickMs = options.tickMs ?? 100
  const game = new Game({
    questions: options.questions,
    filter: options.filter,
    duration: options.duration,
    ...(options.category ? { category: options.category } : {}),
    rng: options.rng ?? Math.random,
    now: options.now ?? (() => performance.now()),
  })

  const snapshot = shallowRef<GameSnapshot>(game.snapshot())
  // The question on screen. The core has no "current" question while feedback is
  // showing, but the card must keep displaying it, so it is tracked here.
  const question = shallowRef<PlayableQuestion | null>(null)
  const remainingMs = ref(game.remainingMs())
  const feedback = shallowRef<AnswerFeedback | null>(null)
  const report = shallowRef<GameReport | null>(null)

  let tickTimer: ReturnType<typeof setInterval> | undefined
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined

  function refresh(): void {
    snapshot.value = game.snapshot()
    remainingMs.value = snapshot.value.remainingMs
    if (snapshot.value.current) question.value = snapshot.value.current
  }

  function stopTimers(): void {
    clearInterval(tickTimer)
    clearTimeout(feedbackTimer)
    tickTimer = undefined
    feedbackTimer = undefined
  }

  /** Ends the session once: freezes the state and builds the report. */
  function finalize(): void {
    if (report.value !== null) return
    stopTimers()
    feedback.value = null
    refresh()
    question.value = null
    const finished = game.report()
    report.value = finished
    if (finished) options.effects?.onFinish?.(finished)
  }

  function onTick(): void {
    game.tick()
    remainingMs.value = game.remainingMs()
    // If the clock ran out while the feedback is still showing, let it finish first;
    // the feedback timer will end the game right after.
    if (game.snapshot().status === 'finished' && feedback.value === null) finalize()
  }

  function start(): void {
    game.start()
    refresh()
    if (snapshot.value.status === 'finished') {
      finalize()
      return
    }
    tickTimer = setInterval(onTick, tickMs)
  }

  function advance(): void {
    game.next()
    refresh()
    if (snapshot.value.status === 'finished') finalize()
  }

  function answer(index: number): void {
    const outcome = game.answer(index)
    if (outcome.kind === 'expired') return finalize()
    if (outcome.kind !== 'answered') return

    const correct = outcome.result === 'correct'
    feedback.value = {
      chosenIndex: outcome.chosenIndex,
      correctIndex: outcome.correctIndex,
      correct,
      points: outcome.points,
      bonus: outcome.bonus,
      penalty: outcome.penalty,
    }
    refresh()
    if (correct) options.effects?.onCorrect?.()
    else options.effects?.onWrong?.()

    feedbackTimer = setTimeout(() => {
      feedback.value = null
      advance()
    }, feedbackMs)
  }

  function skip(): void {
    const outcome = game.skip()
    if (outcome.kind === 'expired') return finalize()
    if (outcome.kind !== 'skipped') return
    options.effects?.onSkip?.(outcome.penalty)
    advance()
  }

  onScopeDispose(stopTimers)

  return {
    snapshot,
    question,
    remainingMs,
    feedback,
    report,
    start,
    answer,
    skip,
    dispose: stopTimers,
  }
}

export type GameSession = ReturnType<typeof useGameSession>
