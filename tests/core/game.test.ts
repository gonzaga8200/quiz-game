import { describe, expect, it } from 'vitest'
import {
  COMBO_BONUSES,
  DIFFICULTIES,
  FREE_SKIPS,
  MAX_POINTS_PER_CORRECT,
  POINTS_BY_DIFFICULTY,
  WRONG_PENALTY_BY_DIFFICULTY,
} from '../../core/constants'
import type { Difficulty } from '../../core/constants'
import { Game } from '../../core/game'
import { mulberry32 } from '../../core/rng'
import {
  answerRight,
  answerWrong,
  asAnswered,
  asSkipped,
  current,
  makeBank,
  makeClock,
  makeQuestion,
  rightIndex,
  skipOne,
  startGame,
  wrongIndex,
} from './helpers'

describe('points per difficulty', () => {
  it.each(DIFFICULTIES)('awards the table points for a correct "%s" answer', (difficulty) => {
    const { game } = startGame(makeBank(difficulty, 2))
    const outcome = asAnswered(game.answer(rightIndex(game)))

    expect(outcome.result).toBe('correct')
    expect(outcome.points).toBe(POINTS_BY_DIFFICULTY[difficulty])
    expect(outcome.bonus).toBe(0)
    expect(game.snapshot().score).toBe(POINTS_BY_DIFFICULTY[difficulty])
  })

  it('uses the documented table: 3, 5, 7, 10, 15', () => {
    expect(DIFFICULTIES.map((d) => POINTS_BY_DIFFICULTY[d])).toEqual([3, 5, 7, 10, 15])
  })
})

describe('penalties for a wrong answer', () => {
  const cases: readonly [Difficulty, number][] = [
    ['muy fácil', 2],
    ['fácil', 1],
    ['medio', 0],
    ['difícil', 0],
    ['muy difícil', 0],
  ]

  it.each(cases)('"%s" costs %i points', (difficulty, penalty) => {
    const { game } = startGame(makeBank(difficulty, 3))
    answerRight(game)
    const before = game.snapshot().score
    const outcome = asAnswered(game.answer(wrongIndex(game)))

    expect(outcome.result).toBe('wrong')
    expect(outcome.penalty).toBe(penalty)
    expect(outcome.points).toBe(0)
    expect(game.snapshot().score).toBe(before - penalty)
    expect(WRONG_PENALTY_BY_DIFFICULTY[difficulty]).toBe(penalty)
  })

  it('reports the wrong answer with the correct index so the UI can highlight it', () => {
    const { game } = startGame(makeBank('medio', 2))
    const question = current(game)
    const outcome = asAnswered(game.answer(wrongIndex(game)))

    expect(outcome.correctIndex).toBe(question.correctIndex)
    expect(outcome.chosenIndex).not.toBe(question.correctIndex)
  })
})

describe('score floor', () => {
  it('never goes below 0 on a wrong answer', () => {
    const { game } = startGame(makeBank('muy fácil', 3))
    const outcome = asAnswered(game.answer(wrongIndex(game)))

    expect(outcome.penalty).toBe(0) // nothing to take away from 0
    expect(game.snapshot().score).toBe(0)
  })

  it('applies only the part of the penalty the score can cover', () => {
    // 'fácil' pays 5; a wrong "muy fácil" would cost 2, so mix: earn 3, lose at most 2
    const { game } = startGame(makeBank('muy fácil', 4))
    answerRight(game) // +3
    answerWrong(game) // -2 -> 1
    expect(game.snapshot().score).toBe(1)
    const outcome = asAnswered(game.answer(wrongIndex(game))) // -2 but only 1 available
    expect(outcome.penalty).toBe(1)
    expect(game.snapshot().score).toBe(0)
  })

  it('keeps the breakdown honest: effective penalties only', () => {
    const { game } = startGame(makeBank('muy fácil', 4))
    answerRight(game)
    answerWrong(game)
    answerWrong(game)
    game.tick()
    const results = game.results()
    const earned = results.reduce((t, r) => t + r.points + r.bonus, 0)
    const lost = results.reduce((t, r) => t + r.penalty, 0)
    expect(earned - lost).toBe(game.snapshot().score)
  })
})

