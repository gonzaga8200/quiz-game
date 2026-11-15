import { describe, expect, it } from 'vitest'
import {
  CONSENT_KEY,
  CONSENT_MAX_AGE_MS,
  CONSENT_MODE_DEFAULT,
  CONSENT_VERSION,
  consentModeFor,
  isAnalyticsAllowed,
  readConsent,
  writeConsent,
} from '../../app/utils/consent'
import type { ConsentStorage } from '../../app/utils/consent'

class MemoryStorage implements ConsentStorage {
  data = new Map<string, string>()
  getItem(key: string) {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.data.set(key, value)
  }
}

const NOW = 1_800_000_000_000
const stored = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({ version: CONSENT_VERSION, choice: 'accepted', decidedAt: NOW, ...overrides })

describe('readConsent', () => {
  it('is unset on a first visit', () => {
    expect(readConsent(new MemoryStorage(), NOW)).toEqual({ status: 'unset' })
  })

  it('returns what was saved', () => {
    const storage = new MemoryStorage()
    writeConsent(storage, 'accepted', NOW)
    expect(readConsent(storage, NOW + 1000)).toEqual({ status: 'accepted', decidedAt: NOW })

    writeConsent(storage, 'rejected', NOW + 5)
    expect(readConsent(storage, NOW + 1000)).toEqual({ status: 'rejected', decidedAt: NOW + 5 })
  })

  it('asks again after 24 months, but not a moment before', () => {
    const storage = new MemoryStorage()
    storage.setItem(CONSENT_KEY, stored())
    expect(readConsent(storage, NOW + CONSENT_MAX_AGE_MS - 1).status).toBe('accepted')
    expect(readConsent(storage, NOW + CONSENT_MAX_AGE_MS).status).toBe('unset')
  })

  it('asks again when the policy version changed', () => {
    const storage = new MemoryStorage()
    storage.setItem(CONSENT_KEY, stored({ version: CONSENT_VERSION + 1 }))
    expect(readConsent(storage, NOW)).toEqual({ status: 'unset' })
  })

  it('does not trust a decision dated in the future', () => {
    const storage = new MemoryStorage()
    storage.setItem(CONSENT_KEY, stored({ decidedAt: NOW + 10_000 }))
    expect(readConsent(storage, NOW)).toEqual({ status: 'unset' })
  })

  it.each([
    ['corrupt JSON', '{nope'],
    ['an unknown choice', stored({ choice: 'maybe' })],
    ['a missing date', JSON.stringify({ version: CONSENT_VERSION, choice: 'accepted' })],
    ['a non-object', '"accepted"'],
  ])('treats %s as no decision', (_label, raw) => {
    const storage = new MemoryStorage()
    storage.setItem(CONSENT_KEY, raw)
    expect(readConsent(storage, NOW)).toEqual({ status: 'unset' })
  })

  it('is unset when storage is unavailable or throws', () => {
    expect(readConsent(null, NOW)).toEqual({ status: 'unset' })
    const broken: ConsentStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {},
    }
    expect(readConsent(broken, NOW)).toEqual({ status: 'unset' })
  })
})

describe('writeConsent', () => {
  it('stores the choice with its version and date', () => {
    const storage = new MemoryStorage()
    writeConsent(storage, 'rejected', NOW)
    expect(JSON.parse(storage.data.get(CONSENT_KEY) ?? '{}')).toEqual({
      version: CONSENT_VERSION,
      choice: 'rejected',
      decidedAt: NOW,
    })
  })

  it('still returns the decision when storage fails or is missing', () => {
    const broken: ConsentStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(writeConsent(broken, 'accepted', NOW)).toEqual({ status: 'accepted', decidedAt: NOW })
    expect(writeConsent(null, 'rejected', NOW)).toEqual({ status: 'rejected', decidedAt: NOW })
  })
})

describe('consent mode signals', () => {
  it('denies every signal by default', () => {
    expect(CONSENT_MODE_DEFAULT).toEqual({
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
  })

  it('grants only analytics storage, and only after accepting', () => {
    expect(consentModeFor({ status: 'accepted', decidedAt: NOW })).toEqual({
      ...CONSENT_MODE_DEFAULT,
      analytics_storage: 'granted',
    })
    expect(consentModeFor({ status: 'rejected', decidedAt: NOW })).toEqual(CONSENT_MODE_DEFAULT)
    expect(consentModeFor({ status: 'unset' })).toEqual(CONSENT_MODE_DEFAULT)
  })

  it('allows analytics only for an explicit acceptance', () => {
    expect(isAnalyticsAllowed({ status: 'accepted', decidedAt: NOW })).toBe(true)
    expect(isAnalyticsAllowed({ status: 'rejected', decidedAt: NOW })).toBe(false)
    expect(isAnalyticsAllowed({ status: 'unset' })).toBe(false)
  })
})
