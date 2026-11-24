import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useGameSession } from '../../app/composables/useGameSession'
import type { SessionOptions } from '../../app/composables/useGameSession'
import { mulberry32 } from '../../core'
import { makeBank, makeQuestion } from '../core/helpers'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function setup(overrides: Partial<SessionOptions> = {}) {
  const effects = {
    onCorrect: vi.fn(),
    onWrong: vi.fn(),
    onSkip: vi.fn(),
    onFinish: vi.fn(),
  }
  const scope = effectScope()
  const session = scope.run(() =>
    useGameSession({
      questions: makeBank('medio', 6),
      filter: 'Aleatorio',
      duration: 60,
      rng: mulberry32(3),
      now: () => Date.now(),
      effects,
      ...overrides,
    }),
  )!
  session.start()
  return { session, effects, scope }
}

const rightIndex = (s: ReturnType<typeof setup>['session']) => s.question.value!.correctIndex
const wrongIndex = (s: ReturnType<typeof setup>['session']) => (rightIndex(s) + 1) % 4

describe('useGameSession', () => {
  it('presents the first question when started', () => {
    const { session } = setup()
    expect(session.snapshot.value.status).toBe('question')
    expect(session.question.value).not.toBeNull()
    expect(session.remainingMs.value).toBe(60_000)
    expect(session.report.value).toBeNull()
  })

  it('shows correct feedback, keeps the question for ~600 ms, then moves on', () => {
    const { session, effects } = setup()
    const first = session.question.value

    session.answer(rightIndex(session))

    expect(session.feedback.value).toMatchObject({ correct: true, points: 7, bonus: 0 })
    expect(effects.onCorrect).toHaveBeenCalledOnce()
    expect(session.question.value).toBe(first) // still on screen while the feedback shows
    expect(session.snapshot.value.score).toBe(7)

    vi.advanceTimersByTime(599)
    expect(session.feedback.value).not.toBeNull()
    vi.advanceTimersByTime(1)
    expect(session.feedback.value).toBeNull()
    expect(session.question.value).not.toBe(first)
  })

  it('reports the right answer on a wrong choice', () => {
    const { session, effects } = setup()
    const right = rightIndex(session)
    const wrong = wrongIndex(session)

    session.answer(wrong)

    expect(session.feedback.value).toMatchObject({
      correct: false,
      chosenIndex: wrong,
      correctIndex: right,
    })
    expect(effects.onWrong).toHaveBeenCalledOnce()
  })

  it('ignores further answers and skips while the feedback is showing', () => {
    const { session, effects } = setup()
    session.answer(rightIndex(session))
    session.answer(wrongIndex(session))
    session.skip()

    expect(effects.onCorrect).toHaveBeenCalledOnce()
    expect(effects.onWrong).not.toHaveBeenCalled()
    expect(effects.onSkip).not.toHaveBeenCalled()
    expect(session.snapshot.value.score).toBe(7)
  })

  it('skips straight to the next question with no feedback pause', () => {
    const { session, effects } = setup()
    const first = session.question.value

    session.skip()

    expect(effects.onSkip).toHaveBeenCalledOnce()
    expect(session.feedback.value).toBeNull()
    expect(session.question.value).not.toBe(first)
    expect(session.snapshot.value.freeSkipsLeft).toBe(1)
  })

  it('counts the clock down and ends the game, discarding the open question', () => {
    const { session, effects } = setup()
    session.answer(rightIndex(session))
    vi.advanceTimersByTime(600)

    vi.advanceTimersByTime(10_000)
    expect(session.remainingMs.value).toBeLessThan(50_000)
    expect(session.report.value).toBeNull()

    vi.advanceTimersByTime(60_000)
    expect(session.report.value).not.toBeNull()
    expect(session.report.value?.finishReason).toBe('time')
    expect(session.report.value?.rows).toHaveLength(1) // only the answered question
    expect(session.question.value).toBeNull()
    expect(effects.onFinish).toHaveBeenCalledOnce()
  })

  it('lets the last feedback finish before ending when the clock runs out during it', () => {
    const { session, effects } = setup()
    vi.advanceTimersByTime(59_900)
    session.answer(rightIndex(session)) // answered in time

    vi.advanceTimersByTime(200) // clock hits zero while feedback is showing
    expect(session.report.value).toBeNull()
    expect(session.feedback.value).not.toBeNull()

    vi.advanceTimersByTime(500) // feedback done: now the game ends
    expect(session.report.value?.rows).toHaveLength(1)
    expect(session.report.value?.points).toBe(7)
    expect(effects.onFinish).toHaveBeenCalledOnce()
  })

  it('ends immediately when an answer or skip arrives after the time is up', () => {
    const answered = setup()
    vi.setSystemTime(Date.now() + 70_000) // jump past the end without firing the interval
    answered.session.answer(0)
    expect(answered.session.report.value?.rows).toHaveLength(0)
    expect(answered.effects.onCorrect).not.toHaveBeenCalled()

    const skipped = setup()
    vi.setSystemTime(Date.now() + 70_000)
    skipped.session.skip()
    expect(skipped.session.report.value?.rows).toHaveLength(0)
    expect(skipped.effects.onSkip).not.toHaveBeenCalled()
  })

  it('only presents questions of the chosen category', () => {
    const questions = [
      ...makeBank('medio', 6).map((q) => ({ ...q, category: 'Deportes' as const })),
      ...makeBank('fácil', 6).map((q) => ({
        ...q,
        id: `otra-${q.id}`,
        category: 'Ciencias' as const,
      })),
    ]
    for (let seed = 1; seed <= 5; seed++) {
      const { session, scope } = setup({ questions, category: 'Ciencias', rng: mulberry32(seed) })
      expect(session.question.value?.category).toBe('Ciencias')
      scope.stop()
    }
  })

  it('finishes right away when the chosen category has no questions', () => {
    const { session, effects } = setup({
      questions: [makeQuestion({ category: 'Deportes' })],
      category: 'Ciencias',
    })
    expect(session.snapshot.value.status).toBe('finished')
    expect(effects.onFinish).toHaveBeenCalledOnce()
  })

  it('finishes right away when no question matches', () => {
    const { session, effects } = setup({ questions: makeBank('medio', 3), filter: 'Difícil' })

    expect(session.report.value?.finishReason).toBe('exhausted')
    expect(effects.onFinish).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ends after the last question when the bank runs out', () => {
    const { session } = setup({ questions: makeBank('medio', 2) })
    session.answer(rightIndex(session))
    vi.advanceTimersByTime(600)
    session.answer(rightIndex(session))
    vi.advanceTimersByTime(600)

    expect(session.report.value?.finishReason).toBe('exhausted')
    expect(session.report.value?.rows).toHaveLength(2)
  })

  it('stops all timers on dispose', () => {
    const { session } = setup()
    session.dispose()
    vi.advanceTimersByTime(120_000)
    expect(session.report.value).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stops its timers when the owning scope is disposed', () => {
    const { scope } = setup()
    scope.stop()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('only reports the finish once', () => {
    const { session, effects } = setup()
    vi.advanceTimersByTime(70_000)
    session.answer(0)
    session.skip()
    vi.advanceTimersByTime(5_000)
    expect(effects.onFinish).toHaveBeenCalledOnce()
  })

  it('works without effect callbacks', () => {
    const { session } = setup({ effects: undefined })
    session.answer(rightIndex(session))
    session.answer(wrongIndex(session))
    vi.advanceTimersByTime(600)
    session.skip()
    vi.advanceTimersByTime(70_000)
    expect(session.report.value).not.toBeNull()
  })

  describe('memory of shown questions', () => {
    /** Fakes the page going to the background or coming back, and fires the event. */
    function setVisibility(state: 'hidden' | 'visible'): void {
      Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    }

    afterEach(() => {
      Reflect.deleteProperty(document, 'visibilityState')
    })

    it('reports the shown questions once when the game ends', () => {
      const bank = makeBank('medio', 2)
      const onShown = vi.fn()
      const { session, scope } = setup({ questions: bank, onShown })
      session.answer(rightIndex(session))
      vi.advanceTimersByTime(600)
      session.answer(rightIndex(session))
      vi.advanceTimersByTime(600)

      expect(session.report.value?.finishReason).toBe('exhausted')
      expect(onShown).toHaveBeenCalledOnce()
      expect([...(onShown.mock.calls[0]?.[0] as string[])].sort()).toEqual(
        bank.map((q) => q.id).sort(),
      )

      scope.stop() // leaving the screen after the end must not count the game twice
      expect(onShown).toHaveBeenCalledOnce()
    })

    it('reports when the player leaves mid-game, including the question on screen', () => {
      const onShown = vi.fn()
      const { session, scope } = setup({ onShown })
      session.answer(rightIndex(session))
      vi.advanceTimersByTime(600) // the second question is now on screen
      expect(onShown).not.toHaveBeenCalled()

      scope.stop()

      expect(onShown).toHaveBeenCalledOnce()
      expect(onShown.mock.calls[0]?.[0]).toHaveLength(2)
    })

    it('reports nothing when no question was shown', () => {
      const onShown = vi.fn()
      const scope = effectScope()
      scope.run(() =>
        useGameSession({
          questions: makeBank('medio', 3),
          filter: 'Aleatorio',
          duration: 60,
          rng: mulberry32(1),
          now: () => Date.now(),
          onShown,
        }),
      )
      scope.stop()
      expect(onShown).not.toHaveBeenCalled()
    })

    it('saves on page hide and then only reports the questions shown afterwards', () => {
      const onShown = vi.fn()
      const { session, scope } = setup({ onShown })
      session.answer(rightIndex(session))
      vi.advanceTimersByTime(600) // two questions presented so far

      window.dispatchEvent(new Event('pagehide'))
      expect(onShown).toHaveBeenCalledOnce()
      expect(onShown.mock.calls[0]?.[0]).toHaveLength(2)

      window.dispatchEvent(new Event('pagehide')) // nothing new since the last save
      expect(onShown).toHaveBeenCalledOnce()

      session.answer(rightIndex(session))
      vi.advanceTimersByTime(600) // a third question is on screen
      scope.stop()

      expect(onShown).toHaveBeenCalledTimes(2)
      const all = onShown.mock.calls.flatMap((call) => call[0] as string[])
      expect(all).toHaveLength(3)
      expect(new Set(all).size).toBe(3) // no question counted twice

      window.dispatchEvent(new Event('pagehide')) // the listener is gone with the scope
      expect(onShown).toHaveBeenCalledTimes(2)
    })

    it('saves when the tab goes to the background, but not when it comes back', () => {
      const onShown = vi.fn()
      const { scope } = setup({ onShown })

      setVisibility('visible')
      expect(onShown).not.toHaveBeenCalled()

      setVisibility('hidden')
      expect(onShown).toHaveBeenCalledOnce()
      expect(onShown.mock.calls[0]?.[0]).toHaveLength(1) // the question on screen

      scope.stop()
      expect(onShown).toHaveBeenCalledOnce() // nothing new to report
    })

    it('never lets a failing save stop the game from ending or the screen from closing', () => {
      const onShown = vi.fn(() => {
        throw new Error('storage exploded')
      })
      const finished = setup({ questions: makeBank('medio', 2), onShown })
      finished.session.answer(rightIndex(finished.session))
      vi.advanceTimersByTime(600)
      finished.session.answer(rightIndex(finished.session))
      vi.advanceTimersByTime(600)
      expect(finished.session.report.value?.finishReason).toBe('exhausted')
      expect(() => finished.scope.stop()).not.toThrow()

      const left = setup({ onShown })
      expect(() => left.scope.stop()).not.toThrow()
    })

    it('uses the memory to choose the first question', () => {
      const bank = makeBank('medio', 6)
      const seen = new Map(bank.slice(1).map((q) => [q.id, 3] as const))
      const { session, scope } = setup({
        questions: bank,
        category: 'Historia y Geografía',
        seen,
      })
      expect(session.question.value?.id).toBe((bank[0] as { id: string }).id)
      scope.stop()
    })
  })

  it('stops the clock while paused and carries on from the same point on resume', () => {
    const { session } = setup()
    vi.advanceTimersByTime(2000)
    session.pause()
    vi.advanceTimersByTime(30_000)
    // Nothing moves while paused, however long the report takes.
    expect(session.remainingMs.value).toBe(58_000)
    session.resume()
    vi.advanceTimersByTime(1000)
    expect(session.remainingMs.value).toBe(57_000)
  })

  it('ignores a resume that has no pause to end, and a pause before the game starts', () => {
    const { session } = setup()
    session.resume()
    vi.advanceTimersByTime(500)
    expect(session.remainingMs.value).toBeLessThan(60_000)
    expect(session.report.value).toBeNull()
  })
})
