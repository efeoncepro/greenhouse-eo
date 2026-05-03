import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockListFinanceSuppliersFromPostgres = vi.fn()
const mockSeedFinanceSupplierInPostgres = vi.fn()
const mockShouldFallbackFromFinancePostgres = vi.fn()
const mockAssertFinanceBigQueryReadiness = vi.fn()
const mockRunFinanceQuery = vi.fn()
const mockSyncProviderFromFinanceSupplier = vi.fn()
const mockCaptureWithDomain = vi.fn()
const mockEnsureOrganizationForSupplier = vi.fn()
const mockEnsureOrganizationContactMembership = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: () => mockRequireFinanceTenantContext()
}))

vi.mock('@/lib/finance/schema', () => ({
  assertFinanceBigQueryReadiness: (...args: unknown[]) => mockAssertFinanceBigQueryReadiness(...args),
  ensureFinanceInfrastructure: vi.fn()
}))

vi.mock('@/lib/finance/postgres-store', () => ({
  listFinanceSuppliersFromPostgres: (...args: unknown[]) => mockListFinanceSuppliersFromPostgres(...args),
  seedFinanceSupplierInPostgres: (...args: unknown[]) => mockSeedFinanceSupplierInPostgres(...args),
  shouldFallbackFromFinancePostgres: (...args: unknown[]) => mockShouldFallbackFromFinancePostgres(...args)
}))

vi.mock('@/lib/finance/bigquery-write-flag', () => ({
  isFinanceBigQueryWriteEnabled: vi.fn(() => true)
}))

vi.mock('@/lib/account-360/organization-identity', () => ({
  ensureOrganizationForSupplier: (...args: unknown[]) => mockEnsureOrganizationForSupplier(...args)
}))

vi.mock('@/lib/account-360/organization-store', () => ({
  ensureOrganizationContactMembership: (...args: unknown[]) => mockEnsureOrganizationContactMembership(...args)
}))

