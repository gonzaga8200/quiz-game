import { describe, expect, it } from 'vitest'
import { celebrationFor } from '../../core/celebration'
import type { CelebrationTier } from '../../core/celebration'
import { CATEGORIES, DIFFICULTY_FILTERS, DURATIONS } from '../../core/constants'
import { BOARDS, FILTER_SLUGS, boardId, isPersonalBest } from '../../core/filters'
import {
  answerRight,
  answerWrong,
  current,
  makeBank,
  makeClock,
  makeQuestion,
  skipOne,
  startGame,
} from './helpers'
import { buildReport } from '../../core/report'
import { Game } from '../../core/game'
import { mulberry32 } from '../../core/rng'

describe('ranking boards', () => {
  it('has one board per duration, difficulty filter and category choice (64 in total)', () => {
    expect(BOARDS).toHaveLength(
      DURATIONS.length * DIFFICULTY_FILTERS.length * (CATEGORIES.length + 1),
    )
    expect(new Set(BOARDS.map((b) => b.id)).size).toBe(64)
  })

  it('builds ASCII ids from duration, filter and, when there is one, category', () => {
    expect(boardId(60, 'Aleatorio')).toBe('60_aleatorio')
    expect(boardId(120, 'Difícil')).toBe('120_dificil')
    expect(boardId(60, 'Fácil')).toBe('60_facil')
    expect(boardId(60, 'Aleatorio', 'Ciencias')).toBe('60_aleatorio_ciencias')
    expect(boardId(120, 'Medio', 'Historia y Geografía')).toBe('120_medio_historia-y-geografia')
    expect(boardId(60, 'Difícil', 'Música')).toBe('60_dificil_musica')
    expect(Object.values(FILTER_SLUGS).every((slug) => /^[a-z]+$/.test(slug))).toBe(true)
    expect(BOARDS.every((b) => /^(60|120)_[a-z]+(_[a-z-]+)?$/.test(b.id))).toBe(true)
  })

  it('keeps the original ids for games that mix every category', () => {
    expect(BOARDS.filter((b) => b.category === undefined).map((b) => b.id)).toEqual([
      '60_aleatorio',
      '60_facil',
      '60_medio',
      '60_dificil',
      '120_aleatorio',
      '120_facil',
      '120_medio',
      '120_dificil',
    ])
  })

  it('lists boards in display order (60 s first, mixed categories before each category)', () => {
    expect(BOARDS.slice(0, 8).map((b) => b.id)).toEqual([
      '60_aleatorio',
      '60_aleatorio_arte-y-literatura',
      '60_aleatorio_historia-y-geografia',
      '60_aleatorio_deportes',
      '60_aleatorio_cine-y-television',
      '60_aleatorio_ciencias',
      '60_aleatorio_lengua-e-idiomas',
      '60_aleatorio_musica',
    ])
  })

  it('only replaces a stored score when the new one is strictly better', () => {
    expect(isPersonalBest(null, 0)).toBe(true)
    expect(isPersonalBest(40, 41)).toBe(true)
    expect(isPersonalBest(40, 40)).toBe(false)
    expect(isPersonalBest(40, 10)).toBe(false)
  })
})

describe('celebrationFor', () => {
  const cases: readonly [number, 60 | 120, CelebrationTier][] = [
    [150, 60, 'trophy'],
    [149, 60, 'party'],
    [90, 60, 'party'],
    [89, 60, 'clap'],
    [45, 60, 'clap'],
    [44, 60, 'thumbs'],
    [15, 60, 'thumbs'],
    [14, 60, 'try'],
    [0, 60, 'try'],
    // 120 s games are normalised to points per minute
    [300, 120, 'trophy'],
    [299, 120, 'party'],
    [180, 120, 'party'],
    [90, 120, 'clap'],
    [30, 120, 'thumbs'],
    [29, 120, 'try'],
  ]

  it.each(cases)('%i points in %i s -> %s', (points, duration, tier) => {
    expect(celebrationFor(points, duration).tier).toBe(tier)
  })

  it('launches more pieces for better results', () => {
    const counts = [0, 20, 50, 100, 200].map((points) => celebrationFor(points, 60).particleCount)
    expect(counts).toEqual([...counts].sort((a, b) => a - b))
    expect(new Set(counts).size).toBe(5)
  })

  it('uses a trophy for a great result and clapping for a decent one', () => {
    expect(celebrationFor(200, 60).emojis).toContain('🏆')
    expect(celebrationFor(50, 60).emojis).toContain('👏')
  })

  it('falls back to the lowest tier for a nonsensical negative score', () => {
    expect(celebrationFor(-5, 60).tier).toBe('try')
  })
})

