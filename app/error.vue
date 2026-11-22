<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const notFound = computed(() => props.error.statusCode === 404)
const title = computed(() => (notFound.value ? 'Página no encontrada' : 'Algo ha fallado'))

// An error page must never be indexed.
useHead({ title, meta: [{ name: 'robots', content: 'noindex' }] })

function backToMenu(): Promise<void> {
  return clearError({ redirect: '/' })
}
</script>

<template>
  <div class="shell">
    <main id="main" tabindex="-1" class="error">
      <h1 class="error__title">{{ title }}</h1>
      <p v-if="notFound">La página que buscas no existe o ha cambiado de sitio.</p>
      <p v-else>No se ha podido mostrar esta página. Inténtalo de nuevo en un momento.</p>
      <button type="button" class="btn btn--primary btn--large" @click="backToMenu">
        Volver al menú
      </button>
    </main>
  </div>
</template>

<style scoped>
.error {
  display: grid;
  gap: 1.25rem;
  padding-top: 3rem;
}

.error__title {
  font-size: clamp(2.5rem, 11vw, 3.5rem);
}
</style>
