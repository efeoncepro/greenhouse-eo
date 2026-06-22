import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockClaimPendingDteEmissions = vi.fn()
const mockMarkDteEmitted = vi.fn()
const mockMarkDteEmissionFailed = vi.fn()
const mockEmitDte = vi.fn()

vi.mock('server-only', () => ({}))

vi.mock('@/lib/finance/dte-emission-queue', () => ({
  claimPendingDteEmissions: (...args: unknown[]) => mockClaimPendingDteEmissions(...args),
  markDteEmitted: (...args: unknown[]) => mockMarkDteEmitted(...args),
  markDteEmissionFailed: (...args: unknown[]) => mockMarkDteEmissionFailed(...args)
}))

vi.mock('@/lib/nubox/emission', () => ({
  emitDte: (...args: unknown[]) => mockEmitDte(...args)
}))

import { processDteEmissionRetryQueue } from './dte-emission-retry'

describe('processDteEmissionRetryQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an empty result when there are no pending DTE emissions', async () => {
    mockClaimPendingDteEmissions.mockResolvedValue([])

    await expect(processDteEmissionRetryQueue()).resolves.toEqual({
      processed: 0,
      emitted: 0,
      failed: 0,
      message: 'No pending DTE emissions'
    })
    expect(mockClaimPendingDteEmissions).toHaveBeenCalledWith(5)
  })

  it('emits queued DTEs and marks successful items as emitted', async () => {
    mockClaimPendingDteEmissions.mockResolvedValue([
      {
        queueId: 'q-1',
        incomeId: 'income-1',
        dteTypeCode: '61',
        attemptCount: 1,
        maxAttempts: 3
      }
    ])
    mockEmitDte.mockResolvedValue({ success: true })

    await expect(processDteEmissionRetryQueue()).resolves.toEqual({ processed: 1, emitted: 1, failed: 0 })
    expect(mockEmitDte).toHaveBeenCalledWith({ incomeId: 'income-1', dteTypeCode: '61' })
    expect(mockMarkDteEmitted).toHaveBeenCalledWith('q-1')
  })

  it('marks a failed emission for retry when Nubox returns an unsuccessful result', async () => {
    mockClaimPendingDteEmissions.mockResolvedValue([
      {
        queueId: 'q-2',
        incomeId: 'income-2',
        dteTypeCode: '33',
        attemptCount: 2,
        maxAttempts: 3
      }
    ])
    mockEmitDte.mockResolvedValue({ success: false, error: 'Nubox timeout' })

    await expect(processDteEmissionRetryQueue()).resolves.toEqual({ processed: 1, emitted: 0, failed: 1 })
    expect(mockMarkDteEmissionFailed).toHaveBeenCalledWith('q-2', 'Nubox timeout', 2, 3)
  })
})
