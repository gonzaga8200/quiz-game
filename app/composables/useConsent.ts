import { readConsent, writeConsent } from '~/utils/consent'
import type { ConsentChoice, ConsentState, ConsentStorage } from '~/utils/consent'

export function browserConsentStorage(): ConsentStorage | null {
  try {
    return window.localStorage
  } catch {
    return null // storage blocked
  }
}

/** The player's cookie/analytics decision and the actions that change it. */
export function useConsent() {
  const state = useState<ConsentState>('consent-state', () => ({ status: 'unset' }))
  const ready = useState<boolean>('consent-ready', () => false)
  const reopened = useState<boolean>('consent-reopened', () => false)
  const analytics = useAnalytics()
  const router = useRouter()

  /** Shown on the first visit, and again whenever the player asks to change their choice. */
  const bannerVisible = computed(
    () => ready.value && (state.value.status === 'unset' || reopened.value),
  )

  /** Reads the saved decision. Called once, by the analytics plugin, in the browser. */
  function restore(): void {
    state.value = readConsent(browserConsentStorage(), Date.now())
    analytics.apply(state.value)
    ready.value = true
  }

  function decide(choice: ConsentChoice): void {
    state.value = writeConsent(browserConsentStorage(), choice, Date.now())
    reopened.value = false
    analytics.apply(state.value)
    // Count the page the player is on right now, since the navigation already happened.
    if (choice === 'accepted') {
      analytics.pageView(router.currentRoute.value.fullPath, document.title)
    }
  }

  return {
    state: readonly(state),
    ready: readonly(ready),
    bannerVisible,
    restore,
    accept: () => decide('accepted'),
    reject: () => decide('rejected'),
    reopen: () => {
      reopened.value = true
    },
  }
}
