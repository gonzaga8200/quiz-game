// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint'],

  // Static site: `nuxt generate` prerenders every page into `.output/public`
  // (Firebase Hosting on the Spark plan has no server runtime).
  ssr: true,

  eslint: {
    config: { stylistic: false }, // formatting is Prettier's job
  },

  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true,
      },
    },
  },

  // Public values are inlined at build time (static output). They are NOT secrets:
  // Firebase web config and the GA measurement id are public by design.
  runtimeConfig: {
    public: {
      gaId: '', // NUXT_PUBLIC_GA_ID
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
      ],
    },
  },
})