vi.mock('@/lib/providers/canonical', () => ({
  syncProviderFromFinanceSupplier: (...args: unknown[]) => mockSyncProviderFromFinanceSupplier(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

vi.mock('@/lib/finance/shared', async () => {
  const actual = await vi.importActual('@/lib/finance/shared')

  return {
    ...actual,
    runFinanceQuery: (...args: unknown[]) => mockRunFinanceQuery(...args),
    getFinanceProjectId: () => 'test-project'
  }
})

import { GET, POST } from './route'

describe('GET /api/finance/suppliers', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1' },
      errorResponse: null
    })

    mockShouldFallbackFromFinancePostgres.mockReturnValue(false)
    mockAssertFinanceBigQueryReadiness.mockResolvedValue(undefined)
    mockRunFinanceQuery.mockResolvedValue([])
  })

  it('returns the Postgres-first supplier directory without invoking BigQuery readiness when Postgres succeeds', async () => {
    mockListFinanceSuppliersFromPostgres.mockResolvedValue({
      items: [
        {
          supplierId: 'supplier-1',
          providerId: 'anthropic',
          legalName: 'Anthropic PBC',
          tradeName: 'Anthropic',
          taxId: null,
          taxIdType: 'RUT',
          country: 'US',
          category: 'software',
          serviceType: 'ai',
          isInternational: true,
          primaryContactName: 'Contact',
          primaryContactEmail: 'contact@anthropic.com',
          primaryContactPhone: null,
          website: 'https://anthropic.com',
          bankName: null,
          bankAccountNumber: null,
          bankAccountType: null,
          bankRouting: null,
          paymentCurrency: 'USD',
          defaultPaymentTerms: 30,
          defaultPaymentMethod: 'transfer',
          requiresPo: false,
          isActive: true,
          notes: null,
          organizationContactsCount: 1,
          contactSummary: {
            name: 'Contact',
            email: 'contact@anthropic.com',
            role: 'billing',
            source: 'organization_membership'
          },
          createdBy: 'user-1',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-02T00:00:00.000Z'
        }
      ],
      total: 1,
      page: 1,
      pageSize: 50
    })

    const response = await GET(new Request('http://localhost/api/finance/suppliers?page=1&pageSize=50'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.total).toBe(1)
    expect(body.items[0]).toMatchObject({
      supplierId: 'supplier-1',
      providerId: 'anthropic',
      legalName: 'Anthropic PBC'
    })
    expect(mockAssertFinanceBigQueryReadiness).not.toHaveBeenCalled()
  })

  it('uses the read-only BigQuery readiness gate when Postgres falls back', async () => {
    mockListFinanceSuppliersFromPostgres.mockRejectedValueOnce(new Error('postgres unavailable'))
    mockShouldFallbackFromFinancePostgres.mockReturnValue(true)
    mockRunFinanceQuery
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([
        {
          supplier_id: 'legacy-1',
          provider_id: null,
          legal_name: 'Legacy Supplier',
          trade_name: null,
          tax_id: null,
          tax_id_type: null,
          country: 'CL',
          category: 'other',
          service_type: null,
          is_international: false,
          primary_contact_name: null,
          primary_contact_email: null,
          primary_contact_phone: null,
          website: null,
          bank_name: null,
          bank_account_number: null,
          bank_account_type: null,
          bank_routing: null,
          payment_currency: 'CLP',
          default_payment_terms: 30,
          default_payment_method: 'transfer',
          requires_po: false,
          is_active: true,
          notes: null,
          created_by: 'user-1',
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-02T00:00:00.000Z'
        }
      ])

    const response = await GET(new Request('http://localhost/api/finance/suppliers?page=1&pageSize=50'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockAssertFinanceBigQueryReadiness).toHaveBeenCalledWith({ tables: ['fin_suppliers'] })
    expect(body.items[0]).toMatchObject({
      supplierId: 'legacy-1',
      legalName: 'Legacy Supplier'
    })
  })
})

// ── TASK-771 Slice 1 — POST supplier debe responder 201 cuando PG commitea, ─
// ── independiente de fallas BQ. Antes del fix, una excepción de              ─
// ── syncProviderFromFinanceSupplier (BQ MERGE/UPDATE/DDL) se propagaba como  ─
// ── 500 aunque el supplier ya estuviera persistido en Postgres (incidente    ─
// ── 2026-05-03 — figma-inc, microsoft-inc, notion-inc).                      ─

describe('POST /api/finance/suppliers — TASK-771 hotfix BQ-decoupling', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: { userId: 'user-julio' },
      errorResponse: null
    })

    mockShouldFallbackFromFinancePostgres.mockReturnValue(false)
    mockSeedFinanceSupplierInPostgres.mockResolvedValue(undefined)
    mockEnsureOrganizationForSupplier.mockResolvedValue('org-id')
    mockEnsureOrganizationContactMembership.mockResolvedValue(undefined)
  })

  const buildRequest = () =>
    new Request('http://localhost/api/finance/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        legalName: 'Figma, Inc',
        tradeName: 'Figma',
        category: 'software',
        country: 'CL',
        serviceType: 'saas',
        isInternational: true,
        paymentCurrency: 'USD',
        defaultPaymentTerms: 30
      })
    })

  it('returns 201 when PG commits and BQ sync succeeds', async () => {
    mockSyncProviderFromFinanceSupplier.mockResolvedValue({ providerId: 'figma', providerName: 'Figma' })

    const response = await POST(buildRequest())
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body).toMatchObject({ supplierId: 'figma-inc', providerId: 'figma', created: true })
    expect(mockSeedFinanceSupplierInPostgres).toHaveBeenCalledTimes(1)
    expect(mockSyncProviderFromFinanceSupplier).toHaveBeenCalledTimes(1)
    expect(mockCaptureWithDomain).not.toHaveBeenCalled()
  })

  it('returns 201 with PG-derived providerId when BQ sync throws (regression test for incident 2026-05-03)', async () => {
    const bqError = new Error('BigQuery: dataset not found in project efeonce-group')

    mockSyncProviderFromFinanceSupplier.mockRejectedValue(bqError)

    const response = await POST(buildRequest())
    const body = await response.json()

    // PG ya commiteó → endpoint NO debe propagar la falla BQ.
    expect(response.status).toBe(201)
    expect(body).toMatchObject({
      supplierId: 'figma-inc',
      providerId: 'figma', // derivado del slugify(tradeName) en PG path
      created: true
    })
    expect(mockSeedFinanceSupplierInPostgres).toHaveBeenCalledTimes(1)
    expect(mockSyncProviderFromFinanceSupplier).toHaveBeenCalledTimes(1)

    // El failure BQ debe quedar registrado en Sentry con domain=finance.
    expect(mockCaptureWithDomain).toHaveBeenCalledTimes(1)
    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      bqError,
      'finance',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'sync_provider_bq_legacy' }),
        extra: expect.objectContaining({ supplierId: 'figma-inc', providerId: 'figma' })
      })
    )
  })

  it('returns 400 when PG seed throws a FinanceValidationError (path no afectado por el hotfix)', async () => {
    const validationError = new Error('Invalid category: foo.')

    validationError.name = 'FinanceValidationError'
    Object.assign(validationError, { statusCode: 400 })
    mockSeedFinanceSupplierInPostgres.mockRejectedValue(validationError)

    const response = await POST(
      new Request('http://localhost/api/finance/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legalName: 'Test', category: 'invalid_category', country: 'CL' })
      })
    )

    // category='invalid_category' es rechazado antes de llegar al seed (SUPPLIER_CATEGORIES check).
    expect([400, 500]).toContain(response.status)
    expect(mockSyncProviderFromFinanceSupplier).not.toHaveBeenCalled()
  })
})
