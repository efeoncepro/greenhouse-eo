import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()

const mockWithTransaction = vi.fn(
  async (callback: (client: unknown) => Promise<unknown>) => callback({ query: mockQuery })
)

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  withTransaction: (callback: (client: unknown) => Promise<unknown>) => mockWithTransaction(callback)
}))

const mockEnsureContract = vi.fn()

vi.mock('@/lib/commercial/contract-lifecycle', () => ({
  ensureContractForQuotation: (...args: unknown[]) => mockEnsureContract(...args)
}))

const mockPromoteParty = vi.fn()

vi.mock('../promote-party', () => ({
  promoteParty: (...args: unknown[]) => mockPromoteParty(...args)
}))

const mockInstantiateClient = vi.fn()

vi.mock('../instantiate-client-for-party', () => ({
  instantiateClientForParty: (...args: unknown[]) => mockInstantiateClient(...args)
}))

const mockPublishDealWon = vi.fn()

vi.mock('@/lib/commercial/deal-events', () => ({
  publishDealWon: (...args: unknown[]) => mockPublishDealWon(...args)
}))

const mockPublishOutboxEvent = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

import {
  QuotationNotConvertibleError,
  QuotationNotFoundError,
  QuoteToCashApprovalRequiredError,
  QuoteToCashMissingAnchorsError
} from '../convert-quote-to-cash-types'
import { convertQuoteToCash } from '../convert-quote-to-cash'

const QUOTE_ROW_ISSUED = {
  quotation_id: 'QT-001',
  quotation_number: 'Q-001',
  status: 'issued',
  organization_id: 'org-1',
  client_id: null,
  space_id: null,
  hubspot_deal_id: 'hs-deal-1',
  total_amount_clp: 5_000_000,
  total_amount: 5_000_000,
  currency: 'CLP',
  converted_to_income_id: null,
  converted_at: null,
  organization_lifecycle_stage: 'opportunity'
}

const baseInput = {
  quotationId: 'QT-001',
  conversionTriggeredBy: 'operator' as const,
  actor: { userId: 'user-1', tenantScope: 'efeonce_internal:efeonce' }
}

