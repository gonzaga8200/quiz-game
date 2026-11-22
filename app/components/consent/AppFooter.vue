<script setup lang="ts">
import { COPYRIGHT_NOTICE } from '~/content/legal'

defineProps<{ wide?: boolean }>()
const emit = defineEmits<{ 'open-cookie-settings': [] }>()
</script>

<template>
  <footer class="footer" :class="{ 'footer--wide': wide }">
    <nav aria-label="Información legal" class="footer__nav">
      <NuxtLink to="/preguntas">Preguntas con respuestas</NuxtLink>
      <NuxtLink to="/aviso-legal">Aviso legal</NuxtLink>
      <NuxtLink to="/cookies">Cookies y privacidad</NuxtLink>
      <button type="button" class="footer__link" @click="emit('open-cookie-settings')">
        Configurar cookies
      </button>
    </nav>
    <p class="footer__copyright">{{ COPYRIGHT_NOTICE }} · Contrarreloj</p>
  </footer>
</template>

<style scoped>
.footer {
  max-width: var(--measure);
  margin-inline: auto;
  padding: 0 1rem 2rem;
  font-size: 0.9375rem;
}

.footer--wide {
  max-width: var(--measure-wide);
}

.footer__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.25rem;
}

.footer__copyright {
  margin-top: 0.5rem;
  color: var(--crema-suave);
  font-size: 0.875rem;
}

.footer a,
.footer__link {
  padding: 0.5rem 0;
  border: 0;
  background: none;
  color: var(--oro-claro);
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}
</style>
