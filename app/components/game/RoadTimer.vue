<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  durationMs: number
  remainingMs: number
}>()

/** 0 at the start, 1 when time is up. */
const elapsed = computed(() => {
  if (props.durationMs <= 0) return 1
  return Math.min(1, Math.max(0, 1 - props.remainingMs / props.durationMs))
})
</script>

<template>
  <div class="road" aria-hidden="true" :style="{ '--elapsed': elapsed }">
    <!-- Decorative: the exact time is read from the clock next to it. -->
    <div class="road__ahead" />
    <div class="road__ridden" />
    <div class="road__rider" />
  </div>
</template>

<style scoped>
.road {
  position: relative;
  height: 1.5rem;
  margin-inline: 0.625rem; /* room for the rider at both ends */
}

/* Road still to ride: dashed centre line. */
.road__ahead {
  position: absolute;
  inset-inline: 0;
  top: 50%;
  height: 4px;
  transform: translateY(-50%);
  background: repeating-linear-gradient(90deg, var(--asfalto) 0 14px, transparent 14px 24px);
}

/* Road already ridden: solid, so it reads as "used up" even without colour. */
.road__ridden {
  position: absolute;
  left: 0;
  top: 50%;
  width: calc(var(--elapsed) * 100%);
  height: 8px;
  transform: translateY(-50%);
  border-radius: 4px;
  background: var(--azul);
  transition: width 0.12s linear;
}

.road__rider {
  position: absolute;
  left: calc(var(--elapsed) * 100%);
  top: 50%;
  width: 1.25rem;
  height: 1.25rem;
  transform: translate(-50%, -50%);
  border: 3px solid var(--asfalto);
  border-radius: 50%;
  background: var(--amarillo);
  transition: left 0.12s linear;
}
</style>
