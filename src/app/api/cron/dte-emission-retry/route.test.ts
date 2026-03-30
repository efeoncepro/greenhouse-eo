import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireCronAuth = vi.fn()
const mockClaimPendingDteEmissions = vi.fn()
const mockMarkDteEmitted = vi.fn()
const mockMarkDteEmissionFailed = vi.fn()
const mockEmitDte = vi.fn()
const mockAlertCronFailure = vi.fn()

vi.mock('@/lib/cron/require-cron-auth', () => ({
  requireCronAuth: (...args: unknown[]) => mockRequireCronAuth(...args)
}))

vi.mock('@/lib/finance/dte-emission-queue', () => ({
  claimPendingDteEmissions: (...args: unknown[]) => mockClaimPendingDteEmissions(...args),
  markDteEmitted: (...args: unknown[]) => mockMarkDteEmitted(...args),
  markDteEmissionFailed: (...args: unknown[]) => mockMarkDteEmissionFailed(...args)
}))

vi.mock('@/lib/nubox/emission', () => ({
  emitDte: (...args: unknown[]) => mockEmitDte(...args)
}))

vi.mock('@/lib/alerts/slack-notify', () => ({
  alertCronFailure: (...args: unknown[]) => mockAlertCronFailure(...args)
}))

import { GET } from './route'

describe('GET /api/cron/dte-emission-retry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCronAuth.mockReturnValue({ authorized: true, errorResponse: null })
  })

  it('retries queued emissions via emitDte and marks successful items as emitted', async () => {
    mockClaimPendingDteEmissions.mockResolvedValue([
      {
        queueId: 'q-1',
        incomeId: 'income-1',
        requestedBy: 'finance_emit_route',
        dteTypeCode: '61',
        status: 'emitting',
        attemptCount: 1,
        maxAttempts: 3
      }
    ])
    mockEmitDte.mockResolvedValue({ success: true })

    const response = await GET(new Request('http://localhost/api/cron/dte-emission-retry'))
    const body = await response.json()

    expect(mockEmitDte).toHaveBeenCalledWith({ incomeId: 'income-1', dteTypeCode: '61' })
    expect(mockMarkDteEmitted).toHaveBeenCalledWith('q-1')
    expect(body).toMatchObject({ processed: 1, emitted: 1, failed: 0 })
  })

  it('schedules retry failure when emitDte returns an unsuccessful result', async () => {
    mockClaimPendingDteEmissions.mockResolvedValue([
      {
        queueId: 'q-2',
        incomeId: 'income-2',
        requestedBy: 'finance_emit_route',
        dteTypeCode: '33',
        status: 'emitting',
        attemptCount: 2,
        maxAttempts: 3
      }
    ])
    mockEmitDte.mockResolvedValue({ success: false, error: 'Nubox timeout' })

    const response = await GET(new Request('http://localhost/api/cron/dte-emission-retry'))
    const body = await response.json()

    expect(mockMarkDteEmissionFailed).toHaveBeenCalledWith('q-2', 'Nubox timeout', 2, 3)
    expect(body).toMatchObject({ processed: 1, emitted: 0, failed: 1 })
  })
})
