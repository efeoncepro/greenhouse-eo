import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockEnsureFinanceInfrastructure = vi.fn()
const mockRunFinanceQuery = vi.fn()
const mockGetFinanceProjectId = vi.fn()
const mockGetHubspotTableColumns = vi.fn()
const mockGetHubspotCompaniesExpressions = vi.fn()
const mockGetHubspotDealsExpressions = vi.fn()
const mockRunGreenhousePostgresQuery = vi.fn()
const mockWithGreenhousePostgresTransaction = vi.fn()
const mockGetGreenhousePostgresPool = vi.fn()
const mockGetOrganizationMemberships = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: (...args: unknown[]) => mockRequireFinanceTenantContext(...args)
}))

vi.mock('@/lib/finance/schema', () => ({
  ensureFinanceInfrastructure: (...args: unknown[]) => mockEnsureFinanceInfrastructure(...args)
}))

vi.mock('@/lib/finance/hubspot', () => ({
  getHubspotTableColumns: (...args: unknown[]) => mockGetHubspotTableColumns(...args),
  getHubspotCompaniesExpressions: (...args: unknown[]) => mockGetHubspotCompaniesExpressions(...args),
  getHubspotDealsExpressions: (...args: unknown[]) => mockGetHubspotDealsExpressions(...args)
}))

vi.mock('@/lib/finance/postgres-store', () => ({
  shouldFallbackFromFinancePostgres: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: (...args: unknown[]) => mockWithGreenhousePostgresTransaction(...args),
  getGreenhousePostgresPool: (...args: unknown[]) => mockGetGreenhousePostgresPool(...args),
  closeGreenhousePostgres: vi.fn()
}))

vi.mock('@/lib/finance/postgres-store-slice2', () => ({
  upsertFinanceClientProfileInPostgres: vi.fn(),
  getFinanceClientProfileFromPostgres: vi.fn()
}))

vi.mock('@/lib/account-360/organization-store', () => ({
  getOrganizationMemberships: (...args: unknown[]) => mockGetOrganizationMemberships(...args)
}))

vi.mock('@/lib/finance/canonical', () => ({
  resolveFinanceClientContext: vi.fn()
}))

vi.mock('@/lib/finance/bigquery-write-flag', () => ({
  isFinanceBigQueryWriteEnabled: vi.fn(() => true)
}))

vi.mock('@/lib/finance/shared', async () => {
  const actual = await vi.importActual('@/lib/finance/shared')

  return {
    ...actual,
    runFinanceQuery: (...args: unknown[]) => mockRunFinanceQuery(...args),
    getFinanceProjectId: (...args: unknown[]) => mockGetFinanceProjectId(...args)
  }
})

import { GET as getClients } from '@/app/api/finance/clients/route'
import { GET as getClientById } from '@/app/api/finance/clients/[id]/route'

