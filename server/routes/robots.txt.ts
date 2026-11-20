import { SEO } from '../../app/content/seo'
import { buildRobotsTxt, normalizeSiteUrl } from '../../app/utils/seo'

// Prerendered by `nuxt generate` (see nitro.prerender.routes), so the site URL is baked in at
// build time from NUXT_PUBLIC_SITE_URL.
export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  const { siteUrl } = useRuntimeConfig(event).public
  return buildRobotsTxt(normalizeSiteUrl(siteUrl, SEO.defaultSiteUrl))
})
