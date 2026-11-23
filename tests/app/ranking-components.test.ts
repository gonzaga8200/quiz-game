import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RankingList from '../../app/components/ranking/RankingList.vue'
import RankingResult from '../../app/components/ranking/RankingResult.vue'
import RankingFilters from '../../app/components/ranking/RankingFilters.vue'
import CategoryPicker from '../../app/components/CategoryPicker.vue'
import { describeBoard } from '../../app/utils/format'
import { CATEGORIES } from '../../core'
import type { CategoryChoice, DifficultyFilter, Duration, RankingEntry } from '../../core'

const entry = (
  uid: string,
  name: string,
  points: number,
  photoURL: string | null = null,
): RankingEntry => ({
  uid,
  displayName: name,
  photoURL,
  points,
  correct: 10,
  wrong: 0,
  skipped: 0,
  duration: 60,
  difficultyFilter: 'Medio',
  createdAt: '2026-01-01T00:00:00.000Z',
})

describe('RankingFilters', () => {
  const mountFilters = (
    props: { duration?: Duration; filter?: DifficultyFilter; category?: CategoryChoice } = {},
  ) =>
    mount(RankingFilters, {
      props: {
        duration: 60,
        filter: 'Aleatorio',
        category: 'Aleatorio',
        ...props,
        'onUpdate:duration': () => {},
        'onUpdate:filter': () => {},
        'onUpdate:category': () => {},
      },
      attachTo: document.body,
    })

  const radios = (wrapper: ReturnType<typeof mountFilters>, name: string) =>
    wrapper.findAll<HTMLInputElement>(`input[name="${name}"]`)

  it('offers the three choices: 2 times, 4 difficulties and every category plus "Aleatorio"', () => {
    const wrapper = mountFilters()
    expect(radios(wrapper, 'ranking-duration')).toHaveLength(2)
    expect(radios(wrapper, 'ranking-filter')).toHaveLength(4)
    expect(radios(wrapper, 'ranking-category')).toHaveLength(CATEGORIES.length + 1)
    wrapper.unmount()
  })

  it('checks the current choice in each group', () => {
    const wrapper = mountFilters({ duration: 120, filter: 'Medio', category: 'Ciencias' })
    const checked = (name: string) =>
      radios(wrapper, name)
        .filter((input) => input.element.checked)
        .map((input) => input.element.value)
    expect(checked('ranking-duration')).toEqual(['120'])
    expect(checked('ranking-filter')).toEqual(['Medio'])
    expect(checked('ranking-category')).toEqual(['Ciencias'])
    wrapper.unmount()
  })

  it('tells each model apart when the player picks something', async () => {
    const wrapper = mountFilters()
    await radios(wrapper, 'ranking-duration')[1]?.setValue()
    await radios(wrapper, 'ranking-filter')[3]?.setValue()
    await radios(wrapper, 'ranking-category')[5]?.setValue()
    expect(wrapper.emitted('update:duration')).toEqual([[120]])
    expect(wrapper.emitted('update:filter')).toEqual([['Difícil']])
    expect(wrapper.emitted('update:category')).toEqual([['Ciencias']])
    wrapper.unmount()
  })

  it('lists "Aleatorio" first and then every category', () => {
    const wrapper = mountFilters()
    expect(radios(wrapper, 'ranking-category').map((input) => input.element.value)).toEqual([
      'Aleatorio',
      ...CATEGORIES,
    ])
    wrapper.unmount()
  })
})

describe('CategoryPicker', () => {
  it('offers "Aleatorio" first and an even number of options, so the tiles never leave a stray one', () => {
    const wrapper = mount(CategoryPicker, {
      props: { modelValue: 'Aleatorio', legend: 'Categoría', name: 'c' },
    })
    const labels = wrapper.findAll('.choice__label').map((label) => label.text())
    expect(labels[0]).toBe('Aleatorio')
    expect(labels).toEqual(['Aleatorio', ...CATEGORIES])
    expect(labels.length % 2).toBe(0)
  })

  it('gives each category the colour of its bookmark', () => {
    const wrapper = mount(CategoryPicker, {
      props: { modelValue: 'Aleatorio', legend: 'Categoría', name: 'c' },
    })
    const tones = wrapper.findAll('.choice').map((choice) => choice.attributes('data-tone'))
    expect(tones).toEqual([
      'todas',
      'arte',
      'historia',
      'deportes',
      'cine',
      'ciencias',
      'lengua',
      'musica',
    ])
  })
})

