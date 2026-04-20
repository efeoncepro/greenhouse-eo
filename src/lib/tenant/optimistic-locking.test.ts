import { NextResponse } from 'next/server'

import { describe, expect, it } from 'vitest'

import {
  buildEtag,
  requireIfMatch,
  toUpdatedAtString,
  withOptimisticLockHeaders
} from '@/lib/tenant/optimistic-locking'

describe('optimistic-locking', () => {
  it('normalizes updated_at values and builds quoted etags', () => {
    expect(toUpdatedAtString('2026-04-19T12:00:00.000Z')).toBe('2026-04-19T12:00:00.000Z')
    expect(buildEtag('2026-04-19T12:00:00.000Z')).toBe('"2026-04-19T12:00:00.000Z"')
  })

  it('adds deprecation header when If-Match is absent', () => {
    const response = withOptimisticLockHeaders(
      NextResponse.json({ ok: true }),
      '2026-04-19T12:00:00.000Z',
      { missingIfMatch: true }
    )

    expect(response.headers.get('ETag')).toBe('"2026-04-19T12:00:00.000Z"')
    expect(response.headers.get('X-Deprecated-No-If-Match')).toBe('true')
  })

  it('accepts matching If-Match values and rejects stale ones', async () => {
    const fresh = new Request('http://localhost/test', {
      method: 'PATCH',
      headers: { 'if-match': '"2026-04-19T12:00:00.000Z"' }
    })

    const stale = new Request('http://localhost/test', {
      method: 'PATCH',
      headers: { 'if-match': '"2026-04-18T12:00:00.000Z"' }
    })

    const freshResult = requireIfMatch(fresh, '2026-04-19T12:00:00.000Z')
    const staleResult = requireIfMatch(stale, '2026-04-19T12:00:00.000Z')

    expect(freshResult).toEqual({ ok: true, missingIfMatch: false })
    expect(staleResult.ok).toBe(false)

    if (!staleResult.ok) {
      expect(staleResult.response.status).toBe(409)
      await expect(staleResult.response.json()).resolves.toMatchObject({
        error: 'Conflict',
        currentUpdatedAt: '2026-04-19T12:00:00.000Z'
      })
    }
  })
})
