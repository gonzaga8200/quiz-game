import { describe, expect, it, vi } from 'vitest'
import { Game, mulberry32 } from '../../core'
import type { BoardId, GameReport, RankingEntry, ScoreSubmission } from '../../core'
import { createRankingService, toScoreSubmission } from '../../app/utils/ranking-service'
import type { RankingStore } from '../../app/utils/ranking-service'
import { answerRight, makeBank, makeClock } from '../core/helpers'

/** Plays `rights` correct answers (7 points each, plus combo bonuses) and returns the report. */
function reportWith(
  rights: number,
  options: { duration?: 60 | 120; filter?: 'Medio' | 'Aleatorio' } = {},
): GameReport {
  const clock = makeClock()
  const game = new Game({
    questions: makeBank('medio', Math.max(rights, 1)),
    filter: options.filter ?? 'Medio',
    duration: options.duration ?? 60,
    rng: mulberry32(1),
    now: clock.now,
  })
  game.start()
  for (let i = 0; i < rights; i++) answerRight(game)
  clock.advance(1_000_000)
  game.tick()
  return game.report()!
}

const player = {
  uid: 'ana',
  displayName: 'Ana García',
  photoURL: 'https://lh3.googleusercontent.com/a/x',
}

function fakeStore(options: { best?: number | null; better?: number } = {}) {
  const saved: { board: BoardId; entry: ScoreSubmission }[] = []
  const store: RankingStore = {
    getBestPoints: vi.fn(() => Promise.resolve(options.best ?? null)),
    saveEntry: vi.fn((board, entry) => {
      saved.push({ board, entry })
      return Promise.resolve()
    }),
    countBetter: vi.fn(() => Promise.resolve(options.better ?? 0)),
    topEntries: vi.fn(() => Promise.resolve([] as RankingEntry[])),
  }
  return { store, saved }
}

describe('toScoreSubmission', () => {
  it('builds a valid document from the report and the Google profile', () => {
    const report = reportWith(5)
    expect(toScoreSubmission(player, report)).toEqual({
      uid: 'ana',
      displayName: 'Ana García',
      photoURL: 'https://lh3.googleusercontent.com/a/x',
      points: report.points,
      correct: 5,
      wrong: 0,
      skipped: 0,
      duration: 60,
      difficultyFilter: 'Medio',
    })
  })

  it('cleans up awkward profile data', () => {
    const report = reportWith(2)
    expect(toScoreSubmission({ ...player, displayName: null }, report).displayName).toBe('Jugador')
    expect(toScoreSubmission({ ...player, displayName: '   ' }, report).displayName).toBe('Jugador')
    expect(
      toScoreSubmission({ ...player, displayName: ` ${'x'.repeat(80)} ` }, report).displayName,
    ).toHaveLength(60)
    expect(
      toScoreSubmission({ ...player, photoURL: 'http://insecure.example/a.png' }, report).photoURL,
    ).toBeNull()
    expect(
      toScoreSubmission({ ...player, photoURL: `https://x.example/${'a'.repeat(500)}` }, report)
        .photoURL,
    ).toBeNull()
    expect(toScoreSubmission({ ...player, photoURL: null }, report).photoURL).toBeNull()
  })
})

describe('ranking service: submit', () => {
  it('creates the first entry on a board and reports the position', async () => {
    const { store, saved } = fakeStore({ best: null, better: 4 })
    const report = reportWith(6)

    const result = await createRankingService(store).submit(player, report)

    expect(result).toEqual({ status: 'new-best', best: report.points, position: 5 })
    expect(saved).toHaveLength(1)
    expect(saved[0]?.board).toBe('60_medio')
    expect(saved[0]?.entry.points).toBe(report.points)
    expect(store.countBetter).toHaveBeenCalledWith('60_medio', report.points)
  })

  it('replaces a lower previous best', async () => {
    const { store, saved } = fakeStore({ best: 10, better: 0 })
    const result = await createRankingService(store).submit(player, reportWith(6))
    expect(result).toMatchObject({ status: 'new-best', position: 1 })
    expect(saved).toHaveLength(1)
  })

  it.each([
    ['equal', 0],
    ['higher', 500],
  ])('keeps a %s previous best and does not write', async (_label, extra) => {
    const report = reportWith(6)
    const { store, saved } = fakeStore({ best: report.points + extra, better: 2 })

    const result = await createRankingService(store).submit(player, report)

    expect(result).toEqual({ status: 'kept', best: report.points + extra, position: 3 })
    expect(saved).toHaveLength(0)
    expect(store.countBetter).toHaveBeenCalledWith('60_medio', report.points + extra)
  })

  it('skips games with no points without touching the store', async () => {
    const { store } = fakeStore()
    const result = await createRankingService(store).submit(player, reportWith(0))
    expect(result).toEqual({ status: 'skipped' })
    expect(store.getBestPoints).not.toHaveBeenCalled()
    expect(store.saveEntry).not.toHaveBeenCalled()
  })

  it('uses the board of the game that was played', async () => {
    const { store, saved } = fakeStore()
    await createRankingService(store).submit(
      player,
      reportWith(4, { duration: 120, filter: 'Aleatorio' }),
    )
    expect(saved[0]?.board).toBe('120_aleatorio')
  })

  it('lets store errors reach the caller', async () => {
    const { store } = fakeStore()
    vi.mocked(store.saveEntry).mockRejectedValueOnce(new Error('permission-denied'))
    await expect(createRankingService(store).submit(player, reportWith(3))).rejects.toThrow(
      'permission-denied',
    )
  })
})

describe('ranking service: top', () => {
  it('reads the board from the store', async () => {
    const { store } = fakeStore()
    await createRankingService(store).top('60_facil')
    expect(store.topEntries).toHaveBeenCalledWith('60_facil')
  })
})
