<script setup lang="ts">
import { CATEGORIES, categoryFromSlug, categoryUrlSlug } from '~~/core'
import { CATEGORY_COPY } from '~/content/categories'
import { QUESTIONS_PATH, SEO } from '~/content/seo'
import { loadCategoryPage, SHOWCASE_SIZE } from '~/utils/category-pages'
import { breadcrumbJsonLd, normalizeSiteUrl } from '~/utils/seo'

const route = useRoute()
const category = categoryFromSlug(route.params.categoria)
if (!category) {
  throw createError({ statusCode: 404, statusMessage: 'Página no encontrada', fatal: true })
}

const slug = categoryUrlSlug(category)
const copy = CATEGORY_COPY[category]
const sound = useSound()

// Rendered at build time; the data comes from the questions shipped with the app.
const { data } = await useAsyncData(`category-page:${slug}`, () => loadCategoryPage(category))
const total = computed(() => data.value?.total ?? 0)
const items = computed(() => data.value?.items ?? [])

const playUrl = `/jugar?modo=arcade&categoria=${slug}`
const others = CATEGORIES.filter((other) => other !== category)
const lower = category.toLowerCase()

const socialTitle = `${copy.title} · ${SEO.name}`
useSeoMeta({
  title: copy.title,
  description: copy.description,
  ogTitle: socialTitle,
  ogDescription: copy.description,
  twitterTitle: socialTitle,
  twitterDescription: copy.description,
})

const siteUrl = normalizeSiteUrl(useRuntimeConfig().public.siteUrl, SEO.defaultSiteUrl)
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: breadcrumbJsonLd(siteUrl, [
        { name: 'Inicio', path: '/' },
        { name: 'Preguntas', path: QUESTIONS_PATH },
        { name: category, path: `${QUESTIONS_PATH}/${slug}` },
      ]),
    },
  ],
})
</script>

<template>
  <main id="main" tabindex="-1" class="cat">
    <nav class="crumbs" aria-label="Migas de pan">
      <NuxtLink to="/">Inicio</NuxtLink>
      <span aria-hidden="true">/</span>
      <NuxtLink :to="QUESTIONS_PATH">Preguntas</NuxtLink>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{{ category }}</span>
    </nav>

    <header class="cat__head">
      <h1 class="cat__title">{{ copy.heading }}</h1>
      <p v-for="paragraph in copy.intro" :key="paragraph">{{ paragraph }}</p>
      <p class="cat__count">
        En el juego hay {{ total }} preguntas de {{ lower }}. Aquí ves {{ items.length }}, de las
        más fáciles a las más difíciles.
      </p>
      <NuxtLink class="btn btn--primary btn--large" :to="playUrl" @click="sound.unlock()">
        Jugar con preguntas de {{ lower }}
      </NuxtLink>
    </header>

    <section v-if="items.length > 0" aria-labelledby="lista">
      <h2 id="lista" class="cat__subtitle">
        {{ items.length === SHOWCASE_SIZE ? `${SHOWCASE_SIZE} preguntas` : 'Preguntas' }} de
        {{ lower }} con respuesta
      </h2>
      <ol class="list">
        <li v-for="item in items" :key="item.id" class="item">
          <h3 class="item__question">{{ item.text }}</h3>
          <p class="item__answer">
            <strong>Respuesta:</strong>
            {{ item.answer }}
          </p>
          <p class="item__explanation">{{ item.explanation }}</p>
          <p class="item__level">Dificultad: {{ item.difficulty }}</p>
        </li>
      </ol>
    </section>

    <section class="cta" aria-labelledby="cta-title">
      <h2 id="cta-title" class="cat__subtitle">¿Cuántas aciertas en 60 segundos?</h2>
      <NuxtLink class="btn btn--primary btn--large" :to="playUrl" @click="sound.unlock()">
        Jugar con preguntas de {{ lower }}
      </NuxtLink>
    </section>

    <nav class="more" aria-labelledby="more-title">
      <h2 id="more-title" class="cat__subtitle">Más preguntas con respuestas</h2>
      <ul>
        <li v-for="other in others" :key="other">
          <NuxtLink :to="`${QUESTIONS_PATH}/${categoryUrlSlug(other)}`">
            {{ CATEGORY_COPY[other].title }}
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="QUESTIONS_PATH">Todas las categorías</NuxtLink>
        </li>
      </ul>
    </nav>
  </main>
</template>

<style scoped>
.cat {
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

.cat__head {
  display: grid;
  gap: 0.875rem;
  max-width: 65ch;
}

.cat__head .btn {
  justify-self: start;
}

.cat__title {
  font-size: clamp(2.25rem, 9vw, 3.25rem);
}

.cat__count {
  color: var(--crema-suave);
}

.cat__subtitle {
  margin-bottom: 0.75rem;
  font-size: 1.75rem;
}

.list {
  display: grid;
  gap: 0.875rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: grid;
  gap: 0.375rem;
  padding: 1rem;
  border-radius: var(--radius-card);
  background: var(--papel);
  color: var(--tinta);
}

.item__question {
  font-family: var(--font-body);
  font-size: 1.125rem;
  font-style: normal;
  font-weight: 700;
  line-height: 1.3;
}

.item__answer strong {
  color: var(--acierto);
}

.item__explanation {
  color: var(--tinta-suave);
}

.item__level {
  color: var(--tinta-suave);
  font-size: 0.875rem;
}

.cta {
  display: grid;
  justify-items: start;
}

.more ul {
  display: grid;
  gap: 0.25rem;
  margin: 0;
  padding-left: 1.25rem;
}

.more a {
  color: var(--oro-claro);
  font-weight: 700;
}
</style>
