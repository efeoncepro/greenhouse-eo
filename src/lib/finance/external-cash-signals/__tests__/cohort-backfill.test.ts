import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockRecordSignal = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/finance/external-cash-signals/record-signal', () => ({
  recordSignal: (...args: unknown[]) => mockRecordSignal(...args)
}))

import {
  backfillCohortAToSignals,
  backfillCohortBToSignals
} from '@/lib/finance/external-cash-signals/cohort-backfill'

const sampleCohortARow = {
  payment_id: 'PAY-NUBOX-inc-100',
  income_id: 'INC-NB-100',
  payment_date: '2026-03-06T03:00:00.000Z',
  amount: '6902000.00',
  currency: 'CLP',
  reference: 'nubox-mvmt-inc-3699924',
  payment_method: 'bank_transfer',
  is_reconciled: true,
  nubox_document_id: '14242953',
  income_payment_status: 'paid',
  client_name: 'Sky Airline',
  organization_id: 'org-sky',
  resolved_space_id: 'spc-sky-test'
}

const sampleCohortBRow = {
  payment_id: 'exp-pay-backfill-EXP-NB-29133156',
  expense_id: 'EXP-NB-29133156',
  payment_date: '2025-12-24T03:00:00.000Z',
  amount: '8163.00',
  currency: 'CLP',
  reference: null,
  nubox_purchase_id: '29133156',
  expense_payment_status: 'paid',
  supplier_name: 'Test Supplier',
  resolved_space_id: 'spc-default'
}

describe('TASK-708b — backfillCohortAToSignals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns inspected count without side effects on dry-run', async () => {
    const result = await backfillCohortAToSignals({ dryRun: true, rows: [sampleCohortARow] })

    expect(result.inspected).toBe(1)
    expect(result.signalsCreated).toBe(0)
    expect(mockRecordSignal).not.toHaveBeenCalled()
  })

  it('creates signals for new rows when applied', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([]) // existingCheck → empty
    mockRecordSignal.mockResolvedValueOnce({ signalId: 'signal-fresh', sourceEventId: 'nubox-mvmt-inc-3699924' })

    const result = await backfillCohortAToSignals({ dryRun: false, rows: [sampleCohortARow] })

    expect(result.signalsCreated).toBe(1)
    expect(result.signalsAlreadyExisted).toBe(0)
    expect(result.errors).toHaveLength(0)
    expect(mockRecordSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceSystem: 'nubox',
        sourceEventId: 'nubox-mvmt-inc-3699924',
        documentKind: 'income',
        documentId: 'INC-NB-100',
        amount: 6_902_000,
        currency: 'CLP',
        spaceId: 'spc-sky-test'
      })
    )
  })

  it('skips signals that already exist (idempotency)', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([{ signal_id: 'signal-existing' }])

    const result = await backfillCohortAToSignals({ dryRun: false, rows: [sampleCohortARow] })

    expect(result.signalsAlreadyExisted).toBe(1)
    expect(result.signalsCreated).toBe(0)
    expect(mockRecordSignal).not.toHaveBeenCalled()
  })

  it('falls back to default space_id when resolved_space_id is null', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])
    mockRecordSignal.mockResolvedValueOnce({ signalId: 'signal-fb', sourceEventId: 'nubox-mvmt-inc-x' })

    const result = await backfillCohortAToSignals({
      dryRun: false,
      rows: [{ ...sampleCohortARow, resolved_space_id: null, reference: 'nubox-mvmt-inc-x' }]
    })

    expect(result.signalsCreated).toBe(1)
    expect(mockRecordSignal).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'spc-8641519f-12a0-456f-b03a-e94522d35e3a' })
    )
  })

  it('captures errors per row without aborting the loop', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([])
    mockRecordSignal
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ signalId: 'signal-2', sourceEventId: 'nubox-mvmt-inc-y' })

    const result = await backfillCohortAToSignals({
      dryRun: false,
      rows: [
        { ...sampleCohortARow, payment_id: 'PAY-NUBOX-inc-200', reference: 'nubox-mvmt-inc-y' },
        { ...sampleCohortARow, payment_id: 'PAY-NUBOX-inc-300', reference: 'nubox-mvmt-inc-z' }
      ]
    })

    expect(result.errors).toHaveLength(1)
    expect(result.signalsCreated).toBe(1)
  })
})

describe('TASK-708b — backfillCohortBToSignals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses nubox-purchase- prefix for source_event_id', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])
    mockRecordSignal.mockResolvedValueOnce({ signalId: 'signal-B1', sourceEventId: 'nubox-purchase-29133156' })

    const result = await backfillCohortBToSignals({ dryRun: false, rows: [sampleCohortBRow] })

    expect(result.signalsCreated).toBe(1)
    expect(mockRecordSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceEventId: 'nubox-purchase-29133156',
        documentKind: 'expense',
        documentId: 'EXP-NB-29133156'
      })
    )
  })

  it('handles rows without nubox_purchase_id by falling back to payment_id-derived event id', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])
    mockRecordSignal.mockResolvedValueOnce({ signalId: 'signal-B-fb', sourceEventId: 'nubox-expense-payment-x' })

    const result = await backfillCohortBToSignals({
      dryRun: false,
      rows: [{ ...sampleCohortBRow, nubox_purchase_id: null, payment_id: 'exp-pay-backfill-EXP-NB-XXX' }]
    })

    expect(result.signalsCreated).toBe(1)
    expect(mockRecordSignal).toHaveBeenCalledWith(
      expect.objectContaining({ sourceEventId: 'nubox-expense-payment-exp-pay-backfill-EXP-NB-XXX' })
    )
  })
})
