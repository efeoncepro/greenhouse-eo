import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { queryMock, syncHubSpotCompaniesMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  syncHubSpotCompaniesMock: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: queryMock
}))

vi.mock('@/lib/hubspot/sync-hubspot-companies', () => ({
  syncHubSpotCompanies: syncHubSpotCompaniesMock
}))

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()

global.fetch = fetchMock as unknown as typeof fetch

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })

describe('syncHubSpotCompanyById', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('RETURNING company_record_id')) {
        return [{ company_record_id: 'crm-company-existing' }]
      }

      return []
    })

    syncHubSpotCompaniesMock.mockResolvedValue({
      processed: 1,
      created: 0,
      promoted: 0,
      clientsInstantiated: 0
    })
  })

  it('materializes HubSpot companies without name using domain fallback and a non-blocking warning', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        hubspotCompanyId: '54964918606',
        identity: {
          name: null,
          domain: 'prospectrampuae.help',
          website: 'prospectrampuae.help',
          industry: null,
          country: null
        },
        lifecycle: {
          lifecyclestage: 'salesqualifiedlead'
        },
        owner: {
          hubspotOwnerId: '75788512'
        },
        capabilities: {
          businessLines: [],
          serviceModules: []
        }
      }))
      .mockResolvedValueOnce(jsonResponse({ contacts: [] }))

    const { syncHubSpotCompanyById } = await import('./sync-company-by-id')
    const result = await syncHubSpotCompanyById('54964918606')

    expect(result.companyRecordId).toBe('crm-company-existing')

    const warningCall = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes('hubspot_company_missing_name_warning')
    )

    expect(warningCall).toBeDefined()
    expect(warningCall?.[1]).toEqual(expect.arrayContaining([
      'hubspot-company-missing-name-54964918606',
      '54964918606'
    ]))

    const upsertCall = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO greenhouse_crm.companies')
    )

    expect(upsertCall).toBeDefined()
    expect(upsertCall?.[1]?.[1]).toBe('54964918606')
    expect(upsertCall?.[1]?.[2]).toBe('prospectrampuae.help')
    expect(upsertCall?.[1]?.[3]).toBeNull()
  })
})
