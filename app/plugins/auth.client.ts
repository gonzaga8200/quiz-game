import type { AuthUser } from '~/composables/useAuth'

/** Starts listening to Firebase Auth as soon as the app boots in the browser. */
export default defineNuxtPlugin(() => {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const ready = useState<boolean>('auth-ready', () => false)
  const { configured, load } = useFirebase()

  if (!configured) {
    ready.value = true
    return
  }

  // Not awaited: the app must not wait for the Firebase SDK to start.
  load()
    .then(({ lib, services }) => {
      lib.watchAuth(services.auth, (signedIn) => {
        user.value = signedIn
        ready.value = true
      })
    })
    .catch(() => {
      ready.value = true
    })
})
