<script setup lang="ts">
import type { StreakFx } from '~/utils/fx'
import IconFlame from '../icons/IconFlame.vue'

/** What the layer shows now. `id` changes on every event so the animation restarts. */
export type LayerFx =
  | { readonly id: number; readonly kind: 'wrong' }
  | ({
      readonly id: number
      readonly kind: 'streak'
      /** Viewport y (px) of the top edge of the question text; the banner sits just above it. */
      readonly anchorTop?: number
    } & StreakFx)

defineProps<{ fx: LayerFx | null }>()

// Fixed numbers, not Math.random: the same confetti every time and no hydration surprises.
const COLORS = ['var(--oro-claro)', 'var(--fallo-suelo)', '#5fc7a0', '#7fb3d5', 'var(--papel)']
const confetti = Array.from({ length: 24 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  drift: ((i * 53) % 41) - 20,
  delay: (i % 8) * 0.05,
  spin: 240 + ((i * 71) % 360),
  color: COLORS[i % COLORS.length],
}))
</script>

<template>
  <!-- Decorative: the live region in the game screen announces the same events in words. -->
  <div v-if="fx" :key="fx.id" class="fx" aria-hidden="true">
    <span v-if="fx.kind === 'wrong'" class="fx__vignette" />

    <template v-else>
      <!-- The slot ends where the question text starts, so the banner never covers it. -->
      <div
        class="fx__slot"
        :style="fx.anchorTop === undefined ? undefined : { '--anchor': `${fx.anchorTop}px` }"
      >
        <p class="fx__banner" :class="{ 'fx__banner--big': fx.big }">
          <IconFlame class="fx__flame" />
          <span class="fx__title">¡Racha de {{ fx.streak }}!</span>
          <span v-if="fx.bonus > 0" class="fx__bonus">+{{ fx.bonus }} de bonus</span>
        </p>
      </div>

      <template v-if="fx.big">
        <span
          v-for="(piece, index) in confetti"
          :key="index"
          class="fx__confetti"
          :style="{
            '--x': `${piece.x}vw`,
            '--drift': `${piece.drift}vw`,
            '--delay': `${piece.delay}s`,
            '--spin': `${piece.spin}deg`,
            '--color': piece.color,
          }"
        />
      </template>
    </template>
  </div>
</template>

<style scoped>
.fx {
  position: fixed;
  inset: 0;
  z-index: 20;
  overflow: hidden;
  pointer-events: none;
}

/* A mistake: the edges of the screen flash a sharp red. */
.fx__vignette {
  position: absolute;
  inset: 0;
  box-shadow:
    inset 0 0 4.5rem 1.25rem rgb(240 24 14 / 0.95),
    inset 0 0 0 0.625rem rgb(240 24 14);
  animation: vignette 0.7s ease-out forwards;
}

@keyframes vignette {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/*
 * A streak: a gold ticket drops in above the question. The slot is the strip of screen from
 * the top down to the question text, and the banner rests on its bottom edge. It stays compact
 * so it fits in the free space of the card without covering the clock or the category tags.
 */
.fx__slot {
  position: absolute;
  inset: 0 0 auto;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: max(var(--anchor, 6.75rem), 4rem);
  padding-bottom: 0.5rem;
}

.fx__banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 2px solid var(--tinta);
  border-radius: 999px;
  background: linear-gradient(180deg, var(--oro-claro), var(--oro));
  box-shadow:
    0 0.5rem 1.25rem rgb(0 0 0 / 0.5),
    0 0 0 3px var(--oro-sombra);
  color: var(--tinta);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.25rem;
  line-height: 1;
  white-space: nowrap;
  animation: banner 1.5s ease-out forwards;
}

.fx__banner--big {
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.125rem 0.5rem;
  padding: 0.5rem 1.25rem;
  border-radius: var(--radius-card);
  font-size: 1.5rem;
  animation-duration: 2.2s;
}

.fx__flame {
  color: #b0410d;
  font-size: 1.5em;
}

.fx__bonus {
  flex-basis: 100%;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 700;
  text-align: center;
}

@keyframes banner {
  0% {
    opacity: 0;
    transform: translateY(-1.5rem) scale(0.6);
  }
  14% {
    opacity: 1;
    transform: translateY(0) scale(1.12);
  }
  24% {
    transform: translateY(0) scale(1);
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-0.5rem) scale(1);
  }
}

.fx__confetti {
  position: absolute;
  top: -1rem;
  left: var(--x);
  width: 0.625rem;
  height: 1.125rem;
  background: var(--color);
  border-radius: 1px;
  opacity: 0;
  animation: fall 1.7s var(--delay) cubic-bezier(0.25, 0.6, 0.5, 1) forwards;
}

@keyframes fall {
  0% {
    opacity: 1;
    transform: translate(0, 0) rotate(0deg);
  }
  85% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(var(--drift), 105vh) rotate(var(--spin));
  }
}

/* Less motion: no falling confetti and no flash animation; the banner just stays a moment. */
@media (prefers-reduced-motion: reduce) {
  .fx__confetti {
    display: none;
  }

  .fx__vignette,
  .fx__banner {
    animation: none;
  }
}
</style>
