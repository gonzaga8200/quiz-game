import { CATEGORY_PATHS, QUESTIONS_PATH, SEO } from './app/content/seo'
import { normalizeSiteUrl } from './app/utils/seo'

// Public origin of the deployed site, used for canonical URLs, social cards and the sitemap.
// Set NUXT_PUBLIC_SITE_URL when the game gets its own domain.
const siteUrl = normalizeSiteUrl(process.env.NUXT_PUBLIC_SITE_URL, SEO.defaultSiteUrl)

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

  // robots.txt and sitemap.xml are server routes rendered once at build time, so the site URL
  // comes from the environment instead of being hard-coded in a file under public/. The question
  // pages are listed too, so the build always emits one page per category.
  nitro: {
    prerender: { routes: ['/robots.txt', '/sitemap.xml', QUESTIONS_PATH, ...CATEGORY_PATHS] },
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
      siteUrl, // NUXT_PUBLIC_SITE_URL
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
      title: SEO.title,
      meta: [
        { name: 'description', content: SEO.description },
        { name: 'theme-color', content: '#261811' },
        // Social cards (WhatsApp, Telegram, X, Facebook, LinkedIn...).
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: SEO.name },
        { property: 'og:locale', content: SEO.locale },
        { property: 'og:title', content: SEO.title },
        { property: 'og:description', content: SEO.description },
        { property: 'og:image', content: `${siteUrl}${SEO.image}` },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: SEO.imageAlt },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: SEO.title },
        { name: 'twitter:description', content: SEO.description },
        { name: 'twitter:image', content: `${siteUrl}${SEO.image}` },
        { name: 'twitter:image:alt', content: SEO.imageAlt },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },
})