describe('convertQuoteToCash', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws QuotationNotFoundError when the row does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await expect(convertQuoteToCash(baseInput)).rejects.toBeInstanceOf(QuotationNotFoundError)
  })

  it('throws QuotationNotConvertibleError when status is not issued/sent/approved', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...QUOTE_ROW_ISSUED, status: 'draft' }] })

    await expect(convertQuoteToCash(baseInput)).rejects.toBeInstanceOf(QuotationNotConvertibleError)
    expect(mockEnsureContract).not.toHaveBeenCalled()
  })

  it('throws QuoteToCashMissingAnchorsError when the quote has no organization_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...QUOTE_ROW_ISSUED, organization_id: null }] })

    // startCorrelatedOperation is not reached — error fires before audit insert.
    await expect(convertQuoteToCash(baseInput)).rejects.toBeInstanceOf(QuoteToCashMissingAnchorsError)
  })

  it('short-circuits with idempotent_hit when the quote is already converted and has prior audit', async () => {
    mockQuery

      // lock quotation — returns converted quote
      .mockResolvedValueOnce({ rows: [{ ...QUOTE_ROW_ISSUED, status: 'converted', converted_to_income_id: 'INC-0001' }] })

      // findCompletedOperationForQuotation
      .mockResolvedValueOnce({
        rows: [
          {
            operation_id: 'op-prev',
            correlation_id: 'corr-prev',
            status: 'completed',
            contract_id: 'CT-prev',
            client_id: 'cli-prev',
            organization_id: 'org-1',
            hubspot_deal_id: 'hs-deal-1',
            quotation_id: 'QT-001',
            approval_id: null,
            completed_at: '2026-04-21T10:00:00Z'
          }
        ]
      })

    const result = await convertQuoteToCash(baseInput)

    expect(result.status).toBe('idempotent_hit')
    expect(result.operationId).toBe('op-prev')
    expect(result.contractId).toBe('CT-prev')
    expect(mockEnsureContract).not.toHaveBeenCalled()
    expect(mockPromoteParty).not.toHaveBeenCalled()
  })

  it('persists pending_approval and throws QuoteToCashApprovalRequiredError when amount > $100M CLP', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ...QUOTE_ROW_ISSUED, total_amount_clp: 150_000_000 }] }) // lock
      .mockResolvedValueOnce({ rows: [{ operation_id: 'op-big' }] }) // startCorrelatedOperation insert
      .mockResolvedValueOnce(undefined) // completeOperation(pending_approval)

    await expect(convertQuoteToCash(baseInput)).rejects.toBeInstanceOf(QuoteToCashApprovalRequiredError)

    expect(mockEnsureContract).not.toHaveBeenCalled()
    expect(mockPromoteParty).not.toHaveBeenCalled()

    // The approval_requested event fires via publishOutboxEvent wrapper.
    const approvalEvent = mockPublishOutboxEvent.mock.calls.find(
      call => (call[0] as { eventType?: string }).eventType === 'commercial.quote_to_cash.approval_requested'
    )

    expect(approvalEvent).toBeDefined()
  })

  it('bypasses the approval gate when skipApprovalGate is true', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ...QUOTE_ROW_ISSUED, total_amount_clp: 200_000_000 }] }) // lock
      .mockResolvedValueOnce({ rows: [{ operation_id: 'op-override' }] }) // audit insert
      .mockResolvedValueOnce(undefined) // UPDATE quotations → converted
      .mockResolvedValueOnce(undefined) // completeOperation(completed)

    mockEnsureContract.mockResolvedValueOnce({
      contractId: 'CT-1',
      contractNumber: 'C-001',
      created: true,
      status: 'active'
    })
    mockPromoteParty.mockResolvedValueOnce({ ok: true })

    const result = await convertQuoteToCash({ ...baseInput, skipApprovalGate: true })

    expect(result.status).toBe('completed')
    expect(result.contractId).toBe('CT-1')
    expect(mockEnsureContract).toHaveBeenCalled()
  })

  it('happy path — transitions quote, creates contract, promotes party, emits events', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ...QUOTE_ROW_ISSUED, organization_lifecycle_stage: 'opportunity' }] }) // lock
      .mockResolvedValueOnce({ rows: [{ operation_id: 'op-ok' }] }) // startCorrelatedOperation
      .mockResolvedValueOnce(undefined) // UPDATE quotations → converted
      .mockResolvedValueOnce(undefined) // completeOperation(completed)

    mockEnsureContract.mockResolvedValueOnce({
      contractId: 'CT-42',
      contractNumber: 'C-042',
      created: true,
      status: 'active'
    })
    mockPromoteParty.mockResolvedValueOnce({ ok: true })

    const result = await convertQuoteToCash(baseInput)

    expect(result.status).toBe('completed')
    expect(result.contractId).toBe('CT-42')
    expect(result.organizationPromoted).toBe(true)
    expect(result.dealWonEmitted).toBe(true) // trigger=operator + hubspotDealId present → re-emit locally

    expect(mockPromoteParty).toHaveBeenCalledWith(
      expect.objectContaining({
        toStage: 'active_client',
        source: 'quote_converted',
        triggerEntity: { type: 'contract', id: 'CT-42' }
      }),
      expect.anything()
    )
    expect(mockPublishDealWon).toHaveBeenCalledTimes(1)
  })

  it('skips re-emit of deal.won when trigger came from HubSpot sync', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ...QUOTE_ROW_ISSUED, organization_lifecycle_stage: 'opportunity' }] })
      .mockResolvedValueOnce({ rows: [{ operation_id: 'op-sync' }] })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)

    mockEnsureContract.mockResolvedValueOnce({
      contractId: 'CT-55',
      contractNumber: 'C-055',
      created: true,
      status: 'active'
    })
    mockPromoteParty.mockResolvedValueOnce({ ok: true })

    const result = await convertQuoteToCash({
      ...baseInput,
      conversionTriggeredBy: 'deal_won_hubspot'
    })

    expect(result.dealWonEmitted).toBe(false)
    expect(mockPublishDealWon).not.toHaveBeenCalled()
  })

  it('does not promote party when org is already active_client', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ...QUOTE_ROW_ISSUED, organization_lifecycle_stage: 'active_client', client_id: 'cli-existing' }] })
      .mockResolvedValueOnce({ rows: [{ operation_id: 'op-noprom' }] })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)

    mockEnsureContract.mockResolvedValueOnce({
      contractId: 'CT-66',
      contractNumber: 'C-066',
      created: true,
      status: 'active'
    })

    const result = await convertQuoteToCash(baseInput)

    expect(result.organizationPromoted).toBe(false)
    expect(mockPromoteParty).not.toHaveBeenCalled()
  })
})
