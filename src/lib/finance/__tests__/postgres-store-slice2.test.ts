import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockWithGreenhousePostgresTransaction = vi.fn()
const mockIsGreenhousePostgresConfigured = vi.fn()
const mockResolveAutoAllocation = vi.fn()
const mockEnsureOrganizationForClient = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: (...args: unknown[]) => mockWithGreenhousePostgresTransaction(...args),
  isGreenhousePostgresConfigured: () => mockIsGreenhousePostgresConfigured()
}))

vi.mock('@/lib/finance/auto-allocation-rules', () => ({
  resolveAutoAllocation: (...args: unknown[]) => mockResolveAutoAllocation(...args)
}))

vi.mock('@/lib/account-360/organization-identity', () => ({
  ensureOrganizationForClient: (...args: unknown[]) => mockEnsureOrganizationForClient(...args)
}))

import {
  buildExpenseTaxWriteFields,
  serializeExpenseTaxSnapshot
} from '@/lib/finance/expense-tax-snapshot'
import {
  buildIncomeTaxWriteFields,
  serializeIncomeTaxSnapshot
} from '@/lib/finance/income-tax-snapshot'
import {
  assertFinanceSlice2PostgresReady,
  buildMonthlySequenceIdFromPostgres,
  createFinanceExpenseInPostgres,
  createFinanceIncomeInPostgres,
  getFinanceIncomeFromPostgres,
  listFinanceExpensesFromPostgres,
  listFinanceIncomeFromPostgres,
  updateFinanceIncomeInPostgres
} from '@/lib/finance/postgres-store-slice2'

type CreateFinanceIncomeParams = Parameters<typeof createFinanceIncomeInPostgres>[0]
type CreateFinanceExpenseParams = Parameters<typeof createFinanceExpenseInPostgres>[0]

// ─── Fixtures ────────────────────────────────────────────────────────

const REQUIRED_TABLES_ROWS = [
  { qualified_name: 'greenhouse_finance.income' },
  { qualified_name: 'greenhouse_finance.income_payments' },
  { qualified_name: 'greenhouse_finance.expenses' },
  { qualified_name: 'greenhouse_finance.client_profiles' },
  { qualified_name: 'greenhouse_finance.reconciliation_periods' },
  { qualified_name: 'greenhouse_finance.bank_statement_rows' }
]

const mockIncomeRow = {
  income_id: 'INC-202603-001',
  client_id: 'client-1',
  organization_id: 'org-1',
  client_profile_id: 'profile-1',
  hubspot_company_id: null,
  hubspot_deal_id: null,
  client_name: 'Acme Corp',
  invoice_number: 'F-001',
  invoice_date: '2026-03-01',
  due_date: '2026-03-31',
  description: 'Dev services',
  currency: 'CLP',
  subtotal: '1000000',
  tax_rate: '0.19',
  tax_amount: '190000',
  total_amount: '1190000',
  exchange_rate_to_clp: '1',
  total_amount_clp: '1190000',
  payment_status: 'pending',
  amount_paid: '0',
  collection_method: null,
  po_number: null,
  hes_number: null,
  service_line: 'globe',
  income_type: 'invoice',
  is_reconciled: false,
  reconciliation_id: null,
  partner_id: null,
  partner_name: null,
  partner_share_percent: null,
  partner_share_amount: null,
  net_after_partner: null,
  notes: null,
  created_by_user_id: 'user-1',
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  nubox_document_id: null,
  nubox_sii_track_id: null,
  nubox_emission_status: null,
  dte_type_code: null,
  dte_folio: null,
  nubox_emitted_at: null,
  nubox_last_synced_at: null,
  is_annulled: false,
  nubox_pdf_url: null,
  nubox_xml_url: null,
  referenced_income_id: null,
  payment_form: null,
  balance_nubox: null
}

