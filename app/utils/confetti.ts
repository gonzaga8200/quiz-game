import type { Celebration } from '~~/core'
import { prefersReducedMotion } from './motion'

/**
 * Emoji confetti for the end of a game. The size of the burst comes from the
 * celebration tier (more points, more pieces). Does nothing for users who asked
 * for reduced motion; the report still shows the tier emoji statically.
 */
export async function fireCelebration(celebration: Celebration): Promise<void> {
  if (prefersReducedMotion()) return

  const confetti = (await import('canvas-confetti')).default
  const shapes = celebration.emojis.map((text) => confetti.shapeFromText({ text, scalar: 3 }))
  const bursts = celebration.particleCount >= 170 ? 3 : celebration.particleCount >= 60 ? 2 : 1
  const perBurst = Math.round(celebration.particleCount / bursts)

  for (let i = 0; i < bursts; i++) {
    const x = bursts === 1 ? 0.5 : 0.2 + (0.6 * i) / (bursts - 1)
    setTimeout(() => {
      void confetti({
        shapes,
        scalar: 3,
        flat: true,
        particleCount: perBurst,
        spread: 80,
        startVelocity: 45,
        gravity: 0.9,
        ticks: 220,
        origin: { x, y: 0.7 },
        disableForReducedMotion: true,
        zIndex: 1000,
      })
    }, i * 260)
  }
}
