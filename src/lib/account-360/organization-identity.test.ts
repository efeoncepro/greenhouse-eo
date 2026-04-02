import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only (no-op in tests)
vi.mock('server-only', () => ({}))

// Mock postgres client
const mockQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockQuery(...args)
}))

// Mock id generation
vi.mock('@/lib/account-360/id-generation', () => ({
  generateOrganizationId: () => 'org-test-123',
  nextPublicId: async () => 'EO-ORG-0001'
}))

// Import AFTER mocks are registered
const {
  findOrganizationByTaxId,
  ensureOrganizationForSupplier,
  ensureOrganizationForClient,
  resolveOrganizationForClient,
  resolvePrimarySpaceForOrganization
} =
  await import('./organization-identity')

describe('findOrganizationByTaxId', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns org when tax_id matches', async () => {
    mockQuery.mockResolvedValueOnce([
      { organization_id: 'org-abc', organization_type: 'client' }
    ])

    const result = await findOrganizationByTaxId('76.123.456-7')

    expect(result).toEqual({
      organizationId: 'org-abc',
      organizationType: 'client'
    })
    expect(mockQuery).toHaveBeenCalledOnce()
  })

  it('returns null when no match', async () => {
    mockQuery.mockResolvedValueOnce([])

    const result = await findOrganizationByTaxId('99.999.999-9')

    expect(result).toBeNull()
  })
})

describe('ensureOrganizationForSupplier', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns existing org_id when tax_id matches a supplier org', async () => {
    // findOrganizationByTaxId query
    mockQuery.mockResolvedValueOnce([
      { organization_id: 'org-existing', organization_type: 'supplier' }
    ])

    const orgId = await ensureOrganizationForSupplier({
      taxId: '76.123.456-7',
      taxIdType: 'RUT',
      legalName: 'ACME SpA'
    })

    expect(orgId).toBe('org-existing')

    // Should NOT call UPDATE (type is already 'supplier', not 'client')
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('upgrades type client → both when org exists as client', async () => {
    // findOrganizationByTaxId returns a client org
    mockQuery.mockResolvedValueOnce([
      { organization_id: 'org-client', organization_type: 'client' }
    ])

    // UPDATE to set type = 'both'
    mockQuery.mockResolvedValueOnce([])

    const orgId = await ensureOrganizationForSupplier({
      taxId: '76.123.456-7',
      taxIdType: 'RUT',
      legalName: 'ACME SpA'
    })

    expect(orgId).toBe('org-client')
    expect(mockQuery).toHaveBeenCalledTimes(2)

    // Verify the UPDATE was called with the right org_id
    expect(mockQuery.mock.calls[1][0]).toContain("organization_type = 'both'")
    expect(mockQuery.mock.calls[1][1]).toEqual(['org-client'])
  })

  it('creates new org with type supplier when no match exists', async () => {
    // findOrganizationByTaxId returns empty
    mockQuery.mockResolvedValueOnce([])

    // nextPublicId is mocked to return EO-ORG-0001
    // INSERT new org
    mockQuery.mockResolvedValueOnce([])

    const orgId = await ensureOrganizationForSupplier({
      taxId: '30-12345678-9',
      taxIdType: 'CUIT',
      legalName: 'Argentine Corp SA',
      tradeName: 'ArgCorp',
      country: 'AR'
    })

    expect(orgId).toBe('org-test-123')
    expect(mockQuery).toHaveBeenCalledTimes(2)

    // Verify INSERT params
    const insertParams = mockQuery.mock.calls[1][1]

    expect(insertParams[0]).toBe('org-test-123') // organization_id
    expect(insertParams[1]).toBe('EO-ORG-0001') // public_id
    expect(insertParams[2]).toBe('ArgCorp') // organization_name (tradeName)
    expect(insertParams[3]).toBe('Argentine Corp SA') // legal_name
    expect(insertParams[4]).toBe('30-12345678-9') // tax_id
    expect(insertParams[5]).toBe('CUIT') // tax_id_type
    expect(insertParams[6]).toBe('AR') // country
  })

  it('defaults country to CL and uses legalName when no tradeName', async () => {
    mockQuery.mockResolvedValueOnce([]) // find returns empty
    mockQuery.mockResolvedValueOnce([]) // INSERT

    await ensureOrganizationForSupplier({
      taxId: '76.111.222-3',
      legalName: 'Chilean SpA'
    })

    const insertParams = mockQuery.mock.calls[1][1]

    expect(insertParams[2]).toBe('Chilean SpA') // organization_name = legalName (no tradeName)
    expect(insertParams[5]).toBeNull() // tax_id_type not provided
    expect(insertParams[6]).toBe('CL') // default country
  })
})

describe('resolveOrganizationForClient', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('resolves org_id via spaces bridge', async () => {
    mockQuery.mockResolvedValueOnce([
      { organization_id: 'org-from-space' }
    ])

    const result = await resolveOrganizationForClient('client-123')

    expect(result).toBe('org-from-space')
    expect(mockQuery.mock.calls[0][1]).toEqual(['client-123'])
  })

  it('returns null when client has no active space with org', async () => {
    mockQuery.mockResolvedValueOnce([])

    const result = await resolveOrganizationForClient('client-orphan')

    expect(result).toBeNull()
  })
})

describe('ensureOrganizationForClient', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns existing org found via tax_id and upgrades type when needed', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { organization_id: 'org-existing', organization_type: 'other' }
      ])
      .mockResolvedValueOnce([])

    const result = await ensureOrganizationForClient({
      taxId: '76.123.456-7',
      taxIdType: 'RUT',
      legalName: 'Sky Airline SA',
      organizationName: 'Sky Airline',
      country: 'CL'
    })

    expect(result).toBe('org-existing')
    expect(mockQuery).toHaveBeenCalledTimes(2)
    expect(mockQuery.mock.calls[1][1]).toEqual([
      'org-existing',
      'client',
      'Sky Airline',
      'Sky Airline SA',
      null,
      '76.123.456-7',
      'RUT',
      'CL'
    ])
  })

  it('creates a new client organization when nothing matches', async () => {
    mockQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await ensureOrganizationForClient({
      hubspotCompanyId: 'hubspot-1',
      legalName: 'New Client LLC',
      organizationName: 'New Client',
      country: 'US'
    })

    expect(result).toBe('org-test-123')
    expect(mockQuery).toHaveBeenCalledTimes(2)
    expect(mockQuery.mock.calls[1][1]).toEqual([
      'org-test-123',
      'EO-ORG-0001',
      'New Client',
      'New Client LLC',
      null,
      null,
      'US',
      'hubspot-1'
    ])
  })
})

describe('resolvePrimarySpaceForOrganization', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns the latest active bridged space and client info', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        space_id: 'space-1',
        client_id: 'client-1',
        client_name: 'Sky Airline'
      }
    ])

    const result = await resolvePrimarySpaceForOrganization('org-1')

    expect(result).toEqual({
      spaceId: 'space-1',
      clientId: 'client-1',
      clientName: 'Sky Airline'
    })
  })
})
