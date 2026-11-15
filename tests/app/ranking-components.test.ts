import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RankingList from '../../app/components/ranking/RankingList.vue'
import RankingResult from '../../app/components/ranking/RankingResult.vue'
import RankingTabs from '../../app/components/ranking/RankingTabs.vue'
import type { BoardId, RankingEntry } from '../../core'

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

describe('RankingTabs', () => {
  const mountTabs = (modelValue: BoardId = '60_aleatorio') =>
    mount(RankingTabs, {
      props: { modelValue, 'onUpdate:modelValue': () => {} },
      attachTo: document.body,
    })

  it('renders one tab per duration and difficulty (8)', () => {
    const wrapper = mountTabs()
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(8)
    expect(tabs[0]?.text()).toContain('60 s')
    expect(tabs[0]?.text()).toContain('Aleatorio')
    expect(tabs[7]?.text()).toContain('120 s')
    expect(tabs[7]?.text()).toContain('Difícil')
    wrapper.unmount()
  })

  it('marks only the selected tab and makes it the only tab stop', () => {
    const wrapper = mountTabs('120_medio')
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.filter((t) => t.attributes('aria-selected') === 'true')).toHaveLength(1)
    expect(wrapper.find('#tab-120_medio').attributes('aria-selected')).toBe('true')
    expect(wrapper.find('#tab-120_medio').attributes('tabindex')).toBe('0')
    expect(wrapper.find('#tab-60_medio').attributes('tabindex')).toBe('-1')
    wrapper.unmount()
  })

  it('selects a tab on click', async () => {
    const wrapper = mountTabs()
    await wrapper.find('#tab-120_facil').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['120_facil']])
    wrapper.unmount()
  })

  it.each([
    ['ArrowRight', '60_facil'],
    ['ArrowDown', '60_facil'],
    ['ArrowLeft', '120_dificil'], // wraps around
    ['ArrowUp', '120_dificil'],
    ['End', '120_dificil'],
  ])('%s from the first tab selects %s', async (key, expected) => {
    const wrapper = mountTabs()
    await wrapper.find('#tab-60_aleatorio').trigger('keydown', { key })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([expected])
    wrapper.unmount()
  })

  it('Home jumps to the first tab from anywhere', async () => {
    const wrapper = mountTabs('120_medio')
    await wrapper.find('#tab-120_medio').trigger('keydown', { key: 'Home' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['60_aleatorio'])
    wrapper.unmount()
  })

  it('ignores other keys', async () => {
    const wrapper = mountTabs()
    await wrapper.find('#tab-60_aleatorio').trigger('keydown', { key: 'a' })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
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
