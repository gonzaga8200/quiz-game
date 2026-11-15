<script setup lang="ts">
import { computed } from 'vue'
import type { DifficultyFilter, Duration } from '~~/core'
import type { SubmissionState } from '~/types/ranking'

const props = defineProps<{
  state: SubmissionState
  duration: Duration
  filter: DifficultyFilter
}>()

const emit = defineEmits<{ retry: [] }>()

const boardLabel = computed(
  () =>
    `${props.duration} segundos, ${
      props.filter === 'Aleatorio'
        ? 'dificultad aleatoria'
        : `dificultad ${props.filter.toLowerCase()}`
    }`,
)
</script>

<template>
  <section class="result" aria-labelledby="ranking-result-title" aria-live="polite">
    <h2 id="ranking-result-title" class="result__title">Ranking</h2>

    <p v-if="state.status === 'idle' || state.status === 'saving'">Guardando tu puntuación…</p>

    <template v-else-if="state.status === 'done'">
      <p v-if="state.result.status === 'skipped'">Con 0 puntos no entras en el ranking.</p>

      <div v-else class="place">
        <p class="place__bib" aria-hidden="true">{{ state.result.position }}</p>
        <p>
          <template v-if="state.result.status === 'new-best'">
            <strong>Nuevo récord personal.</strong>
            Estás en el puesto {{ state.result.position }} del ranking de {{ boardLabel }}.
          </template>
          <template v-else>
            Tu mejor marca en el ranking de {{ boardLabel }} sigue siendo
            <strong>{{ state.result.best }} puntos</strong>, en el puesto
            {{ state.result.position }}.
          </template>
        </p>
      </div>
    </template>

    <div v-else role="alert" class="error">
      <p>No se ha podido guardar tu puntuación en el ranking.</p>
      <button type="button" class="btn btn--secondary" @click="emit('retry')">Reintentar</button>
    </div>
  </section>
</template>

<style scoped>
.result {
  padding: 1rem;
  border-radius: var(--radius-card);
  background: var(--papel);
}

.result__title {
  margin-bottom: 0.625rem;
  font-size: 1.5rem;
}

.place {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.place__bib {
  display: grid;
  flex: none;
  place-items: center;
  min-width: 4rem;
  height: 3.5rem;
  padding-inline: 0.5rem;
  border: 3px solid var(--asfalto);
  border-radius: 0.375rem;
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 800;
  font-size: 2.5rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.error {
  display: grid;
  gap: 0.75rem;
}
</style>
