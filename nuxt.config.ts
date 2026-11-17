// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/fonts'],

  // Static site: `nuxt generate` prerenders every page into `.output/public`
  // (Firebase Hosting on the Spark plan has no server runtime).
  ssr: true,

  css: ['~/assets/css/main.css'],

  // Component names match file names (`components/game/QuestionCard.vue` -> <QuestionCard>).
  components: [{ path: '~/components', pathPrefix: false }],

  // Pages that depend on browser-only state (the game, auth, Firestore) render on the
  // client; Nuxt still emits their HTML shell so Hosting can serve them.
  routeRules: {
    '/jugar': { ssr: false },
    '/competitivo': { ssr: false },
    '/ranking': { ssr: false },
  },

  eslint: {
    config: { stylistic: false }, // formatting is Prettier's job
  },

  // Fonts are downloaded at build time and served from our own origin, so visitors'
  // IP addresses never reach Google's font CDN (no consent needed for that).
  fonts: {
    defaults: { subsets: ['latin', 'latin-ext'] },
    families: [
      {
        name: 'Playfair Display',
        provider: 'google',
        weights: [700, 800],
        styles: ['normal', 'italic'],
      },
      {
        name: 'Atkinson Hyperlegible Next',
        provider: 'google',
        weights: [400, 700],
        styles: ['normal', 'italic'],
      },
    ],
  },

  typescript: {
    strict: true,
    // Type-check the app's unit tests with the same (strict) settings as the app.
    tsConfig: { include: ['../tests/app/**/*'] },
  },

  // Public values are inlined at build time (static output). They are NOT secrets:
  // Firebase web config and the GA measurement id are public by design.
  runtimeConfig: {
    public: {
      gaId: '', // NUXT_PUBLIC_GA_ID
      firebase: {
        apiKey: '', // NUXT_PUBLIC_FIREBASE_API_KEY
        authDomain: '', // NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN
        projectId: '', // NUXT_PUBLIC_FIREBASE_PROJECT_ID
        appId: '', // NUXT_PUBLIC_FIREBASE_APP_ID
      },
      useEmulators: false, // NUXT_PUBLIC_USE_EMULATORS
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'es' },
      title: 'Contrarreloj',
      meta: [
        {
          name: 'description',
          content: 'Responde todas las preguntas que puedas antes de que se acabe el tiempo.',
        },
        { name: 'theme-color', content: '#261811' },
      ],
    },
  },
})
