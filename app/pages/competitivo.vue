<script setup lang="ts">
import { DURATIONS, RANDOM_CATEGORY, categoryOfChoice } from '~~/core'
import type { CategoryChoice, DifficultyFilter, Duration } from '~~/core'
import { describeBoard } from '~/utils/format'

useHead({ title: 'Modo competitivo' })
definePageMeta({ middleware: 'auth' })

const setup = useGameSetup()
const sound = useSound()

const duration = ref<Duration>(60)
const filter = ref<DifficultyFilter>('Aleatorio')
const category = ref<CategoryChoice>(RANDOM_CATEGORY)

const durationOptions = DURATIONS.map((value) => ({ value, label: `${value} s` }))

const filterOptions: readonly { value: DifficultyFilter; label: string; hint?: string }[] = [
  { value: 'Aleatorio', label: 'Aleatorio' },
  { value: 'Fácil', label: 'Fácil', hint: 'Muy fácil y fácil' },
  { value: 'Medio', label: 'Medio', hint: 'Solo nivel medio' },
  { value: 'Difícil', label: 'Difícil', hint: 'Difícil y muy difícil' },
]

/** The ranking this game will count for, spelled out before the player commits to it. */
const board = computed(() =>
  describeBoard(duration.value, filter.value, categoryOfChoice(category.value)),
)

async function start(): Promise<void> {
  sound.unlock() // browsers only allow audio after a tap: this is that tap
  const chosen = categoryOfChoice(category.value)
  setup.value = {
    mode: 'competitive',
    duration: duration.value,
    filter: filter.value,
    ...(chosen ? { category: chosen } : {}),
  }
  await navigateTo('/jugar?modo=competitivo')
}
</script>

<template>
  <main id="main" tabindex="-1" class="setup">
    <header class="setup__head">
      <h1 class="setup__title">Modo competitivo</h1>
      <p>
        Tu puntuación entra en el ranking de la combinación de tiempo, dificultad y categoría que
        elijas.
      </p>
    </header>

    <form class="setup__form" @submit.prevent="start">
      <ChoiceGroup v-model="duration" legend="Tiempo" name="duration" :options="durationOptions" />
      <ChoiceGroup v-model="filter" legend="Dificultad" name="filter" :options="filterOptions" />
      <CategoryPicker v-model="category" legend="Categoría" name="category" />

      <div class="setup__actions">
        <!-- A recap that follows the choices: the player sees which ranking they are playing for. -->
        <p class="recap" aria-live="polite">
          <span class="recap__label">Juegas por el ranking de</span>
          <strong class="recap__board">{{ board }}</strong>
        </p>
        <button type="submit" class="btn btn--primary btn--large">Empezar partida</button>
        <NuxtLink class="btn btn--secondary" to="/">Volver al menú</NuxtLink>
      </div>
    </form>
  </main>
</template>

<style scoped>
.setup {
  display: grid;
  gap: 1.5rem;
}

.setup__title {
  margin-bottom: 0.375rem;
  font-size: clamp(2.5rem, 11vw, 3.5rem);
}

.setup__form {
  display: grid;
  gap: 1.75rem;
}

.setup__actions {
  display: grid;
  gap: 0.75rem;
}

.recap {
  display: grid;
  padding-left: 0.875rem;
  border-left: 3px solid var(--oro);
  color: var(--crema);
  line-height: 1.3;
}

.recap__label {
  color: var(--crema-suave);
  font-size: 0.9375rem;
}

.recap__board {
  font-size: 1.0625rem;
}
</style>
