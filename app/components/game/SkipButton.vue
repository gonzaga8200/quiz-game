<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** Free skips remaining. */
  freeLeft: number
  /** Points the next skip costs once free skips are used up. */
  cost: number
  locked: boolean
}>()

const emit = defineEmits<{ skip: [] }>()

const isFree = computed(() => props.freeLeft > 0)

const accessibleName = computed(() => {
  if (isFree.value) {
    const noun = props.freeLeft === 1 ? 'pase gratis' : 'pases gratis'
    return `Pasar pregunta. Te quedan ${props.freeLeft} ${noun}.`
  }
  return `Pasar pregunta. Cuesta ${props.cost} ${props.cost === 1 ? 'punto' : 'puntos'}.`
})

function onClick(): void {
  if (!props.locked) emit('skip')
}
</script>

<template>
  <button
    type="button"
    class="skip"
    :class="isFree ? 'skip--free' : 'skip--paid'"
    :aria-label="accessibleName"
    :aria-disabled="locked"
    aria-keyshortcuts="P"
    @click="onClick"
  >
    <span class="skip__label">Pasar</span>
    <span v-if="isFree" class="skip__badge">
      {{ freeLeft === 1 ? 'Queda 1 gratis' : `Quedan ${freeLeft} gratis` }}
    </span>
    <span v-else class="skip__badge">
      <span aria-hidden="true">😅</span> −{{ cost }} {{ cost === 1 ? 'punto' : 'puntos' }}
    </span>
  </button>
</template>

<style scoped>
.skip {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 9.5rem;
  min-height: 3.5rem;
  padding: 0.375rem 1rem;
  border: 2px solid transparent;
  border-radius: var(--radius-control);
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.skip[aria-disabled='true'] {
  cursor: default;
}

.skip__label {
  font-size: 1.125rem;
}

.skip__badge {
  font-size: 0.875rem;
  font-weight: 400;
}

/* Free: light orange with dark text. */
.skip--free {
  border-color: var(--pasar-claro-borde);
  background: var(--pasar-claro);
  color: var(--tinta);
}

/* Costs points: dark orange with white text. */
.skip--paid {
  background: var(--pasar-oscuro);
  color: var(--papel);
}

.skip--paid:hover:not([aria-disabled='true']) {
  background: var(--pasar-oscuro-hover);
}
</style>
