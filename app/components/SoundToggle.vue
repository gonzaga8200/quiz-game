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
  border: 2px solid var(--asfalto);
  border-radius: 999px;
  background: var(--papel);
  color: var(--asfalto);
  cursor: pointer;
}

.sound-toggle:hover {
  background: #eef1f4;
}

/* Pressed means "muted": show it with a filled ground, not only the icon. */
.sound-toggle[aria-pressed='true'] {
  background: var(--asfalto);
  color: var(--papel);
}
</style>
