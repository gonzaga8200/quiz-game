<script setup lang="ts">
import { CATEGORIES, RANDOM_CATEGORY } from '~~/core'
import type { CategoryChoice } from '~~/core'
import { categorySlug } from '~/utils/category'
import IconCheck from './icons/IconCheck.vue'

/**
 * One radio per category plus "Aleatorio" (every category). Each option carries the colour of
 * the bookmark that its questions wear on the game card, so the player already knows it.
 *  - `tiles`: big targets for the setup screen, with a check on the chosen one. They sit in
 *    two columns, so keep the number of categories + "Aleatorio" even.
 *  - `chips`: a compact strip for the ranking filters: one scrollable row on a phone.
 */
withDefaults(
  defineProps<{
    legend: string
    name: string
    variant?: 'tiles' | 'chips'
  }>(),
  { variant: 'tiles' },
)

const model = defineModel<CategoryChoice>({ required: true })

const options: readonly { value: CategoryChoice; label: string; tone: string }[] = [
  { value: RANDOM_CATEGORY, label: 'Aleatorio', tone: 'todas' },
  ...CATEGORIES.map((category) => ({
    value: category,
    label: category,
    tone: categorySlug(category),
  })),
]
</script>

<template>
  <fieldset class="group" :class="`group--${variant}`">
    <legend class="group__legend">{{ legend }}</legend>
    <div class="group__list">
      <label v-for="option in options" :key="option.value" class="choice" :data-tone="option.tone">
        <input
          v-model="model"
          class="choice__input"
          type="radio"
          :name="name"
          :value="option.value"
        />
        <span class="choice__body">
          <!-- The bookmark: the same ribbon that hangs from the question card. -->
          <span class="choice__ribbon" aria-hidden="true" />
          <span class="choice__text">
            <span class="choice__label">{{ option.label }}</span>
          </span>
          <span v-if="variant === 'tiles'" class="choice__check" aria-hidden="true"
            ><IconCheck v-if="model === option.value"
          /></span>
        </span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.group {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.group__legend {
  margin-bottom: 0.625rem;
  padding: 0;
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 800;
  font-size: 1.75rem;
  line-height: 1.1;
}

.choice {
  --cat: var(--cat-arte);

  /* Holds the hidden radio, so the scrolling strip clips it instead of widening the page. */
  position: relative;
  display: block;
  cursor: pointer;
}

.choice[data-tone='arte'] {
  --cat: var(--cat-arte);
}

.choice[data-tone='historia'] {
  --cat: var(--cat-historia);
}

.choice[data-tone='deportes'] {
  --cat: var(--cat-deportes);
}

.choice[data-tone='cine'] {
  --cat: var(--cat-cine);
}

.choice[data-tone='ciencias'] {
  --cat: var(--cat-ciencias);
}

.choice[data-tone='lengua'] {
  --cat: var(--cat-lengua);
}

.choice[data-tone='musica'] {
  --cat: var(--cat-musica);
}

/* "Aleatorio": a ribbon in every category colour at once. */
.choice[data-tone='todas'] {
  --cat: linear-gradient(
    180deg,
    var(--cat-arte) 0 14.28%,
    var(--cat-historia) 0 28.57%,
    var(--cat-deportes) 0 42.85%,
    var(--cat-cine) 0 57.14%,
    var(--cat-ciencias) 0 71.42%,
    var(--cat-lengua) 0 85.71%,
    var(--cat-musica) 0
  );
}

/* The native radio stays in the DOM for keyboard and screen-reader behaviour. */
.choice__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.choice__body {
  position: relative;
  display: flex;
  align-items: center;
  border: 2px solid var(--papel-borde);
  background: var(--papel);
  color: var(--tinta);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.choice__ribbon {
  position: absolute;
  background: var(--cat);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%);
}

.choice:hover .choice__body {
  border-color: var(--oro-sombra);
}

.choice__input:checked + .choice__body {
  border-color: var(--oro-sombra);
  background: var(--oro);
}

.choice__input:focus-visible + .choice__body {
  outline: 3px solid var(--oro-claro);
  outline-offset: 3px;
  box-shadow: 0 0 0 3px var(--tinta);
}

.choice__label {
  font-weight: 700;
}

/* --- Tiles ---------------------------------------------------------------------- */
/* "Aleatorio" plus the categories make an even number of tiles: two columns, no stray one. */
.group--tiles .group__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.625rem;
}

.group--tiles .choice__body {
  gap: 0.5rem;
  min-height: 3.75rem;
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  border-radius: var(--radius-option);
}

.group--tiles .choice__ribbon {
  top: -2px;
  left: 0.75rem;
  width: 1.125rem;
  height: 2rem;
}

.group--tiles .choice__text {
  display: grid;
  flex: 1;
  min-width: 0;
  line-height: 1.2;
}

.choice__check {
  display: grid;
  flex: none;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid var(--tinta);
  border-radius: 50%;
  font-size: 0.9rem;
  color: var(--papel);
}

.choice__input:checked + .choice__body .choice__check {
  background: var(--tinta);
  color: var(--oro-claro);
}

/* --- Chips ---------------------------------------------------------------------- */
.group--chips .group__legend {
  margin-bottom: 0.375rem;
  font-size: 1.25rem;
}

/* Phone: one row that scrolls sideways, fading out at the right edge to hint at more. */
.group--chips .group__list {
  display: flex;
  gap: 0.375rem;
  margin-inline: -1rem;
  padding: 0.25rem 1rem;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scroll-padding-inline: 1rem;
  scrollbar-width: none;
  -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 2.5rem), transparent);
  mask-image: linear-gradient(90deg, #000 calc(100% - 2.5rem), transparent);
}

.group--chips .group__list::-webkit-scrollbar {
  display: none;
}

.group--chips .choice {
  flex: none;
  scroll-snap-align: start;
}

.group--chips .choice__body {
  gap: 0.375rem;
  min-height: 2.75rem;
  padding: 0.25rem 0.875rem 0.25rem 0.625rem;
  border-radius: 999px;
  font-size: 0.9375rem;
  white-space: nowrap;
}

.group--chips .choice__ribbon {
  position: static;
  flex: none;
  width: 0.5rem;
  height: 1rem;
}

@media (min-width: 40rem) {
  .group--chips .group__list {
    flex-wrap: wrap;
    margin-inline: 0;
    padding-inline: 0;
    overflow: visible;
    -webkit-mask-image: none;
    mask-image: none;
  }
}
</style>
