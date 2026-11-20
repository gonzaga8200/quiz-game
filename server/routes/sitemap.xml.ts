import { SEO, SITEMAP_PATHS } from '../../app/content/seo'
import { buildSitemapXml, normalizeSiteUrl } from '../../app/utils/seo'

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  const { siteUrl } = useRuntimeConfig(event).public
  return buildSitemapXml(normalizeSiteUrl(siteUrl, SEO.defaultSiteUrl), SITEMAP_PATHS)
})
