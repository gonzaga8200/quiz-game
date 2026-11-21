<script setup lang="ts">
import { categoryUrlSlug } from '~~/core'
import { CATEGORY_COPY, HUB_COPY } from '~/content/categories'
import { QUESTIONS_PATH, SEO } from '~/content/seo'
import { loadHubPage } from '~/utils/category-pages'
import { breadcrumbJsonLd, normalizeSiteUrl } from '~/utils/seo'

const sound = useSound()

// Rendered at build time; the counts come from the questions shipped with the app.
const { data } = await useAsyncData('questions-hub', () => loadHubPage())
const entries = computed(() => data.value ?? [])

const socialTitle = `${HUB_COPY.title} · ${SEO.name}`
useSeoMeta({
  title: HUB_COPY.title,
  description: HUB_COPY.description,
  ogTitle: socialTitle,
  ogDescription: HUB_COPY.description,
  twitterTitle: socialTitle,
  twitterDescription: HUB_COPY.description,
})

const siteUrl = normalizeSiteUrl(useRuntimeConfig().public.siteUrl, SEO.defaultSiteUrl)
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: breadcrumbJsonLd(siteUrl, [
        { name: 'Inicio', path: '/' },
        { name: 'Preguntas', path: QUESTIONS_PATH },
      ]),
    },
  ],
})
</script>

<template>
  <main id="main" tabindex="-1" class="hub">
    <nav class="crumbs" aria-label="Migas de pan">
      <NuxtLink to="/">Inicio</NuxtLink>
      <span aria-hidden="true">/</span>
      <span aria-current="page">Preguntas</span>
    </nav>

    <header class="hub__head">
      <h1 class="hub__title">{{ HUB_COPY.heading }}</h1>
      <p v-for="paragraph in HUB_COPY.intro" :key="paragraph">{{ paragraph }}</p>
      <NuxtLink class="btn btn--primary btn--large" to="/jugar?modo=arcade" @click="sound.unlock()">
        Jugar con todas las categorías
      </NuxtLink>
    </header>

    <ul class="cards">
      <li v-for="entry in entries" :key="entry.category" class="card">
        <h2 class="card__title">
          <NuxtLink :to="`${QUESTIONS_PATH}/${categoryUrlSlug(entry.category)}`">
            {{ CATEGORY_COPY[entry.category].title }}
          </NuxtLink>
        </h2>
        <p>{{ CATEGORY_COPY[entry.category].blurb }}</p>
        <p class="card__count">{{ entry.total }} preguntas en el juego</p>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.hub {
  display: grid;
  gap: 1.75rem;
}

.crumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
  font-size: 0.9375rem;
  color: var(--crema-suave);
}

.crumbs a {
  color: var(--oro-claro);
  font-weight: 700;
}

.hub__head {
  display: grid;
  gap: 0.875rem;
  max-width: 65ch;
}

.hub__head .btn {
  justify-self: start;
}

.hub__title {
  font-size: clamp(2.25rem, 9vw, 3.25rem);
}

.cards {
  display: grid;
  gap: 0.875rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  display: grid;
  gap: 0.375rem;
  padding: 1rem;
  border-radius: var(--radius-card);
  background: var(--papel);
  color: var(--tinta);
}

.card__title {
  font-size: 1.5rem;
}

.card__title a {
  color: var(--enlace-papel);
}

.card__count {
  color: var(--tinta-suave);
  font-size: 0.9375rem;
}
</style>
