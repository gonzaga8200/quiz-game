import { ScoreSubmissionSchema, boardId, isPersonalBest } from '~~/core'
import type { BoardId, GameReport, RankingEntry, ScoreSubmission } from '~~/core'

/** The few Firestore operations the ranking needs. The real one lives in `lib/firebase`. */
export interface RankingStore {
  /** The player's stored best on a board, or null if they have none. */
  getBestPoints(board: BoardId, uid: string): Promise<number | null>
  saveEntry(board: BoardId, entry: ScoreSubmission): Promise<void>
  /** How many players on the board have strictly more points. */
  countBetter(board: BoardId, points: number): Promise<number>
  topEntries(board: BoardId): Promise<RankingEntry[]>
}

export interface RankingPlayer {
  readonly uid: string
  readonly displayName: string | null
  readonly photoURL: string | null
}

export type SubmitResult =
  /** Zero points: nothing worth ranking. */
  | { readonly status: 'skipped' }
  /** The score beat (or created) the player's best on this board. */
  | { readonly status: 'new-best'; readonly best: number; readonly position: number }
  /** The player already has an equal or better score; it was left untouched. */
  | { readonly status: 'kept'; readonly best: number; readonly position: number }

/** Builds the document to store from a finished game, cleaning up Google profile data. */
export function toScoreSubmission(player: RankingPlayer, report: GameReport): ScoreSubmission {
  const name = (player.displayName ?? '').trim().slice(0, 60)
  const photo = player.photoURL
  return ScoreSubmissionSchema.parse({
    uid: player.uid,
    displayName: name === '' ? 'Jugador' : name,
    photoURL: photo !== null && photo.startsWith('https://') && photo.length <= 500 ? photo : null,
    points: report.points,
    correct: report.correct,
    wrong: report.wrong,
    skipped: report.skipped,
    duration: report.duration,
    difficultyFilter: report.filter,
  })
}

export function createRankingService(store: RankingStore) {
  return {
    /**
     * Saves a finished competitive game if it improves the player's best on that
     * board, and tells them where they stand. One document per player per board.
     */
    async submit(player: RankingPlayer, report: GameReport): Promise<SubmitResult> {
      if (report.points <= 0) return { status: 'skipped' }

      const board = boardId(report.duration, report.filter)
      const previous = await store.getBestPoints(board, player.uid)

      if (previous !== null && !isPersonalBest(previous, report.points)) {
        return {
          status: 'kept',
          best: previous,
          position: (await store.countBetter(board, previous)) + 1,
        }
      }

      await store.saveEntry(board, toScoreSubmission(player, report))
      return {
        status: 'new-best',
        best: report.points,
        position: (await store.countBetter(board, report.points)) + 1,
      }
    },

    top(board: BoardId): Promise<RankingEntry[]> {
      return store.topEntries(board)
    },
  }
}

export type RankingService = ReturnType<typeof createRankingService>
