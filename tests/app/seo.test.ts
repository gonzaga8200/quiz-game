import { describe, expect, it } from 'vitest'
import { CATEGORY_COPY, HUB_COPY } from '../../app/content/categories'
import { SEO, SITEMAP_PATHS } from '../../app/content/seo'
import { LEGAL } from '../../app/content/legal'
import { CATEGORIES } from '../../core/constants'
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildRobotsTxt,
  buildSitemapXml,
  normalizeSiteUrl,
} from '../../app/utils/seo'

const SITE = 'https://contrarreloj-quiz.web.app'

describe('normalizeSiteUrl', () => {
  it.each([
    ['https://example.com', 'https://example.com'],
    ['https://example.com/', 'https://example.com'],
    ['  https://example.com//  ', 'https://example.com'],
    ['http://localhost:3000', 'http://localhost:3000'],
  ])('keeps %j as %j', (input, expected) => {
    expect(normalizeSiteUrl(input, SITE)).toBe(expected)
  })

  it.each([undefined, '', '   ', 'example.com', 'ftp://example.com'])(
    'falls back for %j',
    (input) => {
      expect(normalizeSiteUrl(input, SITE)).toBe(SITE)
    },
  )
})

describe('absoluteUrl', () => {
  it('keeps the home page as the origin plus a slash', () => {
    expect(absoluteUrl(SITE, '/')).toBe(`${SITE}/`)
  })

  it('drops query, hash and trailing slashes from other pages', () => {
    expect(absoluteUrl(SITE, '/cookies/')).toBe(`${SITE}/cookies`)
    expect(absoluteUrl(SITE, '/jugar?modo=arcade')).toBe(`${SITE}/jugar`)
    expect(absoluteUrl(SITE, '/ranking#top')).toBe(`${SITE}/ranking`)
  })

  it('adds a missing leading slash', () => {
    expect(absoluteUrl(SITE, 'cookies')).toBe(`${SITE}/cookies`)
  })
})

describe('buildRobotsTxt', () => {
  it('allows crawling and points at the sitemap', () => {
    expect(buildRobotsTxt(SITE)).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)
  })

  it('does not disallow the noindex routes: a crawler must be able to read the header', () => {
    expect(buildRobotsTxt(SITE)).not.toMatch(/Disallow/i)
  })
})

describe('buildSitemapXml', () => {
  it('lists every path with an absolute URL', () => {
    const xml = buildSitemapXml(SITE, ['/', '/cookies'])
    expect(xml).toContain(`<loc>${SITE}/</loc>`)
    expect(xml).toContain(`<loc>${SITE}/cookies</loc>`)
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  })

  it('escapes XML special characters', () => {
    expect(buildSitemapXml(SITE, ['/a&b'])).toContain('/a&amp;b</loc>')
  })

  it('the real sitemap lists the home, the question hub and one page per category', () => {
    expect(SITEMAP_PATHS).toHaveLength(2 + CATEGORIES.length)
    expect(SITEMAP_PATHS.slice(0, 2)).toEqual(['/', '/preguntas'])
    expect(SITEMAP_PATHS).toContain('/preguntas/deportes')
    expect(new Set(SITEMAP_PATHS).size).toBe(SITEMAP_PATHS.length)
  })
})

describe('the site address', () => {
  it('is the custom domain, over https and without a trailing slash', () => {
    expect(SEO.defaultSiteUrl).toBe('https://contrarreloj-quiz.com')
    expect(normalizeSiteUrl(undefined, SEO.defaultSiteUrl)).toBe(SEO.defaultSiteUrl)
  })

  it('is the same domain the legal notice names, as Spanish law asks', () => {
    expect(LEGAL.domain).toBe(new URL(SEO.defaultSiteUrl).hostname)
  })

  it('has a public contact address on that domain, not a personal mailbox', () => {
    expect(LEGAL.email).toBe(`informacion@${LEGAL.domain}`)
  })
})

describe('SEO copy', () => {
  it('fits the search result limits', () => {
    expect(SEO.title.length).toBeLessThanOrEqual(60)
    expect(SEO.description.length).toBeGreaterThanOrEqual(110)
    expect(SEO.description.length).toBeLessThanOrEqual(160)
  })

  it('does not promise "no registration" for the whole game: only arcade has none', () => {
    expect(SEO.description).toContain('arcade')
    expect(SEO.description).not.toMatch(/gratis y sin registro/i)
  })

  it('puts the descriptive words next to the brand', () => {
    expect(SEO.title).toContain(SEO.name)
    expect(SEO.title.toLowerCase()).toContain('preguntas')
  })
})

describe('category page copy', () => {
  it.each(CATEGORIES)('%s has copy that fits the search result limits', (category) => {
    const copy = CATEGORY_COPY[category]
    expect(copy.title.length).toBeLessThanOrEqual(45)
    expect(copy.description.length).toBeGreaterThanOrEqual(110)
    expect(copy.description.length).toBeLessThanOrEqual(160)
    expect(copy.heading.toLowerCase()).toContain('preguntas')
    expect(copy.intro).toHaveLength(2)
  })

  it('gives every page a different title, heading and description', () => {
    const all = [...CATEGORIES.map((c) => CATEGORY_COPY[c]), HUB_COPY]
    for (const key of ['title', 'heading', 'description'] as const) {
      expect(new Set(all.map((c) => c[key])).size).toBe(all.length)
    }
  })

  it('does not repeat the same paragraph or the same opening on every page', () => {
    const copies = CATEGORIES.map((c) => CATEGORY_COPY[c])
    const openings = copies.map((c) => c.intro[0].split(' ').slice(0, 3).join(' '))
    expect(new Set(openings).size).toBe(copies.length)
    expect(new Set(copies.map((c) => c.intro[1])).size).toBe(copies.length)
    expect(new Set(copies.map((c) => c.intro[0])).size).toBe(copies.length)
  })

  it('the hub copy fits the limits too', () => {
    expect(HUB_COPY.title.length).toBeLessThanOrEqual(45)
    expect(HUB_COPY.description.length).toBeGreaterThanOrEqual(110)
    expect(HUB_COPY.description.length).toBeLessThanOrEqual(160)
  })
})

describe('breadcrumbJsonLd', () => {
  const json = breadcrumbJsonLd(SITE, [
    { name: 'Inicio', path: '/' },
    { name: 'Preguntas', path: '/preguntas' },
    { name: 'Deportes', path: '/preguntas/deportes' },
  ])
  const data = JSON.parse(json)

  it('is a BreadcrumbList with absolute URLs in order', () => {
    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toBe('BreadcrumbList')
    expect(data.itemListElement.map((item: { position: number }) => item.position)).toEqual([
      1, 2, 3,
    ])
    expect(data.itemListElement[2]).toMatchObject({
      '@type': 'ListItem',
      name: 'Deportes',
      item: `${SITE}/preguntas/deportes`,
    })
  })

  it('cannot close the script tag it is embedded in', () => {
    const risky = breadcrumbJsonLd(SITE, [{ name: '</script><b>', path: '/' }])
    expect(risky).not.toContain('<')
    expect(JSON.parse(risky).itemListElement[0].name).toBe('</script><b>')
  })
})
