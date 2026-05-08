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
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import {
  findFinanceClientContextByLookupId,
  resolveFinanceClientContext,
  resolveFinanceDownstreamScope
} from '@/lib/finance/canonical'

describe('resolveFinanceClientContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRunFinanceQuery.mockReset()
    mockGetFinanceProjectId.mockReset()
    mockResolveOrganizationForClient.mockReset()
    mockShouldFallbackFromFinancePostgres.mockReset()
    mockRunGreenhousePostgresQuery.mockReset()
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

  it('qualifies joined client profile filters to avoid ambiguous client_id references', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    await expect(
      resolveFinanceClientContext({
        organizationId: 'org-1',
        clientId: 'client-1',
        clientProfileId: 'profile-1',
        hubspotCompanyId: 'hubspot-1'
      })
    ).rejects.toThrow('clientId does not exist in the finance client context.')

    const profileQuery = mockRunGreenhousePostgresQuery.mock.calls[1]?.[0]

    expect(typeof profileQuery).toBe('string')
    expect(profileQuery).toContain("($1 != '' AND cp.client_profile_id = $1)")
    expect(profileQuery).toContain("OR ($2 != '' AND (cp.client_id = $2 OR cp.client_profile_id = $2))")
    expect(profileQuery).toContain("OR ($3 != '' AND cp.hubspot_company_id = $3)")
    expect(profileQuery).not.toContain("($1 != '' AND client_profile_id = $1)")
    expect(profileQuery).not.toContain("OR ($2 != '' AND (client_id = $2 OR client_profile_id = $2))")
    expect(profileQuery).not.toContain("OR ($3 != '' AND hubspot_company_id = $3)")
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

  it('resolves downstream scope for org-first flows through the active space bridge', async () => {
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
          client_id: null,
          space_id: 'space-1'
        }
      ])
      .mockResolvedValueOnce([
        {
          space_id: 'space-1',
          client_id: 'client-1',
          organization_id: 'org-1'
        }
      ])

    const result = await resolveFinanceDownstreamScope({
      organizationId: 'org-1',
      requireLegacyClientBridge: true
    })

    expect(result).toMatchObject({
      clientId: 'client-1',
      clientProfileId: 'profile-1',
      organizationId: 'org-1',
      spaceId: 'space-1'
    })
  })

  it('fails closed when a downstream flow still needs a legacy client bridge', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          client_profile_id: 'profile-2',
          client_id: null,
          organization_id: 'org-2',
          hubspot_company_id: null,
          legal_name: 'Acme LLC'
        }
      ])
      .mockResolvedValueOnce([
        {
          organization_id: 'org-2',
          organization_name: 'Acme',
          legal_name: 'Acme LLC',
          hubspot_company_id: null,
          client_id: null,
          space_id: null
        }
      ])
      .mockResolvedValueOnce([
        {
          space_id: 'space-2',
          client_id: null,
          organization_id: 'org-2'
        }
      ])

    await expect(
      resolveFinanceDownstreamScope({
        organizationId: 'org-2',
        requireLegacyClientBridge: true
      })
    ).rejects.toThrow('legacy clientId bridge')
  })
})

/**
 * ISSUE-070 — `findFinanceClientContextByLookupId` es el helper canónico para
 * READ paths que reciben URL `[id]` sin saber qué shape canónico es. Tests
 * cubren los 4 prefijos conocidos + sin prefix + miss + propagación de errores
 * no-validation.
 */
