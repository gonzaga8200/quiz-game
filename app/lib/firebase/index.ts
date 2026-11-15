/**
 * The only place that imports the Firebase SDK. It is loaded on demand with a dynamic
 * import (see `useFirebase`), so the SDK stays out of the main bundle and arcade mode
 * never downloads it. Covered by the emulator rules tests and by manual checks.
 */
import { getApps, initializeApp } from 'firebase/app'
import type { FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import type { Auth, User } from 'firebase/auth'
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { RANKING_SIZE } from '~~/core'
import type { Question } from '~~/core'
import { toQuestion, toRankingEntry } from '~/utils/firestore-mappers'
import type { RankingStore } from '~/utils/ranking-service'

export interface FirebaseWebConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
}

export interface FirebaseServices {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

export interface SignedInUser {
  uid: string
  displayName: string
  photoURL: string | null
}

export function createFirebase(config: FirebaseWebConfig, useEmulators: boolean): FirebaseServices {
  const existing = getApps()[0]
  const app = existing ?? initializeApp(config)
  const auth = getAuth(app)
  const db = getFirestore(app)
  if (!existing && useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8180)
  }
  return { app, auth, db }
}

// --- Auth -------------------------------------------------------------------------

function toSignedInUser(user: User): SignedInUser {
  return { uid: user.uid, displayName: user.displayName ?? 'Jugador', photoURL: user.photoURL }
}

/** Calls back with the current user (or null) now and on every change. */
export function watchAuth(auth: Auth, callback: (user: SignedInUser | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => callback(user ? toSignedInUser(user) : null))
}

export async function signInWithGoogle(auth: Auth): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider())
}

export function signOutUser(auth: Auth): Promise<void> {
  return signOut(auth)
}

// --- Questions --------------------------------------------------------------------

/** Active questions only (the security rules require this filter). Skips malformed docs. */
export async function fetchActiveQuestions(db: Firestore): Promise<Question[]> {
  const snapshot = await getDocs(
    query(collection(db, 'questions'), where('status', '==', 'active')),
  )
  const questions: Question[] = []
  let invalid = 0
  for (const document of snapshot.docs) {
    const question = toQuestion(document.id, document.data())
    if (question) questions.push(question)
    else invalid += 1
  }
  if (invalid > 0) console.warn(`[questions] ignored ${invalid} malformed document(s)`)
  return questions
}

// --- Rankings ---------------------------------------------------------------------

export function createRankingStore(db: Firestore): RankingStore {
  const entriesOf = (board: string) => collection(db, 'rankings', board, 'entries')

  return {
    async getBestPoints(board, uid) {
      const snapshot = await getDoc(doc(db, 'rankings', board, 'entries', uid))
      const points: unknown = snapshot.get('points')
      return typeof points === 'number' ? points : null
    },

    async saveEntry(board, entry) {
      await setDoc(doc(db, 'rankings', board, 'entries', entry.uid), {
        ...entry,
        createdAt: serverTimestamp(),
      })
    },

    async countBetter(board, points) {
      const snapshot = await getCountFromServer(
        query(entriesOf(board), where('points', '>', points)),
      )
      return snapshot.data().count
    },

    async topEntries(board) {
      const snapshot = await getDocs(
        query(entriesOf(board), orderBy('points', 'desc'), limit(RANKING_SIZE)),
      )
      return snapshot.docs.flatMap((document) => {
        const entry = toRankingEntry(document.data())
        return entry ? [entry] : []
      })
    },
  }
}
