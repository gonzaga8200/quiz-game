<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { nextComboMilestone } from '~~/core'
import { formatClock } from '~/utils/format'
import { STREAK_CHEER_FROM } from '~/utils/fx'
import IconFlame from '../icons/IconFlame.vue'
import ClockFace from './ClockFace.vue'

const props = defineProps<{
  durationMs: number
  remainingMs: number
  score: number
  streak: number
  /** Points just lost (wrong answer or paid skip); the score tile flashes while it is set. */
  hit?: { id: number; amount: number } | null
}>()

const URGENT_FROM_MS = 10_000

// A streak that was worth something just broke: the tile flashes red for a moment.
const broken = ref(false)
let brokenTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => props.streak,
  (now, before) => {
    if (now >= before || before < 2) return
    broken.value = true
    clearTimeout(brokenTimer)
    brokenTimer = setTimeout(() => (broken.value = false), 900)
  },
)
onBeforeUnmount(() => clearTimeout(brokenTimer))

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
      <!-- Keyed by the hit, so the flash starts again on every loss. -->
      <div :key="hit?.id ?? 0" class="stat" :class="{ 'stat--hit': hit }">
        <dt>Puntos</dt>
        <dd class="stat__value">{{ score }}</dd>
        <span v-if="hit" class="stat__delta" aria-hidden="true">−{{ hit.amount }}</span>
      </div>
      <div
        class="stat"
        :class="{ 'stat--hot': streak >= STREAK_CHEER_FROM, 'stat--broken': broken }"
      >
        <dt>Racha</dt>
        <dd class="stat__value">
          <IconFlame v-if="streak >= STREAK_CHEER_FROM" class="stat__flame" />
          <!-- Keyed by the number, so it pops every time the streak grows. -->
          <span :key="streak" class="stat__number">{{ streak }}</span>
        </dd>
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
  gap: 0 0.75rem;
  margin-inline: -1rem;
  padding: 0.375rem 1rem 0.375rem;
  background-color: var(--nogal-alto);
  background-image: var(--grano-nogal);
  border-bottom: 2px solid var(--oro-sombra);
}

.hud__dial {
  grid-area: dial;
  width: 3.5rem;
}

.clock {
  grid-area: clock;
  display: inline-flex;
  align-items: baseline;
  margin: 0;
  color: var(--oro-claro);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(2.25rem, 10vw, 3rem);
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
  gap: 1.125rem;
  margin: 0;
}

.stat {
  position: relative;
  text-align: right;
}

.stat dt {
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--crema-suave);
}

.stat__value {
  margin: 0;
  color: var(--crema);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.625rem;
  line-height: 1.1;
  font-variant-numeric: lining-nums tabular-nums;
}

.stat__value {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
}

.stat__number {
  display: inline-block;
}

.stat__flame {
  color: var(--oro-claro);
  font-size: 0.85em;
}

/* Losing points: the number turns red and jolts, and the amount floats up in a red tag. */
.stat--hit .stat__value {
  color: var(--fallo-suelo);
}

.stat__delta {
  position: absolute;
  top: -0.375rem;
  right: -0.25rem;
  z-index: 1;
  padding: 0.125rem 0.5rem;
  border: 2px solid var(--papel);
  border-radius: 999px;
  background: var(--fallo);
  color: var(--papel);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.375rem;
  line-height: 1.1;
  box-shadow: 0 0.25rem 0.75rem rgb(0 0 0 / 0.5);
}

/* A streak of 3 or more: a flame and a gold number. */
.stat--hot .stat__value {
  color: var(--oro-claro);
}

.stat--broken .stat__value {
  color: var(--fallo-suelo);
}

@media (prefers-reduced-motion: no-preference) {
  .stat--hit .stat__value {
    animation: jolt 0.5s ease-in-out;
  }

  .stat__delta {
    animation: delta 1.4s ease-out forwards;
  }

  .stat__number {
    animation: pop 0.35s ease-out;
  }

  .stat--broken .stat__value {
    animation: jolt 0.5s ease-in-out;
  }
}

@keyframes jolt {
  0%,
  100% {
    transform: translateX(0);
  }
  20%,
  60% {
    transform: translateX(-5px);
  }
  40%,
  80% {
    transform: translateX(5px);
  }
}

@keyframes pop {
  0% {
    transform: scale(1.7);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes delta {
  0% {
    opacity: 0;
    transform: translateY(0.75rem) scale(0.5);
  }
  15% {
    opacity: 1;
    transform: translateY(0) scale(1.25);
  }
  30% {
    transform: translateY(0) scale(1);
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-0.75rem) scale(1);
  }
}

.combo-hint {
  grid-area: hint;
  min-height: 1.25em;
  font-size: 0.8125rem;
  line-height: 1.25;
  color: var(--crema-suave);
}

/* Very narrow phones (320 px): a smaller watch and tighter numbers, so nothing overflows. */
@media (max-width: 24rem) {
  .hud {
    column-gap: 0.625rem;
  }

  .hud__dial {
    width: 3rem;
  }

  .clock {
    font-size: 2rem;
  }

  .stats {
    gap: 0.875rem;
  }

  .stat__value {
    font-size: 1.375rem;
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
