import { afterEach, describe, expect, it, vi } from 'vitest'

const token = vi.hoisted(() => vi.fn())

vi.mock('@/lib/hubspot/access-token', () => ({ getHubSpotAccessToken: token }))

import { fetchServicesForCompany } from './list-services-for-company'

afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks() })

describe('service source authentication', () => {
  it('uses the canonical credential for association and service reads', async () => {
    token.mockResolvedValue('synthetic-token')
    const source = { id: 'service-1', properties: { hs_name: 'Synthetic service' } }

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ toObjectId: 'service-1' }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [source] })))

    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchServicesForCompany('company-1')).resolves.toEqual([source])

    for (const [url, options] of fetchMock.mock.calls) {
      expect(new URL(url).origin).toBe('https://api.hubapi.com')
      expect(options.headers.Authorization).toBe('Bearer synthetic-token')
    }
  })

  it('does not call the provider without an authorized credential', async () => {
    token.mockRejectedValue(new Error('Unavailable credential'))
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchServicesForCompany('company-1')).rejects.toThrow('Unavailable credential')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
