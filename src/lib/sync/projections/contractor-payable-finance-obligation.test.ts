import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockGetPayable = vi.fn()
const mockCreateObligation = vi.fn()
const mockMarkObligationCreated = vi.fn()
const mockCapture = vi.fn()

vi.mock('@/lib/contractor-engagements/payables/store', () => ({
  getContractorPayableById: (...args: unknown[]) => mockGetPayable(...args),
  markPayableObligationCreated: (...args: unknown[]) => mockMarkObligationCreated(...args)
}))

vi.mock('@/lib/finance/payment-obligations/create-obligation', () => ({
  createPaymentObligation: (...args: unknown[]) => mockCreateObligation(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCapture(...args)
}))

import { contractorPayableFinanceObligationProjection as projection } from './contractor-payable-finance-obligation'

const readyPayable = {
  contractorPayableId: 'cpay-1',
  publicId: 'EO-CPAY-0001',
  contractorEngagementId: 'ceng-1',
  payableSourceKind: 'work_submission',
  beneficiaryType: 'member',
  beneficiaryId: 'm-1',
  grossAmount: 1000,
  withholdingAmount: 152.5,
  netPayable: 847.5,
  currency: 'CLP',
  paymentCurrency: null,
  payrollVia: 'internal',
  taxComplianceOwner: 'greenhouse_policy',
  dueDate: null,
  status: 'ready_for_finance',
  financeObligationId: null
}

describe('contractorPayableFinanceObligationProjection (TASK-793)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('declares the canonical trigger + finance domain + retries', () => {
    expect(projection.name).toBe('contractor_payable_finance_obligation')
    expect(projection.domain).toBe('finance')
    expect(projection.triggerEvents).toContain('workforce.contractor_payable.ready_for_finance')
    expect(projection.maxRetries).toBe(5)
  })

  it('extractScope reads contractorPayableId from the event payload', () => {
    expect(projection.extractScope({ contractorPayableId: 'cpay-9' })).toEqual({
      entityType: 'contractor_payable',
      entityId: 'cpay-9'
    })
    expect(projection.extractScope({})).toBeNull()
    expect(projection.extractScope({ contractorPayableId: 42 })).toBeNull()
  })

  it('skips when the payable no longer exists', async () => {
    mockGetPayable.mockResolvedValueOnce(null)
    const res = await projection.refresh({ entityType: 'contractor_payable', entityId: 'cpay-x' }, {})

    expect(res).toContain('not found')
    expect(mockCreateObligation).not.toHaveBeenCalled()
  })

  it('skips idempotently when status is not ready_for_finance', async () => {
    mockGetPayable.mockResolvedValueOnce({ ...readyPayable, status: 'obligation_created' })
    const res = await projection.refresh({ entityType: 'contractor_payable', entityId: 'cpay-1' }, {})

    expect(res).toContain('skipped')
    expect(mockCreateObligation).not.toHaveBeenCalled()
  })

  it('creates ONE obligation (amount=net) and marks obligation_created', async () => {
    mockGetPayable.mockResolvedValueOnce(readyPayable)
    mockCreateObligation.mockResolvedValueOnce({
      created: true,
      obligation: { obligationId: 'pob-1' },
      eventId: 'evt-1'
    })
    mockMarkObligationCreated.mockResolvedValueOnce({ ...readyPayable, status: 'obligation_created' })

    const res = await projection.refresh({ entityType: 'contractor_payable', entityId: 'cpay-1' }, {})

    expect(mockCreateObligation).toHaveBeenCalledTimes(1)
    const arg = mockCreateObligation.mock.calls[0][0]

    expect(arg.sourceKind).toBe('contractor_payable')
    expect(arg.sourceRef).toBe('cpay-1')
    expect(arg.obligationKind).toBe('provider_payroll')
    expect(arg.amount).toBe(847.5) // net_payable, NOT gross
    expect(arg.currency).toBe('CLP')
    expect(mockMarkObligationCreated).toHaveBeenCalledWith(
      expect.objectContaining({ contractorPayableId: 'cpay-1', financeObligationId: 'pob-1' })
    )
    expect(res).toContain('created')
  })

  it('is idempotent: a duplicate obligation still links + marks created', async () => {
    mockGetPayable.mockResolvedValueOnce(readyPayable)
    mockCreateObligation.mockResolvedValueOnce({
      created: false,
      obligation: { obligationId: 'pob-1' },
      reason: 'duplicate'
    })
    mockMarkObligationCreated.mockResolvedValueOnce({ ...readyPayable, status: 'obligation_created' })

    const res = await projection.refresh({ entityType: 'contractor_payable', entityId: 'cpay-1' }, {})

    expect(mockMarkObligationCreated).toHaveBeenCalledWith(
      expect.objectContaining({ financeObligationId: 'pob-1' })
    )
    expect(res).toContain('duplicate')
  })

  it('skips + captures when the obligation currency is unsupported', async () => {
    mockGetPayable.mockResolvedValueOnce({ ...readyPayable, currency: 'EUR', paymentCurrency: 'EUR' })
    const res = await projection.refresh({ entityType: 'contractor_payable', entityId: 'cpay-1' }, {})

    expect(res).toContain('unsupported currency')
    expect(mockCreateObligation).not.toHaveBeenCalled()
    expect(mockCapture).toHaveBeenCalled()
  })

  it('uses payment_currency over contract currency for the obligation', async () => {
    mockGetPayable.mockResolvedValueOnce({ ...readyPayable, currency: 'CLP', paymentCurrency: 'USD' })
    mockCreateObligation.mockResolvedValueOnce({
      created: true,
      obligation: { obligationId: 'pob-2' },
      eventId: 'evt-2'
    })
    mockMarkObligationCreated.mockResolvedValueOnce({ ...readyPayable, status: 'obligation_created' })

    await projection.refresh({ entityType: 'contractor_payable', entityId: 'cpay-1' }, {})

    expect(mockCreateObligation.mock.calls[0][0].currency).toBe('USD')
  })
})
