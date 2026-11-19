<script setup lang="ts">
import type { StreakFx } from '~/utils/fx'
import IconFlame from '../icons/IconFlame.vue'

/** What the layer shows now. `id` changes on every event so the animation restarts. */
export type LayerFx =
  | { readonly id: number; readonly kind: 'wrong' }
  | ({ readonly id: number; readonly kind: 'streak' } & StreakFx)

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
      <p class="fx__banner" :class="{ 'fx__banner--big': fx.big }">
        <IconFlame class="fx__flame" />
        <span class="fx__title">¡Racha de {{ fx.streak }}!</span>
        <span v-if="fx.bonus > 0" class="fx__bonus">+{{ fx.bonus }} de bonus</span>
      </p>

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

/* A mistake: the edges of the screen flash red. */
.fx__vignette {
  position: absolute;
  inset: 0;
  box-shadow:
    inset 0 0 5rem 1rem rgb(214 58 46 / 0.85),
    inset 0 0 0 0.5rem rgb(214 58 46 / 0.9);
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

/* A streak: a gold ticket drops in under the top bar. */
.fx__banner {
  position: absolute;
  top: 6.75rem;
  left: 50%;
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
  transform: translateX(-50%);
  animation: banner 1.5s ease-out forwards;
}

.fx__banner--big {
  top: 6.75rem;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-card);
  font-size: 1.875rem;
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
    transform: translateX(-50%) translateY(-1.5rem) scale(0.6);
  }
  14% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1.12);
  }
  24% {
    transform: translateX(-50%) translateY(0) scale(1);
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-0.5rem) scale(1);
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

@media (min-width: 56rem) {
  .fx__banner,
  .fx__banner--big {
    top: 5rem;
  }
}
</style>
