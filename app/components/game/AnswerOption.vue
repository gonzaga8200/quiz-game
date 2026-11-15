<script setup lang="ts">
import type { OptionState } from '~/types/game'
import IconCheck from '../icons/IconCheck.vue'
import IconCross from '../icons/IconCross.vue'

const props = defineProps<{
  letter: string
  text: string
  state: OptionState
  /** True once the question was answered; clicks are then ignored (focus is kept). */
  locked: boolean
  shortcut: string
}>()

const emit = defineEmits<{ select: [] }>()

function onClick(): void {
  if (!props.locked) emit('select')
}
</script>

<template>
  <button
    type="button"
    class="option"
    :class="`option--${state}`"
    :aria-disabled="locked"
    :aria-keyshortcuts="shortcut"
    @click="onClick"
  >
    <span class="option__mark" aria-hidden="true">
      <IconCheck v-if="state === 'correct' || state === 'revealed'" />
      <IconCross v-else-if="state === 'wrong'" />
      <template v-else>{{ letter }}</template>
    </span>
    <span class="option__text">{{ text }}</span>
    <span v-if="state === 'correct'" class="sr-only">Respuesta correcta</span>
    <span v-else-if="state === 'wrong'" class="sr-only">Respuesta incorrecta</span>
    <span v-else-if="state === 'revealed'" class="sr-only">Esta era la respuesta correcta</span>
  </button>
</template>

<style scoped>
.option {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  width: 100%;
  min-height: 3.75rem;
  padding: 0.625rem 0.875rem 0.625rem 0.625rem;
  border: 2px solid var(--cemento-borde);
  border-radius: var(--radius-option);
  background: var(--papel);
  color: var(--asfalto);
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.25;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.option:hover:not([aria-disabled='true']) {
  border-color: var(--azul);
}

.option[aria-disabled='true'] {
  cursor: default;
}

/* Letter chip, replaced by a tick or a cross once the question is answered. */
.option__mark {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: var(--asfalto);
  color: var(--papel);
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 800;
  font-size: 1.375rem;
  line-height: 1;
}

.option__text {
  flex: 1;
  overflow-wrap: anywhere;
}

.option--correct {
  border-color: var(--acierto);
  background: var(--acierto);
  color: var(--papel);
}

.option--correct .option__mark {
  background: var(--papel);
  color: var(--acierto);
  font-size: 1.5rem;
}

.option--wrong {
  border-color: var(--fallo);
  background: var(--fallo);
  color: var(--papel);
}

.option--wrong .option__mark {
  background: var(--papel);
  color: var(--fallo);
  font-size: 1.5rem;
}

/* The right answer revealed after a mistake: outlined, not filled, so the wrong
   choice stays the loudest thing on screen. */
.option--revealed {
  border: 4px solid var(--acierto);
  padding: calc(0.625rem - 2px) calc(0.875rem - 2px) calc(0.625rem - 2px) calc(0.625rem - 2px);
  background: var(--papel);
}

.option--revealed .option__mark {
  background: var(--acierto);
  color: var(--papel);
  font-size: 1.5rem;
}

@media (prefers-reduced-motion: no-preference) {
  .option--wrong {
    animation: shake 0.42s ease-in-out;
  }
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20%,
  60% {
    transform: translateX(-7px);
  }
  40%,
  80% {
    transform: translateX(7px);
  }
}
</style>
