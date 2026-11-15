<script setup lang="ts">
import { computed } from 'vue'
import { nextComboMilestone } from '~~/core'
import { formatClock } from '~/utils/format'
import RoadTimer from './RoadTimer.vue'

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
    <div class="hud__top">
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
    </div>

    <RoadTimer :duration-ms="durationMs" :remaining-ms="remainingMs" />

    <p class="combo-hint">
      <template v-if="milestone"> {{ hint }} para +{{ milestone.bonus }} </template>
      <template v-else>Racha máxima de bonus alcanzada</template>
    </p>
  </header>
</template>

<style scoped>
.hud {
  position: sticky;
  top: 0;
  z-index: 5;
  display: grid;
  gap: 0.5rem;
  margin-inline: -1rem;
  padding: 0.75rem 1rem 0.625rem;
  background: var(--cemento);
  border-bottom: 2px solid var(--cemento-borde);
}

.hud__top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}

.clock {
  display: inline-flex;
  align-items: baseline;
  margin: 0;
  padding: 0.125rem 0.75rem 0.25rem;
  border-radius: 0.625rem;
  background: var(--amarillo);
  color: var(--asfalto);
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 800;
  font-size: clamp(3.25rem, 16vw, 4.5rem);
  line-height: 1;
}

.clock__char {
  display: inline-block;
  width: 0.58em;
  text-align: center;
}

.clock__char--colon {
  width: 0.3em;
}

/* Last ten seconds: the clock turns red, and the change does not rely on colour only
   because the digits also pulse in size for users who allow motion. */
.hud[data-urgent='true'] .clock {
  background: var(--fallo);
  color: var(--papel);
}

@media (prefers-reduced-motion: no-preference) {
  .hud[data-urgent='true'] .clock {
    animation: urgent-pulse 1s ease-in-out infinite;
  }
}

@keyframes urgent-pulse {
  50% {
    transform: scale(1.04);
  }
}

.stats {
  display: flex;
  gap: 1.25rem;
  margin: 0;
}

.stat {
  text-align: right;
}

.stat dt {
  font-size: 0.875rem;
  color: var(--asfalto-suave);
}

.stat__value {
  margin: 0;
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 800;
  font-size: 2rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.combo-hint {
  min-height: 1.5em;
  font-size: 0.9375rem;
  color: var(--asfalto-suave);
}
</style>
