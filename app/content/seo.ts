import { categoryUrlSlug } from '../../core/categories'
import { CATEGORIES } from '../../core/constants'

/**
 * Search and social-sharing copy, kept in one place so the Nuxt config, the pages and the
 * generated files (robots.txt, sitemap.xml) never drift apart.
 *
 * Why the title is not just "Contrarreloj": the word is also the cycling time trial, and the
 * name alone would compete with Vuelta and Tour results. The descriptive part says what this is.
 */
export const SEO = {
  name: 'Contrarreloj',
  title: 'Contrarreloj · Juego de preguntas contra el tiempo',
  description:
    'Contrarreloj es un juego de preguntas contra el tiempo: responde todas las que puedas en 60 segundos. El modo arcade es gratis y no pide registro.',
  /** Used until the game has its own domain; override with NUXT_PUBLIC_SITE_URL. */
  defaultSiteUrl: 'https://contrarreloj-quiz.web.app',
  /** Path under `public/`; 1200 x 630 px. */
  image: '/og-image.png',
  imageAlt:
    'Reloj de bolsillo dorado y el texto «Contrarreloj, juego de preguntas contra el tiempo».',
  locale: 'es_ES',
} as const

/** Public URL of the question hub and of each category page. */
export const QUESTIONS_PATH = '/preguntas'
export const CATEGORY_PATHS: readonly string[] = CATEGORIES.map(
  (category) => `${QUESTIONS_PATH}/${categoryUrlSlug(category)}`,
)

/**
 * Pages worth indexing: the home, the question hub and one page per category. The game, the
 * competitive setup and the ranking are client-rendered (empty HTML for a crawler) and are
 * marked `noindex` in firebase.json; the cookie policy is `noindex` too.
 */
export const SITEMAP_PATHS: readonly string[] = ['/', QUESTIONS_PATH, ...CATEGORY_PATHS]
