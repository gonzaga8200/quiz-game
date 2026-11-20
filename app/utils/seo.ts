/** Site origin without a trailing slash, falling back to `fallback` when empty or not http(s). */
export function normalizeSiteUrl(value: string | undefined, fallback: string): string {
  const candidate = (value ?? '').trim()
  const url = /^https?:\/\//i.test(candidate) ? candidate : fallback
  return url.replace(/\/+$/, '')
}

/** Absolute URL for a site path. The home page keeps its trailing slash: `https://host/`. */
export function absoluteUrl(siteUrl: string, path: string): string {
  const clean = path.split(/[?#]/)[0] ?? ''
  const normalized = clean.startsWith('/') ? clean : `/${clean}`
  return `${siteUrl}${normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized}`
}

export function buildRobotsTxt(siteUrl: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${absoluteUrl(siteUrl, '/sitemap.xml')}`,
    '',
  ].join('\n')
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function buildSitemapXml(siteUrl: string, paths: readonly string[]): string {
  const urls = paths.map(
    (path) => `  <url><loc>${escapeXml(absoluteUrl(siteUrl, path))}</loc></url>`,
  )
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
}
