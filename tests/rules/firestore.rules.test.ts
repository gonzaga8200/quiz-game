/**
 * Firestore security rules, run against the local emulator:
 *   npm run test:rules
 */
import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { BOARDS, MAX_POINTS_PER_CORRECT, boardId } from '../../core'

const PROJECT_ID = 'demo-contrarreloj'

let env: RulesTestEnvironment

beforeAll(async () => {
  const [host = '127.0.0.1', port = '8180'] = (process.env.FIRESTORE_EMULATOR_HOST ?? '').split(':')
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'),
      host,
      port: Number(port),
    },
  })
})

beforeEach(async () => {
  await env.clearFirestore()
})

afterAll(async () => {
  await env.cleanup()
})

const anonymous = () => env.unauthenticatedContext().firestore()
const asUser = (uid: string) => env.authenticatedContext(uid).firestore()

// --- Questions ------------------------------------------------------------------

const question = (status: 'active' | 'disabled') => ({
  text: '¿Cuál es la capital de Francia?',
  options: ['París', 'Lyon', 'Marsella', 'Burdeos'],
  correctIndex: 0,
  category: 'Historia y Geografía',
  difficulty: 'medio',
  explanation: 'París es la capital de Francia.',
  status,
})

async function seedQuestions() {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'questions/activa-1'), question('active'))
    await setDoc(doc(db, 'questions/apagada-1'), question('disabled'))
  })
}

describe('questions', () => {
  it('lets anyone read an active question, signed in or not', async () => {
    await seedQuestions()
    await assertSucceeds(getDoc(doc(anonymous(), 'questions/activa-1')))
    await assertSucceeds(getDoc(doc(asUser('ana'), 'questions/activa-1')))
  })

  it('hides disabled questions', async () => {
    await seedQuestions()
    await assertFails(getDoc(doc(anonymous(), 'questions/apagada-1')))
  })

  it('lets anyone query for active questions', async () => {
    await seedQuestions()
    const snapshot = await assertSucceeds(
      getDocs(query(collection(anonymous(), 'questions'), where('status', '==', 'active'))),
    )
    expect(snapshot.docs.map((d) => d.id)).toEqual(['activa-1'])
  })

  it('rejects a query that could return disabled questions', async () => {
    await seedQuestions()
    await assertFails(getDocs(collection(anonymous(), 'questions')))
  })

  it('never allows writing questions from a client', async () => {
    const attempts = [anonymous(), asUser('ana')]
    for (const db of attempts) {
      await assertFails(setDoc(doc(db, 'questions/nueva'), question('active')))
    }
    await seedQuestions()
    await assertFails(setDoc(doc(asUser('ana'), 'questions/activa-1'), question('disabled')))
    await assertFails(deleteDoc(doc(asUser('ana'), 'questions/activa-1')))
  })
})

// --- Rankings -------------------------------------------------------------------

type Entry = Record<string, unknown>

function entry(uid: string, overrides: Entry = {}): Entry {
  return {
    uid,
    displayName: 'Ana García',
    photoURL: 'https://lh3.googleusercontent.com/a/foto',
    points: 100,
    correct: 15,
    wrong: 2,
    skipped: 1,
    duration: 60,
    difficultyFilter: 'Medio',
    createdAt: serverTimestamp(),
    ...overrides,
  }
}

const board = '60_medio'
const path = (uid: string, id = board) => `rankings/${id}/entries/${uid}`

async function seedEntry(uid: string, points: number, id = board) {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path(uid, id)), {
      ...entry(uid, { points, createdAt: new Date('2026-01-01T00:00:00Z') }),
    })
  })
}

describe('rankings: reading', () => {
  it('is public', async () => {
    await seedEntry('ana', 100)
    await seedEntry('luis', 80)
    await assertSucceeds(getDoc(doc(anonymous(), path('ana'))))
    const top = await assertSucceeds(
      getDocs(
        query(
          collection(anonymous(), `rankings/${board}/entries`),
          orderBy('points', 'desc'),
          limit(50),
        ),
      ),
    )
    expect(top.docs.map((d) => d.id)).toEqual(['ana', 'luis'])
  })
})

