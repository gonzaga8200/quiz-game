import { CONSENT_MODE_DEFAULT, consentModeFor } from './consent'
import type { ConsentState } from './consent'

/** A valid GA4 measurement id looks like G-XXXXXXXXXX. */
export const GA_ID_PATTERN = /^G-[A-Z0-9]{6,12}$/

export interface AnalyticsDeps {
  /** Measurement id from NUXT_PUBLIC_GA_ID. Empty or invalid turns analytics off. */
  readonly gaId: string
  /** Holds `dataLayer`, `gtag` and the `ga-disable-<id>` flag (the browser `window`). */
  readonly win: Record<string, unknown>
  readonly loadScript: (src: string) => void
  /** Removes every Google Analytics cookie (`_ga`, `_ga_<id>`...). */
  readonly clearCookies: () => void
}

export type EventParams = Record<string, string | number | boolean>

/**
 * Google Analytics 4 with Consent Mode v2, "basic" flavour:
 *  - consent defaults to denied for every signal, set before anything else;
 *  - the Google tag script is not even requested until the player accepts;
 *  - withdrawing consent disables measurement and deletes the GA cookies.
 */
export function createAnalytics(deps: AnalyticsDeps) {
  const enabled = GA_ID_PATTERN.test(deps.gaId)
  const disableFlag = `ga-disable-${deps.gaId}`
  let initialised = false
  let scriptLoaded = false
  let allowed = false

  function gtag(..._args: unknown[]): void {
    // gtag.js only understands the `arguments` object, not an array.
    // eslint-disable-next-line prefer-rest-params
    ;(deps.win.dataLayer as unknown[]).push(arguments)
  }

  function init(): void {
    if (!enabled || initialised) return
    initialised = true
    deps.win.dataLayer = deps.win.dataLayer ?? []
    deps.win.gtag = gtag
    gtag('consent', 'default', { ...CONSENT_MODE_DEFAULT })
  }

  function loadTag(): void {
    if (scriptLoaded) return
    scriptLoaded = true
    gtag('js', new Date())
    gtag('config', deps.gaId, {
      send_page_view: false, // we send page views ourselves on route changes
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    })
    deps.loadScript(`https://www.googletagmanager.com/gtag/js?id=${deps.gaId}`)
  }

  return {
    /** Whether analytics can ever run (a valid id is configured). */
    enabled,

    /** Sets the denied-by-default consent. Call once, as early as possible. */
    init,

    /** Applies the player's decision: starts measuring, or stops and cleans up. */
    apply(state: ConsentState): void {
      if (!enabled) return
      init()
      const signals = consentModeFor(state)
      gtag('consent', 'update', signals)
      allowed = signals.analytics_storage === 'granted'
      deps.win[disableFlag] = !allowed
      if (allowed) loadTag()
      else if (scriptLoaded) deps.clearCookies()
    },

    /** Sends an event, only if the player accepted. Never put personal data in params. */
    track(name: string, params: EventParams = {}): void {
      if (!enabled || !allowed || !scriptLoaded) return
      gtag('event', name, params)
    },

    pageView(path: string, title: string): void {
      this.track('page_view', { page_path: path, page_title: title })
    },
  }
}

export type Analytics = ReturnType<typeof createAnalytics>

/** Minimal shape of `document` needed to expire cookies. */
export interface CookieJar {
  cookie: string
}

/** Names of the Google Analytics cookies in a `document.cookie` string. */
export function gaCookieNames(cookieString: string): string[] {
  return cookieString
    .split(';')
    .map((part) => part.split('=')[0]?.trim() ?? '')
    .filter((name) => name === '_ga' || name.startsWith('_ga_') || name === '_gid')
}

/**
 * Expires the Google Analytics cookies. GA may have set them on the host or on any
 * parent domain, and a cookie can only be removed with the domain it was set with.
 */
export function clearGaCookies(jar: CookieJar, hostname: string): void {
  const parts = hostname.split('.')
  const domains = [''] // host-only cookie
  for (let i = 0; i < parts.length - 1; i++) {
    domains.push(`; domain=.${parts.slice(i).join('.')}`)
  }
  for (const name of gaCookieNames(jar.cookie)) {
    for (const domain of domains) {
      jar.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`
    }
  }
}
