import { COMBO_BONUSES } from './constants'

export interface ComboMilestone {
  /** Streak length that triggers the bonus. */
  readonly at: number
  readonly bonus: number
}

const MILESTONES: readonly ComboMilestone[] = Object.entries(COMBO_BONUSES)
  .map(([at, bonus]) => ({ at: Number(at), bonus }))
  .sort((a, b) => a.at - b.at)

/** The next bonus the player can still earn, or null once the last one is behind them. */
export function nextComboMilestone(streak: number): ComboMilestone | null {
  return MILESTONES.find((milestone) => milestone.at > streak) ?? null
}
