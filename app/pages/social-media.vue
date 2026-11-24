<script setup lang="ts">
import SocialLinks from '~/components/social/SocialLinks.vue'

useHead({ title: 'Social Media' })
useSeoMeta({
  description:
    'Las cuentas de Contrarreloj en Instagram y X: preguntas nuevas y novedades del juego.',
})
</script>

<template>
  <main id="main" tabindex="-1" class="social-page">
    <header class="social-page__intro">
      <h1 class="social-page__title">Social Media</h1>
      <p>Síguenos. Preguntas nuevas y novedades de Contrarreloj, también en redes.</p>
    </header>

    <SocialLinks size="full" />
  </main>
</template>

<style scoped>
.social-page {
  display: grid;
  gap: 1.5rem;
}

.social-page__intro {
  display: grid;
  gap: 0.75rem;
  max-width: 36rem;
}

.social-page__title {
  font-size: clamp(2.25rem, 9vw, 3.25rem);
  color: var(--oro-claro);
  text-shadow: 0 2px 0 rgb(0 0 0 / 0.5);
}

.social-page__intro p {
  color: var(--crema-suave);
  font-size: 1.0625rem;
}
</style>
