import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockWithGreenhousePostgresTransaction = vi.fn()
const mockIsGreenhousePostgresConfigured = vi.fn()
const mockUpsertProviderFromFinanceSupplierInPostgres = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: (...args: unknown[]) => mockWithGreenhousePostgresTransaction(...args),
  isGreenhousePostgresConfigured: () => mockIsGreenhousePostgresConfigured()
}))

vi.mock('@/lib/providers/postgres', () => ({
  upsertProviderFromFinanceSupplierInPostgres: (...args: unknown[]) =>
    mockUpsertProviderFromFinanceSupplierInPostgres(...args)
}))

import {
  assertFinancePostgresReady,
  createFinanceAccountInPostgres,
  listFinanceAccountsFromPostgres,
  seedFinanceSupplierInPostgres,
  shouldFallbackFromFinancePostgres,
  upsertFinanceExchangeRateInPostgres
} from '@/lib/finance/postgres-store'
import { FinanceValidationError } from '@/lib/finance/shared'

// ─── Fixtures ────────────────────────────────────────────────────────

const REQUIRED_TABLES_ROWS = [
  { qualified_name: 'greenhouse_core.providers' },
  { qualified_name: 'greenhouse_sync.outbox_events' },
  { qualified_name: 'greenhouse_finance.accounts' },
  { qualified_name: 'greenhouse_finance.suppliers' },
  { qualified_name: 'greenhouse_finance.exchange_rates' }
]

const mockAccountRow = {
  account_id: 'acc-1',
  account_name: 'Banco Principal',
  bank_name: 'Banco Estado',
  account_number: '12345',
  account_number_full: null,
  currency: 'CLP',
  account_type: 'checking',
  country_code: 'CL',
  is_active: true,
  opening_balance: '0',
  opening_balance_date: null,
  notes: null,
  instrument_category: 'bank_account',
  provider_slug: null,
  provider_identifier: null,
  card_last_four: null,
  card_network: null,
  credit_limit: null,
  responsible_user_id: null,
  default_for: [],
  display_order: '0',
  metadata_json: {},
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z'
}

const mockExchangeRateRow = {
  rate_id: 'rate-1',
  from_currency: 'USD',
  to_currency: 'CLP',
  rate_date: '2026-03-01',
  rate: '950',
  source: 'manual',
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z'
}

const mockSupplierRow = {
  supplier_id: 'sup-1',
  provider_id: 'prov-1',
  organization_id: null,
  legal_name: 'Supplier Legal SA',
  trade_name: null,
  tax_id: '12345678-9',
  tax_id_type: 'rut',
  country_code: 'CL',
  category: 'services',
  service_type: null,
  is_international: false,
  primary_contact_name: null,
  primary_contact_email: null,
  primary_contact_phone: null,
  website_url: null,
  bank_name: null,
  bank_account_number: null,
  bank_account_type: null,
  bank_routing: null,
  payment_currency: 'CLP',
  default_payment_terms: '30',
  default_payment_method: 'transfer',
  requires_po: false,
  is_active: true,
  notes: null,
  organization_contacts_count: '0',
  organization_contact_name: null,
  organization_contact_email: null,
  organization_contact_role: null,
  created_by_user_id: 'user-1',
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z'
}

// ─── Prime the TTL cache ──────────────────────────────────────────────

beforeAll(async () => {
  mockIsGreenhousePostgresConfigured.mockReturnValue(true)
  mockRunGreenhousePostgresQuery.mockResolvedValue(REQUIRED_TABLES_ROWS)
  await assertFinancePostgresReady()
})

// ─── Reset mocks before each test (cache already warm) ───────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockIsGreenhousePostgresConfigured.mockReturnValue(true)
})

// ─── shouldFallbackFromFinancePostgres ────────────────────────────────

