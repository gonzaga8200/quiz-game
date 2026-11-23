<script setup lang="ts" generic="T extends string | number">
import IconCheck from './icons/IconCheck.vue'

defineProps<{
  legend: string
  name: string
  options: readonly { value: T; label: string; hint?: string }[]
}>()

const model = defineModel<T>({ required: true })
</script>

<template>
  <fieldset class="group">
    <legend class="group__legend">{{ legend }}</legend>
    <div class="group__grid">
      <label v-for="option in options" :key="String(option.value)" class="choice">
        <input
          v-model="model"
          class="choice__input"
          type="radio"
          :name="name"
          :value="option.value"
        />
        <span class="choice__body">
          <span class="choice__check" aria-hidden="true"
            ><IconCheck v-if="model === option.value"
          /></span>
          <span class="choice__text">
            <span class="choice__label">{{ option.label }}</span>
            <span v-if="option.hint" class="choice__hint">{{ option.hint }}</span>
          </span>
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

.group__grid {
  display: grid;
  /* Two columns fit both the 2-option and the 4-option groups, on a phone and on a desktop. */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  /* Every button as tall as the tallest, whether or not its hint wraps. */
  grid-auto-rows: 1fr;
  gap: 0.625rem;
}

.choice {
  display: block;
  cursor: pointer;
}

/* The native radio stays in the DOM for keyboard and screen-reader behaviour. */
.choice__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.choice__body {
  display: flex;
  height: 100%;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.75rem;
  padding: 0.5rem 0.875rem;
  border: 2px solid var(--papel-borde);
  border-radius: var(--radius-option);
  background: var(--papel);
  color: var(--tinta);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.choice:hover .choice__body {
  border-color: var(--oro-sombra);
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

.choice__text {
  display: grid;
}

.choice__label {
  font-weight: 700;
}

.choice__hint {
  font-size: 0.875rem;
}

.choice__input:checked + .choice__body {
  border-color: var(--oro-sombra);
  background: var(--oro);
  color: var(--tinta);
}

.choice__input:checked + .choice__body .choice__check {
  border-color: var(--tinta);
  background: var(--tinta);
  color: var(--oro-claro);
}

.choice__input:focus-visible + .choice__body {
  outline: 3px solid var(--oro-claro);
  outline-offset: 3px;
  box-shadow: 0 0 0 3px var(--tinta);
}
</style>
