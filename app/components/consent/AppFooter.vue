<script setup lang="ts">
const emit = defineEmits<{ 'open-cookie-settings': [] }>()
</script>

<template>
  <footer class="footer">
    <nav aria-label="Información legal" class="footer__nav">
      <NuxtLink to="/cookies">Cookies y privacidad</NuxtLink>
      <button type="button" class="footer__link" @click="emit('open-cookie-settings')">
        Configurar cookies
      </button>
    </nav>
  </footer>
</template>

<style scoped>
.footer {
  max-width: var(--measure);
  margin-inline: auto;
  padding: 0 1rem 2rem;
  font-size: 0.9375rem;
}

.footer__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.25rem;
}

.footer a,
.footer__link {
  padding: 0.5rem 0;
  border: 0;
  background: none;
  color: var(--azul);
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}
</style>
