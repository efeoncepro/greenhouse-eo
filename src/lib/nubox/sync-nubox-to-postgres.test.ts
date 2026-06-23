import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runGreenhousePostgresQuery, syncCanonicalFinanceQuote, withGreenhousePostgresTransaction } = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn(),
  syncCanonicalFinanceQuote: vi.fn(),
  withGreenhousePostgresTransaction: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
}))

vi.mock('@/lib/finance/quotation-canonical-store', () => ({
  syncCanonicalFinanceQuote
}))

// TASK-1210 — el native backfill persiste el snapshot FX dentro de la transacción.
vi.mock('@/lib/finance/multi-currency/fx-snapshot-store', () => ({
  persistFxSnapshot: vi.fn().mockResolvedValue('fxs-test-mxn')
}))

// TASK-1210 — el reporting USD plane resuelve la tasa CLP→USD; mockeamos solo eso
// (preservamos observedFxSnapshotEvidence real para el plano native MXN→CLP).
vi.mock('@/lib/finance/multi-currency/fx-snapshot', async importActual => {
  const actual = (await importActual()) as Record<string, unknown>

  return {
    ...actual,
    resolveFxSnapshotEvidence: vi.fn().mockResolvedValue({ evidence: { rate: '0.00112' } })
  }
})

import {
  isNuboxPurchaseAnnulled,
  resolveNuboxPurchaseProjectionAmounts,
  upsertIncomeFromSale,
  upsertNuboxQuoteFromSale,
  type NuboxProjectionPurchase,
  type NuboxProjectionSale
} from '@/lib/nubox/sync-nubox-to-postgres'

const makeProjectionSale = (overrides: Partial<NuboxProjectionSale> = {}): NuboxProjectionSale => ({
  nubox_sale_id: '28186300',
  folio: '150076',
  dte_type_code: 'COT',
  dte_type_abbreviation: 'COT',
  dte_type_name: 'Cotización',
  net_amount: 5799999,
  exempt_amount: 0,
  tax_vat_amount: 1102001,
  total_amount: 6902000,
  other_taxes_amount: 0,
  withholding_amount: 0,
  balance: 6902000,
  emission_date: '2026-04-25',
  due_date: '2026-05-25',
  period_year: 2026,
  period_month: 4,
  payment_form_code: '2',
  payment_form_name: 'Crédito',
  sii_track_id: '123456789',
  is_annulled: false,
  emission_status_id: 1,
  emission_status_name: 'Emitido',
  origin_name: 'Manual Emision',
  client_rut: '88417000-1',
  client_trade_name: 'SKY AIRLINE S A',
  client_main_activity: 'Transporte',
  // TASK-990 — CLP-only quote: export foreign-currency fields stay null/none.
  foreign_total_amount: null,
  foreign_currency_code: null,
  functional_total_amount_clp: 6902000,
  exportation_detail_json: null,
  foreign_currency_evidence_source: 'none',
  foreign_currency_confidence: 'none',
  pdf_url: null,
  xml_url: null,
  details_url: null,
  references_url: null,
  organization_id: 'org-sky',
  client_id: 'client-sky',
  income_id: null,
  payload_hash: 'hash',
  sync_run_id: 'nubox-quotes-hot-test',
  synced_at: '2026-04-26T08:00:00.000Z',
  source_last_ingested_at: '2026-04-26T08:00:00.000Z',
  ...overrides
})

describe('upsertNuboxQuoteFromSale', () => {
  beforeEach(() => {
    runGreenhousePostgresQuery.mockReset()
    syncCanonicalFinanceQuote.mockReset()
    syncCanonicalFinanceQuote.mockResolvedValue(undefined)
  })

  it('preserves nubox as source_system when updating an existing quote', async () => {
    runGreenhousePostgresQuery
      .mockResolvedValueOnce([{ quote_id: 'QUO-NB-28186300' }])
      .mockResolvedValueOnce([])

    const result = await upsertNuboxQuoteFromSale(makeProjectionSale())

    expect(result).toBe('updated')
    expect(runGreenhousePostgresQuery.mock.calls[1]?.[0]).toContain("source_system = 'nubox'")
    expect(syncCanonicalFinanceQuote).toHaveBeenCalledWith({ quoteId: 'QUO-NB-28186300' })
  })

  it('writes new Nubox quotes with source_system nubox and keeps conflict updates idempotent', async () => {
    runGreenhousePostgresQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await upsertNuboxQuoteFromSale(makeProjectionSale())
    const insertSql = String(runGreenhousePostgresQuery.mock.calls[1]?.[0] ?? '')

    expect(result).toBe('created')
    expect(insertSql).toContain('source_system')
    expect(insertSql).toContain("'nubox'")
    expect(insertSql).toContain("source_system = 'nubox'")
    expect(syncCanonicalFinanceQuote).toHaveBeenCalledWith({ quoteId: 'QUO-NB-28186300' })
  })
})

