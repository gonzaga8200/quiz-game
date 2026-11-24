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
  /** How many times this device has shown each question; the least shown are served first. */
  seen?: ReadonlyMap<string, number>
  /**
   * Called with the ids of the questions presented since the previous call: when the page is
   * hidden or closed, when the game ends and when the screen is left. A question is never
   * reported twice, and it is not called when there is nothing new.
   */
  onShown?: (ids: readonly string[]) => void
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

  // The game's clock. A pause freezes it: while paused it reads the same instant, and resuming
  // subtracts the paused time, so a report or a pause never costs the player seconds.
  const readClock = options.now ?? (() => performance.now())
  let pausedTotal = 0
  let pausedAt: number | null = null
  const clock = (): number => (pausedAt ?? readClock()) - pausedTotal

  const game = new Game({
    questions: options.questions,
    filter: options.filter,
    duration: options.duration,
    ...(options.category ? { category: options.category } : {}),
    ...(options.seen ? { seen: options.seen } : {}),
    rng: options.rng ?? Math.random,
    now: clock,
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

  let reportedCount = 0

  /**
   * Hands `onShown` the questions presented since the last report, if any. It can run several
   * times (page hidden, game over, screen left) and never reports a question twice. Saving the
   * memory must never get in the way of the game, so a failing callback is swallowed.
   */
  function reportShown(): void {
    const ids = game.shownIds().slice(reportedCount)
    if (ids.length === 0) return
    reportedCount += ids.length
    try {
      options.onShown?.(ids)
    } catch {
      // The memory is a nicety: losing a save is better than breaking the screen.
    }
  }

  /** Ends the session once: freezes the state and builds the report. */
  function finalize(): void {
    if (report.value !== null) return
    stopTimers()
    reportShown()
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

  let started = false

  function start(): void {
    started = true
    game.start()
    refresh()
    if (snapshot.value.status === 'finished') {
      finalize()
      return
    }
    tickTimer = setInterval(onTick, tickMs)
  }

  /** Stops the clock, e.g. while a report is open. Nothing is lost: `resume` carries on. */
  function pause(): void {
    if (!started || pausedAt !== null || report.value !== null) return
    pausedAt = readClock()
    clearInterval(tickTimer)
    tickTimer = undefined
  }

  function resume(): void {
    if (pausedAt === null) return
    pausedTotal += readClock() - pausedAt
    pausedAt = null
    if (started && report.value === null && tickTimer === undefined) {
      tickTimer = setInterval(onTick, tickMs)
    }
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

  // Leaving the screen mid-game also counts what was shown. A reload, a closed tab or a phone
  // suspending the app never dispose the scope, so the page being hidden saves it too.
  const onPageHide = (): void => reportShown()
  const onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') reportShown()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  onScopeDispose(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
    stopTimers()
    reportShown()
  })

  return {
    snapshot,
    question,
    remainingMs,
    feedback,
    report,
    start,
    answer,
    skip,
    pause,
    resume,
    dispose: stopTimers,
  }
}

export type GameSession = ReturnType<typeof useGameSession>
