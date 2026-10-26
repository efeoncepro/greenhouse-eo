import { describe, expect, it } from 'vitest'

import {
  decide,
  pageModified,
  parseCrawlDate,
  requestedRecently,
  requestedToday,
  selectedProperty,
  urlBelongsToProperty
} from './gsc-request-indexing.mjs'

describe('parseCrawlDate', () => {
  it('reads the Spanish format Search Console shows', () => {
    expect(parseCrawlDate('26 oct 2026, 4:49:08')).toEqual(new Date(2026, 9, 26, 4, 49, 8))
    expect(parseCrawlDate('3 sept 2026, 17:05')).toEqual(new Date(2026, 8, 3, 17, 5, 0))
  })

  it('reads the English format with am/pm', () => {
    expect(parseCrawlDate('Oct 26, 2026, 4:49:08 PM')).toEqual(new Date(2026, 9, 26, 16, 49, 8))
    expect(parseCrawlDate('Oct 26, 2026, 12:10:00 AM')).toEqual(new Date(2026, 9, 26, 0, 10, 0))
  })

  it('returns null for anything else instead of guessing', () => {
    expect(parseCrawlDate('N/D')).toBeNull()
    expect(parseCrawlDate('')).toBeNull()
  })
})

describe('pageModified', () => {
  it('prefers article:modified_time and falls back to JSON-LD', () => {
    expect(pageModified('<meta property="article:modified_time" content="2026-10-26T12:00:00+00:00" />')?.toISOString()).toBe('2026-10-26T12:00:00.000Z')
    expect(pageModified('{"dateModified":"2026-10-20T08:00:00Z"}')?.toISOString()).toBe('2026-10-20T08:00:00.000Z')
    expect(pageModified('<html></html>')).toBeNull()
  })
})

describe('decide', () => {
  const modified = new Date('2026-10-26T12:00:00Z')

  it('requests when the URL is not on Google or was crawled before the change', () => {
    expect(decide({ onGoogle: false, lastCrawl: null, modified: null, force: false }).request).toBe(true)
    expect(decide({ onGoogle: true, lastCrawl: new Date('2026-10-10T00:00:00Z'), modified, force: false }).request).toBe(true)
  })

  it('skips when Google already crawled after the change, or when it cannot tell', () => {
    expect(decide({ onGoogle: true, lastCrawl: new Date('2026-10-26T13:00:00Z'), modified, force: false }).request).toBe(false)
    expect(decide({ onGoogle: true, lastCrawl: null, modified, force: false }).request).toBe(false)
    expect(decide({ onGoogle: true, lastCrawl: new Date('2026-10-10T00:00:00Z'), modified: null, force: false }).request).toBe(false)
  })

  it('force always requests', () => {
    expect(decide({ onGoogle: true, lastCrawl: new Date('2026-10-26T13:00:00Z'), modified, force: true }).request).toBe(true)
  })
})

describe('requestedToday', () => {
  it('counts only today’s confirmed requests', () => {
    const now = new Date('2026-10-26T15:00:00Z')

    const lines = [
      { at: '2026-10-26T09:00:00Z', result: 'requested' },
      { at: '2026-10-26T10:00:00Z', result: 'dry-run' },
      { at: '2026-10-25T23:00:00Z', result: 'requested' },
      null
    ]

    expect(requestedToday(lines, now)).toBe(1)
  })
})

describe('property guard', () => {
  it('accepts only URLs of the property, never another client', () => {
    expect(urlBelongsToProperty('https://efeoncepro.com/aeo/seo-y-aeo/', 'sc-domain:efeoncepro.com')).toBe(true)
    expect(urlBelongsToProperty('https://think.efeoncepro.com/x/', 'sc-domain:efeoncepro.com')).toBe(true)
    expect(urlBelongsToProperty('https://notefeoncepro.com/', 'sc-domain:efeoncepro.com')).toBe(false)
    expect(urlBelongsToProperty('https://cliente.cl/', 'sc-domain:efeoncepro.com')).toBe(false)
    expect(urlBelongsToProperty('https://efeoncepro.com/blog/', 'https://efeoncepro.com/')).toBe(true)
  })

  it('reads the selected property from the Search Console URL', () => {
    expect(selectedProperty('https://search.google.com/search-console/inspect?resource_id=sc-domain%3Aefeoncepro.com&id=abc')).toBe('sc-domain:efeoncepro.com')
    expect(selectedProperty('https://search.google.com/search-console?resource_id=sc-domain%3Acliente.cl')).toBe('sc-domain:cliente.cl')
    expect(selectedProperty('https://search.google.com/search-console/about')).toBeNull()
  })
})

describe('requestedRecently', () => {
  it('blocks a second request for the same URL within 24 hours, never another URL', () => {
    const now = new Date('2026-10-26T16:00:00Z')
    const url = 'https://efeoncepro.com/inbound/que-es-inbound-marketing/'

    const lines = [
      { at: '2026-10-26T15:39:00Z', url, result: 'timeout' },
      { at: '2026-10-26T15:50:00Z', url, result: 'requested' }
    ]

    expect(requestedRecently(lines, url, now)).toBe(true)
    expect(requestedRecently(lines, 'https://efeoncepro.com/aeo/seo-y-aeo/', now)).toBe(false)
    expect(requestedRecently(lines, url, new Date('2026-10-27T16:00:00Z'))).toBe(false)
    expect(requestedRecently([{ at: '2026-10-26T15:39:00Z', url, result: 'timeout' }], url, now)).toBe(false)
  })
})
