import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { Ga4AdminClient, Ga4DataClient } from '../api-client'

afterEach(() => vi.unstubAllGlobals())

describe('GA4 API clients', () => {
  it('loads every accessible account summary page for the property picker', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        accountSummaries: [{ account: 'accounts/1', propertySummaries: [{ property: 'properties/111' }] }],
        nextPageToken: 'next page'
      }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        accountSummaries: [{ account: 'accounts/2', propertySummaries: [{ property: 'properties/222' }] }]
      }) })

    vi.stubGlobal('fetch', fetchMock)

    const accounts = await new Ga4AdminClient({ getAccessToken: async () => 'access-token' }).listAccountSummaries()

    expect(accounts.map(account => account.properties[0]?.propertyId)).toEqual(['111', '222'])
    expect(fetchMock.mock.calls[1][0]).toContain('pageToken=next%20page')
  })

  it('sends a historical report with the bound property and read token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rows: [], rowCount: 0 }) })

    vi.stubGlobal('fetch', fetchMock)

    await new Ga4DataClient({ getAccessToken: async () => 'access-token' }).runReport('328274754', {
      dateRanges: [{ startDate: '2025-09-01', endDate: '2026-08-31' }],
      dimensions: [{ name: 'yearMonth' }],
      metrics: [{ name: 'sessions' }]
    })

    expect(fetchMock.mock.calls[0][0]).toContain('properties/328274754:runReport')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer access-token' }
    })
  })
})