describe('describeBoard', () => {
  it('names the board with time, difficulty and, when there is one, category', () => {
    expect(describeBoard(60, 'Aleatorio')).toBe('60 segundos, dificultad aleatoria')
    expect(describeBoard(120, 'Difícil', 'Ciencias')).toBe(
      '120 segundos, dificultad difícil, categoría Ciencias',
    )
  })
})

describe('RankingList', () => {
  const entries = [entry('ana', 'Ana', 120, 'https://x.example/a.png'), entry('luis', 'Luis', 90)]

  it('lists players in order with position, name and points', () => {
    const wrapper = mount(RankingList, { props: { entries, currentUid: null } })
    const rows = wrapper.findAll('li')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('Puesto 1')
    expect(rows[0]?.text()).toContain('Ana')
    expect(rows[0]?.text()).toContain('120')
    expect(rows[1]?.text()).toContain('Puesto 2')
  })

  it('highlights the current player', () => {
    const wrapper = mount(RankingList, { props: { entries, currentUid: 'luis' } })
    const rows = wrapper.findAll('li')
    expect(rows[1]?.attributes('aria-current')).toBe('true')
    expect(rows[1]?.text()).toContain('(tú)')
    expect(rows[0]?.attributes('aria-current')).toBeUndefined()
  })

  it('shows the avatar, or the initial when there is none or it fails to load', async () => {
    const wrapper = mount(RankingList, { props: { entries, currentUid: null } })
    expect(wrapper.findAll('img')).toHaveLength(1)
    expect(wrapper.findAll('.avatar--initial')[0]?.text()).toBe('L') // Luis has no photo

    await wrapper.find('img').trigger('error')
    expect(wrapper.findAll('img')).toHaveLength(0)
    expect(wrapper.findAll('.avatar--initial')).toHaveLength(2)
  })
})

describe('RankingResult', () => {
  const props = { duration: 60, filter: 'Aleatorio' } as const

  it('shows progress while saving', () => {
    expect(
      mount(RankingResult, { props: { ...props, state: { status: 'saving' } } }).text(),
    ).toContain('Guardando tu puntuación')
    expect(
      mount(RankingResult, { props: { ...props, state: { status: 'idle' } } }).text(),
    ).toContain('Guardando tu puntuación')
  })

  it('celebrates a new personal best with the position', () => {
    const wrapper = mount(RankingResult, {
      props: {
        ...props,
        state: { status: 'done', result: { status: 'new-best', best: 120, position: 3 } },
      },
    })
    expect(wrapper.text()).toContain('Nuevo récord personal')
    expect(wrapper.text()).toContain('puesto 3')
    expect(wrapper.text()).toContain('60 segundos, dificultad aleatoria')
  })

  it('names the category when the game was limited to one', () => {
    const wrapper = mount(RankingResult, {
      props: {
        ...props,
        category: 'Ciencias',
        state: { status: 'done', result: { status: 'new-best', best: 80, position: 2 } },
      },
    })
    expect(wrapper.text()).toContain('60 segundos, dificultad aleatoria, categoría Ciencias')
  })

  it('reminds the player of their best when this game did not beat it', () => {
    const wrapper = mount(RankingResult, {
      props: {
        duration: 120,
        filter: 'Difícil',
        state: { status: 'done', result: { status: 'kept', best: 200, position: 7 } },
      },
    })
    expect(wrapper.text()).toContain('200 puntos')
    expect(wrapper.text()).toContain('puesto 7')
    expect(wrapper.text()).toContain('120 segundos, dificultad difícil')
  })

  it('explains why a 0-point game is not ranked', () => {
    const wrapper = mount(RankingResult, {
      props: { ...props, state: { status: 'done', result: { status: 'skipped' } } },
    })
    expect(wrapper.text()).toContain('Con 0 puntos no entras en el ranking')
  })

  it('offers a retry when saving failed', async () => {
    const wrapper = mount(RankingResult, { props: { ...props, state: { status: 'error' } } })
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
