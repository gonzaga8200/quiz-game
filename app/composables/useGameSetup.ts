import { ARCADE_DURATION, ARCADE_FILTER } from '~~/core'
import type { DifficultyFilter, Duration } from '~~/core'

export type GameMode = 'arcade' | 'competitive'

export interface GameSetup {
  readonly mode: GameMode
  readonly duration: Duration
  readonly filter: DifficultyFilter
}

export const ARCADE_SETUP: GameSetup = {
  mode: 'arcade',
  duration: ARCADE_DURATION,
  filter: ARCADE_FILTER,
}

/** The options chosen on the setup screen, shared with the game screen. */
export function useGameSetup() {
  return useState<GameSetup | null>('game-setup', () => null)
}
