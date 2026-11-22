import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ReportScreen from '../../app/components/report/ReportScreen.vue'
import { answerRight, answerWrong, makeBank, startGame } from '../core/helpers'

// The confetti is not what these tests are about (and needs a canvas).
vi.mock('../../app/utils/confetti', () => ({ fireCelebration: vi.fn() }))

const URL = 'https://contrarreloj-quiz.web.app/'

/** A finished game with at least one right answer. */
function winningReport() {
  const { game, clock } = startGame(makeBank('medio', 3))
  answerRight(game)
  clock.advance(61_000)
  game.tick()
  return game.report()!
}

/** A finished game with no points at all (a wrong "medio" answer costs nothing). */
function scorelessReport() {
  const { game, clock } = startGame(makeBank('medio', 3))
  answerWrong(game)
  clock.advance(61_000)
  game.tick()
  return game.report()!
}

const shareButton = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('button').find((b) => b.text() === 'Compartir resultado')

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ReportScreen sharing', () => {
  it('offers to share a result that scored, once it knows where the link goes', () => {
    const wrapper = mount(ReportScreen, { props: { report: winningReport(), shareUrl: URL } })
    expect(shareButton(wrapper)).toBeDefined()
  })

  it('does not offer it without points, or without a link', () => {
    expect(
      shareButton(mount(ReportScreen, { props: { report: scorelessReport(), shareUrl: URL } })),
    ).toBeUndefined()
    expect(shareButton(mount(ReportScreen, { props: { report: winningReport() } }))).toBeUndefined()
  })

  it('opens the share sheet with the result and the link, and says so', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share })
    const report = winningReport()
    const wrapper = mount(ReportScreen, { props: { report, category: 'Deportes', shareUrl: URL } })

    await shareButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(share).toHaveBeenCalledOnce()
    const [data] = share.mock.calls[0] as [{ text: string; url: string }]
    expect(data.url).toBe(URL)
    expect(data.text).toContain(
      `He conseguido ${report.points} puntos en Contrarreloj, el juego de preguntas contra el reloj (60 s, Deportes)`,
    )
    expect(wrapper.emitted('shared')).toEqual([['native']])
  })

  it('copies the result when the browser has no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const wrapper = mount(ReportScreen, { props: { report: winningReport(), shareUrl: URL } })

    await shareButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledOnce()
    expect(writeText.mock.calls[0]?.[0]).toContain(URL)
    expect(wrapper.find('[role="status"]').text()).toContain('Resultado copiado')
    expect(wrapper.emitted('shared')).toEqual([['copy']])
  })

  it('says it did not work when there is no way to share', async () => {
    vi.stubGlobal('navigator', {})
    const wrapper = mount(ReportScreen, { props: { report: winningReport(), shareUrl: URL } })

    await shareButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="status"]').text()).toContain('No se ha podido compartir')
    expect(wrapper.emitted('shared')).toBeUndefined()
  })

  it('stays quiet when the player closes the share sheet', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('closed', 'AbortError'))
    vi.stubGlobal('navigator', { share })
    const wrapper = mount(ReportScreen, { props: { report: winningReport(), shareUrl: URL } })

    await shareButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="status"]').text()).toBe('')
    expect(wrapper.emitted('shared')).toBeUndefined()
  })
})