describe('upsertIncomeFromSale — fiscal period stamping (TASK-1191)', () => {
  beforeEach(() => {
    runGreenhousePostgresQuery.mockReset()
  })

  it('self-heals the fiscal period of an existing income from the document date even when conformed period is NULL', async () => {
    // Existing income row → UPDATE path (does not enter the mocked transaction).
    runGreenhousePostgresQuery
      .mockResolvedValueOnce([{ income_id: 'INC-NB-28186300' }]) // SELECT existing
      .mockResolvedValueOnce([]) // UPDATE
      .mockResolvedValueOnce([]) // publishOutboxEvent INSERT

    const result = await upsertIncomeFromSale(
      makeProjectionSale({
        dte_type_code: '33',
        emission_date: '2025-08-15',
        period_year: null,
        period_month: null
      })
    )

    expect(result).toBe('updated')

    const updateSql = String(runGreenhousePostgresQuery.mock.calls[1]?.[0] ?? '')
    const updateParams = runGreenhousePostgresQuery.mock.calls[1]?.[1] as unknown[]

    // Self-heal COALESCE present + derived period (Aug 2025) passed as params.
    expect(updateSql).toContain('period_year = COALESCE(greenhouse_finance.income.period_year')
    expect(updateSql).toContain('period_month = COALESCE(greenhouse_finance.income.period_month')
    expect(updateParams).toContain(2025)
    expect(updateParams).toContain(8)
  })
})

describe('upsertIncomeFromSale — native plane backfill on existing CLP row (TASK-1210)', () => {
  beforeEach(() => {
    runGreenhousePostgresQuery.mockReset()
    withGreenhousePostgresTransaction.mockReset()
  })

  const mxnSale = () =>
    makeProjectionSale({
      nubox_sale_id: '28800562',
      dte_type_code: '110',
      foreign_currency_code: 'MXN',
      foreign_total_amount: 89960,
      functional_total_amount_clp: 4617647
    })

  it('backfills native_amount/native_currency on an EXISTING income row when MXN is enabled (TASK-1209 creates CLP first)', async () => {
    process.env.FINANCE_CORE_MXN_ENABLED = 'true'

    const clientQuery = vi.fn().mockResolvedValue({ rows: [] })

    withGreenhousePostgresTransaction.mockImplementation(async (cb: (c: unknown) => Promise<unknown>) =>
      cb({ query: clientQuery })
    )
    runGreenhousePostgresQuery
      .mockResolvedValueOnce([{ income_id: 'INC-NB-28800562' }]) // SELECT existing
      .mockResolvedValueOnce([]) // publishOutboxEvent

    const result = await upsertIncomeFromSale(mxnSale())

    expect(result).toBe('updated')
    // El native backfill va por el client de la transacción (no por runGreenhousePostgresQuery).
    expect(withGreenhousePostgresTransaction).toHaveBeenCalledTimes(1)

    const updateSql = String(clientQuery.mock.calls[0]?.[0] ?? '')
    const updateParams = clientQuery.mock.calls[0]?.[1] as unknown[]

    expect(updateSql).toContain('native_amount = COALESCE(greenhouse_finance.income.native_amount')
    expect(updateSql).toContain('native_currency = COALESCE(greenhouse_finance.income.native_currency')
    expect(updateParams).toContain(89960) // nativeAmount
    expect(updateParams).toContain('MXN')
    // TASK-1210 — el reporting USD plane también se backfillea (functional CLP × CLP→USD).
    expect(updateSql).toContain('amount_usd = COALESCE(greenhouse_finance.income.amount_usd')
    expect(updateParams).toContain(Math.round(4617647 * 0.00112 * 100) / 100) // amountUsd

    delete process.env.FINANCE_CORE_MXN_ENABLED
  })

  it('does NOT touch the native plane when MXN flag is OFF (bit-for-bit legacy UPDATE)', async () => {
    delete process.env.FINANCE_CORE_MXN_ENABLED

    runGreenhousePostgresQuery
      .mockResolvedValueOnce([{ income_id: 'INC-NB-28800562' }]) // SELECT existing
      .mockResolvedValueOnce([]) // UPDATE (non-tx path)
      .mockResolvedValueOnce([]) // publishOutboxEvent

    const result = await upsertIncomeFromSale(mxnSale())

    expect(result).toBe('updated')
    expect(withGreenhousePostgresTransaction).not.toHaveBeenCalled()

    const updateSql = String(runGreenhousePostgresQuery.mock.calls[1]?.[0] ?? '')

    expect(updateSql).not.toContain('native_amount')
  })
})