describe('combo bonuses', () => {
  it('awards +2 at 3, +4 at 5 and +8 at 10, each once, and nothing in between', () => {
    const { game } = startGame(makeBank('medio', 14))
    const bonuses = Array.from({ length: 12 }, () => asAnswered(answerRight(game)).bonus)

    // streaks 1..12
    expect(bonuses).toEqual([0, 0, 2, 0, 4, 0, 0, 0, 0, 8, 0, 0])
    expect(game.snapshot().score).toBe(12 * 7 + 2 + 4 + 8)
    expect(game.snapshot().streak).toBe(12)
  })

  it('matches the documented table', () => {
    expect(COMBO_BONUSES).toEqual({ 3: 2, 5: 4, 10: 8 })
  })

  it('resets the streak on a wrong answer and lets the bonus be earned again', () => {
    const { game } = startGame(makeBank('medio', 12))
    answerRight(game)
    answerRight(game)
    expect(asAnswered(answerRight(game)).bonus).toBe(2) // streak 3
    expect(asAnswered(answerWrong(game)).streak).toBe(0)
    answerRight(game)
    answerRight(game)
    const again = asAnswered(answerRight(game))
    expect(again.streak).toBe(3)
    expect(again.bonus).toBe(2)
  })

  it('tracks the best streak', () => {
    const { game } = startGame(makeBank('medio', 12))
    answerRight(game)
    answerRight(game)
    answerRight(game)
    answerWrong(game)
    answerRight(game)
    expect(game.snapshot().bestStreak).toBe(3)
    expect(game.snapshot().streak).toBe(1)
  })

  it('never lets a bonus exceed the per-answer bound used by the ranking rules', () => {
    // Best case is a clean streak of 10: base 15 + 14 bonus over 10 answers.
    const bonusUpTo = (length: number) =>
      Object.entries(COMBO_BONUSES)
        .filter(([streak]) => Number(streak) <= length)
        .reduce((total, [, bonus]) => total + bonus, 0)
    const worstRatio = Math.max(...Array.from({ length: 60 }, (_, i) => bonusUpTo(i + 1) / (i + 1)))

    expect(15 + worstRatio).toBeLessThanOrEqual(MAX_POINTS_PER_CORRECT)
  })
})

describe('skipping', () => {
  it('gives two free skips, then charges 1 point each', () => {
    const { game } = startGame(makeBank('medio', 10))
    answerRight(game) // 7 points in the bank
    expect(game.snapshot().freeSkipsLeft).toBe(FREE_SKIPS)
    expect(game.snapshot().skipCost).toBe(0)

    const first = asSkipped(skipOne(game))
    expect(first).toMatchObject({ free: true, penalty: 0, freeSkipsLeft: 1 })
    const second = asSkipped(skipOne(game))
    expect(second).toMatchObject({ free: true, penalty: 0, freeSkipsLeft: 0 })
    expect(game.snapshot().skipCost).toBe(1)

    const third = asSkipped(skipOne(game))
    expect(third).toMatchObject({ free: false, penalty: 1, freeSkipsLeft: 0 })
    expect(game.snapshot().score).toBe(6)
  })

  it('does not reset the combo', () => {
    const { game } = startGame(makeBank('medio', 10))
    answerRight(game)
    answerRight(game)
    skipOne(game)
    expect(game.snapshot().streak).toBe(2)
    expect(asAnswered(answerRight(game)).bonus).toBe(2) // third correct in a row, skip ignored
  })

  it('counts a skipped question as skipped, not wrong', () => {
    const { game } = startGame(makeBank('medio', 5))
    skipOne(game)
    const { skipped, wrong, correct } = game.snapshot()
    expect({ skipped, wrong, correct }).toEqual({ skipped: 1, wrong: 0, correct: 0 })
    expect(game.results()[0]).toMatchObject({ result: 'skipped', chosenIndex: null })
  })

  it('never takes the score below 0 when a paid skip has nothing to deduct', () => {
    const { game } = startGame(makeBank('medio', 6))
    skipOne(game)
    skipOne(game)
    const paid = asSkipped(skipOne(game)) // score is 0, skip costs 1 -> effective 0
    expect(paid.free).toBe(false)
    expect(paid.penalty).toBe(0)
    expect(game.snapshot().score).toBe(0)
  })
})

