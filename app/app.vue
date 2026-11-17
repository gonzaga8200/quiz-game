<script setup lang="ts">
useHead({
  titleTemplate: (title) =>
    title && title !== 'Contrarreloj' ? `${title} · Contrarreloj` : 'Contrarreloj',
})

const route = useRoute()
const consent = useConsent()

// Keep the game screen clear: no banner or footer on top of the answers.
const inGame = computed(() => route.path === '/jugar')

// Home and game spread over the width of a desktop screen; other pages keep a reading column.
const wide = computed(() => route.path === '/' || inGame.value)
</script>

<template>
  <a class="skip-link" href="#main">Saltar al contenido</a>
  <div class="shell" :class="{ 'shell--wide': wide }">
    <NuxtPage />
  </div>

  <AppFooter v-if="!inGame" :wide="wide" @open-cookie-settings="consent.reopen" />

  <ClientOnly>
    <template v-if="consent.bannerVisible.value && !inGame">
      <!-- Lets the page scroll up above the fixed banner so it never hides content. -->
      <div class="banner-spacer" aria-hidden="true" />
      <CookieBanner @accept="consent.accept" @reject="consent.reject" />
    </template>
  </ClientOnly>

  <NuxtRouteAnnouncer />
</template>

<style>
.banner-spacer {
  height: 22rem;
}
</style>
