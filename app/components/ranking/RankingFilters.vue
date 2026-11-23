<script setup lang="ts">
import { DIFFICULTY_FILTERS, DURATIONS } from '~~/core'
import type { CategoryChoice, DifficultyFilter, Duration } from '~~/core'
import CategoryPicker from '../CategoryPicker.vue'
import SegmentedChoice from '../SegmentedChoice.vue'

/** The three choices that pick one of the 56 ranking boards. */
const duration = defineModel<Duration>('duration', { required: true })
const filter = defineModel<DifficultyFilter>('filter', { required: true })
const category = defineModel<CategoryChoice>('category', { required: true })

const durationOptions = DURATIONS.map((value) => ({ value, label: `${value} s` }))
const filterOptions = DIFFICULTY_FILTERS.map((value) => ({ value, label: value }))
</script>

<template>
  <form class="filters" aria-label="Elige el ranking" @submit.prevent>
    <div class="filters__row">
      <SegmentedChoice
        v-model="duration"
        class="filters__duration"
        legend="Tiempo"
        name="ranking-duration"
        :options="durationOptions"
      />
      <SegmentedChoice
        v-model="filter"
        class="filters__filter"
        legend="Dificultad"
        name="ranking-filter"
        :options="filterOptions"
      />
    </div>
    <CategoryPicker v-model="category" legend="Categoría" name="ranking-category" variant="chips" />
  </form>
</template>

<style scoped>
.filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
}

.filters__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
}

@media (min-width: 36rem) {
  .filters__row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 2.4fr);
  }
}
</style>