describe('timer', () => {
  it('reports the full time before the game starts', () => {
    const clock = makeClock(500)
    const game = new Game({
      questions: makeBank('medio', 2),
      filter: 'Aleatorio',
      duration: 120,
      rng: mulberry32(1),
      now: clock.now,
    })
    expect(game.snapshot().status).toBe('ready')
    expect(game.remainingMs()).toBe(120_000)
    expect(game.tick()).toBe('ready') // a game that has not started cannot expire
    clock.advance(999_999)
    expect(game.tick()).toBe('ready')
  })

  it('counts down and ends the game when it reaches zero', () => {
    const { game, clock } = startGame(makeBank('medio', 5))
    clock.advance(59_999)
    expect(game.remainingMs()).toBe(1)
    expect(game.tick()).toBe('question')

    clock.advance(1)
    expect(game.remainingMs()).toBe(0)
    expect(game.tick()).toBe('finished')
    expect(game.snapshot()).toMatchObject({
      status: 'finished',
      finishReason: 'time',
      current: null,
    })
  })

  it('stays at zero and never goes negative', () => {
    const { game, clock } = startGame(makeBank('medio', 5))
    clock.advance(500_000)
    expect(game.remainingMs()).toBe(0)
    expect(game.tick()).toBe('finished')
    expect(game.tick()).toBe('finished') // already finished: unchanged
  })

  it('discards the question in flight when time runs out (answer)', () => {
    const { game, clock } = startGame(makeBank('medio', 5))
    const scoreBefore = game.snapshot().score
    clock.advance(60_000)

    expect(game.answer(0)).toEqual({ kind: 'expired' })
    expect(game.results()).toHaveLength(0) // not counted
    expect(game.snapshot().score).toBe(scoreBefore)
    expect(game.snapshot().status).toBe('finished')
  })

  it('discards the question in flight when time runs out (skip)', () => {
    const { game, clock } = startGame(makeBank('medio', 5))
    clock.advance(60_000)

    expect(game.skip()).toEqual({ kind: 'expired' })
    expect(game.results()).toHaveLength(0)
    expect(game.snapshot().freeSkipsLeft).toBe(FREE_SKIPS) // the skip was not used
  })

  it('discards it as well when only tick() notices the end', () => {
    const { game, clock } = startGame(makeBank('medio', 5))
    clock.advance(60_000)
    game.tick()
    expect(game.snapshot().current).toBeNull()
    expect(game.results()).toHaveLength(0)
    expect(game.answer(0)).toEqual({ kind: 'ignored' })
  })

  it('keeps the clock running during feedback and keeps the answer given before the end', () => {
    const { game, clock } = startGame(makeBank('medio', 5))
    clock.set(59_900)
    const outcome = asAnswered(game.answer(rightIndex(game))) // answered in time
    expect(outcome.result).toBe('correct')

    clock.set(60_500) // feedback animation ran past the end
    expect(game.next()).toBe('finished')
    expect(game.snapshot().finishReason).toBe('time')
    expect(game.results()).toHaveLength(1) // the answered question still counts
    expect(game.snapshot().score).toBe(7)
  })

  it('measures time spent per question from presentation to answer', () => {
    const { game, clock } = startGame(makeBank('medio', 5))
    clock.set(3_500)
    game.answer(rightIndex(game))
    clock.set(4_100) // 600 ms of feedback
    game.next()
    clock.set(6_100)
    game.skip()

    expect(game.results().map((r) => r.timeMs)).toEqual([3_500, 2_000])
  })
})

describe('end of the question bank', () => {
  it('finishes as "exhausted" after the last question', () => {
    const { game } = startGame(makeBank('medio', 2))
    answerRight(game)
    answerRight(game)

    expect(game.snapshot()).toMatchObject({ status: 'finished', finishReason: 'exhausted' })
    expect(game.report()?.finishReason).toBe('exhausted')
  })

  it('finishes immediately when nothing matches the filter', () => {
    const { game } = startGame(makeBank('medio', 3), { filter: 'Difícil' })
    expect(game.snapshot()).toMatchObject({ status: 'finished', finishReason: 'exhausted' })
    expect(game.report()?.points).toBe(0)
  })
})

