import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import {
  buildRefreshQueueId,
  enqueueRefresh,
  markRefreshCompleted,
  markRefreshFailed,
  claimOrphanedRefreshItems,
  requeueRefreshItem
} from './refresh-queue'

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
    // markRefreshFailed now appends `orphanReason` (7th param, null when the
    // entity-existence guard didn't classify the row as orphan).
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining('retry_count = retry_count + 1'),
      ['queue-2', 3, 'boom', null, null, false, null]
    )
  })

  it('routes exhausted application faults to dead and infrastructure faults to failed', async () => {
    await markRefreshFailed('queue-app', 'sql bug', 3, {
      errorClass: 'application',
      errorFamily: 'application',
      isInfrastructureFault: false
    })
    await markRefreshFailed('queue-infra', 'timeout', 3, {
      errorClass: 'infra.db_connectivity',
      errorFamily: 'infrastructure',
      isInfrastructureFault: true
    })

    const lastTwoCalls = mockRunGreenhousePostgresQuery.mock.calls.slice(-2)

    // Both calls hit the same UPDATE — distinguished by the `is_infrastructure_fault` param.
    expect(lastTwoCalls[0][0]).toContain('dead_at = CASE')
    expect(lastTwoCalls[0][1][5]).toBe(false)
    expect(lastTwoCalls[1][1][5]).toBe(true)
  })

  it('requeueRefreshItem clears classification and reopens dead/failed rows', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([{ refresh_id: 'queue-3' }])

    const reopened = await requeueRefreshItem('queue-3')

    expect(reopened).toBe(true)
    expect(mockRunGreenhousePostgresQuery).toHaveBeenLastCalledWith(
      expect.stringContaining("status IN ('failed', 'dead')"),
      ['queue-3']
    )
  })

  it('requeueRefreshItem returns false when no row matched', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])

    expect(await requeueRefreshItem('queue-missing')).toBe(false)
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
