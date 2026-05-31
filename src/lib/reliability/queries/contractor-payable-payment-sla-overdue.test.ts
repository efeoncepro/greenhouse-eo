/**
 * TASK-978 Slice 2 — tests para getContractorPayablePaymentSlaOverdueSignal.
 *
 * 4 paths cubiertos:
 *   1. count = 0 → severity 'ok'
 *   2. count > 0, max overdue ≤ 10 días → severity 'warning'
 *   3. count > 0, max overdue > 10 días → severity 'error'
 *   4. query throws → severity 'unknown' (degradación honesta)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { getContractorPayablePaymentSlaOverdueSignal } from './contractor-payable-payment-sla-overdue'

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getContractorPayablePaymentSlaOverdueSignal', () => {
  it('count = 0 → severity ok', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0, max_overdue_days: 0 }])

    const signal = await getContractorPayablePaymentSlaOverdueSignal()

    expect(signal.signalId).toBe('finance.contractor_payable.payment_sla_overdue')
    expect(signal.moduleKey).toBe('finance')
    expect(signal.kind).toBe('lag')
    expect(signal.severity).toBe('ok')
  })

  it('count > 0 con atraso ≤ 10 días → severity warning', async () => {
    queryMock.mockResolvedValueOnce([{ n: 3, max_overdue_days: 4 }])

    const signal = await getContractorPayablePaymentSlaOverdueSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('3')
    expect(signal.summary).toContain('4')
  })

  it('count > 0 con atraso > 10 días → severity error', async () => {
    queryMock.mockResolvedValueOnce([{ n: 1, max_overdue_days: 15 }])

    const signal = await getContractorPayablePaymentSlaOverdueSignal()

    expect(signal.severity).toBe('error')
  })

  it('query throws → severity unknown (degradado, no rompe el dashboard)', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom'))

    const signal = await getContractorPayablePaymentSlaOverdueSignal()

    expect(signal.severity).toBe('unknown')
  })
})
