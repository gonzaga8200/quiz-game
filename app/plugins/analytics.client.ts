/**
 * Browser start-up for consent and analytics: restore the saved decision (everything is
 * denied until then) and report a page view after every navigation if allowed.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const analytics = useAnalytics()
  const router = useRouter()

  analytics.init()
  useConsent().restore()

  nuxtApp.hook('page:finish', () => {
    // Let the page set its title first.
    setTimeout(() => analytics.pageView(router.currentRoute.value.fullPath, document.title), 0)
  })
})
