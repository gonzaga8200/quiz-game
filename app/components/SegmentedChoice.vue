<script setup lang="ts" generic="T extends string | number">
/** A short row of radios drawn as one segmented bar: for two to four options that fit side by side. */
defineProps<{
  legend: string
  name: string
  options: readonly { value: T; label: string }[]
}>()

const model = defineModel<T>({ required: true })
</script>

<template>
  <fieldset class="seg">
    <legend class="seg__legend">{{ legend }}</legend>
    <div class="seg__bar" :style="{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }">
      <label v-for="option in options" :key="String(option.value)" class="seg__option">
        <input v-model="model" class="seg__input" type="radio" :name="name" :value="option.value" />
        <span class="seg__label">{{ option.label }}</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.seg {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.seg__legend {
  margin-bottom: 0.375rem;
  padding: 0;
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 800;
  font-size: 1.25rem;
  line-height: 1.1;
}

.seg__bar {
  display: grid;
  gap: 2px;
  padding: 2px;
  border: 2px solid var(--papel-borde);
  border-radius: var(--radius-option);
  background: var(--papel-borde);
}

.seg__option {
  position: relative;
  display: block;
  cursor: pointer;
}

.seg__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.seg__label {
  display: grid;
  place-items: center;
  min-height: 2.75rem;
  padding: 0.25rem;
  border-radius: calc(var(--radius-option) - 3px);
  background: var(--papel);
  color: var(--tinta);
  font-size: 0.9375rem;
  font-weight: 700;
  text-align: center;
  transition: background-color 0.15s ease;
}

.seg__option:hover .seg__label {
  background: var(--papel-oscuro);
}

.seg__input:checked + .seg__label {
  background: var(--oro);
}

.seg__input:focus-visible + .seg__label {
  outline: 3px solid var(--oro-claro);
  outline-offset: 3px;
  box-shadow: 0 0 0 3px var(--tinta);
}
</style>
