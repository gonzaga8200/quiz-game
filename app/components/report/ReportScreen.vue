<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Category, CelebrationTier, GameReport } from '~~/core'
import { fireCelebration } from '~/utils/confetti'
import { formatSigned } from '~/utils/format'
import { browserShareDeps, shareResult, shareText } from '~/utils/share'
import type { ShareOutcome } from '~/utils/share'
import ReportQuestionList from './ReportQuestionList.vue'

const props = defineProps<{
  report: GameReport
  category?: Category
  /** Where a shared link lands. Without it the share button is not shown. */
  shareUrl?: string
}>()
const emit = defineEmits<{ again: []; menu: []; shared: [method: 'native' | 'copy'] }>()

const TITLES: Record<CelebrationTier, string> = {
  trophy: '¡Resultado de campeón!',
  party: '¡Gran partida!',
  clap: '¡Buena partida!',
  thumbs: 'Nada mal',
  try: 'Sigue practicando',
}

const noQuestions = computed(
  () => props.report.rows.length === 0 && props.report.finishReason === 'exhausted',
)

const heading = computed(() => {
  if (noQuestions.value) return 'No hay preguntas con estas opciones'
  if (props.report.finishReason === 'exhausted') return '¡Has respondido todas las preguntas!'
  return TITLES[props.report.celebration.tier]
})

const title = ref<HTMLElement | null>(null)

// Sharing: only a result that scored, and only when the page knows where the link goes.
const canShare = computed(
  () => Boolean(props.shareUrl) && !noQuestions.value && props.report.points > 0,
)
const sharing = ref(false)
const shareStatus = ref('')

const SHARE_STATUS: Record<ShareOutcome, string> = {
  shared: '',
  cancelled: '',
  copied: 'Resultado copiado. Pégalo donde quieras.',
  failed: 'No se ha podido compartir. Inténtalo de nuevo.',
}

async function share(): Promise<void> {
  if (!props.shareUrl || sharing.value) return
  sharing.value = true
  shareStatus.value = ''
  const outcome = await shareResult(browserShareDeps(navigator), {
    text: shareText({
      points: props.report.points,
      duration: props.report.duration,
      filter: props.report.filter,
      emoji: props.report.celebration.emojis[0] ?? '',
      ...(props.category ? { category: props.category } : {}),
    }),
    url: props.shareUrl,
  })
  shareStatus.value = SHARE_STATUS[outcome]
  if (outcome === 'shared') emit('shared', 'native')
  if (outcome === 'copied') emit('shared', 'copy')
  sharing.value = false
}

const emoji = computed(() => props.report.celebration.emojis[0] ?? '')

const filterLabel = computed(() =>
  props.report.filter === 'Aleatorio'
    ? 'dificultad aleatoria'
    : `dificultad ${props.report.filter.toLowerCase()}`,
)

onMounted(() => {
  title.value?.focus({ preventScroll: true })
  if (!noQuestions.value) void fireCelebration(props.report.celebration)
})
</script>