const mockExpenseRow = {
  expense_id: 'EXP-202603-001',
  client_id: 'client-1',
  space_id: 'space-1',
  expense_type: 'supplier',
  source_type: 'manual',
  description: 'Software license',
  currency: 'CLP',
  subtotal: '50000',
  tax_rate: '0',
  tax_amount: '0',
  total_amount: '50000',
  exchange_rate_to_clp: '1',
  total_amount_clp: '50000',
  payment_date: '2026-03-15',
  payment_status: 'paid',
  payment_method: 'transfer',
  payment_provider: null,
  payment_rail: null,
  payment_account_id: null,
  payment_reference: null,
  document_number: null,
  document_date: null,
  due_date: null,
  supplier_id: null,
  supplier_name: 'Proveedor SA',
  supplier_invoice_number: null,
  payroll_period_id: null,
  payroll_entry_id: null,
  member_id: null,
  member_name: null,
  social_security_type: null,
  social_security_institution: null,
  social_security_period: null,
  tax_type: null,
  tax_period: null,
  tax_form_number: null,
  miscellaneous_category: null,
  service_line: null,
  is_recurring: false,
  recurrence_frequency: null,
  reconciliation_id: null,
  linked_income_id: null,
  cost_category: null,
  cost_is_direct: true,
  allocated_client_id: null,
  direct_overhead_scope: null,
  direct_overhead_kind: null,
  direct_overhead_member_id: null,
  notes: null,
  is_reconciled: false,
  recorded_by_user_id: null,
  created_at: '2026-03-15T00:00:00.000Z',
  updated_at: '2026-03-15T00:00:00.000Z',
  nubox_purchase_id: null,
  nubox_document_status: null,
  nubox_supplier_rut: null,
  nubox_supplier_name: null,
  nubox_origin: null,
  nubox_last_synced_at: null,
  is_annulled: false,
  sii_document_status: null,
  nubox_pdf_url: null,
  balance_nubox: null
}

const buildCreateFinanceIncomeParams = async (
  overrides: Partial<CreateFinanceIncomeParams> = {}
): Promise<CreateFinanceIncomeParams> => {
  const subtotal = overrides.subtotal ?? 1000000

  const taxWriteFields = await buildIncomeTaxWriteFields({
    subtotal,
    taxCode: overrides.taxCode ?? 'cl_vat_19'
  })

  return {
    incomeId: 'INC-202603-001',
    clientId: 'client-1',
    organizationId: 'org-1',
    clientProfileId: 'profile-1',
    hubspotCompanyId: null,
    hubspotDealId: null,
    clientName: 'Acme Corp',
    invoiceNumber: 'F-001',
    invoiceDate: '2026-03-01',
    dueDate: '2026-03-31',
    description: 'Dev services',
    currency: 'CLP',
    subtotal,
    taxRate: taxWriteFields.taxRate,
    taxAmount: taxWriteFields.taxAmount,
    taxCode: taxWriteFields.taxCode,
    taxRateSnapshot: taxWriteFields.taxRateSnapshot,
    taxAmountSnapshot: taxWriteFields.taxAmountSnapshot,
    taxSnapshotJson: serializeIncomeTaxSnapshot(taxWriteFields.taxSnapshot),
    isTaxExempt: taxWriteFields.isTaxExempt,
    taxSnapshotFrozenAt: taxWriteFields.taxSnapshotFrozenAt,
    totalAmount: taxWriteFields.totalAmount,
    exchangeRateToClp: 1,
    totalAmountClp: taxWriteFields.totalAmount,
    paymentStatus: 'pending',
    quotationId: null,
    contractId: null,
    sourceHesId: null,
    purchaseOrderId: null,
    hesId: null,
    poNumber: null,
    hesNumber: null,
    serviceLine: 'globe',
    incomeType: 'invoice',
    partnerId: null,
    partnerName: null,
    partnerSharePercent: null,
    partnerShareAmount: null,
    netAfterPartner: null,
    notes: null,
    actorUserId: 'user-1',
    ...overrides
  }
}

