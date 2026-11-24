<script setup lang="ts">
import { SEO } from '~/content/seo'
import { absoluteUrl, normalizeSiteUrl } from '~/utils/seo'

const route = useRoute()
const consent = useConsent()

// The home page keeps the full descriptive title; every other page gets "Page · Contrarreloj".
useHead({
  titleTemplate: (title) => (title && title !== SEO.title ? `${title} · ${SEO.name}` : SEO.title),
})

// One canonical URL per page, always on the public origin (also on preview channels, so those
// never compete with production). Query strings such as `?modo=arcade` are dropped.
const siteUrl = normalizeSiteUrl(useRuntimeConfig().public.siteUrl, SEO.defaultSiteUrl)
const canonical = computed(() => absoluteUrl(siteUrl, route.path))
useHead({
  link: [{ rel: 'canonical', href: canonical }],
  meta: [{ property: 'og:url', content: canonical }],
})

// Keep the game screen clear: no banner or footer on top of the answers.
const inGame = computed(() => route.path === '/jugar')

// Home and game spread over the width of a desktop screen; other pages keep a reading column.
const wide = computed(() => route.path === '/' || inGame.value)
</script>

<template>
  <a class="skip-link" href="#main">Saltar al contenido</a>
  <div class="shell" :class="{ 'shell--wide': wide }">
    <AppHeader v-if="!inGame" />
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
