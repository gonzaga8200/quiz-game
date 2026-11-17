<script setup lang="ts">
import { computed, useId } from 'vue'

const props = defineProps<{
  durationMs: number
  remainingMs: number
  /** Cover screen: the hand sweeps on its own instead of following the game time. */
  idle?: boolean
}>()

/** 0 at the start, 1 when time is up. */
const elapsed = computed(() => {
  if (props.durationMs <= 0) return 1
  return Math.min(1, Math.max(0, 1 - props.remainingMs / props.durationMs))
})

// Gradients are referenced by id, so each clock needs its own to avoid clashes.
const uid = useId()

// Centre of the dial in the 200 x 232 viewBox (the bow and crown sit above it).
const CX = 100
const CY = 132

const minorTicks = Array.from({ length: 60 }, (_, i) => i).filter((i) => i % 5 !== 0)
const majorTicks = Array.from({ length: 12 }, (_, i) => i)

const NUMERALS = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']
const numerals = NUMERALS.map((label, i) => {
  const angle = (i * Math.PI) / 6
  // Rounded: server and browser would otherwise print the last float digit differently
  // and Vue would warn about a hydration mismatch.
  return {
    label,
    x: Math.round((CX + 50 * Math.sin(angle)) * 100) / 100,
    y: Math.round((CY - 50 * Math.cos(angle) + 3.6) * 100) / 100,
  }
})
</script>

<template>
  <div
    class="dial"
    :class="{ 'dial--idle': idle }"
    aria-hidden="true"
    :style="{ '--elapsed': elapsed }"
  >
    <!-- Decorative: the exact time is read from the digital clock next to it. -->
    <svg viewBox="0 0 200 232" focusable="false">
      <defs>
        <linearGradient :id="`${uid}-brass`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f6dc92" />
          <stop offset="0.5" stop-color="#c89b3c" />
          <stop offset="1" stop-color="#7a5714" />
        </linearGradient>
        <radialGradient :id="`${uid}-face`" cx="50%" cy="42%" r="62%">
          <stop offset="0.6" stop-color="#f6ecd2" />
          <stop offset="1" stop-color="#dcc690" />
        </radialGradient>
      </defs>

      <!-- Bow and crown -->
      <circle cx="100" cy="15" r="12" fill="none" :stroke="`url(#${uid}-brass)`" stroke-width="5" />
      <rect
        x="90"
        y="26"
        width="20"
        height="18"
        rx="3"
        :fill="`url(#${uid}-brass)`"
        stroke="#5c3f10"
      />

      <!-- Case -->
      <circle
        cx="100"
        cy="132"
        r="92"
        :fill="`url(#${uid}-brass)`"
        stroke="#5c3f10"
        stroke-width="2"
      />
      <circle
        cx="100"
        cy="132"
        r="84"
        fill="none"
        stroke="#5c3f10"
        stroke-opacity="0.55"
        stroke-width="1.5"
      />

      <!-- Face -->
      <circle cx="100" cy="132" r="80" :fill="`url(#${uid}-face)`" />

      <g class="ticks">
        <line
          v-for="i in minorTicks"
          :key="`m${i}`"
          class="tick tick--minor"
          x1="100"
          y1="54"
          x2="100"
          y2="58"
          :transform="`rotate(${i * 6} ${CX} ${CY})`"
        />
        <line
          v-for="i in majorTicks"
          :key="`M${i}`"
          class="tick tick--major"
          x1="100"
          y1="54"
          x2="100"
          y2="62"
          :transform="`rotate(${i * 30} ${CX} ${CY})`"
        />
      </g>

      <g class="numerals">
        <text v-for="n in numerals" :key="n.label" :x="n.x" :y="n.y" text-anchor="middle">
          {{ n.label }}
        </text>
      </g>

      <!-- Time left: the ring empties clockwise from twelve o'clock. -->
      <circle
        class="arc"
        cx="100"
        cy="132"
        r="64"
        pathLength="100"
        stroke-dasharray="100"
        :stroke-dashoffset="elapsed * 100"
        :transform="`rotate(-90 ${CX} ${CY})`"
      />

      <g class="hand">
        <line x1="100" y1="146" x2="100" y2="62" />
        <circle cx="100" cy="132" r="5.5" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.dial {
  container-type: inline-size;
  width: 100%;
}

.dial svg {
  display: block;
  width: 100%;
  height: auto;
  filter: drop-shadow(0 0.5rem 0.75rem rgb(0 0 0 / 0.5));
}

.tick {
  stroke: var(--tinta);
  stroke-linecap: round;
}

.tick--minor {
  stroke-width: 0.9;
  stroke-opacity: 0.55;
}

.tick--major {
  stroke-width: 2.4;
}

.numerals text {
  fill: var(--tinta);
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
}

.arc {
  fill: none;
  stroke: var(--dial-arc, var(--oro-sombra));
  stroke-width: 5;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.12s linear;
}

.hand {
  transform-origin: 100px 132px;
  transform: rotate(calc(var(--elapsed) * 360deg));
  transition: transform 0.12s linear;
}

.hand line {
  stroke: #7c2a22;
  stroke-width: 2;
  stroke-linecap: round;
}

.hand circle {
  fill: #c89b3c;
  stroke: #5c3f10;
  stroke-width: 1.5;
}

/* Cover: the hand never stops, like a clock on a wall. */
.dial--idle .hand {
  transition: none;
  animation: sweep 60s linear infinite;
}

@keyframes sweep {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Small clocks (the game bar on a phone) drop the numerals and the minute marks. */
@container (max-width: 8rem) {
  .numerals,
  .tick--minor {
    display: none;
  }

  .arc {
    stroke-width: 8;
  }
}
</style>
