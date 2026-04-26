import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runGreenhousePostgresQuery, syncCanonicalFinanceQuote } = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn(),
  syncCanonicalFinanceQuote: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction: vi.fn()
}))

vi.mock('@/lib/finance/quotation-canonical-store', () => ({
  syncCanonicalFinanceQuote
}))

import { upsertNuboxQuoteFromSale, type NuboxProjectionSale } from '@/lib/nubox/sync-nubox-to-postgres'

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
