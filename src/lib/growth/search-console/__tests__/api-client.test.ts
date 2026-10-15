import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '@/mocks/node'
import { querySearchAnalytics, SearchConsoleApiError } from '../api-client'

describe('Search Analytics request contract', () => {
  it('preserves the previous request when additive options are absent', async () => {
    let body: unknown

    server.use(
      http.post(
        'https://searchconsole.googleapis.com/webmasters/v3/sites/:site/searchAnalytics/query',
        async ({ request }) => {
          body = await request.json()

          return HttpResponse.json({ rows: [] })
        }
      )
    )
    await querySearchAnalytics('test-access', 'https://example.com/', {
      range: { startDate: '2026-09-01', endDate: '2026-09-30' }
    })
    expect(body).toEqual({ startDate: '2026-09-01', endDate: '2026-09-30', dimensions: ['query'], rowLimit: 100 })
  })

  it('forwards explicit dimensions, filters, aggregation, final state and pagination', async () => {
    let body: unknown

    server.use(
      http.post(
        'https://searchconsole.googleapis.com/webmasters/v3/sites/:site/searchAnalytics/query',
        async ({ request }) => {
          body = await request.json()

          return HttpResponse.json({
            rows: [{ keys: ['page', 'query', 'chl'], clicks: 5, impressions: 10, ctr: 0.5, position: 1 }]
          })
        }
      )
    )

    const filters = [
      {
        groupType: 'and' as const,
        filters: [
          { dimension: 'page' as const, operator: 'includingRegex' as const, expression: '^https://blog\\.example/' }
        ]
      }
    ]

    const rows = await querySearchAnalytics('test-access', 'https://example.com/', {
      range: { startDate: '2026-09-01', endDate: '2026-09-30' },
      dimensions: [],
      rowLimit: 25000,
      startRow: 25000,
      type: 'web',
      dataState: 'final',
      aggregationType: 'byPage',
      dimensionFilterGroups: filters
    })

    expect(body).toMatchObject({
      dimensions: [],
      startRow: 25000,
      type: 'web',
      dataState: 'final',
      aggregationType: 'byPage',
      dimensionFilterGroups: filters
    })
    expect(rows[0].clicks).toBe(5)
  })

  it('keeps permission errors typed', async () => {
    server.use(
      http.post(
        'https://searchconsole.googleapis.com/webmasters/v3/sites/:site/searchAnalytics/query',
        () => new HttpResponse(null, { status: 403 })
      )
    )
    await expect(
      querySearchAnalytics('test-access', 'https://example.com/', {
        range: { startDate: '2026-09-01', endDate: '2026-09-30' }
      })
    ).rejects.toBeInstanceOf(SearchConsoleApiError)
  })
})
