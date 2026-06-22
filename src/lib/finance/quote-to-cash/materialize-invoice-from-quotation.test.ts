import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  withTransaction: vi.fn()
}))

vi.mock('@/lib/commercial/governance/audit-log', () => ({
  recordAudit: vi.fn()
}))

vi.mock('@/lib/commercial/quotation-events', () => ({
  publishQuotationInvoiceEmitted: vi.fn()
}))

vi.mock('@/lib/commercial/contract-lifecycle', () => ({
  ensureContractForQuotation: vi.fn()
}))

vi.mock('@/lib/commercial-intelligence/contract-profitability-materializer', () => ({
  materializeContractProfitabilitySnapshots: vi.fn()
}))

vi.mock('@/lib/finance/postgres-store-slice2', () => ({
  createFinanceIncomeInPostgres: vi.fn()
}))

// TASK-1210 — la rama CLF corre la proyección real (buildClfIncomeProjection);
// mockeamos solo el resolver de la UF (fecha→tasa) y la persistencia del snapshot.
vi.mock('@/lib/finance/multi-currency/fx-snapshot', () => ({
  resolveIndexedUnitSnapshotEvidence: vi.fn().mockResolvedValue({
    fromCurrency: 'CLF',
    toCurrency: 'CLP',
    fromUnitClass: 'indexed_unit',
    rate: '39000.00000000',
    inverseRate: (1 / 39000).toFixed(8),
    rateDate: '2026-06-22',
    rateDateResolved: '2026-06-22',
    source: 'economic_indicators.UF',
    composedVia: null,
    policy: 'rate_at_event',
    lockedBy: 'system',
    manualOverrideReason: null
  })
}))

vi.mock('@/lib/finance/multi-currency/fx-snapshot-store', () => ({
  persistFxSnapshot: vi.fn().mockResolvedValue('fx-snap-clf-1')
}))

import { withTransaction } from '@/lib/db'
import { ensureContractForQuotation } from '@/lib/commercial/contract-lifecycle'
import { materializeContractProfitabilitySnapshots } from '@/lib/commercial-intelligence/contract-profitability-materializer'
import { createFinanceIncomeInPostgres } from '@/lib/finance/postgres-store-slice2'

const mockedWithTransaction = withTransaction as unknown as ReturnType<typeof vi.fn>
const mockedEnsureContractForQuotation = ensureContractForQuotation as unknown as ReturnType<typeof vi.fn>
const mockedCreateFinanceIncome = createFinanceIncomeInPostgres as unknown as ReturnType<typeof vi.fn>

const mockedMaterializeContractProfitabilitySnapshots = materializeContractProfitabilitySnapshots as unknown as ReturnType<
  typeof vi.fn
>