describe('rankings: creating a score', () => {
  it('accepts a valid score from its owner', async () => {
    await assertSucceeds(setDoc(doc(asUser('ana'), path('ana')), entry('ana')))
  })

  it.each(BOARDS)('accepts a valid score on board $id', async ({ id, duration, filter }) => {
    await assertSucceeds(
      setDoc(
        doc(asUser('ana'), path('ana', id)),
        entry('ana', { duration, difficultyFilter: filter }),
      ),
    )
  })

  it('accepts a player without a photo', async () => {
    await assertSucceeds(setDoc(doc(asUser('ana'), path('ana')), entry('ana', { photoURL: null })))
  })

  it('rejects anonymous visitors', async () => {
    await assertFails(setDoc(doc(anonymous(), path('ana')), entry('ana')))
  })

  it("rejects writing another player's document", async () => {
    await assertFails(setDoc(doc(asUser('mallory'), path('ana')), entry('ana')))
    await assertFails(setDoc(doc(asUser('mallory'), path('ana')), entry('mallory')))
  })

  it('rejects a uid field that does not match the document and the user', async () => {
    await assertFails(setDoc(doc(asUser('ana'), path('ana')), entry('ana', { uid: 'luis' })))
  })

  it('rejects a board that does not match the duration and filter', async () => {
    await assertFails(setDoc(doc(asUser('ana'), path('ana', '60_facil')), entry('ana')))
    await assertFails(setDoc(doc(asUser('ana'), path('ana', '120_medio')), entry('ana')))
    await assertFails(setDoc(doc(asUser('ana'), path('ana', 'cualquiera')), entry('ana')))
  })

  it('rejects unknown or missing fields', async () => {
    await assertFails(setDoc(doc(asUser('ana'), path('ana')), entry('ana', { admin: true })))
    const { wrong: _wrong, ...missing } = entry('ana')
    await assertFails(setDoc(doc(asUser('ana'), path('ana')), missing))
  })

  it('rejects a client-supplied timestamp (it must be the server time)', async () => {
    await assertFails(
      setDoc(doc(asUser('ana'), path('ana')), entry('ana', { createdAt: new Date('2020-01-01') })),
    )
  })

  const invalid: readonly [string, Entry][] = [
    ['negative points', { points: -1 }],
    ['fractional points', { points: 10.5 }],
    ['points as a string', { points: '100' }],
    ['negative correct', { correct: -1 }],
    ['negative wrong', { wrong: -1 }],
    ['negative skipped', { skipped: -1 }],
    ['a 90 s duration', { duration: 90 }],
    ['an unknown filter', { difficultyFilter: 'Imposible' }],
    ['an empty display name', { displayName: '' }],
    ['a 61-char display name', { displayName: 'x'.repeat(61) }],
    ['a non-string display name', { displayName: 42 }],
    ['an http photo', { photoURL: 'http://example.org/a.png' }],
    ['a javascript: photo', { photoURL: 'javascript:alert(1)' }],
    ['a 501-char photo URL', { photoURL: `https://example.org/${'a'.repeat(490)}` }],
    ['more answers than seconds', { correct: 50, wrong: 10, skipped: 1, points: 100 }],
  ]

  it.each(invalid)('rejects %s', async (_label, overrides) => {
    await assertFails(setDoc(doc(asUser('ana'), path('ana')), entry('ana', overrides)))
  })

  it('caps points at what the correct answers can yield (same constant as core)', async () => {
    const correct = 20
    const ceiling = correct * MAX_POINTS_PER_CORRECT
    await assertSucceeds(
      setDoc(
        doc(asUser('ana'), path('ana')),
        entry('ana', { correct, wrong: 0, skipped: 0, points: ceiling }),
      ),
    )
    await assertFails(
      setDoc(
        doc(asUser('luis'), path('luis')),
        entry('luis', { correct, wrong: 0, skipped: 0, points: ceiling + 1 }),
      ),
    )
  })

  it('accepts exactly one answer per second and rejects one more', async () => {
    await assertSucceeds(
      setDoc(
        doc(asUser('ana'), path('ana')),
        entry('ana', { correct: 40, wrong: 10, skipped: 10, points: 100 }),
      ),
    )
    await assertFails(
      setDoc(
        doc(asUser('luis'), path('luis')),
        entry('luis', { correct: 40, wrong: 10, skipped: 11, points: 100 }),
      ),
    )
  })

  it('builds the same board ids as core', () => {
    expect(boardId(60, 'Medio')).toBe(board)
  })
})

describe('rankings: improving a score', () => {
  it('lets a player replace their score with a higher one', async () => {
    await seedEntry('ana', 100)
    await assertSucceeds(setDoc(doc(asUser('ana'), path('ana')), entry('ana', { points: 101 })))
  })

  it('rejects an equal or lower score', async () => {
    await seedEntry('ana', 100)
    await assertFails(setDoc(doc(asUser('ana'), path('ana')), entry('ana', { points: 100 })))
    await assertFails(setDoc(doc(asUser('ana'), path('ana')), entry('ana', { points: 40 })))
  })

  it("rejects touching someone else's score", async () => {
    await seedEntry('ana', 100)
    await assertFails(setDoc(doc(asUser('mallory'), path('ana')), entry('ana', { points: 150 })))
  })

  it('still validates an update (a higher score must also be in range)', async () => {
    await seedEntry('ana', 100)
    await assertFails(
      setDoc(
        doc(asUser('ana'), path('ana')),
        entry('ana', { points: 15 * MAX_POINTS_PER_CORRECT + 1 }),
      ),
    )
  })

  it('never allows deleting a score', async () => {
    await seedEntry('ana', 100)
    await assertFails(deleteDoc(doc(asUser('ana'), path('ana'))))
  })
})

describe('everything else is closed', () => {
  it('denies unknown collections to everyone', async () => {
    for (const db of [anonymous(), asUser('ana')]) {
      await assertFails(getDoc(doc(db, 'scores/ana')))
      await assertFails(setDoc(doc(db, 'scores/ana'), { points: 1 }))
      await assertFails(setDoc(doc(db, 'users/ana'), { admin: true }))
    }
  })
})