<template>
  <div class="report">
    <header class="report__head">
      <p v-if="!noQuestions" class="report__emoji" aria-hidden="true">{{ emoji }}</p>
      <h1 ref="title" tabindex="-1" class="report__title">{{ heading }}</h1>
      <template v-if="!noQuestions">
        <p class="report__total">
          <span class="report__points">{{ report.points }}</span>
          <span class="report__unit">{{ report.points === 1 ? 'punto' : 'puntos' }}</span>
        </p>
        <p class="report__context">
          <template v-if="category"
            >Partida de {{ report.duration }} segundos de {{ category }}.</template
          >
          <template v-else>
            Partida de {{ report.duration }} segundos con {{ filterLabel }}.
          </template>
        </p>
      </template>
    </header>

    <template v-if="!noQuestions">
      <slot name="ranking" />

      <section class="panel" aria-labelledby="counts-title">
        <h2 id="counts-title" class="panel__title">Respuestas</h2>
        <dl class="counts">
          <div>
            <dt>Correctas</dt>
            <dd>{{ report.correct }}</dd>
          </div>
          <div>
            <dt>Incorrectas</dt>
            <dd>{{ report.wrong }}</dd>
          </div>
          <div>
            <dt>Pasadas</dt>
            <dd>{{ report.skipped }}</dd>
          </div>
          <div>
            <dt>Mejor racha</dt>
            <dd>{{ report.bestStreak }}</dd>
          </div>
        </dl>
      </section>

      <section class="panel" aria-labelledby="breakdown-title">
        <h2 id="breakdown-title" class="panel__title">Desglose de puntos</h2>
        <table class="breakdown">
          <tbody>
            <tr>
              <th scope="row">Aciertos</th>
              <td>{{ formatSigned(report.breakdown.correctPoints) }}</td>
            </tr>
            <tr v-for="line in report.breakdown.comboBonuses" :key="line.streak">
              <th scope="row">
                Racha de {{ line.streak }}
                <span class="breakdown__note">
                  ({{ line.count === 1 ? 'una vez' : `${line.count} veces` }})
                </span>
              </th>
              <td>{{ formatSigned(line.points) }}</td>
            </tr>
            <tr>
              <th scope="row">Penalización por fallos</th>
              <td>{{ formatSigned(-report.breakdown.wrongPenalty) }}</td>
            </tr>
            <tr>
              <th scope="row">Penalización por pasar</th>
              <td>{{ formatSigned(-report.breakdown.skipPenalty) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>{{ report.points }}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section aria-labelledby="questions-title">
        <h2 id="questions-title" class="panel__title panel__title--loose">Pregunta a pregunta</h2>
        <ReportQuestionList :rows="report.rows" />
      </section>
    </template>

    <p v-else class="report__empty">
      No hay preguntas para esta combinación. Prueba con otra dificultad.
    </p>

    <div class="report__actions">
      <button type="button" class="btn btn--primary btn--large" @click="emit('again')">
        Jugar de nuevo
      </button>
      <button
        v-if="canShare"
        type="button"
        class="btn btn--secondary btn--large"
        :disabled="sharing"
        @click="share"
      >
        Compartir resultado
      </button>
      <button type="button" class="btn btn--secondary btn--large" @click="emit('menu')">
        Volver al menú
      </button>
      <!-- Always in the page, so a screen reader announces the text when it changes. -->
      <p class="sr-only" role="status">{{ shareStatus }}</p>
      <p v-if="shareStatus" class="report__share-status" aria-hidden="true">{{ shareStatus }}</p>
    </div>
  </div>
</template>

<style scoped>
.report {
  display: grid;
  gap: 1.5rem;
}

.report__head {
  display: grid;
  gap: 0.375rem;
  padding-top: 0.5rem;
}

.report__emoji {
  font-size: 3.5rem;
  line-height: 1;
}

.report__title {
  font-size: clamp(2.25rem, 9vw, 3.25rem);
}

.report__total {
  display: flex;
  align-items: baseline;
  gap: 0.625rem;
}

.report__points {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 800;
  font-size: clamp(5rem, 24vw, 7.5rem);
  line-height: 0.9;
  font-variant-numeric: lining-nums tabular-nums;
}

.report__unit {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 600;
  font-size: 1.75rem;
}

.report__context {
  color: var(--crema-suave);
}

.panel {
  padding: 1rem;
  border-radius: var(--radius-card);
  background: var(--papel);
  color: var(--tinta);
}

.panel__title {
  margin-bottom: 0.75rem;
  font-size: 1.5rem;
}

.panel__title--loose {
  margin-bottom: 0.75rem;
}

.counts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr));
  gap: 0.75rem;
  margin: 0;
}

.counts dt {
  font-size: 0.9375rem;
  color: var(--tinta-suave);
}

.counts dd {
  margin: 0;
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 800;
  font-size: 2.25rem;
  line-height: 1.1;
  font-variant-numeric: lining-nums tabular-nums;
}

.breakdown {
  width: 100%;
  border-collapse: collapse;
}

.breakdown th,
.breakdown td {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--papel-linea);
  text-align: left;
}

.breakdown td {
  text-align: right;
  font-weight: 700;
  font-variant-numeric: lining-nums tabular-nums;
}

.breakdown th {
  font-weight: 400;
}

.breakdown__note {
  color: var(--tinta-suave);
}

.breakdown tfoot th,
.breakdown tfoot td {
  padding-top: 0.75rem;
  border-bottom: 0;
  border-top: 3px solid var(--tinta);
  font-weight: 700;
  font-size: 1.25rem;
}

.report__empty {
  padding: 1rem;
  border-radius: var(--radius-card);
  background: var(--papel);
  color: var(--tinta);
}

.report__actions {
  display: grid;
  gap: 0.75rem;
}

@media (min-width: 30rem) {
  .report__actions {
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  }
}

.report__share-status {
  grid-column: 1 / -1;
  color: var(--crema-suave);
  font-weight: 700;
}
</style>
