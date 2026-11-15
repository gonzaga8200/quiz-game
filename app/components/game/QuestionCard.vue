<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { DIFFICULTIES } from '~~/core'
import type { PlayableQuestion } from '~~/core'
import type { AnswerFeedback } from '~/composables/useGameSession'
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
  <section class="card" :data-feedback="tint" aria-labelledby="question-text">
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
.card {
  display: grid;
  gap: 1rem;
  padding: 1.25rem 1rem 1rem;
  border: 3px solid var(--papel);
  border-radius: var(--radius-card);
  background: var(--papel);
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease;
}

.card[data-feedback='correct'] {
  border-color: var(--acierto-linea);
  background: var(--acierto-tinte);
}

.card[data-feedback='wrong'] {
  border-color: var(--fallo);
  background: var(--fallo-tinte);
}

.card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.125rem 0.625rem;
  border: 1.5px solid var(--asfalto);
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 700;
}

.pips {
  display: inline-flex;
  gap: 2px;
}

.pip {
  width: 0.4375rem;
  height: 0.75rem;
  border: 1.5px solid var(--asfalto);
  border-radius: 1px;
  transform: skewX(-14deg);
}

.pip--on {
  background: var(--asfalto);
}

.card__question {
  font-family: var(--font-body);
  font-style: normal;
  font-weight: 700;
  font-size: clamp(1.375rem, 5.2vw, 1.75rem);
  line-height: 1.25;
  text-wrap: balance;
}

.options {
  display: grid;
  gap: 0.625rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card__summary {
  min-height: 1.5em;
  font-weight: 700;
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
</style>