const makeProjectionPurchase = (overrides: Partial<NuboxProjectionPurchase> = {}): NuboxProjectionPurchase => ({
  nubox_purchase_id: '36671467',
  folio: '13',
  dte_type_code: 'BHE',
  dte_type_abbreviation: 'BHE',
  dte_type_name: 'Boleta de honorarios electronica',
  net_amount: 175000,
  exempt_amount: 0,
  tax_vat_amount: 0,
  total_amount: 148312,
  total_other_taxes_amount: 0,
  total_withholding_amount: 26688,
  balance: 148312,
  emission_date: '2026-05-09',
  due_date: '2026-05-09',
  period_year: 2026,
  period_month: 5,
  receipt_date: '2026-05-09',
  purchase_type_code: 'honorarios',
  purchase_type_name: 'Honorarios',
  document_status_id: 1,
  document_status_name: 'Emitido',
  is_annulled: false,
  origin_name: 'Nubox',
  supplier_rut: '11111111-1',
  supplier_trade_name: 'LUIS EDUARDO REYES RANGEL',
  pdf_url: null,
  supplier_id: null,
  organization_id: null,
  expense_id: null,
  vat_unrecoverable_amount: null,
  vat_fixed_assets_amount: null,
  vat_common_use_amount: null,
  payload_hash: 'hash',
  sync_run_id: 'nubox-test',
  synced_at: '2026-05-09T12:16:51.000Z',
  source_last_ingested_at: '2026-05-09T12:16:50.000Z',
  ...overrides
})

describe('resolveNuboxPurchaseProjectionAmounts', () => {
  it('keeps BHE withholding as payable total while validating against gross fiscal cost', () => {
    const result = resolveNuboxPurchaseProjectionAmounts(makeProjectionPurchase())

    expect(result).toEqual({
      taxSubtotal: 175000,
      taxValidationTotalAmount: 175000,
      payableTotalAmount: 148312,
      grossFiscalTotalAmount: 175000,
      withholdingAmount: 26688
    })
  })

  it('keeps standard VAT invoices on the source payable total path', () => {
    const result = resolveNuboxPurchaseProjectionAmounts(makeProjectionPurchase({
      dte_type_code: '33',
      net_amount: 100000,
      tax_vat_amount: 19000,
      total_amount: 119000,
      total_withholding_amount: 0
    }))

    expect(result).toMatchObject({
      taxSubtotal: 100000,
      taxValidationTotalAmount: 119000,
      payableTotalAmount: 119000,
      grossFiscalTotalAmount: 119000,
      withholdingAmount: 0
    })
  })
})

describe('isNuboxPurchaseAnnulled (TASK-1204)', () => {
  it('detecta anulación por document_status_name="Anulada" aunque el booleano venga en false', () => {
    // Caso real folio 40 Valentina: Nubox/SII traen "Anulada" pero is_annulled=false.
    expect(isNuboxPurchaseAnnulled({ is_annulled: false, document_status_name: 'Anulada' })).toBe(true)
  })

  it('respeta el booleano is_annulled cuando viene en true', () => {
    expect(isNuboxPurchaseAnnulled({ is_annulled: true, document_status_name: null })).toBe(true)
  })

  it('no marca anulado un documento válido', () => {
    expect(isNuboxPurchaseAnnulled({ is_annulled: false, document_status_name: 'Válido' })).toBe(false)
    expect(isNuboxPurchaseAnnulled({ is_annulled: false, document_status_name: null })).toBe(false)
  })

  it('normaliza mayúsculas/espacios del estado', () => {
    expect(isNuboxPurchaseAnnulled({ is_annulled: false, document_status_name: '  ANULADA  ' })).toBe(true)
  })
})
