import { describe, expect, it, vi } from 'vitest'

const mockGeneratePayrollReceiptsForPeriod = vi.fn()

vi.mock('@/lib/payroll/generate-payroll-receipts', () => ({
  generatePayrollReceiptsForPeriod: (...args: unknown[]) => mockGeneratePayrollReceiptsForPeriod(...args)
}))

import { payrollReceiptsProjection } from './payroll-receipts'

describe('payrollReceiptsProjection', () => {
  it('extracts period scope from payroll export payloads', () => {
    expect(payrollReceiptsProjection.extractScope({ periodId: '2026-03' }))
      .toEqual({ entityType: 'payroll_period', entityId: '2026-03' })
    expect(payrollReceiptsProjection.extractScope({ period_id: '2026-04' }))
      .toEqual({ entityType: 'payroll_period', entityId: '2026-04' })
    expect(payrollReceiptsProjection.extractScope({ periodId: 'invalid' })).toBeNull()
  })

  it('refreshes the receipt batch from the exported payroll event', async () => {
    mockGeneratePayrollReceiptsForPeriod.mockResolvedValueOnce({
      periodId: '2026-03',
      revision: 3,
      totalEntries: 7,
      generated: 7,
      reused: 0,
      emailed: 7,
      generationFailed: 0,
      emailFailed: 0,
      skippedNoEmail: 0
    })

    const result = await payrollReceiptsProjection.refresh(
      { entityType: 'payroll_period', entityId: '2026-03' },
      { periodId: '2026-03', _eventId: 'event-123', generatedBy: 'hr@greenhouse.test' }
    )

    expect(mockGeneratePayrollReceiptsForPeriod).toHaveBeenCalledTimes(1)
    expect(mockGeneratePayrollReceiptsForPeriod).toHaveBeenCalledWith({
      periodId: '2026-03',
      sourceEventId: 'event-123',
      sendEmails: true,
      actorEmail: 'hr@greenhouse.test'
    })
    expect(result).toContain('generated 7 receipts')
  })
})