describe('buildReport', () => {
  it('builds per-question rows with the chosen and correct answers', () => {
    const { game } = startGame(
      [
        makeQuestion({
          id: 'solo-una',
          difficulty: 'muy fácil',
          explanation: 'Porque sí, y bien explicado.',
        }),
      ],
      { seed: 3 },
    )
    const question = current(game)
    const wrong = (question.correctIndex + 1) % 4
    game.answer(wrong)
    game.tick()
    game.next()

    const report = game.report()!
    const [row] = report.rows
    expect(row).toMatchObject({
      id: 'solo-una',
      result: 'wrong',
      category: 'Historia y Geografía',
      difficulty: 'muy fácil',
      chosenAnswer: question.options[wrong],
      correctAnswer: 'París',
      explanation: 'Porque sí, y bien explicado.',
      net: 0,
    })
  })

  it('reports a skipped row without a chosen answer', () => {
    const { game } = startGame([makeQuestion()])
    game.skip()
    game.next()
    const row = game.report()!.rows[0]!
    expect(row.result).toBe('skipped')
    expect(row.chosenAnswer).toBeNull()
    expect(row.correctAnswer).toBe('París')
  })

  it('splits the breakdown into base points, bonuses and penalties', () => {
    const { game } = startGame(makeBank('fácil', 12))
    for (let i = 0; i < 5; i++) answerRight(game) // 5 x 5 + bonuses at 3 (+2) and 5 (+4)
    answerWrong(game) // -1
    skipOne(game) // free
    skipOne(game) // free
    skipOne(game) // paid -1
    while (game.snapshot().status === 'question') skipOne(game) // exhaust the bank, more paid skips

    const report = game.report()!
    expect(report.breakdown.correctPoints).toBe(25)
    expect(report.breakdown.comboBonuses).toEqual([
      { streak: 3, count: 1, points: 2 },
      { streak: 5, count: 1, points: 4 },
    ])
    expect(report.breakdown.comboBonusTotal).toBe(6)
    expect(report.breakdown.wrongPenalty).toBe(1)
    expect(report.breakdown.skipPenalty).toBeGreaterThanOrEqual(1)
    expect(report.breakdown.penaltyTotal).toBe(
      report.breakdown.wrongPenalty + report.breakdown.skipPenalty,
    )
    expect(report.points).toBe(25 + 6 - report.breakdown.penaltyTotal)
    expect(report.bestStreak).toBe(5)
  })

  it('counts a bonus earned twice on separate streaks', () => {
    const { game } = startGame(makeBank('medio', 12))
    for (let i = 0; i < 3; i++) answerRight(game)
    answerWrong(game)
    for (let i = 0; i < 3; i++) answerRight(game)
    while (game.snapshot().status === 'question') skipOne(game)

    expect(game.report()!.breakdown.comboBonuses).toEqual([{ streak: 3, count: 2, points: 4 }])
  })

  it('is a plain function of its input and carries the game settings', () => {
    const clock = makeClock()
    const game = new Game({
      questions: makeBank('medio', 1),
      filter: 'Medio',
      duration: 120,
      rng: mulberry32(1),
      now: clock.now,
    })
    game.start()
    answerRight(game)

    const report = buildReport({
      results: game.results(),
      bestStreak: 1,
      finishReason: 'exhausted',
      duration: 120,
      filter: 'Medio',
    })
    expect(report).toMatchObject({ duration: 120, filter: 'Medio', points: 7, correct: 1 })
    expect(report.celebration.tier).toBe('try')
    expect('category' in report).toBe(false)
  })

  it('remembers the category the game was limited to', () => {
    const game = new Game({
      questions: makeBank('medio', 1),
      filter: 'Medio',
      duration: 60,
      category: 'Historia y Geografía',
      rng: mulberry32(1),
      now: makeClock().now,
    })
    game.start()
    answerRight(game) // the bank has a single question, so the game ends
    expect(game.report()?.category).toBe('Historia y Geografía')
  })
})
