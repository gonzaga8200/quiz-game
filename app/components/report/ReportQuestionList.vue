<script setup lang="ts">
import type { ReportRow } from '~~/core'
import { formatSeconds } from '~/utils/format'
import IconCheck from '../icons/IconCheck.vue'
import IconCross from '../icons/IconCross.vue'

defineProps<{ rows: readonly ReportRow[] }>()

const RESULT_LABEL = { correct: 'Correcta', wrong: 'Incorrecta', skipped: 'Pasada' } as const
</script>

<template>
  <ol class="rows">
    <li v-for="row in rows" :key="row.id" class="row" :class="`row--${row.result}`">
      <div class="row__head">
        <span class="badge" :class="`badge--${row.result}`">
          <IconCheck v-if="row.result === 'correct'" />
          <IconCross v-else-if="row.result === 'wrong'" />
          <span v-else aria-hidden="true">↷</span>
          {{ RESULT_LABEL[row.result] }}
        </span>
        <span class="row__meta">
          {{ row.category }}, {{ row.difficulty }}, {{ formatSeconds(row.timeMs) }}
        </span>
      </div>

      <p class="row__text">{{ row.text }}</p>

      <template v-if="row.result !== 'correct'">
        <p v-if="row.chosenAnswer" class="row__answer">
          Tu respuesta: <strong>{{ row.chosenAnswer }}</strong>
        </p>
        <p class="row__answer">
          Respuesta correcta: <strong>{{ row.correctAnswer }}</strong>
        </p>
        <p class="row__explanation">{{ row.explanation }}</p>
      </template>
    </li>
  </ol>
</template>

<style scoped>
.rows {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style-position: inside;
}

.row {
  display: grid;
  gap: 0.375rem;
  padding: 0.875rem 1rem;
  border-left: 6px solid var(--cemento-borde);
  border-radius: var(--radius-option);
  background: var(--papel);
}

.row--correct {
  border-left-color: var(--acierto-linea);
}

.row--wrong {
  border-left-color: var(--fallo);
}

.row--skipped {
  border-left-style: dashed;
  border-left-color: var(--pasar-oscuro);
}

.row__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.75rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 700;
  font-size: 0.9375rem;
}

.badge--correct {
  color: var(--acierto);
}

.badge--wrong {
  color: var(--fallo);
}

.badge--skipped {
  color: var(--pasar-oscuro);
}

.row__meta {
  font-size: 0.875rem;
  color: var(--asfalto-suave);
}

.row__text {
  font-weight: 700;
}

.row__answer {
  font-size: 0.9375rem;
}

.row__explanation {
  font-size: 0.9375rem;
  color: var(--asfalto-suave);
}
</style>
