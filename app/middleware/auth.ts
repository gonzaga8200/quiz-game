/**
 * Competitive mode needs a signed-in player. Arcade stays open to everyone.
 * Runs in the browser only: these routes render on the client.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  if (to.path === '/jugar' && to.query.modo === 'arcade') return

  const { user, available, whenReady } = useAuth()
  if (!available) return navigateTo('/')
  await whenReady()
  if (!user.value) return navigateTo('/')
})
