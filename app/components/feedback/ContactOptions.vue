<script setup lang="ts">
import { LEGAL } from '~/content/legal'
import { CONTACT_REASONS, mailtoHref } from '~/utils/feedback'

// Each reason opens the visitor's mail app with its subject filled in. The body stays empty:
// the visitor writes whatever they want.
const options = CONTACT_REASONS.map((reason) => ({
  key: reason.key,
  label: reason.label,
  href: mailtoHref(LEGAL.email, reason.subject),
}))
</script>

<template>
  <ul class="options">
    <li v-for="option in options" :key="option.key">
      <a class="btn btn--secondary btn--large options__link" :href="option.href">
        {{ option.label }}
      </a>
    </li>
  </ul>
</template>

<style scoped>
.options {
  display: grid;
  gap: 0.875rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.options__link {
  justify-content: flex-start;
  width: 100%;
  padding-block: 0.875rem;
  text-align: left;
  text-decoration: none;
}
</style>
