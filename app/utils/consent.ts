import { z } from 'zod'

/**
 * Cookie/analytics consent. The decision is stored in the browser as a small record:
 * the choice, when it was made, and the policy version it applies to. It is re-asked
 * after 24 months (Spanish AEPD guidance) or when the policy version changes.
 */
export const CONSENT_KEY = 'contrarreloj.consent'
export const CONSENT_VERSION = 1
export const CONSENT_MAX_AGE_MS = 730 * 24 * 60 * 60 * 1000 // 24 months

export type ConsentChoice = 'accepted' | 'rejected'

export type ConsentState =
  { readonly status: 'unset' } | { readonly status: ConsentChoice; readonly decidedAt: number }

export interface ConsentStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const StoredSchema = z.object({
  version: z.literal(CONSENT_VERSION),
  choice: z.enum(['accepted', 'rejected']),
  decidedAt: z.number(),
})

const UNSET: ConsentState = { status: 'unset' }

/** The saved decision, or `unset` if there is none, it is invalid, outdated or expired. */
export function readConsent(storage: ConsentStorage | null, now: number): ConsentState {
  if (!storage) return UNSET
  try {
    const raw = storage.getItem(CONSENT_KEY)
    if (raw === null) return UNSET
    const parsed = StoredSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return UNSET
    const age = now - parsed.data.decidedAt
    if (age < 0 || age >= CONSENT_MAX_AGE_MS) return UNSET
    return { status: parsed.data.choice, decidedAt: parsed.data.decidedAt }
  } catch {
    return UNSET
  }
}

/** Saves a decision. The returned state is valid even if the browser refuses to store it. */
export function writeConsent(
  storage: ConsentStorage | null,
  choice: ConsentChoice,
  now: number,
): ConsentState {
  try {
    storage?.setItem(
      CONSENT_KEY,
      JSON.stringify({ version: CONSENT_VERSION, choice, decidedAt: now }),
    )
  } catch {
    // Storage blocked or full: the choice still applies for this visit.
  }
  return { status: choice, decidedAt: now }
}

export function isAnalyticsAllowed(state: ConsentState): boolean {
  return state.status === 'accepted'
}

/** Google Consent Mode v2 signals. Everything is denied until the player accepts. */
export interface ConsentModeSignals {
  analytics_storage: 'granted' | 'denied'
  ad_storage: 'denied'
  ad_user_data: 'denied'
  ad_personalization: 'denied'
}

export const CONSENT_MODE_DEFAULT: ConsentModeSignals = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
}

/** Advertising signals stay denied forever: the game shows no ads and builds no profiles. */
export function consentModeFor(state: ConsentState): ConsentModeSignals {
  return {
    ...CONSENT_MODE_DEFAULT,
    analytics_storage: isAnalyticsAllowed(state) ? 'granted' : 'denied',
  }
}
