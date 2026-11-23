<script setup lang="ts">
import { RANDOM_CATEGORY, boardId, categoryOfChoice } from '~~/core'
import type { BoardId, CategoryChoice, DifficultyFilter, Duration, RankingEntry } from '~~/core'
import { describeBoard } from '~/utils/format'

useHead({ title: 'Ranking' })

type Status = 'loading' | 'ready' | 'empty' | 'error' | 'unavailable'

const CACHE_MS = 60_000

const { configured } = useFirebase()
const { user } = useAuth()
const { get } = useRankingService()

const duration = ref<Duration>(60)
const filter = ref<DifficultyFilter>('Aleatorio')
const category = ref<CategoryChoice>(RANDOM_CATEGORY)

const board = computed<BoardId>(() =>
  boardId(duration.value, filter.value, categoryOfChoice(category.value)),
)
const status = ref<Status>(configured ? 'loading' : 'unavailable')
const entries = shallowRef<readonly RankingEntry[]>([])

// Switching back and forth between tabs should not re-read 50 documents every time.
const cache = new Map<BoardId, { at: number; entries: readonly RankingEntry[] }>()

const heading = computed(() =>
  describeBoard(duration.value, filter.value, categoryOfChoice(category.value)),
)

async function loadBoard(id: BoardId): Promise<void> {
  if (!configured) return
  const hit = cache.get(id)
  if (hit && Date.now() - hit.at < CACHE_MS) {
    entries.value = hit.entries
    status.value = hit.entries.length > 0 ? 'ready' : 'empty'
    return
  }

  status.value = 'loading'
  try {
    const service = await get()
    const top = await service.top(id)
    if (board.value !== id) return // the player already moved to another tab
    cache.set(id, { at: Date.now(), entries: top })
    entries.value = top
    status.value = top.length > 0 ? 'ready' : 'empty'
  } catch {
    if (board.value === id) status.value = 'error'
  }
}

watch(board, (id) => void loadBoard(id))
onMounted(() => void loadBoard(board.value))
</script>

<template>
  <main id="main" tabindex="-1" class="ranking">
    <header class="ranking__head">
      <h1 class="ranking__title">Ranking</h1>
      <p>Las 50 mejores puntuaciones de cada combinación de tiempo, dificultad y categoría.</p>
    </header>

    <RankingFilters
      v-model:duration="duration"
      v-model:filter="filter"
      v-model:category="category"
    />

    <section class="panel" aria-labelledby="ranking-heading" :aria-busy="status === 'loading'">
      <h2 id="ranking-heading" class="panel__title" aria-live="polite">{{ heading }}</h2>

      <p v-if="status === 'loading'" aria-live="polite">Cargando el ranking…</p>

      <p v-else-if="status === 'unavailable'">El ranking no está disponible en este momento.</p>

      <div v-else-if="status === 'error'" role="alert" class="panel__error">
        <p>No se ha podido cargar el ranking.</p>
        <button type="button" class="btn btn--secondary" @click="loadBoard(board)">
          Reintentar
        </button>
      </div>

      <p v-else-if="status === 'empty'">
        Todavía no hay puntuaciones aquí. Juega en modo competitivo para ser el primero.
      </p>

      <RankingList v-else :entries="entries" :current-uid="user?.uid ?? null" />
    </section>

    <NuxtLink class="btn btn--secondary" to="/">Volver al menú</NuxtLink>
  </main>
</template>

<style scoped>
.ranking {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.25rem;
}

.ranking__title {
  margin-bottom: 0.375rem;
  font-size: clamp(2.5rem, 11vw, 3.5rem);
}

.panel {
  display: grid;
  gap: 0.75rem;
  min-height: 12rem;
}

.panel__title {
  font-size: 1.5rem;
}

.panel__error {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: var(--radius-card);
  background: var(--papel);
  color: var(--tinta);
}
</style>
