<script setup lang="ts">
const emit = defineEmits<{ accept: []; reject: [] }>()
</script>

<template>
  <section class="banner" aria-labelledby="cookie-banner-title">
    <h2 id="cookie-banner-title" class="banner__title">Cookies y almacenamiento</h2>

    <p>
      Usamos almacenamiento técnico imprescindible para que funcione el inicio de sesión con Google
      y para recordar tus preferencias. Iniciar sesión no depende de lo que elijas aquí.
    </p>
    <p>
      ¿Nos dejas usar Google Analytics para medir cómo se usa el juego? Son datos estadísticos y no
      los usamos para publicidad.
    </p>

    <!-- Same style and size on purpose: accepting and rejecting must be equally easy. -->
    <div class="banner__actions">
      <button type="button" class="btn btn--secondary" @click="emit('accept')">Aceptar</button>
      <button type="button" class="btn btn--secondary" @click="emit('reject')">Rechazar</button>
    </div>

    <p class="banner__more">
      <NuxtLink to="/cookies">Más información en la política de cookies y privacidad</NuxtLink>
    </p>
  </section>
</template>

<style scoped>
.banner {
  position: fixed;
  inset-inline: 0.75rem;
  bottom: 0.75rem;
  z-index: 50;
  display: grid;
  gap: 0.625rem;
  max-width: 38rem;
  margin-inline: auto;
  padding: 1rem;
  border: 3px solid var(--tinta);
  border-radius: var(--radius-card);
  background: var(--papel);
  box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 0.55);
  color: var(--tinta);
  font-size: 0.9375rem;
}

.banner a {
  color: var(--enlace-papel);
}

.banner__title {
  font-size: 1.375rem;
}

.banner__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.banner__more {
  font-size: 0.875rem;
}
</style>