const buildCreateFinanceExpenseParams = async (
  overrides: Partial<CreateFinanceExpenseParams> = {}
): Promise<CreateFinanceExpenseParams> => {
  const subtotal = overrides.subtotal ?? 50000
  const exchangeRateToClp = overrides.exchangeRateToClp ?? 1

  const taxWriteFields = await buildExpenseTaxWriteFields({
    subtotal,
    exchangeRateToClp,
    taxCode: overrides.taxCode ?? 'cl_vat_non_billable'
  })

  return {
    expenseId: 'EXP-202603-001',
    clientId: 'client-1',
    spaceId: 'space-1',
    expenseType: 'supplier',
    sourceType: 'manual',
    description: 'Software license',
    currency: 'CLP',
    subtotal,
    taxRate: taxWriteFields.taxRate,
    taxAmount: taxWriteFields.taxAmount,
    taxCode: taxWriteFields.taxCode,
    taxRecoverability: taxWriteFields.taxRecoverability,
    taxRateSnapshot: taxWriteFields.taxRateSnapshot,
    taxAmountSnapshot: taxWriteFields.taxAmountSnapshot,
    taxSnapshotJson: serializeExpenseTaxSnapshot(taxWriteFields.taxSnapshot),
    isTaxExempt: taxWriteFields.isTaxExempt,
    taxSnapshotFrozenAt: taxWriteFields.taxSnapshotFrozenAt,
    recoverableTaxAmount: taxWriteFields.recoverableTaxAmount,
    recoverableTaxAmountClp: taxWriteFields.recoverableTaxAmountClp,
    nonRecoverableTaxAmount: taxWriteFields.nonRecoverableTaxAmount,
    nonRecoverableTaxAmountClp: taxWriteFields.nonRecoverableTaxAmountClp,
    effectiveCostAmount: taxWriteFields.effectiveCostAmount,
    effectiveCostAmountClp: taxWriteFields.effectiveCostAmountClp,
    totalAmount: taxWriteFields.totalAmount,
    exchangeRateToClp,
    totalAmountClp: taxWriteFields.totalAmount,
    paymentDate: '2026-03-15',
    paymentStatus: 'paid',
    paymentMethod: 'transfer',
    paymentProvider: null,
    paymentRail: null,
    paymentAccountId: null,
    paymentReference: null,
    documentNumber: null,
    documentDate: null,
    dueDate: null,
    supplierId: null,
    supplierName: 'Proveedor SA',
    supplierInvoiceNumber: null,
    payrollPeriodId: null,
    payrollEntryId: null,
    memberId: null,
    memberName: null,
    socialSecurityType: null,
    socialSecurityInstitution: null,
    socialSecurityPeriod: null,
    taxType: null,
    taxPeriod: null,
    taxFormNumber: null,
    miscellaneousCategory: null,
    serviceLine: null,
    isRecurring: false,
    recurrenceFrequency: null,
    costCategory: null,
    costIsDirect: true,
    allocatedClientId: null,
    directOverheadScope: null,
    directOverheadKind: null,
    directOverheadMemberId: null,
    receiptDate: null,
    purchaseType: null,
    vatUnrecoverableAmount: 0,
    vatFixedAssetsAmount: 0,
    vatCommonUseAmount: 0,
    dteTypeCode: null,
    dteFolio: null,
    exemptAmount: 0,
    otherTaxesAmount: 0,
    withholdingAmount: 0,
    notes: null,
    actorUserId: 'user-1',
    ...overrides
  }
}

// ─── Prime the TTL cache ──────────────────────────────────────────────

beforeAll(async () => {
  mockIsGreenhousePostgresConfigured.mockReturnValue(true)
  mockRunGreenhousePostgresQuery.mockResolvedValue(REQUIRED_TABLES_ROWS)
  await assertFinanceSlice2PostgresReady()
})

// ─── Reset mocks before each test (cache already warm) ───────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockIsGreenhousePostgresConfigured.mockReturnValue(true)
  mockResolveAutoAllocation.mockResolvedValue(null)
  mockEnsureOrganizationForClient.mockResolvedValue({ organizationId: 'org-1' })
})

// ─── listFinanceIncomeFromPostgres ────────────────────────────────────

