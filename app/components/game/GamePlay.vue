<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Category, DifficultyFilter, Duration, GameReport, Question } from '~~/core'
import { useGameSession } from '~/composables/useGameSession'
import { useSeenQuestions } from '~/composables/useSeenQuestions'
import { streakFx, vibrate } from '~/utils/fx'
import { actionForKey } from '~/utils/keyboard'
import FxLayer from './FxLayer.vue'
import type { LayerFx } from './FxLayer.vue'
import GameHud from './GameHud.vue'
import QuestionCard from './QuestionCard.vue'
import SkipButton from './SkipButton.vue'
import ReportQuestionDialog from '../feedback/ReportQuestionDialog.vue'
import IconReport from '../icons/IconReport.vue'
import SoundToggle from '../SoundToggle.vue'

const props = defineProps<{
  questions: readonly Question[]
  filter: DifficultyFilter
  duration: Duration
  category?: Category
}>()

const emit = defineEmits<{ finished: [report: GameReport] }>()

const sound = useSound()

// --- Visual feedback: a red flash on mistakes, a banner on streaks, a hit on the score -----
const fx = ref<LayerFx | null>(null)
const card = ref<{ $el: HTMLElement } | null>(null)
const hit = ref<{ id: number; amount: number } | null>(null)
const skipMessage = ref('')
let fxCount = 0
let fxTimer: ReturnType<typeof setTimeout> | undefined
let hitTimer: ReturnType<typeof setTimeout> | undefined
let jingleTimer: ReturnType<typeof setTimeout> | undefined

function showFx(
  next: LayerFx extends infer T ? (T extends LayerFx ? Omit<T, 'id'> : never) : never,
  ms: number,
): void {
  fxCount += 1
  fx.value = { ...next, id: fxCount } as LayerFx
  clearTimeout(fxTimer)
  fxTimer = setTimeout(() => (fx.value = null), ms)
}

/** Points just lost: the score tile in the bar flashes and shows the amount. */
function showHit(amount: number): void {
  fxCount += 1
  hit.value = { id: fxCount, amount }
  clearTimeout(hitTimer)
  hitTimer = setTimeout(() => (hit.value = null), 1400)
}

// The device remembers which questions it has shown, so a new game serves the least seen first.
const memory = useSeenQuestions()

const session = useGameSession({
  questions: props.questions,
  filter: props.filter,
  duration: props.duration,
  category: props.category,
  seen: memory.read(),
  onShown: (ids) => memory.save(ids, props.questions),
  effects: {
    onCorrect: () => sound.play('correct'),
    onWrong: () => sound.play('wrong'),
    onSkip: (penalty) => {
      sound.play('skip')
      skipMessage.value =
        penalty > 0
          ? `Pasas la pregunta. Pierdes ${penalty} ${penalty === 1 ? 'punto' : 'puntos'}.`
          : ''
      if (penalty > 0) showHit(penalty)
    },
    onFinish: (report) => {
      sound.play('end')
      emit('finished', report)
    },
  },
})
const { snapshot, question, remainingMs, feedback } = session

// --- Reporting a question: the clock stops while the dialog is open ----------------------
const reported = ref<{ id: string; text: string } | null>(null)

function openReport(): void {
  const q = question.value
  if (!q || reported.value || feedback.value) return
  reported.value = { id: q.id, text: q.text }
  session.pause()
}

function closeReport(): void {
  // Both the form and the dialog's own close event end here; only the first one counts.
  if (!reported.value) return
  reported.value = null
  session.resume()
}

// The feedback is set right after the score and streak are refreshed, so reading the
// snapshot here already gives the new streak.
watch(feedback, (fb) => {
  if (!fb) return
  skipMessage.value = ''
  if (!fb.correct) {
    showFx({ kind: 'wrong' }, 700)
    if (fb.penalty > 0) showHit(fb.penalty)
    vibrate([90, 50, 90])
    return
  }
  const cheer = streakFx(fb, snapshot.value.streak)
  if (!cheer) return
  // The banner rests on the top edge of the question text: above it, not over it.
  const anchorTop = card.value?.$el.querySelector('.card__question')?.getBoundingClientRect().top
  showFx({ kind: 'streak', anchorTop, ...cheer }, cheer.big ? 2200 : 1500)
  vibrate(cheer.big ? [40, 40, 40, 40, 160] : 40)
  if (cheer.big) jingleTimer = setTimeout(() => sound.play('streak'), 180)
})

/** A combo bonus was just earned: the card gets a gold glow while the feedback shows. */
const celebrate = computed(() => feedback.value?.correct === true && feedback.value.bonus > 0)

