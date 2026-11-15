import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AnswerOption from '../../app/components/game/AnswerOption.vue'
import GameHud from '../../app/components/game/GameHud.vue'
import QuestionCard from '../../app/components/game/QuestionCard.vue'
import RoadTimer from '../../app/components/game/RoadTimer.vue'
import SkipButton from '../../app/components/game/SkipButton.vue'
import type { AnswerFeedback } from '../../app/composables/useGameSession'
import { mulberry32, toPlayable } from '../../core'
import { makeQuestion } from '../core/helpers'

const question = toPlayable(
  makeQuestion({ id: 'capital-francia', options: ['París', 'Lyon', 'Marsella', 'Burdeos'] }),
  mulberry32(1),
)

const feedback = (overrides: Partial<AnswerFeedback>): AnswerFeedback => ({
  chosenIndex: 0,
  correctIndex: 0,
  correct: true,
  points: 7,
  bonus: 0,
  penalty: 0,
  ...overrides,
})

describe('AnswerOption', () => {
  const props = {
    letter: 'B',
    text: 'Júpiter',
    state: 'idle',
    locked: false,
    shortcut: '2 B',
  } as const

  it('shows the letter and the text and emits select on click', async () => {
    const wrapper = mount(AnswerOption, { props })
    expect(wrapper.text()).toContain('B')
    expect(wrapper.text()).toContain('Júpiter')
    await wrapper.trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('ignores clicks once locked, without disabling the button (focus stays)', async () => {
    const wrapper = mount(AnswerOption, { props: { ...props, locked: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.attributes('aria-disabled')).toBe('true')
    expect(wrapper.attributes('disabled')).toBeUndefined()
  })

  it.each([
    ['correct', 'Respuesta correcta'],
    ['wrong', 'Respuesta incorrecta'],
    ['revealed', 'Esta era la respuesta correcta'],
  ] as const)('announces the %s state in text, not only in colour', (state, text) => {
    const wrapper = mount(AnswerOption, { props: { ...props, state } })
    expect(wrapper.text()).toContain(text)
    expect(wrapper.find('svg').exists()).toBe(true) // tick or cross icon
  })

  it('has no state text and keeps the letter while idle', () => {
    const wrapper = mount(AnswerOption, { props })
    expect(wrapper.find('.sr-only').exists()).toBe(false)
    expect(wrapper.find('svg').exists()).toBe(false)
  })
})

describe('QuestionCard', () => {
  it('renders the question, category, difficulty and four options', () => {
    const wrapper = mount(QuestionCard, { props: { question, feedback: null } })
    expect(wrapper.text()).toContain('¿Cuál es la capital de Francia?')
    expect(wrapper.text()).toContain('Historia y Geografía')
    expect(wrapper.text()).toContain('medio')
    expect(wrapper.findAllComponents(AnswerOption)).toHaveLength(4)
    expect(wrapper.attributes('data-feedback')).toBe('none')
  })

  it('emits the index of the chosen option', async () => {
    const wrapper = mount(QuestionCard, { props: { question, feedback: null } })
    await wrapper.findAllComponents(AnswerOption)[2]!.trigger('click')
    expect(wrapper.emitted('answer')).toEqual([[2]])
  })

  it('tints green and ticks the choice when correct', () => {
    const wrapper = mount(QuestionCard, {
      props: {
        question,
        feedback: feedback({
          chosenIndex: question.correctIndex,
          correctIndex: question.correctIndex,
        }),
      },
    })
    expect(wrapper.attributes('data-feedback')).toBe('correct')
    const states = wrapper.findAllComponents(AnswerOption).map((o) => o.props('state'))
    expect(states.filter((s) => s === 'correct')).toHaveLength(1)
    expect(wrapper.text()).toContain('¡Correcto! +7')
  })

  it('adds the combo bonus to the summary', () => {
    const wrapper = mount(QuestionCard, {
      props: { question, feedback: feedback({ bonus: 2 }) },
    })
    expect(wrapper.text()).toContain('¡Correcto! +7 y +2 de racha')
  })

  it('tints red, marks the wrong choice and reveals the right answer', () => {
    const wrong = (question.correctIndex + 1) % 4
    const wrapper = mount(QuestionCard, {
      props: {
        question,
        feedback: feedback({
          correct: false,
          chosenIndex: wrong,
          correctIndex: question.correctIndex,
          points: 0,
          penalty: 2,
        }),
      },
    })
    expect(wrapper.attributes('data-feedback')).toBe('wrong')
    const options = wrapper.findAllComponents(AnswerOption)
    expect(options[wrong]!.props('state')).toBe('wrong')
    expect(options[question.correctIndex]!.props('state')).toBe('revealed')
    expect(wrapper.text()).toContain('Incorrecto −2')
  })

  it('says only "Incorrecto" when the wrong answer costs nothing', () => {
    const wrapper = mount(QuestionCard, {
      props: {
        question,
        feedback: feedback({ correct: false, chosenIndex: 1, correctIndex: 0, penalty: 0 }),
      },
    })
    expect(wrapper.text()).toContain('Incorrecto')
    expect(wrapper.text()).not.toContain('−')
  })

  it('locks the options while the feedback is showing', () => {
    const wrapper = mount(QuestionCard, { props: { question, feedback: feedback({}) } })
    for (const option of wrapper.findAllComponents(AnswerOption)) {
      expect(option.props('locked')).toBe(true)
    }
  })
})

describe('SkipButton', () => {
  it('is light orange and shows the free skips left', () => {
    const wrapper = mount(SkipButton, { props: { freeLeft: 2, cost: 0, locked: false } })
    expect(wrapper.classes()).toContain('skip--free')
    expect(wrapper.text()).toContain('Quedan 2 gratis')
    expect(wrapper.attributes('aria-label')).toBe('Pasar pregunta. Te quedan 2 pases gratis.')
  })

  it('uses the singular for the last free skip', () => {
    const wrapper = mount(SkipButton, { props: { freeLeft: 1, cost: 0, locked: false } })
    expect(wrapper.text()).toContain('Queda 1 gratis')
    expect(wrapper.attributes('aria-label')).toContain('1 pase gratis')
  })

  it('turns dark orange with a sweating emoji once it costs points', () => {
    const wrapper = mount(SkipButton, { props: { freeLeft: 0, cost: 1, locked: false } })
    expect(wrapper.classes()).toContain('skip--paid')
    expect(wrapper.text()).toContain('😅')
    expect(wrapper.text()).toContain('−1 punto')
    expect(wrapper.attributes('aria-label')).toBe('Pasar pregunta. Cuesta 1 punto.')
  })

  it('pluralises larger costs', () => {
    const wrapper = mount(SkipButton, { props: { freeLeft: 0, cost: 2, locked: false } })
    expect(wrapper.text()).toContain('−2 puntos')
  })

  it('emits skip, unless locked', async () => {
    const open = mount(SkipButton, { props: { freeLeft: 2, cost: 0, locked: false } })
    await open.trigger('click')
    expect(open.emitted('skip')).toHaveLength(1)

    const locked = mount(SkipButton, { props: { freeLeft: 2, cost: 0, locked: true } })
    await locked.trigger('click')
    expect(locked.emitted('skip')).toBeUndefined()
  })
})

describe('GameHud', () => {
  const base = { durationMs: 60_000, remainingMs: 42_000, score: 25, streak: 1 }

  it('shows the clock, the score and the streak', () => {
    const wrapper = mount(GameHud, { props: base })
    expect(wrapper.find('[role="timer"]').attributes('aria-label')).toBe('Tiempo restante: 0:42')
    expect(wrapper.text()).toContain('25')
    expect(wrapper.text()).toContain('Racha')
    expect(wrapper.attributes('data-urgent')).toBe('false')
  })

  it('turns urgent in the last ten seconds', () => {
    const wrapper = mount(GameHud, { props: { ...base, remainingMs: 10_000 } })
    expect(wrapper.attributes('data-urgent')).toBe('true')
  })

  it('hints how many answers are missing for the next combo bonus', () => {
    expect(mount(GameHud, { props: { ...base, streak: 0 } }).text()).toContain(
      'Te faltan 3 aciertos seguidos para +2',
    )
    expect(mount(GameHud, { props: { ...base, streak: 2 } }).text()).toContain(
      'Te falta 1 acierto seguido para +2',
    )
    expect(mount(GameHud, { props: { ...base, streak: 12 } }).text()).toContain(
      'Racha máxima de bonus alcanzada',
    )
  })
})

describe('RoadTimer', () => {
  const elapsedOf = (durationMs: number, remainingMs: number) =>
    mount(RoadTimer, { props: { durationMs, remainingMs } }).attributes('style')

  it('maps remaining time to how much road was ridden', () => {
    expect(elapsedOf(60_000, 60_000)).toContain('--elapsed: 0')
    expect(elapsedOf(60_000, 30_000)).toContain('--elapsed: 0.5')
    expect(elapsedOf(60_000, 0)).toContain('--elapsed: 1')
  })

  it('stays within bounds for out-of-range input', () => {
    expect(elapsedOf(60_000, -5_000)).toContain('--elapsed: 1')
    expect(elapsedOf(60_000, 90_000)).toContain('--elapsed: 0')
    expect(elapsedOf(0, 0)).toContain('--elapsed: 1')
  })

  it('is hidden from assistive technology (the clock carries the time)', () => {
    const wrapper = mount(RoadTimer, { props: { durationMs: 1, remainingMs: 1 } })
    expect(wrapper.attributes('aria-hidden')).toBe('true')
  })
})