describe('listFinanceIncomeFromPostgres', () => {
  it('returns paginated income items and total with no filters', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ total: '2' }])
      .mockResolvedValueOnce([mockIncomeRow, { ...mockIncomeRow, income_id: 'INC-202603-002' }])

    const result = await listFinanceIncomeFromPostgres()

    expect(result.total).toBe(2)
    expect(result.items).toHaveLength(2)
    expect(result.items[0].incomeId).toBe('INC-202603-001')
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(50)
  })

  it('includes payment_status in COUNT query when status filter is provided', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([mockIncomeRow])

    await listFinanceIncomeFromPostgres({ status: 'paid' })

    const countQuery = mockRunGreenhousePostgresQuery.mock.calls[0]?.[0] as string

    expect(countQuery).toContain('payment_status')
    expect(mockRunGreenhousePostgresQuery.mock.calls[0]?.[1]).toContain('paid')
  })

  it('includes invoice_date condition in COUNT query when date range is provided', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([mockIncomeRow])

    await listFinanceIncomeFromPostgres({ fromDate: '2026-03-01', toDate: '2026-03-31' })

    const countQuery = mockRunGreenhousePostgresQuery.mock.calls[0]?.[0] as string

    expect(countQuery).toContain('invoice_date')
  })

  it('maps income rows to FinanceIncomeRecord with computed amountPending', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([{ ...mockIncomeRow, total_amount: '1000', amount_paid: '400' }])

    const result = await listFinanceIncomeFromPostgres()

    expect(result.items[0].amountPaid).toBe(400)
    expect(result.items[0].amountPending).toBe(600)
    expect(result.items[0].paymentStatus).toBe('pending')
  })
})

// ─── getFinanceIncomeFromPostgres ─────────────────────────────────────

describe('getFinanceIncomeFromPostgres', () => {
  it('returns null when income row is not found', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([])

    const result = await getFinanceIncomeFromPostgres('INC-NOTFOUND')

    expect(result).toBeNull()
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
  })

  it('returns income with paymentsReceived when income exists', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([mockIncomeRow])
      .mockResolvedValueOnce([])

    const result = await getFinanceIncomeFromPostgres('INC-202603-001')

    expect(result).not.toBeNull()
    expect(result?.incomeId).toBe('INC-202603-001')
    expect(result?.paymentsReceived).toEqual([])
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(2)
  })
})

// ─── createFinanceIncomeInPostgres ────────────────────────────────────

describe('createFinanceIncomeInPostgres', () => {
  it('uses a transaction and publishes outbox event via client.query', async () => {
    const mockClientQuery = vi.fn().mockResolvedValue({ rows: [mockIncomeRow] })
    const mockClient = { query: mockClientQuery }

    mockWithGreenhousePostgresTransaction.mockImplementation(
      async (fn: (client: typeof mockClient) => Promise<unknown>) => fn(mockClient)
    )

    const result = await createFinanceIncomeInPostgres(await buildCreateFinanceIncomeParams())

    expect(mockWithGreenhousePostgresTransaction).toHaveBeenCalledTimes(1)
    expect(result.incomeId).toBe('INC-202603-001')
    expect(result.clientName).toBe('Acme Corp')

    // TASK-768: client.query called 3 times:
    //   1. INSERT economic_category_resolution_log (resolver write-time)
    //   2. INSERT income
    //   3. INSERT outbox event
    expect(mockClientQuery).toHaveBeenCalledTimes(3)

    // Verify INSERT income is among the calls (no longer first due to resolver)
    const calls = mockClientQuery.mock.calls.map(c => c[0] as string)

    expect(calls.some(s => s.includes('INSERT INTO greenhouse_finance.income (\n'))).toBe(true)
    expect(calls.some(s => s.includes('economic_category_resolution_log'))).toBe(true)
  })
})

// ─── updateFinanceIncomeInPostgres ────────────────────────────────────

