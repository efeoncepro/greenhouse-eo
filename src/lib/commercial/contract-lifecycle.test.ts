import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  withTransaction: vi.fn()
}))

vi.mock('@/lib/commercial/contract-events', () => ({
  publishContractActivated: vi.fn(),
  publishContractCompleted: vi.fn(),
  publishContractCreated: vi.fn(),
  publishContractModified: vi.fn(),
  publishContractRenewed: vi.fn(),
  publishContractTerminated: vi.fn()
}))

import { withTransaction } from '@/lib/db'

const mockedWithTransaction = withTransaction as unknown as ReturnType<typeof vi.fn>

describe('ensureContractForQuotation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reuses the provided client instead of opening a nested transaction', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              contract_id: 'ctr-existing-1',
              contract_number: 'EO-CTR-TEST',
              status: 'draft',
              client_id: null,
              organization_id: 'org-1',
              space_id: 'space-1',
              commercial_model: 'project',
              staffing_model: 'outcome_based',
              originator_quote_id: 'qt-1'
            }
          ]
        })
        .mockResolvedValue({ rows: [] })
    }

    const { ensureContractForQuotation } = await import('./contract-lifecycle')

    const result = await ensureContractForQuotation({
      quotationId: 'qt-1',
      actor: { userId: 'user-1', name: 'User Test' },
      client
    })

    expect(result).toEqual({
      contractId: 'ctr-existing-1',
      contractNumber: 'EO-CTR-TEST',
      created: false,
      status: 'draft'
    })

    expect(mockedWithTransaction).not.toHaveBeenCalled()
    expect(client.query).toHaveBeenCalled()
  })
})
