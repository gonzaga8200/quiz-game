import { describe, expect, it, vi } from 'vitest'
import {
  GA_ID_PATTERN,
  clearGaCookies,
  createAnalytics,
  gaCookieNames,
} from '../../app/utils/analytics'
import type { ConsentState } from '../../app/utils/consent'

const ID = 'G-ABC123XYZ9'
const accepted: ConsentState = { status: 'accepted', decidedAt: 1 }
const rejected: ConsentState = { status: 'rejected', decidedAt: 1 }
const unset: ConsentState = { status: 'unset' }

function setup(gaId = ID) {
  const win: Record<string, unknown> = {}
  const loadScript = vi.fn()
  const clearCookies = vi.fn()
  const analytics = createAnalytics({ gaId, win, loadScript, clearCookies })
  /** The gtag calls queued so far, as plain arrays (gtag.js receives `arguments` objects). */
  const calls = () => (win.dataLayer as ArrayLike<unknown>[]).map((entry) => Array.from(entry))
  return { analytics, win, loadScript, clearCookies, calls }
}

describe('createAnalytics: before any consent', () => {
  it('sets every consent signal to denied before anything else', () => {
    const { analytics, calls } = setup()
    analytics.init()
    expect(calls()).toEqual([
      [
        'consent',
        'default',
        {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        },
      ],
    ])
  })

  it('does not request the Google tag script', () => {
    const { analytics, loadScript } = setup()
    analytics.init()
    analytics.apply(unset)
    analytics.apply(rejected)
    expect(loadScript).not.toHaveBeenCalled()
  })

  it('sends nothing: no events, no page views', () => {
    const { analytics, calls } = setup()
    analytics.init()
    analytics.apply(unset)
    analytics.track('login_click')
    analytics.pageView('/', 'Inicio')
    expect(calls().some(([command]) => command === 'event')).toBe(false)
  })

  it('initialises only once', () => {
    const { analytics, calls } = setup()
    analytics.init()
    analytics.init()
    analytics.apply(unset)
    expect(calls().filter(([c, kind]) => c === 'consent' && kind === 'default')).toHaveLength(1)
  })
})