describe('shouldFallbackFromFinancePostgres', () => {
  it('returns true for FinanceValidationError with FINANCE_POSTGRES_NOT_CONFIGURED code', () => {
    const err = new FinanceValidationError(
      'Finance Postgres store is not configured in this environment.',
      503,
      { missingConfig: true },
      'FINANCE_POSTGRES_NOT_CONFIGURED'
    )

    expect(shouldFallbackFromFinancePostgres(err)).toBe(true)
  })

  it('returns true for FinanceValidationError with FINANCE_POSTGRES_SCHEMA_NOT_READY code', () => {
    const err = new FinanceValidationError(
      'Finance Postgres schema is not ready.',
      503,
      { missingTables: ['greenhouse_finance.accounts'] },
      'FINANCE_POSTGRES_SCHEMA_NOT_READY'
    )

    expect(shouldFallbackFromFinancePostgres(err)).toBe(true)
  })

  it('returns true for connection-type errors that should trigger BigQuery fallback', () => {
    expect(shouldFallbackFromFinancePostgres(new Error('ECONNREFUSED 127.0.0.1:5432'))).toBe(true)
    expect(shouldFallbackFromFinancePostgres(new Error('connect ETIMEDOUT'))).toBe(true)
    expect(shouldFallbackFromFinancePostgres(new Error('Cloud SQL instance unreachable'))).toBe(true)
  })

  it('returns false for unrelated errors that should be re-thrown', () => {
    expect(shouldFallbackFromFinancePostgres(new Error('division by zero'))).toBe(false)
    expect(shouldFallbackFromFinancePostgres(new Error('invalid input syntax for integer'))).toBe(false)
  })

  it('returns false for non-Error values', () => {
    expect(shouldFallbackFromFinancePostgres('some string error')).toBe(false)
    expect(shouldFallbackFromFinancePostgres(null)).toBe(false)
    expect(shouldFallbackFromFinancePostgres(42)).toBe(false)
  })
})

// ─── createFinanceAccountInPostgres ──────────────────────────────────

describe('createFinanceAccountInPostgres', () => {
  it('uses a transaction, inserts account, publishes outbox event, and returns mapped record', async () => {
    const mockClientQuery = vi.fn()

      // First call: check existing (no duplicate)
      .mockResolvedValueOnce({ rows: [] })

      // Second call: INSERT account RETURNING *
      .mockResolvedValueOnce({ rows: [mockAccountRow] })

      // Third call: INSERT outbox event
      .mockResolvedValueOnce({ rows: [] })

    const mockClient = { query: mockClientQuery }

    mockWithGreenhousePostgresTransaction.mockImplementation(
      async (fn: (client: typeof mockClient) => Promise<unknown>) => fn(mockClient)
    )

    const result = await createFinanceAccountInPostgres({
      accountId: 'acc-1',
      accountName: 'Banco Principal',
      bankName: 'Banco Estado',
      accountNumber: '12345',
      accountNumberFull: null,
      currency: 'CLP',
      accountType: 'checking',
      country: 'CL',
      openingBalance: 0,
      openingBalanceDate: null,
      notes: null,
      actorUserId: 'user-1'
    })

    expect(mockWithGreenhousePostgresTransaction).toHaveBeenCalledTimes(1)
    expect(result.accountId).toBe('acc-1')
    expect(result.accountName).toBe('Banco Principal')
    expect(result.bankName).toBe('Banco Estado')
    expect(result.currency).toBe('CLP')

    // Verify the INSERT query was called
    const insertCall = mockClientQuery.mock.calls[1]?.[0] as string

    expect(insertCall).toContain('INSERT INTO greenhouse_finance.accounts')

    // Verify outbox event was published
    const outboxCall = mockClientQuery.mock.calls[2]?.[0] as string

    expect(outboxCall).toContain('INSERT INTO greenhouse_sync.outbox_events')
  })

  it('throws FinanceValidationError when account already exists', async () => {
    const mockClientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [{ account_id: 'acc-1' }] })

    const mockClient = { query: mockClientQuery }

    mockWithGreenhousePostgresTransaction.mockImplementation(
      async (fn: (client: typeof mockClient) => Promise<unknown>) => fn(mockClient)
    )

    await expect(
      createFinanceAccountInPostgres({
        accountId: 'acc-1',
        accountName: 'Banco Principal',
        bankName: 'Banco Estado',
        accountNumber: null,
        accountNumberFull: null,
        currency: 'CLP',
        accountType: 'checking',
        country: 'CL',
        openingBalance: 0,
        openingBalanceDate: null,
        notes: null,
        actorUserId: 'user-1'
      })
    ).rejects.toThrow('already exists')
  })
})

// ─── upsertFinanceExchangeRateInPostgres ──────────────────────────────