// --- Screen reader announcements -------------------------------------------------
const answerMessage = computed(() => {
  const fb = feedback.value
  const q = question.value
  if (!fb || !q) return ''
  if (fb.correct) {
    const bonus = fb.bonus > 0 ? ` y ${fb.bonus} de bonus por racha` : ''
    return `Correcto. ${fb.points} puntos${bonus}.`
  }
  const penalty =
    fb.penalty > 0 ? ` Pierdes ${fb.penalty} ${fb.penalty === 1 ? 'punto' : 'puntos'}.` : ''
  return `Incorrecto. La respuesta correcta era: ${q.options[fb.correctIndex]}.${penalty}`
})

const timeMessage = ref('')
watch(remainingMs, (now, before) => {
  for (const mark of [30, 10]) {
    if (before > mark * 1000 && now <= mark * 1000) timeMessage.value = `Quedan ${mark} segundos`
  }
})

const announcement = computed(() => answerMessage.value || skipMessage.value || timeMessage.value)

// --- Keyboard: 1-4 / A-D answer, P skips ------------------------------------------
function onKeydown(event: KeyboardEvent): void {
  // While the report is open, typing digits or P goes into the form, not into the game.
  if (reported.value) return
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return
  const q = question.value
  if (!q || feedback.value) return
  const action = actionForKey(event.key, q.options.length)
  if (!action) return
  event.preventDefault()
  if (action.type === 'answer') session.answer(action.index)
  else session.skip()
}

onMounted(() => {
  session.start()
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(fxTimer)
  clearTimeout(hitTimer)
  clearTimeout(jingleTimer)
  session.dispose()
})
</script>

<template>
  <div class="game">
    <GameHud
      class="game__hud"
      :duration-ms="duration * 1000"
      :remaining-ms="remainingMs"
      :score="snapshot.score"
      :streak="snapshot.streak"
      :hit="hit"
    />

    <QuestionCard
      v-if="question"
      ref="card"
      class="game__card"
      :question="question"
      :feedback="feedback"
      :data-celebrate="celebrate ? 'big' : undefined"
      @answer="session.answer"
    />

    <div class="game__actions">
      <SkipButton
        :free-left="snapshot.freeSkipsLeft"
        :cost="snapshot.skipCost"
        :locked="feedback !== null"
        @skip="session.skip()"
      />
      <div class="game__tools">
        <button
          type="button"
          class="game__report"
          title="Reportar esta pregunta"
          aria-label="Reportar esta pregunta"
          :disabled="!question || feedback !== null || reported !== null"
          @click="openReport"
        >
          <IconReport />
        </button>
        <SoundToggle />
      </div>
    </div>

    <ReportQuestionDialog
      :open="reported !== null"
      :question-id="reported?.id ?? ''"
      :question-text="reported?.text ?? ''"
      @close="closeReport"
    />

    <p class="game__shortcuts">Con teclado: 1 a 4 o A a D para responder, P para pasar.</p>

    <FxLayer :fx="fx" />

    <p class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement }}</p>
  </div>
</template>

<style scoped>
/*
 * Phone: bar on top, the card takes the spare height (question in the middle, answers at
 * the bottom) and "Pasar" sits under it, all within thumb reach.
 * Desktop: the card on the left and the clock panel on the right.
 */
.game {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 0.625rem;
  /* The shell adds 1rem on top and 3rem below. */
  min-height: calc(100dvh - 4rem);
}

.game__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.game__tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Quiet by design: a small flag that only shows up where the player looks for it. */
.game__report {
  display: inline-grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--nogal-borde);
  border-radius: 999px;
  background: transparent;
  color: var(--crema-suave);
  cursor: pointer;
}

.game__report:hover:not(:disabled) {
  border-color: var(--crema-suave);
  color: var(--crema);
}

.game__report:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.game__shortcuts {
  display: none;
  font-size: 0.875rem;
  color: var(--crema-suave);
}

/* Only show keyboard hints where a keyboard is likely. */
@media (hover: hover) and (pointer: fine) {
  .game__shortcuts {
    display: block;
  }
}

@media (min-width: 56rem) {
  .game {
    grid-template-columns: minmax(0, 1fr) 17rem;
    grid-template-rows: auto auto 1fr;
    grid-template-areas:
      'card hud'
      'actions hud'
      'shortcuts hud';
    align-items: start;
    column-gap: 1.5rem;
    min-height: 0;
  }

  .game__card {
    grid-area: card;
  }

  .game__hud {
    grid-area: hud;
    position: sticky;
    top: 1rem;
  }

  .game__actions {
    grid-area: actions;
  }

  .game__shortcuts {
    grid-area: shortcuts;
  }
}
</style>
