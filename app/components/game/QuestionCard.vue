<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { DIFFICULTIES } from '~~/core'
import type { PlayableQuestion } from '~~/core'
import type { AnswerFeedback } from '~/composables/useGameSession'
import { categorySlug } from '~/utils/category'
import { formatSigned } from '~/utils/format'
import type { OptionState } from '~/types/game'
import AnswerOption from './AnswerOption.vue'

const props = defineProps<{
  question: PlayableQuestion
  feedback: AnswerFeedback | null
}>()

const emit = defineEmits<{ answer: [index: number] }>()

const LETTERS = ['A', 'B', 'C', 'D']

const heading = ref<HTMLElement | null>(null)

const tint = computed(() => {
  if (!props.feedback) return 'none'
  return props.feedback.correct ? 'correct' : 'wrong'
})

const difficultyLevel = computed(() => DIFFICULTIES.indexOf(props.question.difficulty) + 1)

function stateOf(index: number): OptionState {
  const { feedback } = props
  if (!feedback) return 'idle'
  if (index === feedback.chosenIndex) return feedback.correct ? 'correct' : 'wrong'
  if (index === feedback.correctIndex) return 'revealed'
  return 'idle'
}

const summary = computed(() => {
  const { feedback } = props
  if (!feedback) return ''
  if (feedback.correct) {
    return feedback.bonus > 0
      ? `¡Correcto! ${formatSigned(feedback.points)} y ${formatSigned(feedback.bonus)} de racha`
      : `¡Correcto! ${formatSigned(feedback.points)}`
  }
  return feedback.penalty > 0 ? `Incorrecto ${formatSigned(-feedback.penalty)}` : 'Incorrecto'
})

// Move focus to the new question so keyboard and screen-reader users land on it.
function focusQuestion(): void {
  heading.value?.focus({ preventScroll: true })
}
onMounted(focusQuestion)
watch(
  () => props.question.id,
  () => setTimeout(focusQuestion, 0),
)
</script>

<template>
  <section
    class="card"
    :data-feedback="tint"
    :data-category="categorySlug(question.category)"
    aria-labelledby="question-text"
  >
    <!-- The bookmark: its colour tells the category at a glance; the name is in the tag. -->
    <span class="card__ribbon" aria-hidden="true" />

    <div class="card__tags">
      <span class="tag">{{ question.category }}</span>
      <span class="tag">
        <span class="pips" aria-hidden="true">
          <span
            v-for="level in DIFFICULTIES.length"
            :key="level"
            class="pip"
            :class="{ 'pip--on': level <= difficultyLevel }"
          />
        </span>
        <span class="sr-only">Dificultad:</span>
        {{ question.difficulty }}
      </span>
    </div>

    <h2 id="question-text" ref="heading" class="card__question" tabindex="-1">
      {{ question.text }}
    </h2>

    <div class="card__orn" aria-hidden="true" />

    <ol class="options" aria-label="Respuestas posibles">
      <li v-for="(text, index) in question.options" :key="`${question.id}-${index}`">
        <AnswerOption
          :letter="LETTERS[index] ?? ''"
          :text="text"
          :state="stateOf(index)"
          :locked="feedback !== null"
          :shortcut="`${index + 1} ${LETTERS[index] ?? ''}`"
          @select="emit('answer', index)"
        />
      </li>
    </ol>

    <!-- Visual summary only; the live region in the game screen announces the result. -->
    <p class="card__summary" :class="{ 'card__summary--hidden': !feedback }" aria-hidden="true">
      {{ summary || '\u00a0' }}
    </p>
  </section>
</template>

<style scoped>
/*
 * The card is a sheet of parchment: question in the middle, answers at the bottom, where
 * the thumb rests. On a tall phone the question area takes the spare height.
 */
.card {
  --cat: var(--cat-arte);

  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto auto auto;
  gap: 0.875rem;
  padding: 1.25rem 1rem 0.875rem;
  border: 2px solid var(--tinta);
  border-radius: var(--radius-card);
  background-color: var(--papel);
  /* Grain plus a darker, aged edge. */
  background-image:
    var(--grano-papel), radial-gradient(120% 90% at 50% 0%, transparent 55%, rgb(120 80 30 / 0.24));
  box-shadow: 0 0.75rem 1.75rem rgb(0 0 0 / 0.45);
  color: var(--tinta);
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease;
}

/* A fine inner rule, like the border of an old certificate. */
.card::after {
  content: '';
  position: absolute;
  inset: 0.3125rem;
  border: 1px solid rgb(142 106 30 / 0.55);
  border-radius: calc(var(--radius-card) - 2px);
  pointer-events: none;
}

.card[data-category='arte'] {
  --cat: var(--cat-arte);
}

.card[data-category='historia'] {
  --cat: var(--cat-historia);
}

.card[data-category='deportes'] {
  --cat: var(--cat-deportes);
}

.card[data-category='cine'] {
  --cat: var(--cat-cine);
}

.card[data-category='ciencias'] {
  --cat: var(--cat-ciencias);
}

.card[data-category='lengua'] {
  --cat: var(--cat-lengua);
}

.card[data-feedback='correct'] {
  border-color: var(--acierto-linea);
  background-color: var(--acierto-tinte);
}

.card[data-feedback='wrong'] {
  border-color: var(--fallo);
  background-color: var(--fallo-tinte);
}

/* Bookmark ribbon with a notch cut into its tail. */
.card__ribbon {
  position: absolute;
  z-index: 1;
  top: -0.5rem;
  left: 1.25rem;
  width: 1.75rem;
  height: 3.25rem;
  background:
    linear-gradient(90deg, rgb(255 255 255 / 0.18), transparent 45%, rgb(0 0 0 / 0.2)), var(--cat);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%);
}

.card__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.5rem;
  min-height: 2rem;
  padding-left: 2.75rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.125rem 0.625rem;
  border: 1px solid var(--papel-borde);
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pips {
  display: inline-flex;
  gap: 2px;
}

.pip {
  width: 0.4375rem;
  height: 0.75rem;
  border: 1.5px solid var(--tinta);
  border-radius: 1px;
  transform: skewX(-14deg);
}

.pip--on {
  background: var(--tinta);
}

.card__question {
  align-self: center;
  font-family: var(--font-display);
  font-style: normal;
  font-weight: 700;
  font-size: clamp(1.375rem, 5.4vw, 1.875rem);
  line-height: 1.3;
  text-align: center;
  text-wrap: balance;
}

/* A hairline with a diamond in the middle, between the question and the answers. */
.card__orn {
  position: relative;
  height: 1px;
  margin-inline: 1rem;
  background: linear-gradient(90deg, transparent, var(--oro-sombra), transparent);
}

.card__orn::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.5rem;
  height: 0.5rem;
  background: var(--oro-sombra);
  transform: translate(-50%, -50%) rotate(45deg);
}

.options {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0.25rem;
  list-style: none;
}

.options li {
  display: grid;
}

.card__summary {
  min-height: 1.5em;
  font-weight: 700;
  text-align: center;
}

.card__summary--hidden {
  visibility: hidden;
}

.card[data-feedback='correct'] .card__summary {
  color: var(--acierto);
}

.card[data-feedback='wrong'] .card__summary {
  color: var(--fallo);
}

/* Roomy screens: the four answers form a 2 x 2 grid. */
@media (min-width: 40rem) {
  .card {
    padding: 1.5rem 1.75rem 1rem;
  }

  .options {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
