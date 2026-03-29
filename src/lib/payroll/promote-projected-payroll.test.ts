import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockIsPayrollPostgresEnabled = vi.fn(() => true)
const mockGetPayrollPeriod = vi.fn()
const mockCreatePayrollPeriod = vi.fn()
const mockProjectPayrollForPeriod = vi.fn()
const mockUpsertProjectedPayrollSnapshot = vi.fn()
const mockCalculatePayroll = vi.fn()
const mockCreatePromotion = vi.fn()
const mockMarkPromotionCompleted = vi.fn()
const mockMarkPromotionFailed = vi.fn()
const mockPublishPromotionEvents = vi.fn()

vi.mock('@/lib/payroll/postgres-store', () => ({
  isPayrollPostgresEnabled: () => mockIsPayrollPostgresEnabled()
}))

vi.mock('@/lib/payroll/get-payroll-periods', () => ({
  getPayrollPeriod: (...args: unknown[]) => mockGetPayrollPeriod(...args),
  createPayrollPeriod: (...args: unknown[]) => mockCreatePayrollPeriod(...args)
}))

vi.mock('@/lib/payroll/project-payroll', () => ({
  projectPayrollForPeriod: (...args: unknown[]) => mockProjectPayrollForPeriod(...args)
}))

vi.mock('@/lib/payroll/projected-payroll-store', () => ({
  upsertProjectedPayrollSnapshot: (...args: unknown[]) => mockUpsertProjectedPayrollSnapshot(...args)
}))

vi.mock('@/lib/payroll/calculate-payroll', () => ({
  calculatePayroll: (...args: unknown[]) => mockCalculatePayroll(...args)
}))

vi.mock('@/lib/payroll/projected-payroll-promotion-store', () => ({
  pgCreateProjectedPayrollPromotion: (...args: unknown[]) => mockCreatePromotion(...args),
  pgMarkProjectedPayrollPromotionCompleted: (...args: unknown[]) => mockMarkPromotionCompleted(...args),
  pgMarkProjectedPayrollPromotionFailed: (...args: unknown[]) => mockMarkPromotionFailed(...args),
  publishProjectedPayrollPromotionEvents: (...args: unknown[]) => mockPublishPromotionEvents(...args)
}))

import { PayrollValidationError } from '@/lib/payroll/shared'
import { promoteProjectedPayrollToOfficialDraft } from './promote-projected-payroll'

describe('promoteProjectedPayrollToOfficialDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockCreatePromotion.mockResolvedValue({
      promotionId: 'promo-1',
      periodId: '2026-03',
      periodYear: 2026,
      periodMonth: 3,
      projectionMode: 'projected_month_end',
      asOfDate: '2026-03-31',
      sourceSnapshotCount: 1,
      promotedEntryCount: 0,
      sourcePeriodStatus: null,
      actorUserId: null,
      actorIdentifier: 'hr@efeoncepro.com',
      promotionStatus: 'started',
      promotedAt: null,
      failureReason: null,
      createdAt: '2026-03-27T12:00:00.000Z',
      updatedAt: '2026-03-27T12:00:00.000Z'
    })
    mockMarkPromotionCompleted.mockResolvedValue({
      promotionId: 'promo-1',
      periodId: '2026-03',
      periodYear: 2026,
      periodMonth: 3,
      projectionMode: 'projected_month_end',
      asOfDate: '2026-03-31',
      sourceSnapshotCount: 1,
      promotedEntryCount: 1,
      sourcePeriodStatus: null,
      actorUserId: null,
      actorIdentifier: 'hr@efeoncepro.com',
      promotionStatus: 'completed',
      promotedAt: '2026-03-27T12:01:00.000Z',
      failureReason: null,
      createdAt: '2026-03-27T12:00:00.000Z',
      updatedAt: '2026-03-27T12:01:00.000Z'
    })
  })

  it('creates missing official period and recalculates it from projected context', async () => {
    mockGetPayrollPeriod.mockResolvedValue(null)
    mockCreatePayrollPeriod.mockResolvedValue({ periodId: '2026-03' })
    mockProjectPayrollForPeriod.mockResolvedValue({
      period: { year: 2026, month: 3 },
      mode: 'projected_month_end',
      asOfDate: '2026-03-31',
      entries: [{ memberId: 'member-1' }],
      totals: { grossByCurrency: { USD: 740.21 }, netByCurrency: { USD: 740.21 }, memberCount: 1 }
    })
    mockCalculatePayroll.mockResolvedValue({
      period: { periodId: '2026-03', status: 'calculated' },
      entries: [{ entryId: 'entry-1' }],
      diagnostics: {},
      attendanceDiagnostics: {},
      missingKpiMemberIds: [],
      missingCompensationMemberIds: []
    })

    const result = await promoteProjectedPayrollToOfficialDraft({
      year: 2026,
      month: 3,
      mode: 'projected_month_end',
      actorIdentifier: 'hr@efeoncepro.com'
    })

    expect(mockCreatePayrollPeriod).toHaveBeenCalledWith({ year: 2026, month: 3 })
    expect(mockUpsertProjectedPayrollSnapshot).toHaveBeenCalledTimes(1)
    expect(mockCalculatePayroll).toHaveBeenCalledWith({
      periodId: '2026-03',
      actorIdentifier: 'hr@efeoncepro.com',
      projectionContext: {
        mode: 'projected_month_end',
        asOfDate: '2026-03-31',
        promotionId: 'promo-1'
      }
    })
    expect(mockPublishPromotionEvents).toHaveBeenCalled()
    expect(result.createdPeriod).toBe(true)
    expect(result.promotion.promotionStatus).toBe('completed')
  })

  it('marks promotion as failed when official recalculation throws', async () => {
    mockGetPayrollPeriod.mockResolvedValue({ periodId: '2026-03', status: 'draft' })
    mockProjectPayrollForPeriod.mockResolvedValue({
      period: { year: 2026, month: 3 },
      mode: 'actual_to_date',
      asOfDate: '2026-03-27',
      entries: [{ memberId: 'member-1' }],
      totals: { grossByCurrency: { USD: 725 }, netByCurrency: { USD: 725 }, memberCount: 1 }
    })
    mockCalculatePayroll.mockRejectedValue(new PayrollValidationError('Missing tax table version.', 400))

    await expect(
      promoteProjectedPayrollToOfficialDraft({
        year: 2026,
        month: 3,
        mode: 'actual_to_date',
        actorIdentifier: 'hr@efeoncepro.com'
      })
    ).rejects.toThrow('Missing tax table version.')

    expect(mockMarkPromotionFailed).toHaveBeenCalledWith({
      promotionId: 'promo-1',
      failureReason: 'Missing tax table version.'
    })
    expect(mockPublishPromotionEvents).not.toHaveBeenCalled()
  })
})
