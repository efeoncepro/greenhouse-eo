import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ read: vi.fn(), connection: vi.fn() }))

vi.mock('../../../search-console/reader', () => ({ readSearchConsoleAnalytics: mocks.read }))
vi.mock('../../../search-console/connection-store', () => ({ getSearchConsoleConnection: mocks.connection }))
vi.mock('../../keyword-market-data', () => ({ normalizeMarketKeyword: (q: string) => q.trim().toLowerCase() }))

import { collectOrganicTrafficValueInputs } from '../collect'

const input = {
  organizationId: 'org-sky',
  siteUrl: 'https://blog.skyairline.com/',
  hostname: 'blog.skyairline.com',
  range: { startDate: '2026-09-01', endDate: '2026-09-30' }
}

const row = (keys: string[], clicks: number) => ({ keys, clicks, impressions: 10, ctr: 0.1, position: 2 })
const response = (rows: ReturnType<typeof row>[]) => ({ ok: true, siteUrl: input.siteUrl, rows })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.connection.mockResolvedValue({ status: 'active', siteUrl: input.siteUrl })
})

describe('GSC organic value collection', () => {
  it('uses separate controls, final web data and an exact host filter', async () => {
    mocks.read
      .mockResolvedValueOnce(response([row([], 10)]))
      .mockResolvedValueOnce(response([row([input.siteUrl + 'a/'], 10)]))
      .mockResolvedValueOnce(response([row([input.siteUrl + 'a/', ' SKY ', 'CHL'], 3)]))
    const result = await collectOrganicTrafficValueInputs(input)

    expect(result.totalClicks).toBe(10)
    expect(result.rows[0]).toMatchObject({ normalizedQuery: 'sky', country: 'chl', clicks: 3 })
    expect(mocks.read.mock.calls[0][1]).toMatchObject({
      dimensions: [],
      type: 'web',
      dataState: 'final',
      aggregationType: 'byPage'
    })
    expect(mocks.read.mock.calls[2][1].dimensionFilterGroups[0].filters[0].expression).toBe(
      '^https?://blog\\.skyairline\\.com/'
    )
  })

  it('rejects another property before requesting Google data', async () => {
    mocks.connection.mockResolvedValue({ status: 'active', siteUrl: 'https://other.example/' })
    await expect(collectOrganicTrafficValueInputs(input)).rejects.toThrow('connected_site_does_not_match')
    expect(mocks.read).not.toHaveBeenCalled()
  })

  it('stops with a visible failure when its pagination cap is reached', async () => {
    mocks.read
      .mockResolvedValueOnce(response([row([], 10)]))
      .mockResolvedValueOnce(response(Array.from({ length: 25000 }, () => row(['page'], 0))))
    await expect(collectOrganicTrafficValueInputs({ ...input, maxPages: 1 })).rejects.toThrow(
      'pagination_limit_reached'
    )
  })

  it('propagates revocation instead of substituting zero rows', async () => {
    mocks.read.mockResolvedValue({ ok: false, errorCode: 'token_unhealthy', status: 'revoked' })
    await expect(collectOrganicTrafficValueInputs(input)).rejects.toThrow('search_console_token_unhealthy')
  })
})