describe('updateFinanceIncomeInPostgres', () => {
  it('returns null immediately without touching DB when updates object is empty', async () => {
    const result = await updateFinanceIncomeInPostgres('INC-202603-001', {})

    expect(result).toBeNull()
    expect(mockWithGreenhousePostgresTransaction).not.toHaveBeenCalled()
    expect(mockRunGreenhousePostgresQuery).not.toHaveBeenCalled()
  })

  it('updates recognized fields and publishes outbox event, returns null when row not found', async () => {
    const mockClientQuery = vi.fn().mockResolvedValue({ rows: [] })
    const mockClient = { query: mockClientQuery }

    mockWithGreenhousePostgresTransaction.mockImplementation(
      async (fn: (client: typeof mockClient) => Promise<unknown>) => fn(mockClient)
    )

    const result = await updateFinanceIncomeInPostgres('INC-202603-001', {
      paymentStatus: 'paid',
      notes: 'Settled'
    })

    expect(result).toBeNull()
    expect(mockWithGreenhousePostgresTransaction).toHaveBeenCalledTimes(1)
    const updateQuery = mockClientQuery.mock.calls[0]?.[0] as string

    expect(updateQuery).toContain('UPDATE greenhouse_finance.income')
    expect(updateQuery).toContain('payment_status')
  })
})

// ─── createFinanceExpenseInPostgres ──────────────────────────────────

describe('createFinanceExpenseInPostgres', () => {
  it('uses withGreenhousePostgresTransaction when no external client is provided', async () => {
    const mockClientQuery = vi.fn().mockResolvedValue({ rows: [mockExpenseRow] })
    const mockClient = { query: mockClientQuery }

    mockWithGreenhousePostgresTransaction.mockImplementation(
      async (fn: (client: typeof mockClient) => Promise<unknown>) => fn(mockClient)
    )

    const result = await createFinanceExpenseInPostgres(await buildCreateFinanceExpenseParams())

    expect(mockWithGreenhousePostgresTransaction).toHaveBeenCalledTimes(1)
    expect(result.expenseId).toBe('EXP-202603-001')

    // TASK-768: resolver canónico ejecuta antes del INSERT principal.
    // El INSERT a expenses ya no es el primer query. Verificamos que está
    // en la lista de queries ejecutadas.
    const queries = mockClientQuery.mock.calls.map(c => c[0] as string)

    expect(queries.some(s => /INSERT INTO greenhouse_finance\.expenses/.test(s))).toBe(true)
    expect(queries.some(s => s.includes('economic_category_resolution_log'))).toBe(true)
  })

  it('uses provided external client directly without calling withGreenhousePostgresTransaction', async () => {
    const mockClientQuery = vi.fn().mockResolvedValue({ rows: [mockExpenseRow] })
    const externalClient = { query: mockClientQuery }

    const result = await createFinanceExpenseInPostgres(
      await buildCreateFinanceExpenseParams(),
       
      { client: externalClient as any }
    )

    expect(mockWithGreenhousePostgresTransaction).not.toHaveBeenCalled()
    expect(result.expenseId).toBe('EXP-202603-001')
    expect(mockClientQuery).toHaveBeenCalled()
  })
})

// ─── listFinanceExpensesFromPostgres ─────────────────────────────────

describe('listFinanceExpensesFromPostgres', () => {
  it('returns paginated expense items and total', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([mockExpenseRow])

    const result = await listFinanceExpensesFromPostgres({ expenseType: 'supplier' })

    expect(result.total).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].expenseId).toBe('EXP-202603-001')
    expect(result.items[0].supplierName).toBe('Proveedor SA')
    const countQuery = mockRunGreenhousePostgresQuery.mock.calls[0]?.[0] as string

    expect(countQuery).toContain('expense_type')
  })
})

// ─── buildMonthlySequenceIdFromPostgres ──────────────────────────────

describe('buildMonthlySequenceIdFromPostgres', () => {
  it('generates first sequence ID when no entries exist in the period', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([{ next_seq: '1' }])

    const result = await buildMonthlySequenceIdFromPostgres({
      tableName: 'income',
      idColumn: 'income_id',
      prefix: 'INC',
      period: '202603'
    })

    expect(result).toBe('INC-202603-001')
    const query = mockRunGreenhousePostgresQuery.mock.calls[0]?.[0] as string

    expect(query).toContain('regexp_match')
    expect(query).toContain('next_seq')
  })

  it('generates sequential ID when entries already exist in the period', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([{ next_seq: '6' }])

    const result = await buildMonthlySequenceIdFromPostgres({
      tableName: 'income',
      idColumn: 'income_id',
      prefix: 'INC',
      period: '202603'
    })

    expect(result).toBe('INC-202603-006')
  })
})
