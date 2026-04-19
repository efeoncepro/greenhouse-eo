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

import { withTransaction } from '@/lib/db'
import { ensureContractForQuotation } from '@/lib/commercial/contract-lifecycle'
import { materializeContractProfitabilitySnapshots } from '@/lib/commercial-intelligence/contract-profitability-materializer'

const mockedWithTransaction = withTransaction as unknown as ReturnType<typeof vi.fn>
const mockedEnsureContractForQuotation = ensureContractForQuotation as unknown as ReturnType<typeof vi.fn>

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
              subtotal: 1000
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
})
