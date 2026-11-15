import { clearGaCookies, createAnalytics } from '~/utils/analytics'
import type { Analytics } from '~/utils/analytics'

const NOOP: Analytics = {
  enabled: false,
  init: () => {},
  apply: () => {},
  track: () => {},
  pageView: () => {},
}

let instance: Analytics | null = null

/**
 * Google Analytics, gated by consent. Safe to call anywhere: on the server, or when no
 * valid measurement id is configured, every method does nothing.
 */
export function useAnalytics(): Analytics {
  if (import.meta.server) return NOOP
  instance ??= createAnalytics({
    gaId: useRuntimeConfig().public.gaId,
    win: window as unknown as Record<string, unknown>,
    loadScript: (src) => {
      const script = document.createElement('script')
      script.async = true
      script.src = src
      document.head.appendChild(script)
    },
    clearCookies: () => clearGaCookies(document, location.hostname),
  })
  return instance
}
