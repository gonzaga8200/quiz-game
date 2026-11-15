<script setup lang="ts">
defineProps<{ muted: boolean }>()
</script>

<template>
  <svg
    class="icon"
    viewBox="0 0 24 24"
    width="1.25em"
    height="1.25em"
    fill="none"
    stroke="currentColor"
    stroke-width="2.2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
    <template v-if="muted">
      <path d="M16 9.5 21 14.5M21 9.5 16 14.5" />
    </template>
    <template v-else>
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6" />
      <path d="M18.3 6.5a8 8 0 0 1 0 11" />
    </template>
  </svg>
</template>

<style scoped>
.icon {
  flex: none;
}
</style>
