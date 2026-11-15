import type { FirebaseServices } from '~/lib/firebase'

type FirebaseLib = typeof import('~/lib/firebase')

export interface LoadedFirebase {
  lib: FirebaseLib
  services: FirebaseServices
}

let loading: Promise<LoadedFirebase> | null = null

/**
 * Lazy access to Firebase. `configured` is false when the public config is missing
 * (for example a fresh clone with no `.env`); the game then runs fully offline.
 */
export function useFirebase() {
  const { firebase, useEmulators } = useRuntimeConfig().public
  const configured = Boolean(
    firebase.apiKey && firebase.authDomain && firebase.projectId && firebase.appId,
  )

  function load(): Promise<LoadedFirebase> {
    loading ??= import('~/lib/firebase').then((lib) => ({
      lib,
      services: lib.createFirebase(
        {
          apiKey: firebase.apiKey,
          authDomain: firebase.authDomain,
          projectId: firebase.projectId,
          appId: firebase.appId,
        },
        String(useEmulators) === 'true',
      ),
    }))
    return loading
  }

  return { configured, load }
}
