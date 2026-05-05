import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  query: vi.fn()
}))

import { query } from '@/lib/db'

import { checkPayslipResendRateLimit } from './payslip-resend-rate-limit'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>

describe('TASK-759e checkPayslipResendRateLimit', () => {
  beforeEach(() => mockedQuery.mockReset())

  it('allows when no prior manual_resend exists in window', async () => {
    mockedQuery.mockResolvedValueOnce([{ last_resend_at: null }])

    const result = await checkPayslipResendRateLimit({ memberId: 'm-1', entryId: 'e-1' })

    expect(result.allowed).toBe(true)
    expect(result.retryAfterSeconds).toBeNull()
    expect(result.lastResendAt).toBeNull()
  })

  it('blocks when prior resend within window and returns retryAfter seconds', async () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    mockedQuery.mockResolvedValueOnce([{ last_resend_at: tenMinutesAgo }])

    const result = await checkPayslipResendRateLimit({ memberId: 'm-1', entryId: 'e-1' })

    expect(result.allowed).toBe(false)
    expect(result.lastResendAt).toBe(tenMinutesAgo)
    // 60 min default - 10 min elapsed = ~50 min remaining = 3000s give-or-take
    expect(result.retryAfterSeconds).toBeGreaterThan(2900)
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(3000)
  })

  it('respects custom windowMinutes', async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    mockedQuery.mockResolvedValueOnce([{ last_resend_at: fiveMinutesAgo }])

    const result = await checkPayslipResendRateLimit({ memberId: 'm-1', entryId: 'e-1', windowMinutes: 10 })

    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBeGreaterThan(280)
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(300)
  })

  it('passes correct query parameters: entryId, memberId, windowMinutes', async () => {
    mockedQuery.mockResolvedValueOnce([{ last_resend_at: null }])

    await checkPayslipResendRateLimit({ memberId: 'm-1', entryId: 'e-1', windowMinutes: 30 })

    expect(mockedQuery).toHaveBeenCalledTimes(1)

    const params = mockedQuery.mock.calls[0][1] as unknown[]

    expect(params).toEqual(['e-1', 'm-1', '30'])
  })
})