describe('findFinanceClientContextByLookupId — ISSUE-070 fix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRunFinanceQuery.mockReset()
    mockGetFinanceProjectId.mockReset()
    mockResolveOrganizationForClient.mockReset()
    mockShouldFallbackFromFinancePostgres.mockReset()
    mockRunGreenhousePostgresQuery.mockReset()
    mockGetFinanceProjectId.mockReturnValue('test-project')
    mockResolveOrganizationForClient.mockResolvedValue('org-1')
    mockShouldFallbackFromFinancePostgres.mockReturnValue(false)
  })

  // Mock canónico que pattern-matchea por contenido de SQL — el resolver
  // hace múltiples queries (organizations join + client_profiles + clients
  // + spaces) en orden distinto según prefijo. El mock debe responder con
  // datos consistentes para cada SQL signature.
  const installSuccessfulMock = (
    organizationId: string,
    clientProfileId: string,
    hubspotCompanyId = '27776076692'
  ) => {
    mockRunGreenhousePostgresQuery.mockImplementation((sql: string) => {
      const s = String(sql ?? '')

      if (s.includes('FROM greenhouse_core.organizations o')) {
        return Promise.resolve([
          {
            organization_id: organizationId,
            organization_name: 'ANAM',
            legal_name: 'ANAM',
            hubspot_company_id: hubspotCompanyId,
            client_id: clientProfileId,
            space_id: 'spc-1'
          }
        ])
      }

      if (s.includes('FROM greenhouse_finance.client_profiles cp')) {
        return Promise.resolve([
          {
            client_profile_id: clientProfileId,
            client_id: clientProfileId,
            organization_id: organizationId,
            hubspot_company_id: hubspotCompanyId,
            legal_name: 'ANAM'
          }
        ])
      }

      if (s.includes('FROM greenhouse_core.clients c')) {
        return Promise.resolve([
          {
            client_id: clientProfileId,
            client_name: 'ANAM',
            hubspot_company_id: hubspotCompanyId
          }
        ])
      }

      // spaces lookup, etc → empty (resolver tolera)
      return Promise.resolve([])
    })
  }

  it('resuelve prefix `hubspot-company-` como clientProfileId', async () => {
    installSuccessfulMock('org-1', 'hubspot-company-27776076692')

    const result = await findFinanceClientContextByLookupId('hubspot-company-27776076692')

    expect(result).not.toBeNull()
    expect(result!.organizationId).toBe('org-1')
    expect(result!.clientName).toBe('ANAM')
  })

  it('resuelve prefix `org-` como organizationId', async () => {
    installSuccessfulMock('org-f6aa4e20', 'hubspot-company-27776076692')

    const result = await findFinanceClientContextByLookupId('org-f6aa4e20')

    expect(result).not.toBeNull()
    expect(result!.organizationId).toBe('org-f6aa4e20')
  })

  it('resuelve prefix `client-profile-` como clientProfileId', async () => {
    installSuccessfulMock('org-1', 'client-profile-test-001')

    const result = await findFinanceClientContextByLookupId('client-profile-test-001')

    expect(result).not.toBeNull()
    expect(result!.clientProfileId).toBe('client-profile-test-001')
  })

  it('intenta múltiples shapes para IDs sin prefix conocido', async () => {
    installSuccessfulMock('org-1', 'legacy-id-without-prefix')

    const result = await findFinanceClientContextByLookupId('legacy-id-without-prefix')

    expect(result).not.toBeNull()
  })

  it('devuelve null cuando ningún shape matchea (sin throw)', async () => {
    // Todas las PG queries devuelven empty
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    const result = await findFinanceClientContextByLookupId('nonexistent-id')

    expect(result).toBeNull()
  })

  it('devuelve null para input vacío sin tocar PG', async () => {
    const result = await findFinanceClientContextByLookupId('')

    expect(result).toBeNull()
    expect(mockRunGreenhousePostgresQuery).not.toHaveBeenCalled()
  })

  it('NO propaga FinanceValidationError (degradación honesta para read paths)', async () => {
    // PG devuelve empty para hubspot-company prefix → resolver throws
    // FinanceValidationError → helper debe catch y devolver null.
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    // No debería throw
    await expect(
      findFinanceClientContextByLookupId('hubspot-company-nonexistent')
    ).resolves.toBeNull()
  })

  it('SÍ propaga errores no-validation (PG caído)', async () => {
    const pgError = new Error('connection refused')

    mockRunGreenhousePostgresQuery.mockRejectedValueOnce(pgError)
    mockShouldFallbackFromFinancePostgres.mockReturnValue(false)

    await expect(
      findFinanceClientContextByLookupId('org-test')
    ).rejects.toThrow()
  })
})
