import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import { buildRefreshQueueId, enqueueRefresh, markRefreshCompleted, markRefreshFailed, claimOrphanedRefreshItems } from './refresh-queue'

describe('refresh queue helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRunGreenhousePostgresQuery.mockResolvedValue([{ exists: true }])
  })

  it('builds a deterministic queue id from projection scope', () => {
    expect(buildRefreshQueueId('payroll_receipts_delivery', 'payroll_period', '2026-03'))
      .toBe('payroll_receipts_delivery:payroll_period:2026-03')
  })

  it('persists pending intents with dedup-friendly queue ids', async () => {
    await enqueueRefresh({
      projectionName: 'payroll_receipts_delivery',
      entityType: 'payroll_period',
      entityId: '2026-03',
      priority: 2,
      triggeredByEventId: 'event-123',
      maxRetries: 2
    })

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO greenhouse_sync.projection_refresh_queue'),
      [
        'payroll_receipts_delivery:payroll_period:2026-03',
        'payroll_receipts_delivery',
        'payroll_period',
        '2026-03',
        2,
        'event-123',
        2
      ]
    )
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining('created_at = CASE'),
      expect.any(Array)
    )
  })

  it('marks completed and failed queue states explicitly', async () => {
    await markRefreshCompleted('queue-1')
    await markRefreshFailed('queue-2', 'boom', 3)

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'completed'"),
      ['queue-1']
    )
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining('retry_count = retry_count + 1'),
      ['queue-2', 3, 'boom']
    )
  })

  describe('claimOrphanedRefreshItems', () => {
    it('claims orphaned pending/processing items older than stale threshold', async () => {
      mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
        {
          queueId: 'org360:organization:org-1',
          projectionName: 'organization_360',
          entityType: 'organization',
          entityId: 'org-1',
          priority: 2,
          attempts: 1
        }
      ])

      const items = await claimOrphanedRefreshItems(10, 30)

      expect(items).toHaveLength(1)
      expect(items[0]).toEqual({
        queueId: 'org360:organization:org-1',
        projectionName: 'organization_360',
        entityType: 'organization',
        entityId: 'org-1',
        priority: 2,
        attempts: 1
      })

      expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'pending'"),
        [10, 30]
      )
    })

    it('returns empty array when no orphans exist', async () => {
      mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])

      const items = await claimOrphanedRefreshItems()

      expect(items).toHaveLength(0)
    })
  })
})
