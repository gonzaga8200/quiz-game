import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authErrorMessage } from '../../app/utils/auth-errors'
import { toQuestion, toRankingEntry } from '../../app/utils/firestore-mappers'
import {
  QUESTION_CACHE_KEY,
  QUESTION_CACHE_TTL_MS,
  readCachedQuestions,
  writeCachedQuestions,
} from '../../app/utils/question-cache'
import type { StorageLike } from '../../app/utils/question-cache'
import { withTimeout } from '../../app/utils/with-timeout'
import { makeBank, makeQuestion } from '../core/helpers'

const timestamp = (iso: string) => ({ toDate: () => new Date(iso) })

describe('toQuestion', () => {
  const { id: _id, createdAt: _createdAt, ...fields } = makeQuestion()

  it('turns a Firestore document into a validated question, using the document id', () => {
    const question = toQuestion('doc-id-1', {
      ...fields,
      createdAt: timestamp('2026-02-03T04:05:06Z'),
    })
    expect(question).toMatchObject({
      id: 'doc-id-1',
      createdAt: '2026-02-03T04:05:06.000Z',
      text: makeQuestion().text,
    })
  })

  it('also accepts an ISO string date (data written by the import script)', () => {
    expect(toQuestion('doc-id-1', { ...fields, createdAt: '2026-01-01T00:00:00Z' })).not.toBeNull()
  })

  it('returns null for malformed documents instead of throwing', () => {
    expect(
      toQuestion('doc-id-1', { ...fields, createdAt: '2026-01-01T00:00:00Z', correctIndex: 9 }),
    ).toBeNull()
    expect(toQuestion('doc-id-1', {})).toBeNull()
    expect(toQuestion('BAD ID', { ...fields, createdAt: '2026-01-01T00:00:00Z' })).toBeNull()
  })
})

describe('toRankingEntry', () => {
  const entry = {
    uid: 'ana',
    displayName: 'Ana',
    photoURL: null,
    points: 100,
    correct: 15,
    wrong: 2,
    skipped: 1,
    duration: 60,
    difficultyFilter: 'Medio',
  }

  it('converts the server timestamp to an ISO string', () => {
    expect(
      toRankingEntry({ ...entry, createdAt: timestamp('2026-05-06T07:08:09Z') }),
    ).toMatchObject({
      uid: 'ana',
      createdAt: '2026-05-06T07:08:09.000Z',
    })
  })

  it('returns null for malformed or out-of-range entries', () => {
    expect(
      toRankingEntry({ ...entry, createdAt: timestamp('2026-05-06T07:08:09Z'), points: 99_999 }),
    ).toBeNull()
    expect(toRankingEntry({ ...entry, createdAt: 'not a date' })).toBeNull()
    expect(toRankingEntry({ createdAt: { nope: true } })).toBeNull()
  })
})

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>()
  getItem(key: string) {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.data.set(key, value)
  }
}

describe('question cache', () => {
  const questions = makeBank('medio', 3)
  const NOW = 1_000_000

  it('returns what was written while it is fresh', () => {
    const storage = new MemoryStorage()
    writeCachedQuestions(storage, questions, NOW)
    expect(readCachedQuestions(storage, NOW + 1_000)).toEqual(questions)
  })

  it('expires after the TTL', () => {
    const storage = new MemoryStorage()
    writeCachedQuestions(storage, questions, NOW)
    expect(readCachedQuestions(storage, NOW + QUESTION_CACHE_TTL_MS - 1)).not.toBeNull()
    expect(readCachedQuestions(storage, NOW + QUESTION_CACHE_TTL_MS)).toBeNull()
  })

  it('ignores a cache saved "in the future" (clock changed)', () => {
    const storage = new MemoryStorage()
    writeCachedQuestions(storage, questions, NOW + 10_000)
    expect(readCachedQuestions(storage, NOW)).toBeNull()
  })

  it('returns null when empty, corrupt or invalid', () => {
    const storage = new MemoryStorage()
    expect(readCachedQuestions(storage, NOW)).toBeNull()

    storage.setItem(QUESTION_CACHE_KEY, '{not json')
    expect(readCachedQuestions(storage, NOW)).toBeNull()

    storage.setItem(QUESTION_CACHE_KEY, JSON.stringify({ savedAt: NOW, questions: [{ id: 'x' }] }))
    expect(readCachedQuestions(storage, NOW)).toBeNull()

    storage.setItem(QUESTION_CACHE_KEY, JSON.stringify({ savedAt: NOW, questions: [] }))
    expect(readCachedQuestions(storage, NOW)).toBeNull()
  })

  it('copes with missing or failing storage', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(readCachedQuestions(null, NOW)).toBeNull()
    expect(readCachedQuestions(broken, NOW)).toBeNull()
    expect(() => writeCachedQuestions(null, questions, NOW)).not.toThrow()
    expect(() => writeCachedQuestions(broken, questions, NOW)).not.toThrow()
  })
})

describe('authErrorMessage', () => {
  it('stays silent when the player just closes the Google window', () => {
    expect(authErrorMessage({ code: 'auth/popup-closed-by-user' })).toBeNull()
    expect(authErrorMessage({ code: 'auth/cancelled-popup-request' })).toBeNull()
  })

  it('explains blocked pop-ups and network problems in Spanish', () => {
    expect(authErrorMessage({ code: 'auth/popup-blocked' })).toContain('ventanas emergentes')
    expect(authErrorMessage({ code: 'auth/network-request-failed' })).toContain('conexión')
  })

  it('has a generic message for anything else', () => {
    expect(authErrorMessage({ code: 'auth/internal-error' })).toContain(
      'No se ha podido iniciar sesión',
    )
    expect(authErrorMessage(new Error('boom'))).toContain('No se ha podido iniciar sesión')
    expect(authErrorMessage(undefined)).toContain('No se ha podido iniciar sesión')
  })
})

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves with the value when the promise is quick enough', async () => {
    await expect(withTimeout(Promise.resolve(42), 1_000)).resolves.toBe(42)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects when the promise is too slow', async () => {
    const never = new Promise<number>(() => {})
    const result = expect(withTimeout(never, 1_000)).rejects.toThrow('Timed out after 1000 ms')
    await vi.advanceTimersByTimeAsync(1_000)
    await result
  })

  it('passes errors through and normalises non-Error rejections', async () => {
    await expect(withTimeout(Promise.reject(new Error('nope')), 1_000)).rejects.toThrow('nope')
    await expect(withTimeout(Promise.reject('texto'), 1_000)).rejects.toThrow('texto')
    expect(vi.getTimerCount()).toBe(0)
  })
})
