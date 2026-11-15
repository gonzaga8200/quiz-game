export interface AuthUser {
  readonly uid: string
  readonly displayName: string
  readonly photoURL: string | null
}

/**
 * Authentication state. Firebase is wired in the next phase; until then nobody is
 * signed in and the Google sign-in entry points stay hidden (`available` is false).
 */
export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const available = useState<boolean>('auth-available', () => false)
  return { user: readonly(user), available: readonly(available) }
}