describe('upsertFinanceExchangeRateInPostgres', () => {
  it('uses a transaction, upserts rate, publishes outbox event, and returns mapped record', async () => {
    const mockClientQuery = vi.fn()

      // INSERT ON CONFLICT exchange_rate RETURNING *
      .mockResolvedValueOnce({ rows: [mockExchangeRateRow] })

      // INSERT outbox event
      .mockResolvedValueOnce({ rows: [] })

    const mockClient = { query: mockClientQuery }

    mockWithGreenhousePostgresTransaction.mockImplementation(
      async (fn: (client: typeof mockClient) => Promise<unknown>) => fn(mockClient)
    )

    const result = await upsertFinanceExchangeRateInPostgres({
      rateId: 'rate-1',
      fromCurrency: 'USD',
      toCurrency: 'CLP',
      rate: 950,
      rateDate: '2026-03-01',
      source: 'manual'
    })

    expect(mockWithGreenhousePostgresTransaction).toHaveBeenCalledTimes(1)
    expect(result.rateId).toBe('rate-1')
    expect(result.fromCurrency).toBe('USD')
    expect(result.toCurrency).toBe('CLP')
    expect(result.rate).toBe(950)

    const upsertQuery = mockClientQuery.mock.calls[0]?.[0] as string

    expect(upsertQuery).toContain('INSERT INTO greenhouse_finance.exchange_rates')
    expect(upsertQuery).toContain('ON CONFLICT')

    const outboxQuery = mockClientQuery.mock.calls[1]?.[0] as string

    expect(outboxQuery).toContain('greenhouse_sync.outbox_events')
  })
})

// ─── seedFinanceSupplierInPostgres ────────────────────────────────────

describe('seedFinanceSupplierInPostgres', () => {
  it('uses a transaction, calls upsertProviderFromFinanceSupplierInPostgres, and returns mapped supplier', async () => {
    mockUpsertProviderFromFinanceSupplierInPostgres.mockResolvedValue({
      providerId: 'prov-1',
      providerName: 'Supplier Legal SA'
    })

    const mockClientQuery = vi.fn()

      // Check existing supplier
      .mockResolvedValueOnce({ rows: [] })

      // INSERT supplier RETURNING *
      .mockResolvedValueOnce({ rows: [mockSupplierRow] })

      // INSERT outbox event
      .mockResolvedValueOnce({ rows: [] })

    const mockClient = { query: mockClientQuery }

    mockWithGreenhousePostgresTransaction.mockImplementation(
      async (fn: (client: typeof mockClient) => Promise<unknown>) => fn(mockClient)
    )

    const result = await seedFinanceSupplierInPostgres({
      supplierId: 'sup-1',
      legalName: 'Supplier Legal SA',
      category: 'services',
      isActive: true
    })

    expect(mockWithGreenhousePostgresTransaction).toHaveBeenCalledTimes(1)
    expect(mockUpsertProviderFromFinanceSupplierInPostgres).toHaveBeenCalledTimes(1)
    expect(result.supplierId).toBe('sup-1')
    expect(result.legalName).toBe('Supplier Legal SA')
    expect(result.category).toBe('services')

    const insertQuery = mockClientQuery.mock.calls[1]?.[0] as string

    expect(insertQuery).toContain('INSERT INTO greenhouse_finance.suppliers')
    expect(insertQuery).toContain('ON CONFLICT')
  })
})

// ─── listFinanceAccountsFromPostgres ─────────────────────────────────

describe('listFinanceAccountsFromPostgres', () => {
  it('returns mapped account list sorted by display order', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([mockAccountRow])

    const result = await listFinanceAccountsFromPostgres()

    expect(result).toHaveLength(1)
    expect(result[0].accountId).toBe('acc-1')
    expect(result[0].accountName).toBe('Banco Principal')
    expect(result[0].currency).toBe('CLP')
    expect(result[0].isActive).toBe(true)
  })

  it('passes includeInactive flag to SQL query', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([mockAccountRow])

    await listFinanceAccountsFromPostgres({ includeInactive: true })

    const query = mockRunGreenhousePostgresQuery.mock.calls[0]?.[0] as string
    const values = mockRunGreenhousePostgresQuery.mock.calls[0]?.[1] as unknown[]

    expect(query).toContain('greenhouse_finance.accounts')
    expect(values).toContain(true)
  })
})
