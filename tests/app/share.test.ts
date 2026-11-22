import { describe, expect, it, vi } from 'vitest'
import { browserShareDeps, shareResult, shareText, shareUrl } from '../../app/utils/share'

const SITE = 'https://contrarreloj-quiz.web.app'

const base = { points: 142, duration: 60, filter: 'Aleatorio', emoji: '🏆' } as const

describe('shareText', () => {
  it('names the points, the time and invites a rematch', () => {
    expect(shareText(base)).toBe('🏆 He hecho 142 puntos en Contrarreloj (60 s). ¿Me superas?')
  })

  it('uses the singular for a single point', () => {
    expect(shareText({ ...base, points: 1 })).toContain('He hecho 1 punto en')
  })

  it('names the category of a category game', () => {
    expect(shareText({ ...base, category: 'Deportes' })).toBe(
      '🏆 He hecho 142 puntos en Contrarreloj (60 s, Deportes). ¿Me superas?',
    )
  })

  it('names the difficulty of a competitive game, but not the random one', () => {
    expect(shareText({ ...base, duration: 120, filter: 'Difícil' })).toBe(
      '🏆 He hecho 142 puntos en Contrarreloj (120 s, dificultad difícil). ¿Me superas?',
    )
    expect(shareText({ ...base, duration: 120 })).toContain('(120 s)')
  })

  it('carries the emoji of the celebration tier', () => {
    expect(shareText({ ...base, emoji: '💪' }).startsWith('💪 ')).toBe(true)
  })

  it('never includes a link or a player name: those are added or left out elsewhere', () => {
    expect(shareText(base)).not.toMatch(/https?:/)
  })
})

describe('shareUrl', () => {
  it('points at the home page for a mixed game', () => {
    expect(shareUrl(SITE)).toBe(`${SITE}/`)
  })

  it('points at the category page for a category game', () => {
    expect(shareUrl(SITE, 'Deportes')).toBe(`${SITE}/preguntas/deportes`)
    expect(shareUrl(SITE, 'Historia y Geografía')).toBe(`${SITE}/preguntas/historia-y-geografia`)
  })
})

describe('shareResult', () => {
  const message = { text: 'Mira mi resultado', url: `${SITE}/` }

  it('uses the native share sheet when there is one', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const copy = vi.fn()
    expect(await shareResult({ share, copy }, message)).toBe('shared')
    expect(share).toHaveBeenCalledWith({ text: message.text, url: message.url })
    expect(copy).not.toHaveBeenCalled()
  })

  it('does nothing more when the player closes the share sheet', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('closed', 'AbortError'))
    const copy = vi.fn()
    expect(await shareResult({ share, copy }, message)).toBe('cancelled')
    expect(copy).not.toHaveBeenCalled()
  })

  it('copies the text and the link when the share sheet fails', async () => {
    const share = vi.fn().mockRejectedValue(new Error('not allowed'))
    const copy = vi.fn().mockResolvedValue(undefined)
    expect(await shareResult({ share, copy }, message)).toBe('copied')
    expect(copy).toHaveBeenCalledWith(`${message.text}\n${message.url}`)
  })

  it('copies when there is no share sheet at all', async () => {
    const copy = vi.fn().mockResolvedValue(undefined)
    expect(await shareResult({ copy }, message)).toBe('copied')
    expect(copy).toHaveBeenCalledWith(`${message.text}\n${message.url}`)
  })

  it('reports a failure when nothing works', async () => {
    expect(await shareResult({}, message)).toBe('failed')
    const copy = vi.fn().mockRejectedValue(new Error('denied'))
    expect(await shareResult({ copy }, message)).toBe('failed')
  })
})

describe('browserShareDeps', () => {
  it('offers share and copy when the browser has them, bound to the navigator', async () => {
    const calls: string[] = []
    const nav = {
      share(this: unknown, data: ShareData) {
        calls.push(`share:${this === nav}:${data.text}`)
        return Promise.resolve()
      },
      clipboard: {
        writeText(text: string) {
          calls.push(`copy:${text}`)
          return Promise.resolve()
        },
      },
    } as unknown as Navigator
    const deps = browserShareDeps(nav)
    await deps.share?.({ text: 'a', url: 'b' })
    await deps.copy?.('c')
    expect(calls).toEqual(['share:true:a', 'copy:c'])
  })

  it('leaves out what the browser does not have', () => {
    expect(browserShareDeps({} as Navigator)).toEqual({})
  })
})
