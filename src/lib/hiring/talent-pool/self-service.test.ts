import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()
const mockCapture = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCapture(...args)
}))

const { checkTalentPoolPublicRequestAllowed } = await import('./self-service')

describe('Talent Pool public rate guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rate-limits a missing proxy IP through a shared opaque bucket', async () => {
    mockQuery.mockResolvedValue([{ hit_count: 1 }])

    await expect(checkTalentPoolPublicRequestAllowed(null, 'read')).resolves.toBe(true)
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('talent_pool_public_rate_bucket'), [
      expect.stringMatching(/^[a-f0-9]{64}$/),
      'read',
      60
    ])
  })

  it('fails closed when the rate-limit store is unavailable', async () => {
    const error = new Error('rate store unavailable')

    mockQuery.mockRejectedValue(error)

    await expect(checkTalentPoolPublicRequestAllowed('203.0.113.8', 'write')).resolves.toBe(false)
    expect(mockCapture).toHaveBeenCalledWith(error, 'hiring', {
      tags: { source: 'talent_pool_public_rate_guard', action: 'write' }
    })
  })
})
