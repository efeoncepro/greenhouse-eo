import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunFinanceQuery = vi.fn()
const mockGetFinanceProjectId = vi.fn()
const mockResolveOrganizationForClient = vi.fn()
const mockShouldFallbackFromFinancePostgres = vi.fn()
const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/finance/shared', async () => {
  const actual = await vi.importActual('@/lib/finance/shared')

  return {
    ...actual,
    runFinanceQuery: (...args: unknown[]) => mockRunFinanceQuery(...args),
    getFinanceProjectId: (...args: unknown[]) => mockGetFinanceProjectId(...args)
  }
})

vi.mock('@/lib/account-360/organization-identity', () => ({
  resolveOrganizationForClient: (...args: unknown[]) => mockResolveOrganizationForClient(...args)
}))

vi.mock('@/lib/finance/postgres-store', () => ({
  shouldFallbackFromFinancePostgres: (...args: unknown[]) => mockShouldFallbackFromFinancePostgres(...args)
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import { resolveFinanceClientContext } from '@/lib/finance/canonical'

describe('resolveFinanceClientContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFinanceProjectId.mockReturnValue('test-project')
    mockResolveOrganizationForClient.mockResolvedValue('org-1')
    mockShouldFallbackFromFinancePostgres.mockReturnValue(false)
  })

  it('resolves from Postgres-first canonical sources', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          client_id: 'client-1',
          client_name: 'Sky Airline',
          hubspot_company_id: 'hubspot-1'
        }
      ])
      .mockResolvedValueOnce([
        {
          client_profile_id: 'profile-1',
          client_id: 'client-1',
          organization_id: 'org-1',
          hubspot_company_id: 'hubspot-1',
          legal_name: 'Sky Airline SA'
        }
      ])
      .mockResolvedValueOnce([
        {
          organization_id: 'org-1',
          organization_name: 'Sky Airline',
          legal_name: 'Sky Airline SA',
          hubspot_company_id: 'hubspot-1',
          client_id: 'client-1',
          space_id: 'space-1'
        }
      ])

    const result = await resolveFinanceClientContext({
      clientId: 'client-1'
    })

    expect(result).toMatchObject({
      clientId: 'client-1',
      clientProfileId: 'profile-1',
      hubspotCompanyId: 'hubspot-1',
      clientName: 'Sky Airline',
      legalName: 'Sky Airline SA',
      organizationId: 'org-1'
    })
    expect(mockRunFinanceQuery).not.toHaveBeenCalled()
  })

  it('falls back to BigQuery only for allowed Postgres fallback errors', async () => {
    const pgError = new Error('finance postgres schema is not ready')

    mockRunGreenhousePostgresQuery.mockRejectedValue(pgError)
    mockShouldFallbackFromFinancePostgres.mockReturnValue(true)
    mockRunFinanceQuery
      .mockResolvedValueOnce([
        {
          client_id: 'client-1',
          client_name: 'Sky Airline',
          hubspot_company_id: 'hubspot-1'
        }
      ])
      .mockResolvedValueOnce([
        {
          client_profile_id: 'profile-1',
          client_id: 'client-1',
          organization_id: null,
          hubspot_company_id: 'hubspot-1',
          legal_name: 'Sky Airline SA'
        }
      ])

    const result = await resolveFinanceClientContext({
      clientId: 'client-1'
    })

    expect(result).toMatchObject({
      clientId: 'client-1',
      clientProfileId: 'profile-1',
      hubspotCompanyId: 'hubspot-1'
    })
    expect(mockRunFinanceQuery).toHaveBeenCalledTimes(2)
  })

  it('does not hide non-fallback Postgres errors behind BigQuery', async () => {
    const pgError = new Error('syntax error at or near SELECT')

    mockRunGreenhousePostgresQuery.mockRejectedValue(pgError)
    mockShouldFallbackFromFinancePostgres.mockReturnValue(false)

    await expect(
      resolveFinanceClientContext({ clientId: 'client-1' })
    ).rejects.toThrow('syntax error at or near SELECT')

    expect(mockRunFinanceQuery).not.toHaveBeenCalled()
  })
})
