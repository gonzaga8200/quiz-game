<script setup lang="ts">
import { LEGAL } from '~/content/legal'
</script>

<template>
  <p v-if="LEGAL.email">
    Contacto:
    <a :href="`mailto:${LEGAL.email}`">{{ LEGAL.email }}</a>
    .
  </p>
  <p v-else>
    Contacto:
    <a :href="LEGAL.contact" rel="noopener">{{ LEGAL.contact }}</a>
    . {{ LEGAL.contactHint }}
  </p>
</template>