describe('no repeated questions', () => {
  it('shows every question exactly once, even with duplicate ids in the bank', () => {
    const bank = [...makeBank('medio', 12), ...makeBank('medio', 12)] // every id twice
    const { game } = startGame(bank)
    const seen: string[] = []
    while (game.snapshot().status === 'question') {
      seen.push(current(game).id)
      answerRight(game)
    }

    expect(seen).toHaveLength(12)
    expect(new Set(seen).size).toBe(12)
  })

  it('skipped questions do not come back either', () => {
    const { game } = startGame(makeBank('medio', 6))
    const first = current(game).id
    skipOne(game)
    const rest: string[] = []
    while (game.snapshot().status === 'question') {
      rest.push(current(game).id)
      answerRight(game)
    }
    expect(rest).not.toContain(first)
  })
})

describe('calls that do not apply are ignored', () => {
  it('ignores answers before start and during feedback (double taps)', () => {
    const clock = makeClock()
    const game = new Game({
      questions: makeBank('medio', 3),
      filter: 'Aleatorio',
      duration: 60,
      rng: mulberry32(2),
      now: clock.now,
    })
    expect(game.answer(0)).toEqual({ kind: 'ignored' })
    expect(game.skip()).toEqual({ kind: 'ignored' })
    expect(game.next()).toBe('ready')

    game.start()
    game.answer(rightIndex(game))
    expect(game.answer(0)).toEqual({ kind: 'ignored' })
    expect(game.skip()).toEqual({ kind: 'ignored' })
    expect(game.results()).toHaveLength(1)
  })

  it.each([-1, 4, 1.5, Number.NaN])('ignores the invalid option index %s', (index) => {
    const { game } = startGame(makeBank('medio', 3))
    expect(game.answer(index)).toEqual({ kind: 'ignored' })
    expect(game.snapshot().status).toBe('question') // still waiting for a real answer
  })

  it('does not skip ahead when next() is called while a question is showing', () => {
    const { game } = startGame(makeBank('medio', 3))
    const before = current(game).id
    expect(game.next()).toBe('question')
    expect(current(game).id).toBe(before)
  })

  it('does not restart when start() is called twice', () => {
    const { game, clock } = startGame(makeBank('medio', 3))
    clock.advance(10_000)
    game.start()
    expect(game.remainingMs()).toBe(50_000)
  })
})

describe('snapshot and report', () => {
  it('has no report while the game is running', () => {
    const { game } = startGame(makeBank('medio', 3))
    expect(game.report()).toBeNull()
  })

  it('returns a copy of the results', () => {
    const { game } = startGame(makeBank('medio', 3))
    answerRight(game)
    const copy = game.results() as unknown[]
    copy.length = 0
    expect(game.results()).toHaveLength(1)
  })

  it('shuffles options at play time so the right answer moves around', () => {
    const positions = new Set<number>()
    for (let seed = 1; seed <= 40; seed++) {
      const { game } = startGame([makeQuestion({ correctIndex: 0 })], { seed })
      positions.add(current(game).correctIndex)
    }
    expect(positions.size).toBe(4)
  })
})

describe('random full games (invariants)', () => {
  it.each(Array.from({ length: 150 }, (_, i) => i + 1))(
    'seed %i keeps score, floor and report consistent',
    (seed) => {
      const rng = mulberry32(seed * 7919)
      const bank = DIFFICULTIES.flatMap((d) => makeBank(d, 12))
      const { game, clock } = startGame(bank, { seed, duration: seed % 2 === 0 ? 60 : 120 })

      let guard = 0
      while (game.snapshot().status === 'question' && guard++ < 200) {
        clock.advance(200 + Math.floor(rng() * 3_000))
        const roll = rng()
        if (roll < 0.55) game.answer(rightIndex(game))
        else if (roll < 0.8) game.answer(wrongIndex(game))
        else game.skip()
        expect(game.snapshot().score).toBeGreaterThanOrEqual(0)
        clock.advance(600)
        game.next()
      }
      clock.advance(1_000_000)
      game.tick()

      const report = game.report()
      expect(report).not.toBeNull()
      const { breakdown } = report!
      expect(report!.points).toBe(game.snapshot().score)
      expect(breakdown.correctPoints + breakdown.comboBonusTotal - breakdown.penaltyTotal).toBe(
        report!.points,
      )
      expect(report!.correct + report!.wrong + report!.skipped).toBe(report!.rows.length)
      expect(new Set(report!.rows.map((r) => r.id)).size).toBe(report!.rows.length)
    },
  )
})