describe('Finance clients read-path cutover', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: { tenantType: 'efeonce_internal', routeGroups: ['internal'], userId: 'user-1' },
      errorResponse: null
    })

    mockEnsureFinanceInfrastructure.mockResolvedValue(undefined)
    mockGetFinanceProjectId.mockReturnValue('test-project')
    mockGetHubspotTableColumns.mockResolvedValue(['dummy_column'])
    mockGetHubspotCompaniesExpressions.mockReturnValue({
      idExpr: 'CAST(hc.company_id AS STRING)',
      nameExpr: 'hc.name',
      domainExpr: 'hc.domain',
      countryExpr: 'hc.country',
      archivedFilter: 'TRUE',
      businessLineExpr: 'NULL',
      servicesExpr: 'NULL'
    })
    mockGetHubspotDealsExpressions.mockReturnValue({
      canQueryDeals: false,
      idExpr: 'NULL',
      nameExpr: 'NULL',
      stageExpr: 'NULL',
      pipelineExpr: 'NULL',
      amountExpr: 'NULL',
      closeDateExpr: 'NULL',
      companyIdExpr: 'NULL',
      archivedFilter: 'TRUE'
    })

    mockRunGreenhousePostgresQuery.mockResolvedValue([])
    mockGetOrganizationMemberships.mockResolvedValue([])
  })

  it('lists normalized finance clients even when HubSpot metadata lookup fails', async () => {
    mockRunGreenhousePostgresQuery.mockRejectedValueOnce(
      new Error('relation greenhouse_crm does not exist')
    )

    mockGetHubspotTableColumns.mockRejectedValueOnce(new Error('metadata unavailable'))

    mockRunFinanceQuery
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([
        {
          client_id: 'client-1',
          client_profile_id: 'profile-1',
          greenhouse_client_name: 'Sky Airline',
          hubspot_company_id: null,
          company_name: 'Sky Airline',
          company_domain: 'skyairline.com',
          company_country: 'CL',
          business_line: 'creative',
          service_modules_raw: 'creative-hub;media-planning',
          legal_name: 'Sky Airline SA',
          tax_id: '76.123.456-7',
          payment_terms_days: '45',
          payment_currency: 'USD',
          requires_po: true,
          requires_hes: false,
          total_receivable: 0,
          active_invoices_count: 0,
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-02T00:00:00.000Z'
        }
      ])
      .mockResolvedValueOnce([
        {
          income_id: 'inc-1',
          outstanding_amount_clp: '1234',
          canonical_client_id: 'client-1'
        }
      ])

    const response = await getClients(
      new Request('http://localhost/api/finance/clients?page=1&pageSize=20')
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      total: 1,
      page: 1,
      pageSize: 20
    })
    expect(body.items[0]).toMatchObject({
      clientId: 'client-1',
      clientProfileId: 'profile-1',
      companyName: 'Sky Airline',
      greenhouseClientName: 'Sky Airline',
      companyDomain: 'skyairline.com',
      companyCountry: 'CL',
      businessLine: 'creative',
      serviceModules: ['creative-hub', 'media-planning'],
      legalName: 'Sky Airline SA',
      taxId: '76.123.456-7',
      paymentTermsDays: 45,
      paymentCurrency: 'USD',
      requiresPo: true,
      requiresHes: false,
      totalReceivable: 1234,
      activeInvoicesCount: 1
    })
  })

  it('returns normalized client detail through the profile-only BigQuery fallback path', async () => {
    mockRunGreenhousePostgresQuery.mockRejectedValueOnce(
      new Error('relation greenhouse_crm does not exist')
    )

    mockRunFinanceQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          client_id: 'client-1',
          greenhouse_client_name: null,
          client_profile_id: 'profile-1',
          hubspot_company_id: null,
          company_name: 'Sky Airline',
          company_domain: 'skyairline.com',
          company_country: 'CL',
          business_line: 'creative',
          service_modules_raw: 'creative-hub',
          tax_id: '76.123.456-7',
          tax_id_type: 'RUT',
          legal_name: 'Sky Airline SA',
          billing_address: 'Av. Test 123',
          billing_country: 'CL',
          payment_terms_days: '30',
          payment_currency: 'CLP',
          requires_po: false,
          requires_hes: true,
          current_po_number: 'PO-123',
          current_hes_number: null,
          finance_contacts: JSON.stringify([{ name: 'Ana', email: 'ana@skyairline.com' }]),
          special_conditions: 'Monthly close',
          created_by: 'user-1',
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-02T00:00:00.000Z'
        }
      ])
      .mockResolvedValueOnce([
        {
          income_id: 'inc-1',
          invoice_number: 'F001',
          invoice_date: '2026-03-10',
          due_date: '2026-03-30',
          total_amount: '5000',
          currency: 'CLP',
          payment_status: 'partial',
          amount_paid: '1000'
        }
      ])
      .mockResolvedValueOnce([
        {
          total_receivable: '5000',
          active_invoices_count: '1',
          overdue_invoices_count: '0'
        }
      ])

    const response = await getClientById(
      new Request('http://localhost/api/finance/clients/profile-1'),
      { params: Promise.resolve({ id: 'profile-1' }) }
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.company).toMatchObject({
      clientId: 'client-1',
      hubspotCompanyId: null,
      companyName: 'Sky Airline',
      companyDomain: 'skyairline.com',
      companyCountry: 'CL',
      businessLine: 'creative',
      serviceModules: ['creative-hub']
    })
    expect(body.financialProfile).toMatchObject({
      clientId: 'client-1',
      clientProfileId: 'profile-1',
      legalName: 'Sky Airline SA',
      billingAddress: 'Av. Test 123',
      billingCountry: 'CL',
      paymentTermsDays: 30,
      paymentCurrency: 'CLP',
      requiresPo: false,
      requiresHes: true,
      currentPoNumber: 'PO-123',
      financeContacts: [{ name: 'Ana', email: 'ana@skyairline.com' }],
      specialConditions: 'Monthly close',
      createdBy: 'user-1'
    })
    expect(body.summary).toMatchObject({
      totalReceivable: 5000,
      activeInvoicesCount: 1,
      overdueInvoicesCount: 0
    })
    expect(body.invoices[0]).toMatchObject({
      incomeId: 'inc-1',
      invoiceNumber: 'F001',
      invoiceDate: '2026-03-10',
      dueDate: '2026-03-30',
      totalAmount: 5000,
      currency: 'CLP',
      paymentStatus: 'partial',
      amountPaid: 1000,
      amountPending: 4000
    })
    expect(body.deals).toEqual([])
  })

  it('uses canonical client_id aggregation for receivables in the Postgres read path', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([
        {
          client_id: 'client-1',
          client_profile_id: 'profile-1',
          greenhouse_client_name: 'Sky Airline',
          hubspot_company_id: 'hub-1',
          company_name: 'Sky Airline',
          company_domain: 'skyairline.com',
          company_country: 'CL',
          business_line: 'creative',
          service_modules_raw: 'creative-hub',
          legal_name: 'Sky Airline SA',
          tax_id: '76.123.456-7',
          payment_terms_days: '30',
          payment_currency: 'CLP',
          requires_po: false,
          requires_hes: false,
          total_receivable: '5000',
          active_invoices_count: '1',
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-02T00:00:00.000Z'
        }
      ])

    const response = await getClients(
      new Request('http://localhost/api/finance/clients?page=1&pageSize=20')
    )

    expect(response.status).toBe(200)

    const countQuery = mockRunGreenhousePostgresQuery.mock.calls[0]?.[0] as string

    expect(countQuery).toContain('LEFT JOIN greenhouse_finance.client_profiles cp_income')
    expect(countQuery).toContain('COALESCE(i.client_id, cp_income.client_id) AS client_id')
    expect(countQuery).not.toContain('COALESCE(client_id, client_profile_id, hubspot_company_id) AS income_key')
  })

  it('prefers organization memberships over legacy finance_contacts in the Postgres detail path', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          organization_id: 'org-1',
          client_id: 'client-1',
          greenhouse_client_name: 'Sky Airline',
          client_profile_id: 'profile-1',
          hubspot_company_id: 'hub-1',
          company_name: 'Sky Airline',
          company_domain: 'skyairline.com',
          company_country: 'CL',
          business_line: 'creative',
          service_modules_raw: 'creative-hub',
          tax_id: '76.123.456-7',
          tax_id_type: 'RUT',
          legal_name: 'Sky Airline SA',
          billing_address: 'Av. Test 123',
          billing_country: 'CL',
          payment_terms_days: '30',
          payment_currency: 'CLP',
          requires_po: false,
          requires_hes: false,
          current_po_number: null,
          current_hes_number: null,
          finance_contacts: JSON.stringify([{ name: 'Legacy Contact', email: 'legacy@skyairline.com' }]),
          special_conditions: null,
          created_by: 'user-1',
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-02T00:00:00.000Z'
        }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          total_receivable: '0',
          active_invoices_count: '0',
          overdue_invoices_count: '0'
        }
      ])
      .mockResolvedValueOnce([])

    mockGetOrganizationMemberships.mockResolvedValue([
      {
        membershipId: 'membership-1',
        publicId: 'EO-MBR-001',
        profileId: 'profile-contact-1',
        fullName: 'Ana Billing',
        canonicalEmail: 'ana@skyairline.com',
        membershipType: 'billing',
        roleLabel: 'Accounts Payable',
        department: 'Finance',
        isPrimary: true,
        spaceId: null
      }
    ])

    const response = await getClientById(
      new Request('http://localhost/api/finance/clients/profile-1'),
      { params: Promise.resolve({ id: 'profile-1' }) }
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetOrganizationMemberships).toHaveBeenCalledWith('org-1')
    expect(body.financialProfile.financeContacts).toEqual([
      {
        name: 'Ana Billing',
        email: 'ana@skyairline.com',
        phone: '',
        role: 'billing'
      }
    ])
  })

  it.skip('prefers a Postgres-first read path for finance clients once the list/detail cutover is wired', () => {})
})