describe('createAnalytics: after accepting', () => {
  it('grants analytics only, configures GA without ad features and loads the script once', () => {
    const { analytics, loadScript, calls, win } = setup()
    analytics.apply(accepted)
    analytics.apply(accepted)

    expect(loadScript).toHaveBeenCalledOnce()
    expect(loadScript).toHaveBeenCalledWith(`https://www.googletagmanager.com/gtag/js?id=${ID}`)
    const names = calls().map(([command, arg]) => `${String(command)}:${String(arg)}`)
    // default (denied) is queued before the update and before the config.
    expect(names.indexOf('consent:default')).toBeLessThan(names.indexOf('consent:update'))
    expect(names.indexOf('consent:update')).toBeLessThan(names.indexOf(`config:${ID}`))
    expect(calls().find(([c, k]) => c === 'consent' && k === 'update')?.[2]).toEqual({
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
    expect(calls().find(([c]) => c === 'config')?.[2]).toEqual({
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    })
    expect(win[`ga-disable-${ID}`]).toBe(false)
  })

  it('sends events and page views, with no personal data of its own', () => {
    const { analytics, calls } = setup()
    analytics.apply(accepted)
    analytics.track('login_click', { method: 'google' })
    analytics.pageView('/ranking', 'Ranking')

    const events = calls().filter(([command]) => command === 'event')
    expect(events).toEqual([
      ['event', 'login_click', { method: 'google' }],
      ['event', 'page_view', { page_path: '/ranking', page_title: 'Ranking' }],
    ])
  })

  it('sends an event without parameters', () => {
    const { analytics, calls } = setup()
    analytics.apply(accepted)
    analytics.track('login_success')
    expect(calls().at(-1)).toEqual(['event', 'login_success', {}])
  })
})

describe('createAnalytics: withdrawing consent', () => {
  it('stops measuring, denies storage again and deletes the GA cookies', () => {
    const { analytics, calls, clearCookies, win } = setup()
    analytics.apply(accepted)
    analytics.apply(rejected)

    expect(clearCookies).toHaveBeenCalledOnce()
    expect(win[`ga-disable-${ID}`]).toBe(true)
    expect(
      calls()
        .filter(([c, k]) => c === 'consent' && k === 'update')
        .at(-1)?.[2],
    ).toMatchObject({
      analytics_storage: 'denied',
    })

    const before = calls().length
    analytics.track('login_click')
    analytics.pageView('/', 'Inicio')
    expect(calls()).toHaveLength(before)
  })

  it('does not touch cookies if the tag never ran', () => {
    const { analytics, clearCookies } = setup()
    analytics.apply(rejected)
    expect(clearCookies).not.toHaveBeenCalled()
  })

  it('resumes after the player accepts again, without loading the script twice', () => {
    const { analytics, loadScript, calls, win } = setup()
    analytics.apply(accepted)
    analytics.apply(rejected)
    analytics.apply(accepted)

    expect(loadScript).toHaveBeenCalledOnce()
    expect(win[`ga-disable-${ID}`]).toBe(false)
    analytics.track('login_success')
    expect(calls().at(-1)).toEqual(['event', 'login_success', {}])
  })
})

describe('createAnalytics: without a valid measurement id', () => {
  it.each(['', 'nope', 'UA-123456-1', 'G-', 'g-abc123xyz9'])('is off for "%s"', (gaId) => {
    const { analytics, win, loadScript } = setup(gaId)
    expect(analytics.enabled).toBe(false)
    analytics.init()
    analytics.apply(accepted)
    analytics.track('login_click')
    analytics.pageView('/', 'Inicio')
    expect(win.dataLayer).toBeUndefined()
    expect(loadScript).not.toHaveBeenCalled()
  })

  it('recognises well-formed ids', () => {
    expect(GA_ID_PATTERN.test('G-ABC123XYZ9')).toBe(true)
    expect(GA_ID_PATTERN.test('G-A1B2C3')).toBe(true)
  })
})

describe('Google Analytics cookies', () => {
  it('finds only the GA cookies in a cookie string', () => {
    expect(gaCookieNames('theme=dark; _ga=GA1.1.1; _ga_ABC123XYZ9=GS1; _gid=x; other=1')).toEqual([
      '_ga',
      '_ga_ABC123XYZ9',
      '_gid',
    ])
    expect(gaCookieNames('')).toEqual([])
    expect(gaCookieNames('theme=dark; garbage')).toEqual([])
  })

  it('expires each GA cookie for the host and every parent domain, leaving others alone', () => {
    const writes: string[] = []
    const jar = {
      get cookie() {
        return 'keep=1; _ga=GA1.1.1'
      },
      set cookie(value: string) {
        writes.push(value)
      },
    }

    clearGaCookies(jar, 'www.contrarreloj.example.com')

    expect(writes.every((w) => w.startsWith('_ga=;'))).toBe(true)
    expect(writes.every((w) => w.includes('expires=Thu, 01 Jan 1970'))).toBe(true)
    expect(writes).toHaveLength(4) // host-only + 3 parent domains
    expect(writes.some((w) => w.includes('domain=.www.contrarreloj.example.com'))).toBe(true)
    expect(writes.some((w) => w.includes('domain=.example.com'))).toBe(true)
    expect(writes.some((w) => w.includes('domain=.com'))).toBe(false) // never a bare TLD
    expect(writes.some((w) => w.startsWith('keep='))).toBe(false)
  })

  it('handles a single-label host such as localhost', () => {
    const writes: string[] = []
    const jar = {
      get cookie() {
        return '_ga=1'
      },
      set cookie(value: string) {
        writes.push(value)
      },
    }
    clearGaCookies(jar, 'localhost')
    expect(writes).toHaveLength(1)
  })
})
