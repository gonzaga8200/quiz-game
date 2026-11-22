import { describe, expect, it } from 'vitest'
import type { StorageLike } from '../../app/utils/question-cache'
import { SEEN_KEY, readSeen, recordSeen } from '../../app/utils/seen-questions'

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>()
  getItem(key: string) {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.data.set(key, value)
  }
}

const bank = (...ids: string[]) => new Set(ids)

describe('seen questions memory', () => {
  it('uses the documented localStorage key', () => {
    expect(SEEN_KEY).toBe('contrarreloj.seen.v1')
  })

  it('returns an empty map when nothing is stored', () => {
    expect(readSeen(new MemoryStorage())).toEqual(new Map())
  })

  it('adds one to each shown id on every call', () => {
    const storage = new MemoryStorage()
    const all = bank('a', 'b')
    recordSeen(storage, ['a', 'b'], all)
    recordSeen(storage, ['a', 'b'], all)
    recordSeen(storage, ['a'], all)
    expect(readSeen(storage)).toEqual(
      new Map([
        ['a', 3],
        ['b', 2],
      ]),
    )
  })

  it('drops ids that are no longer in the bank', () => {
    const storage = new MemoryStorage()
    recordSeen(storage, ['viejo', 'a'], bank('viejo', 'a'))
    recordSeen(storage, ['a'], bank('a'))
    expect(readSeen(storage)).toEqual(new Map([['a', 2]]))
  })

  it('does not record ids that are not in the bank', () => {
    const storage = new MemoryStorage()
    recordSeen(storage, ['fantasma'], bank('a'))
    expect(readSeen(storage)).toEqual(new Map())
  })

  it.each(['{not json', '[1,2]', '{"a":-1}', '{"a":1.5}', '{"a":"x"}', 'null'])(
    'treats corrupt data as empty: %s',
    (raw) => {
      const storage = new MemoryStorage()
      storage.setItem(SEEN_KEY, raw)
      expect(readSeen(storage)).toEqual(new Map())
    },
  )

  it('recovers from corrupt data on the next record', () => {
    const storage = new MemoryStorage()
    storage.setItem(SEEN_KEY, '{not json')
    recordSeen(storage, ['a'], bank('a'))
    expect(readSeen(storage)).toEqual(new Map([['a', 1]]))
  })

  it('does nothing without storage', () => {
    expect(readSeen(null)).toEqual(new Map())
    expect(() => recordSeen(null, ['a'], bank('a'))).not.toThrow()
  })

  it('survives storage that throws on read or on write', () => {
    const failingRead: StorageLike = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => undefined,
    }
    const failingWrite: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded')
      },
    }
    expect(readSeen(failingRead)).toEqual(new Map())
    expect(() => recordSeen(failingRead, ['a'], bank('a'))).not.toThrow()
    expect(() => recordSeen(failingWrite, ['a'], bank('a'))).not.toThrow()
  })
})
