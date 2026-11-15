import type { Duration } from './constants'

export type CelebrationTier = 'trophy' | 'party' | 'clap' | 'thumbs' | 'try'

export interface Celebration {
  readonly tier: CelebrationTier
  /** Emojis the UI should shoot as confetti. */
  readonly emojis: readonly string[]
  /** How many pieces to launch; scales with the result. */
  readonly particleCount: number
}

interface TierSpec extends Celebration {
  /** Minimum points per minute to reach this tier. */
  readonly minPointsPerMinute: number
}

/** Best tier first. Thresholds are tunable; they live here so they are tested once. */
const TIERS: readonly TierSpec[] = [
  { tier: 'trophy', minPointsPerMinute: 150, emojis: ['🏆', '🥇', '✨'], particleCount: 240 },
  { tier: 'party', minPointsPerMinute: 90, emojis: ['🎉', '🥳', '✨'], particleCount: 170 },
  { tier: 'clap', minPointsPerMinute: 45, emojis: ['👏', '🙌'], particleCount: 110 },
  { tier: 'thumbs', minPointsPerMinute: 15, emojis: ['👍', '🙂'], particleCount: 60 },
  { tier: 'try', minPointsPerMinute: 0, emojis: ['💪'], particleCount: 30 },
]

/** Picks the celebration for a result, normalised so 60 s and 120 s games are comparable. */
export function celebrationFor(points: number, duration: Duration): Celebration {
  const perMinute = points / (duration / 60)
  const spec = TIERS.find((t) => perMinute >= t.minPointsPerMinute) ?? TIERS[TIERS.length - 1]!
  return { tier: spec.tier, emojis: spec.emojis, particleCount: spec.particleCount }
}
