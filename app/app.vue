<script setup lang="ts">
useHead({
  titleTemplate: (title) =>
    title && title !== 'Contrarreloj' ? `${title} · Contrarreloj` : 'Contrarreloj',
})
</script>

<template>
  <a class="skip-link" href="#main">Saltar al contenido</a>
  <div class="shell">
    <NuxtPage />
  </div>
  <NuxtRouteAnnouncer />
</template>
