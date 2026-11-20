import { describe, expect, it } from 'vitest'
import { SEO, SITEMAP_PATHS } from '../../app/content/seo'
import { absoluteUrl, buildRobotsTxt, buildSitemapXml, normalizeSiteUrl } from '../../app/utils/seo'

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

  it('the real sitemap only has the home page', () => {
    expect(SITEMAP_PATHS).toEqual(['/'])
  })
})

describe('SEO copy', () => {
  it('fits the search result limits', () => {
    expect(SEO.title.length).toBeLessThanOrEqual(60)
    expect(SEO.description.length).toBeGreaterThanOrEqual(110)
    expect(SEO.description.length).toBeLessThanOrEqual(160)
  })

  it('puts the descriptive words next to the brand', () => {
    expect(SEO.title).toContain(SEO.name)
    expect(SEO.title.toLowerCase()).toContain('preguntas')
  })
})
