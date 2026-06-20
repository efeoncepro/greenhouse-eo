import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireCronAuth = vi.fn()
const mockProcessDteEmissionRetryQueue = vi.fn()
const mockAlertCronFailure = vi.fn()

vi.mock('@/lib/cron/require-cron-auth', () => ({
  requireCronAuth: (...args: unknown[]) => mockRequireCronAuth(...args)
}))

vi.mock('@/lib/finance/dte-emission-retry', () => ({
  processDteEmissionRetryQueue: (...args: unknown[]) => mockProcessDteEmissionRetryQueue(...args)
}))

vi.mock('@/lib/alerts/slack-notify', () => ({
  alertCronFailure: (...args: unknown[]) => mockAlertCronFailure(...args)
}))

import { GET } from './route'

describe('GET /api/cron/dte-emission-retry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCronAuth.mockReturnValue({ authorized: true, errorResponse: null })
    mockAlertCronFailure.mockResolvedValue(undefined)
  })

  it('delegates queue processing to the canonical retry processor', async () => {
    mockProcessDteEmissionRetryQueue.mockResolvedValue({ processed: 1, emitted: 1, failed: 0 })

    const response = await GET(new Request('http://localhost/api/cron/dte-emission-retry'))
    const body = await response.json()

    expect(mockProcessDteEmissionRetryQueue).toHaveBeenCalledWith(5)
    expect(body).toMatchObject({ processed: 1, emitted: 1, failed: 0 })
  })

  it('alerts and returns 502 when the processor fails', async () => {
    mockProcessDteEmissionRetryQueue.mockRejectedValue(new Error('queue missing'))

    const response = await GET(new Request('http://localhost/api/cron/dte-emission-retry'))
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(mockAlertCronFailure).toHaveBeenCalledWith('dte-emission-retry', expect.any(Error))
    expect(body).toMatchObject({ error: 'queue missing' })
  })
})
