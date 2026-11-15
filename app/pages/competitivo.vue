<script setup lang="ts">
import { DURATIONS } from '~~/core'
import type { DifficultyFilter, Duration } from '~~/core'

useHead({ title: 'Modo competitivo' })

const setup = useGameSetup()
const sound = useSound()

const duration = ref<Duration>(60)
const filter = ref<DifficultyFilter>('Aleatorio')

const durationOptions = DURATIONS.map((value) => ({ value, label: `${value} segundos` }))

const filterOptions: readonly { value: DifficultyFilter; label: string; hint: string }[] = [
  { value: 'Aleatorio', label: 'Aleatorio', hint: 'Todas las dificultades' },
  { value: 'Fácil', label: 'Fácil', hint: 'Muy fácil y fácil' },
  { value: 'Medio', label: 'Medio', hint: 'Solo nivel medio' },
  { value: 'Difícil', label: 'Difícil', hint: 'Difícil y muy difícil' },
]

async function start(): Promise<void> {
  sound.unlock() // browsers only allow audio after a tap: this is that tap
  setup.value = { mode: 'competitive', duration: duration.value, filter: filter.value }
  await navigateTo('/jugar?modo=competitivo')
}
</script>

<template>
  <main id="main" tabindex="-1" class="setup">
    <header class="setup__head">
      <h1 class="setup__title">Modo competitivo</h1>
      <p>Tu puntuación entra en el ranking de la combinación de tiempo y dificultad que elijas.</p>
    </header>

    <form class="setup__form" @submit.prevent="start">
      <ChoiceGroup v-model="duration" legend="Tiempo" name="duration" :options="durationOptions" />
      <ChoiceGroup v-model="filter" legend="Dificultad" name="filter" :options="filterOptions" />

      <div class="setup__actions">
        <button type="submit" class="btn btn--primary btn--large">Comienzo</button>
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
</style>
