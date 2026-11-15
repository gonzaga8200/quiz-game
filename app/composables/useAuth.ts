import { authErrorMessage, errorCode } from '~/utils/auth-errors'

export interface AuthUser {
  readonly uid: string
  readonly displayName: string
  readonly photoURL: string | null
}

/**
 * Google sign-in with Firebase Auth. The listener that keeps `user` up to date is
 * started by `plugins/auth.client.ts`. Firebase Auth keeps its session in the
 * browser's IndexedDB/localStorage; that storage is strictly necessary for signing in.
 */
export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const ready = useState<boolean>('auth-ready', () => false)
  const error = useState<string | null>('auth-error', () => null)
  const { configured, load } = useFirebase()
  const analytics = useAnalytics()

  /** Resolves once Firebase has reported the initial sign-in state. */
  function whenReady(): Promise<void> {
    if (ready.value) return Promise.resolve()
    return new Promise((resolve) => {
      const stop = watch(ready, (value) => {
        if (value) {
          stop()
          resolve()
        }
      })
    })
  }

  async function signIn(): Promise<void> {
    error.value = null
    // Events carry no personal data: only the sign-in method and Firebase's error code.
    analytics.track('login_click', { method: 'google' })
    try {
      const { lib, services } = await load()
      await lib.signInWithGoogle(services.auth)
      analytics.track('login_success', { method: 'google' })
    } catch (cause) {
      analytics.track('login_error', { method: 'google', error_code: errorCode(cause) })
      error.value = authErrorMessage(cause)
    }
  }

  async function signOut(): Promise<void> {
    error.value = null
    try {
      const { lib, services } = await load()
      await lib.signOutUser(services.auth)
    } catch {
      error.value = 'No se ha podido cerrar la sesión. Inténtalo de nuevo.'
    }
  }

  return {
    user: readonly(user),
    ready: readonly(ready),
    error: readonly(error),
    available: configured,
    whenReady,
    signIn,
    signOut,
  }
}
