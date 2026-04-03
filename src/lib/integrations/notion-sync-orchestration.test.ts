import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getDbMock } = vi.hoisted(() => ({
  getDbMock: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  getDb: getDbMock
}))

import {
  buildRetrySchedule,
  computeRetryDelayMinutes,
  recordNotionSyncCompletedSnapshots
} from '@/lib/integrations/notion-sync-orchestration'

describe('notion sync orchestration', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('builds exponential retry windows capped at 60 minutes', () => {
    expect(computeRetryDelayMinutes(0)).toBe(15)
    expect(computeRetryDelayMinutes(1)).toBe(15)
    expect(computeRetryDelayMinutes(2)).toBe(30)
    expect(computeRetryDelayMinutes(3)).toBe(60)
    expect(computeRetryDelayMinutes(5)).toBe(60)
  })

  it('returns a deterministic next retry timestamp from the provided clock', () => {
    const schedule = buildRetrySchedule({
      retryAttempt: 2,
      now: new Date('2026-04-03T06:20:00.000Z')
    })

    expect(schedule).toEqual({
      retryAttempt: 2,
      delayMinutes: 30,
      nextRetryAt: '2026-04-03T06:50:00.000Z'
    })
  })

  it('persists a completed snapshot per active space so the latest UI state reflects current success', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-03T16:30:00.000Z'))

    const executeMock = vi.fn().mockResolvedValue(undefined)
    const valuesMock = vi.fn().mockReturnValue({ execute: executeMock })
    const insertIntoMock = vi.fn().mockReturnValue({ values: valuesMock })

    getDbMock.mockResolvedValue({
      insertInto: insertIntoMock
    })

    await recordNotionSyncCompletedSnapshots({
      sourceSyncRunId: 'sync-cron-123',
      triggerSource: 'cron_primary',
      rawFreshness: {
        ready: true,
        reason: 'Raw listo',
        checkedAt: '2026-04-03T16:29:00.000Z',
        boundaryStartAt: '2026-04-03T00:00:00.000Z',
        freshestRawSyncedAt: '2026-04-03T16:28:00.000Z',
        activeSpaceCount: 2,
        staleSpaces: [],
        spaces: [
          {
            spaceId: 'spc-a',
            taskRowCount: 10,
            projectRowCount: 2,
            sprintRowCount: 1,
            maxTaskSyncedAt: '2026-04-03T16:28:00.000Z',
            maxProjectSyncedAt: '2026-04-03T16:20:00.000Z',
            maxSprintSyncedAt: '2026-04-03T16:10:00.000Z',
            ready: true,
            reasons: []
          },
          {
            spaceId: 'spc-b',
            taskRowCount: 8,
            projectRowCount: 3,
            sprintRowCount: 1,
            maxTaskSyncedAt: '2026-04-03T16:12:00.000Z',
            maxProjectSyncedAt: '2026-04-03T16:11:00.000Z',
            maxSprintSyncedAt: '2026-04-03T16:09:00.000Z',
            ready: true,
            reasons: []
          }
        ]
      },
      metadata: {
        completedBy: 'scheduled_primary'
      }
    })

    expect(insertIntoMock).toHaveBeenCalledWith('greenhouse_sync.notion_sync_orchestration_runs')
    expect(valuesMock).toHaveBeenCalledTimes(1)

    const insertedRows = valuesMock.mock.calls[0][0]

    expect(insertedRows).toHaveLength(2)
    expect(insertedRows[0]).toMatchObject({
      space_id: 'spc-a',
      source_sync_run_id: 'sync-cron-123',
      orchestration_status: 'sync_completed',
      trigger_source: 'cron_primary',
      retry_attempt: 0,
      next_retry_at: null,
      waiting_reason: null,
      latest_raw_synced_at: '2026-04-03T16:28:00.000Z',
      completed_at: '2026-04-03T16:30:00.000Z'
    })
    expect(insertedRows[1]).toMatchObject({
      space_id: 'spc-b',
      latest_raw_synced_at: '2026-04-03T16:12:00.000Z',
      orchestration_status: 'sync_completed'
    })
    expect(insertedRows[0].metadata).toMatchObject({
      boundaryStartAt: '2026-04-03T00:00:00.000Z',
      freshestRawSyncedAt: '2026-04-03T16:28:00.000Z',
      completedViaSnapshot: true,
      completedBy: 'scheduled_primary'
    })
  })
})
