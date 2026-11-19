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
    :data-letter="letter"
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
/*
 * Two independent axes: the slot (A to D) gives the button its fixed colour, and the
 * state (idle, correct, wrong, revealed) adds a border, an icon and a dimming on top.
 * The result never depends on hue: solid ring + tick means right, dashed ring + cross
 * means wrong, and the buttons that do not matter fade out.
 */
.option {
  --tono: var(--resp-a);
  --tono-texto: var(--resp-a-texto);

  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 3.25rem;
  padding: 0.375rem 0.75rem 0.375rem 0.375rem;
  border: 3px solid rgb(0 0 0 / 0.28);
  border-radius: var(--radius-option);
  background: var(--tono);
  color: var(--tono-texto);
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: left;
  cursor: pointer;
  transition:
    filter 0.15s ease,
    opacity 0.2s ease,
    transform 0.1s ease;
}

.option[data-letter='A'] {
  --tono: var(--resp-a);
  --tono-texto: var(--resp-a-texto);
}

.option[data-letter='B'] {
  --tono: var(--resp-b);
  --tono-texto: var(--resp-b-texto);
}

.option[data-letter='C'] {
  --tono: var(--resp-c);
  --tono-texto: var(--resp-c-texto);
}

.option[data-letter='D'] {
  --tono: var(--resp-d);
  --tono-texto: var(--resp-d-texto);
}

@media (hover: hover) {
  .option:hover:not([aria-disabled='true']) {
    filter: brightness(1.12);
  }
}

.option:active:not([aria-disabled='true']) {
  transform: translateY(1px);
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
  border-radius: 0.375rem;
  background: var(--tinta);
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

/* Answered: the buttons that are neither the choice nor the right answer fade out. */
.option--idle[aria-disabled='true'] {
  opacity: 0.5;
}

/* Right answer (chosen, or revealed after a mistake): a solid cream border with a dark ring. */
.option--correct,
.option--revealed {
  border-color: var(--papel);
  box-shadow: 0 0 0 3px var(--tinta);
}

.option--correct .option__mark,
.option--revealed .option__mark {
  background: var(--papel);
  color: var(--acierto);
  font-size: 1.5rem;
}

/* Wrong choice: the same ring, but dashed, plus the cross and the shake. */
.option--wrong {
  border-style: dashed;
  border-color: var(--papel);
  box-shadow: 0 0 0 3px var(--tinta);
}

.option--wrong .option__mark {
  background: var(--papel);
  color: var(--fallo);
  font-size: 1.5rem;
}

/* The whole card shakes (see QuestionCard), so the button itself only gets a quick throb. */
@media (prefers-reduced-motion: no-preference) {
  .option--wrong {
    animation: throb 0.5s ease-in-out;
  }
}

@keyframes throb {
  30% {
    transform: scale(1.04);
  }
  60% {
    transform: scale(0.98);
  }
}
</style>