describe('materializeInvoiceFromApprovedQuotation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes the active transaction client into contract materialization', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              quotation_id: 'qt-1',
              quotation_number: 'EO-QUO-202604-TEST',
              client_id: null,
              organization_id: 'org-1',
              space_id: 'space-1',
              client_name_cache: 'Cliente Test',
              status: 'issued',
              legacy_status: null,
              converted_to_income_id: null,
              current_version: 1,
              total_price: 1000,
              total_amount: 1000,
              total_amount_clp: 1000,
              currency: 'CLP',
              description: 'Quote test',
              subtotal: 1000,
              tax_code: 'cl_vat_non_billable'
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
    }

    mockedWithTransaction.mockImplementationOnce(async callback => callback(client))
    mockedEnsureContractForQuotation.mockResolvedValueOnce({
      contractId: 'ctr-1',
      contractNumber: 'EO-CTR-TEST',
      created: true,
      status: 'draft'
    })
    mockedMaterializeContractProfitabilitySnapshots.mockResolvedValueOnce([])

    const { materializeInvoiceFromApprovedQuotation } = await import('./materialize-invoice-from-quotation')

    const result = await materializeInvoiceFromApprovedQuotation({
      quotationId: 'qt-1',
      actor: { userId: 'user-1', name: 'User Test' }
    })

    expect(mockedEnsureContractForQuotation).toHaveBeenCalledWith({
      quotationId: 'qt-1',
      actor: { userId: 'user-1', name: 'User Test' },
      client
    })
    expect(mockedMaterializeContractProfitabilitySnapshots).toHaveBeenCalledWith({
      contractId: 'ctr-1'
    })
    expect(result.contractId).toBe('ctr-1')
  })

  // TASK-1210 Slice 1 — derivación del desglose neto/IVA de una cotización CLF
  // legacy (HubSpot) que solo trae `total_amount` en UF (subtotal/tax NULL).
  const buildClfClient = (overrides: Record<string, unknown>) => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              quotation_id: 'qt-clf',
              quotation_number: 'EO-QUO-CLF',
              client_id: null,
              organization_id: 'org-clf',
              space_id: null,
              client_name_cache: 'Cliente CLF',
              status: 'issued',
              legacy_status: null,
              converted_to_income_id: null,
              current_version: 1,
              total_price: null,
              total_amount: 128.996,
              total_amount_clp: 0,
              currency: 'CLF',
              description: 'Quote CLF',
              subtotal: null,
              tax_rate: null,
              tax_amount: null,
              tax_amount_snapshot: null,
              tax_snapshot_json: null,
              ...overrides
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValue({ rows: [] })
    }

    mockedWithTransaction.mockImplementationOnce(async callback => callback(client))
    mockedEnsureContractForQuotation.mockResolvedValueOnce({
      contractId: 'ctr-clf',
      contractNumber: 'EO-CTR-CLF',
      created: true,
      status: 'draft'
    })
    mockedMaterializeContractProfitabilitySnapshots.mockResolvedValueOnce([])
  }

  it('CLF afecta (cl_vat_19): deriva neto/IVA desde el total UF y proyecta income CLP con plano native UF', async () => {
    process.env.FINANCE_CLF_INCOME_PROJECTION_ENABLED = 'true'
    buildClfClient({ tax_code: 'cl_vat_19' })

    const { materializeInvoiceFromApprovedQuotation } = await import('./materialize-invoice-from-quotation')

    await materializeInvoiceFromApprovedQuotation({
      quotationId: 'qt-clf',
      actor: { userId: 'u', name: 'U' }
    })

    const fields = mockedCreateFinanceIncome.mock.calls[0][0]

    expect(fields.currency).toBe('CLP')
    expect(fields.nativeCurrency).toBe('CLF')
    expect(fields.nativeAmount).toBeCloseTo(128.996, 3)
    expect(fields.isTaxExempt).toBe(false)
    // El IVA NO es cero — el desglose se derivó (antes el income iba sin IVA / rechazado).
    expect(fields.taxAmount).toBeGreaterThan(0)
    // Identidad documental en CLP entero: total = neto + IVA (tolerancia ≤1 por redondeo).
    expect(Math.abs(fields.totalAmount - (fields.subtotal + fields.taxAmount))).toBeLessThanOrEqual(1)
    // ~128.996 UF × 39.000 ≈ 5.030.844 CLP entero.
    expect(Number.isInteger(fields.totalAmount)).toBe(true)
    expect(fields.totalAmount).toBe(Math.round(128.996 * 39000))

    delete process.env.FINANCE_CLF_INCOME_PROJECTION_ENABLED
  })

  it('CLF exenta (cl_vat_exempt): NO gross-up — IVA = 0 y el total va al plano exento', async () => {
    process.env.FINANCE_CLF_INCOME_PROJECTION_ENABLED = 'true'
    buildClfClient({ tax_code: 'cl_vat_exempt' })

    const { materializeInvoiceFromApprovedQuotation } = await import('./materialize-invoice-from-quotation')

    await materializeInvoiceFromApprovedQuotation({
      quotationId: 'qt-clf',
      actor: { userId: 'u', name: 'U' }
    })

    const fields = mockedCreateFinanceIncome.mock.calls[0][0]

    expect(fields.currency).toBe('CLP')
    expect(fields.nativeCurrency).toBe('CLF')
    expect(fields.isTaxExempt).toBe(true)
    expect(fields.taxAmount).toBe(0)
    expect(fields.totalAmount).toBe(Math.round(128.996 * 39000))

    delete process.env.FINANCE_CLF_INCOME_PROJECTION_ENABLED
  })

  it('CLF sin clasificación fiscal (tax_code NULL): fail-closed — no materializa (no inventa IVA)', async () => {
    process.env.FINANCE_CLF_INCOME_PROJECTION_ENABLED = 'true'
    buildClfClient({ tax_code: null })

    const { materializeInvoiceFromApprovedQuotation } = await import('./materialize-invoice-from-quotation')

    await expect(
      materializeInvoiceFromApprovedQuotation({ quotationId: 'qt-clf', actor: { userId: 'u', name: 'U' } })
    ).rejects.toThrow(/clasificar la cotización CLF/)

    expect(mockedCreateFinanceIncome).not.toHaveBeenCalled()

    delete process.env.FINANCE_CLF_INCOME_PROJECTION_ENABLED
  })
})
