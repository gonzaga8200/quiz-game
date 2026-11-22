<script setup lang="ts">
import { categoryFromSlug } from '~~/core'
import { SEO } from '~/content/seo'
import { normalizeSiteUrl } from '~/utils/seo'
import { shareUrl } from '~/utils/share'
import type { GameReport, Question } from '~~/core'

useHead({ title: 'Jugando' })
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const savedSetup = useGameSetup()
const { load } = useQuestionBank()
const sound = useSound()
const submission = useScoreSubmission()
const analytics = useAnalytics()

// A shared link points at the page of the category that was played, or at the home page.
const siteUrl = normalizeSiteUrl(useRuntimeConfig().public.siteUrl, SEO.defaultSiteUrl)

// Arcade is fixed (60 s, random difficulty) and may be limited to one category with
// `?categoria=<slug>`; an unknown slug is ignored. Competitive options come from the setup
// screen and never take a category, because the ranking boards do not tell categories apart.
const setup = computed(() => {
  if (route.query.modo !== 'arcade') return savedSetup.value
  const category = categoryFromSlug(route.query.categoria)
  return category ? { ...ARCADE_SETUP, category } : ARCADE_SETUP
})

const status = ref<'loading' | 'ready' | 'error'>('loading')
const questions = shallowRef<readonly Question[]>([])
const report = shallowRef<GameReport | null>(null)
const run = ref(0) // changing it remounts <GamePlay> for a fresh game

async function loadQuestions(): Promise<void> {
  status.value = 'loading'
  try {
    questions.value = await load()
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
}

// Competitive games are saved to the ranking as soon as they end.
watch(report, (finished) => {
  if (finished && setup.value?.mode === 'competitive') void submission.submit(finished)
})

function playAgain(): void {
  sound.unlock()
  submission.reset()
  report.value = null
  run.value += 1
}

onMounted(() => {
  if (!setup.value) {
    // Opened directly (e.g. page reload in competitive mode): pick the options first.
    void navigateTo('/competitivo', { replace: true })
    return
  }
  void loadQuestions()
})
</script>

<template>
  <main id="main" tabindex="-1" class="play">
    <template v-if="setup">
      <p v-if="status === 'loading'" class="notice" aria-live="polite">Cargando preguntas…</p>

      <div v-else-if="status === 'error'" class="notice" role="alert">
        <p>No se han podido cargar las preguntas.</p>
        <div class="notice__actions">
          <button type="button" class="btn btn--primary" @click="loadQuestions">Reintentar</button>
          <NuxtLink class="btn btn--secondary" to="/">Volver al menú</NuxtLink>
        </div>
      </div>

      <ReportScreen
        v-else-if="report"
        :report="report"
        :category="setup.category"
        :share-url="shareUrl(siteUrl, setup.category)"
        @shared="
          (method) =>
            analytics.track('share', {
              method,
              content_type: 'game_result',
              mode: setup?.mode ?? 'arcade',
            })
        "
        @again="playAgain"
        @menu="navigateTo('/')"
      >
        <template v-if="setup.mode === 'competitive'" #ranking>
          <RankingResult
            :state="submission.state.value"
            :duration="setup.duration"
            :filter="setup.filter"
            @retry="submission.retry"
          />
        </template>
      </ReportScreen>

      <GamePlay
        v-else
        :key="run"
        :questions="questions"
        :filter="setup.filter"
        :duration="setup.duration"
        :category="setup.category"
        @finished="report = $event"
      />
    </template>
  </main>
</template>

<style scoped>
.notice {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: var(--radius-card);
  background: var(--papel);
  color: var(--tinta);
  font-weight: 700;
}

.notice__actions {
  display: grid;
  gap: 0.75rem;
}
</style>
