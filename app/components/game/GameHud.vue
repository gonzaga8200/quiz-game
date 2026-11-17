<script setup lang="ts">
import { computed } from 'vue'
import { nextComboMilestone } from '~~/core'
import { formatClock } from '~/utils/format'
import ClockFace from './ClockFace.vue'

const props = defineProps<{
  durationMs: number
  remainingMs: number
  score: number
  streak: number
}>()

const URGENT_FROM_MS = 10_000

const clock = computed(() => formatClock(props.remainingMs))
const urgent = computed(() => props.remainingMs <= URGENT_FROM_MS)
const milestone = computed(() => nextComboMilestone(props.streak))
const hint = computed(() => {
  const missing = milestone.value ? milestone.value.at - props.streak : 0
  return missing === 1 ? 'Te falta 1 acierto seguido' : `Te faltan ${missing} aciertos seguidos`
})
</script>

<template>
  <header class="hud" :data-urgent="urgent">
    <ClockFace class="hud__dial" :duration-ms="durationMs" :remaining-ms="remainingMs" />

    <!-- Each character in its own fixed-width box so the digits never jiggle. -->
    <p class="clock" role="timer" aria-live="off" :aria-label="`Tiempo restante: ${clock}`">
      <span
        v-for="(char, index) in clock"
        :key="index"
        class="clock__char"
        :class="{ 'clock__char--colon': char === ':' }"
        aria-hidden="true"
        >{{ char }}</span
      >
    </p>

    <dl class="stats">
      <div class="stat">
        <dt>Puntos</dt>
        <dd class="stat__value">{{ score }}</dd>
      </div>
      <div class="stat">
        <dt>Racha</dt>
        <dd class="stat__value">{{ streak }}</dd>
      </div>
    </dl>

    <p class="combo-hint">
      <template v-if="milestone"> {{ hint }} para +{{ milestone.bonus }} </template>
      <template v-else>Racha máxima de bonus alcanzada</template>
    </p>
  </header>
</template>

<style scoped>
/*
 * Phone: a slim brass bar that stays on top (pocket watch, digits, score).
 * Desktop: the same pieces stacked in a side panel, the watch as the hero.
 */
.hud {
  position: sticky;
  top: 0;
  z-index: 5;
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-areas:
    'dial clock stats'
    'hint hint hint';
  align-items: center;
  gap: 0.125rem 0.875rem;
  margin-inline: -1rem;
  padding: 0.5rem 1rem 0.5rem;
  background-color: var(--nogal-alto);
  background-image: var(--grano-nogal);
  border-bottom: 2px solid var(--oro-sombra);
}

.hud__dial {
  grid-area: dial;
  width: 4.5rem;
}

.clock {
  grid-area: clock;
  display: inline-flex;
  align-items: baseline;
  margin: 0;
  color: var(--oro-claro);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(2.5rem, 12vw, 3.25rem);
  line-height: 1;
  font-variant-numeric: lining-nums;
}

.clock__char {
  display: inline-block;
  width: 0.64em;
  text-align: center;
}

.clock__char--colon {
  width: 0.34em;
}

/* Last ten seconds: the digits turn red and the ring too, and the change does not rely on
   colour only because the digits also pulse in size for users who allow motion. */
.hud[data-urgent='true'] {
  --dial-arc: var(--fallo);
}

.hud[data-urgent='true'] .clock {
  color: var(--fallo-suelo);
}

@media (prefers-reduced-motion: no-preference) {
  .hud[data-urgent='true'] .clock {
    animation: urgent-pulse 1s ease-in-out infinite;
  }
}

@keyframes urgent-pulse {
  50% {
    transform: scale(1.06);
  }
}

.stats {
  grid-area: stats;
  display: flex;
  gap: 1.25rem;
  margin: 0;
}

.stat {
  text-align: right;
}

.stat dt {
  font-size: 0.8125rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--crema-suave);
}

.stat__value {
  margin: 0;
  color: var(--crema);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.875rem;
  line-height: 1.1;
  font-variant-numeric: lining-nums tabular-nums;
}

.combo-hint {
  grid-area: hint;
  min-height: 1.5em;
  font-size: 0.875rem;
  color: var(--crema-suave);
}

/* Very narrow phones (320 px): a smaller watch and tighter numbers, so nothing overflows. */
@media (max-width: 24rem) {
  .hud {
    column-gap: 0.625rem;
  }

  .hud__dial {
    width: 3.5rem;
  }

  .clock {
    font-size: 2.25rem;
  }

  .stats {
    gap: 0.875rem;
  }

  .stat__value {
    font-size: 1.5rem;
  }
}

@media (min-width: 56rem) {
  .hud {
    position: static;
    grid-template-columns: 1fr;
    grid-template-areas:
      'dial'
      'clock'
      'stats'
      'hint';
    justify-items: center;
    gap: 0.625rem;
    margin-inline: 0;
    padding: 1.5rem 1rem 1rem;
    border: 2px solid var(--oro-sombra);
    border-radius: var(--radius-card);
    box-shadow: 0 0.75rem 1.75rem rgb(0 0 0 / 0.4);
    text-align: center;
  }

  .hud__dial {
    width: min(100%, 12.5rem);
  }

  .clock {
    font-size: 3.75rem;
  }

  .stats {
    gap: 2rem;
  }

  .stat {
    text-align: center;
  }

  .stat__value {
    font-size: 2.25rem;
  }
}
</style>
