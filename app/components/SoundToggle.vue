<script setup lang="ts">
import IconSound from './icons/IconSound.vue'

const { muted, toggle } = useSound()
</script>

<template>
  <button
    type="button"
    class="sound-toggle"
    :aria-pressed="muted"
    :aria-label="muted ? 'Activar sonido' : 'Silenciar sonido'"
    @click="toggle"
  >
    <ClientOnly>
      <IconSound :muted="muted" />
      <template #fallback><IconSound :muted="false" /></template>
    </ClientOnly>
  </button>
</template>

<style scoped>
.sound-toggle {
  display: inline-grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border: 2px solid var(--tinta);
  border-radius: 999px;
  background: var(--papel);
  color: var(--tinta);
  cursor: pointer;
}

.sound-toggle:hover {
  background: var(--papel-oscuro);
}

/* Pressed means "muted": show it with a dark ground, not only the icon. */
.sound-toggle[aria-pressed='true'] {
  border-color: var(--crema-suave);
  background: var(--nogal-alto);
  color: var(--crema-suave);
}
</style>
