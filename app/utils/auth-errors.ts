/**
 * Turns a Firebase Auth error into a message for the player, or null when nothing
 * should be shown (they simply closed the window).
 */
export function authErrorMessage(error: unknown): string | null {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''

  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null
    case 'auth/popup-blocked':
      return 'Tu navegador ha bloqueado la ventana de Google. Permite las ventanas emergentes para este sitio y vuelve a intentarlo.'
    case 'auth/network-request-failed':
      return 'No hay conexión con Google. Revisa tu conexión a internet y vuelve a intentarlo.'
    default:
      return 'No se ha podido iniciar sesión. Inténtalo de nuevo en unos minutos.'
  }
}
