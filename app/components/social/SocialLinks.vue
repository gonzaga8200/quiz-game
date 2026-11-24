<script setup lang="ts">
import { SOCIAL_NETWORKS } from '~/content/social'
import IconInstagram from '../icons/IconInstagram.vue'
import IconX from '../icons/IconX.vue'

/** `compact` sits under the home actions; `full` is the Social Media page. */
withDefaults(defineProps<{ size?: 'compact' | 'full' }>(), { size: 'compact' })

const NETWORKS = SOCIAL_NETWORKS
</script>

<template>
  <ul class="social" :class="`social--${size}`" aria-label="Redes sociales de Contrarreloj">
    <li v-for="network in NETWORKS" :key="network.key">
      <a class="social__link" :href="network.href" target="_blank" rel="noopener noreferrer">
        <IconInstagram v-if="network.key === 'instagram'" class="social__icon" />
        <IconX v-else class="social__icon" />
        <span class="social__text">
          <span class="social__name">{{ network.name }}</span>
          <span class="social__handle">{{ network.handle }}</span>
          <span v-if="size === 'full'" class="social__blurb">{{ network.blurb }}</span>
        </span>
        <span class="sr-only"> (se abre en una pestaña nueva)</span>
      </a>
    </li>
  </ul>
</template>

<style scoped>
.social {
  display: grid;
  gap: 0.625rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.social__link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.25rem;
  padding: 0.5rem 0.875rem;
  border: 1px solid var(--nogal-borde);
  border-radius: var(--radius-control);
  background: var(--nogal-alto);
  color: var(--crema);
  text-decoration: none;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.social__link:hover {
  border-color: var(--oro);
  background: var(--nogal-borde);
}

.social__icon {
  flex: none;
  color: var(--oro-claro);
}

.social__text {
  display: grid;
  min-width: 0;
}

.social__name {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 800;
  font-size: 1.125rem;
  line-height: 1.1;
}

.social__handle {
  color: var(--crema-suave);
  font-size: 0.9375rem;
}

.social__blurb {
  margin-top: 0.25rem;
  color: var(--crema-suave);
}

/* Compact: two side by side on wide phones and desktop, one per row on narrow screens. */
.social--compact {
  grid-template-columns: 1fr;
}

.social--compact .social__link {
  min-height: 3rem;
  padding-block: 0.375rem;
}

.social--compact .social__name {
  font-size: 1rem;
}

.social--compact .social__handle {
  font-size: 0.875rem;
}

@media (min-width: 26rem) {
  .social--compact {
    grid-template-columns: 1fr 1fr;
  }
}

.social--full {
  grid-template-columns: 1fr;
}

@media (min-width: 40rem) {
  .social--full {
    grid-template-columns: 1fr 1fr;
  }
}

.social--full .social__link {
  align-items: flex-start;
  padding: 1.125rem 1.25rem;
}

.social--full .social__icon {
  margin-top: 0.25rem;
}

.social--full .social__name {
  font-size: 1.5rem;
}
</style>
