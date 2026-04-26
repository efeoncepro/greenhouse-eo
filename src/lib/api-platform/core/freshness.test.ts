import { describe, expect, it } from 'vitest'

import { buildApiPlatformEtag, isApiPlatformConditionalMatch, maxIsoTimestamp } from './freshness'

describe('api platform freshness', () => {
  it('builds stable etags independent of object key order', () => {
    const left = buildApiPlatformEtag({ b: 2, a: 1 })
    const right = buildApiPlatformEtag({ a: 1, b: 2 })

    expect(left).toBe(right)
    expect(left).toMatch(/^"[a-f0-9]{32}"$/)
  })

  it('matches If-None-Match and If-Modified-Since conditional requests', () => {
    const etag = buildApiPlatformEtag({ ok: true })

    expect(isApiPlatformConditionalMatch({
      request: new Request('https://example.com', {
        headers: {
          'if-none-match': etag
        }
      }),
      etag
    })).toBe(true)

    expect(isApiPlatformConditionalMatch({
      request: new Request('https://example.com', {
        headers: {
          'if-modified-since': 'Sat, 25 Apr 2026 20:31:00 GMT'
        }
      }),
      etag,
      lastModified: 'Sat, 25 Apr 2026 20:30:00 GMT'
    })).toBe(true)
  })

  it('returns the newest timestamp as an HTTP date', () => {
    expect(maxIsoTimestamp([
      '2026-04-25T19:00:00.000Z',
      '2026-04-25T20:30:00.000Z'
    ])).toBe('Sat, 25 Apr 2026 20:30:00 GMT')
  })
})
