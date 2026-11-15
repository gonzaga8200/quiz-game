<script setup lang="ts">
import { ref } from 'vue'
import type { RankingEntry } from '~~/core'

defineProps<{
  entries: readonly RankingEntry[]
  currentUid: string | null
}>()

// Avatars come from Google; if one fails to load, fall back to the player's initial.
const broken = ref(new Set<string>())
function markBroken(uid: string): void {
  broken.value = new Set(broken.value).add(uid)
}
</script>

<template>
  <ol class="list">
    <li
      v-for="(entry, index) in entries"
      :key="entry.uid"
      class="row"
      :class="{ 'row--me': entry.uid === currentUid }"
      :aria-current="entry.uid === currentUid ? 'true' : undefined"
    >
      <span class="bib" aria-hidden="true">{{ index + 1 }}</span>
      <span class="sr-only">Puesto {{ index + 1 }}:</span>

      <img
        v-if="entry.photoURL && !broken.has(entry.uid)"
        class="avatar"
        :src="entry.photoURL"
        alt=""
        width="40"
        height="40"
        loading="lazy"
        referrerpolicy="no-referrer"
        @error="markBroken(entry.uid)"
      />
      <span v-else class="avatar avatar--initial" aria-hidden="true">
        {{ entry.displayName.slice(0, 1).toLocaleUpperCase('es') }}
      </span>

      <span class="name">
        {{ entry.displayName }}
        <span v-if="entry.uid === currentUid" class="you">(tú)</span>
      </span>
      <span class="points">
        {{ entry.points }}
        <span class="sr-only">puntos</span>
      </span>
    </li>
  </ol>
</template>

<style scoped>
.list {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.875rem 0.5rem 0.5rem;
  border: 2px solid transparent;
  border-radius: var(--radius-option);
  background: var(--papel);
}

.row--me {
  border-color: var(--azul);
}

/* Race number, like the bib pinned on a rider's back. */
.bib {
  display: grid;
  flex: none;
  place-items: center;
  min-width: 2.75rem;
  height: 2.25rem;
  padding-inline: 0.375rem;
  border: 2px solid var(--asfalto);
  border-radius: 0.25rem;
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 800;
  font-size: 1.5rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.avatar {
  flex: none;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  object-fit: cover;
}

.avatar--initial {
  display: grid;
  place-items: center;
  background: var(--asfalto);
  color: var(--papel);
  font-weight: 700;
}

.name {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  font-weight: 700;
}

.you {
  font-weight: 400;
}

.points {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 800;
  font-size: 1.75rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
</style>
