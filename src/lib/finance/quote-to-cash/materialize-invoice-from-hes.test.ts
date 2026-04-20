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

describe('materializeInvoiceFromApprovedHes', () => {
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
              hes_id: 'hes-1',
              hes_number: 'HES-001',
              purchase_order_id: null,
              client_id: null,
              organization_id: 'org-1',
              space_id: 'space-1',
              service_description: 'Servicio test',
              amount: 1000,
              currency: 'CLP',
              amount_clp: 1000,
              amount_authorized_clp: 1000,
              status: 'approved',
              income_id: null,
              quotation_id: 'qt-1'
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              quotation_id: 'qt-1',
              client_id: null,
              organization_id: 'org-1',
              space_id: 'space-1',
              client_name_cache: 'Cliente Test',
              status: 'issued',
              converted_to_income_id: null,
              current_version: 1
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [] })
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

    const { materializeInvoiceFromApprovedHes } = await import('./materialize-invoice-from-hes')

    const result = await materializeInvoiceFromApprovedHes({
      hesId: 'hes-1',
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
