<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { BOARDS } from '~~/core'
import type { BoardId } from '~~/core'

const model = defineModel<BoardId>({ required: true })

const buttons = ref<HTMLButtonElement[]>([])

/** Arrow keys, Home and End move between tabs and select them (WAI-ARIA tabs pattern). */
async function onKeydown(event: KeyboardEvent, index: number): Promise<void> {
  const last = BOARDS.length - 1
  const target =
    event.key === 'ArrowRight' || event.key === 'ArrowDown'
      ? (index + 1) % BOARDS.length
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? (index - 1 + BOARDS.length) % BOARDS.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? last
            : null
  if (target === null) return
  event.preventDefault()
  const board = BOARDS[target]
  if (!board) return
  model.value = board.id
  await nextTick()
  buttons.value[target]?.focus()
}
</script>

<template>
  <div class="tabs" role="tablist" aria-label="Rankings por tiempo y dificultad">
    <button
      v-for="(board, index) in BOARDS"
      :id="`tab-${board.id}`"
      :key="board.id"
      :ref="(el) => (buttons[index] = el as HTMLButtonElement)"
      type="button"
      role="tab"
      class="tab"
      :aria-selected="model === board.id"
      aria-controls="ranking-panel"
      :tabindex="model === board.id ? 0 : -1"
      @click="model = board.id"
      @keydown="onKeydown($event, index)"
    >
      <span class="tab__time">{{ board.duration }} s</span>
      <span class="tab__filter">{{ board.filter }}</span>
    </button>
  </div>
</template>

<style scoped>
.tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.375rem;
}

.tab {
  display: grid;
  gap: 0;
  min-height: 3.5rem;
  padding: 0.375rem 0.25rem;
  border: 2px solid var(--papel-borde);
  border-radius: var(--radius-option);
  background: var(--papel);
  color: var(--tinta);
  text-align: center;
  cursor: pointer;
}

.tab:hover {
  border-color: var(--oro-sombra);
}

.tab__time {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 800;
  font-size: 1.25rem;
  line-height: 1.1;
}

.tab__filter {
  font-size: 0.875rem;
  font-weight: 700;
}

.tab[aria-selected='true'] {
  border-color: var(--oro-sombra);
  background: var(--oro);
  color: var(--tinta);
}

@media (max-width: 22.5rem) {
  .tab__filter {
    font-size: 0.8125rem;
  }
}
</style>
