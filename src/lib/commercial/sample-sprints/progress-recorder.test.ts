import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  withTransaction: vi.fn()
}))

import { query, withTransaction } from '@/lib/db'

import {
  EngagementProgressConflictError,
  EngagementProgressValidationError,
  getLatestSnapshot,
  listSnapshotsForService,
  recordProgressSnapshot
} from './progress-recorder'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>
const mockedWithTransaction = withTransaction as unknown as ReturnType<typeof vi.fn>

const eligibleService = {
  service_id: 'SVC-HS-123',
  active: true,
  status: 'active',
  hubspot_sync_status: 'synced'
}

const nonRegularService = {
  engagement_kind: 'pilot'
}

const snapshotRow = {
  snapshot_id: 'engagement-progress-snapshot-1',
  service_id: 'SVC-HS-123',
  snapshot_date: '2026-05-08',
  metrics_json: { managed_volume: 42 },
  qualitative_notes: 'Semana con buen avance.',
  recorded_by: 'user-1',
  recorded_at: '2026-05-08T12:00:00.000Z'
}

const buildClient = (responses: Array<{ rows: unknown[] }>) => {
  const queryMock = vi.fn(async () => responses.shift() ?? { rows: [] })

  return { query: queryMock }
}

describe('engagement progress recorder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedWithTransaction.mockImplementation(async (run: (client: unknown) => Promise<unknown>) => {
      return run(buildClient([]))
    })
  })

  it('records a weekly snapshot after TASK-813 eligibility and non-regular guards', async () => {
    const client = buildClient([
      { rows: [eligibleService] },
      { rows: [nonRegularService] },
      { rows: [{ snapshot_id: 'engagement-progress-snapshot-1' }] }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await expect(
      recordProgressSnapshot({
        serviceId: 'SVC-HS-123',
        snapshotDate: '2026-05-08',
        metricsJson: { managed_volume: 42 },
        qualitativeNotes: 'Semana con buen avance.',
        recordedBy: 'user-1'
      })
    ).resolves.toEqual({ snapshotId: 'engagement-progress-snapshot-1' })

    const calls = client.query.mock.calls as unknown as Array<[string, unknown[]?]>

    expect(calls[0][0]).toContain('FROM greenhouse_core.services')
    expect(calls[1][0]).toContain('SELECT engagement_kind')
    expect(calls[2][0]).toContain('INSERT INTO greenhouse_commercial.engagement_progress_snapshots')
  })

  it('rejects regular services before inserting', async () => {
    const client = buildClient([
      { rows: [eligibleService] },
      { rows: [{ engagement_kind: 'regular' }] }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await expect(
      recordProgressSnapshot({
        serviceId: 'SVC-HS-123',
        snapshotDate: '2026-05-08',
        metricsJson: { managed_volume: 42 },
        recordedBy: 'user-1'
      })
    ).rejects.toBeInstanceOf(EngagementProgressValidationError)

    expect(client.query).toHaveBeenCalledTimes(2)
  })

  it('rejects empty metrics before opening a transaction', async () => {
    await expect(
      recordProgressSnapshot({
        serviceId: 'SVC-HS-123',
        snapshotDate: '2026-05-08',
        metricsJson: {},
        recordedBy: 'user-1'
      })
    ).rejects.toBeInstanceOf(EngagementProgressValidationError)

    expect(mockedWithTransaction).not.toHaveBeenCalled()
  })

  it('maps duplicate service/date snapshots to a recoverable conflict', async () => {
    const client = buildClient([])

    client.query.mockResolvedValueOnce({ rows: [eligibleService] })
    client.query.mockResolvedValueOnce({ rows: [nonRegularService] })
    client.query.mockRejectedValueOnce(
      Object.assign(new Error('duplicate'), {
        code: '23505',
        constraint: 'engagement_progress_snapshots_service_date_unique'
      })
    )
    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await expect(
      recordProgressSnapshot({
        serviceId: 'SVC-HS-123',
        snapshotDate: '2026-05-08',
        metricsJson: { managed_volume: 42 },
        recordedBy: 'user-1'
      })
    ).rejects.toBeInstanceOf(EngagementProgressConflictError)
  })

  it('lists snapshots newest first and filters through TASK-813 eligibility', async () => {
    mockedQuery.mockResolvedValueOnce([snapshotRow])

    const snapshots = await listSnapshotsForService('SVC-HS-123')

    expect(snapshots[0]).toMatchObject({
      snapshotId: 'engagement-progress-snapshot-1',
      serviceId: 'SVC-HS-123',
      snapshotDate: '2026-05-08',
      metrics: { managed_volume: 42 }
    })

    const sql = String(mockedQuery.mock.calls[0][0])

    expect(sql).toContain("s.engagement_kind != 'regular'")
    expect(sql).toContain("s.hubspot_sync_status IS DISTINCT FROM 'unmapped'")
    expect(sql).toContain('ORDER BY ps.snapshot_date DESC')
  })

  it('gets the latest snapshot for a service', async () => {
    mockedQuery.mockResolvedValueOnce([snapshotRow])

    await expect(getLatestSnapshot('SVC-HS-123')).resolves.toMatchObject({
      snapshotId: 'engagement-progress-snapshot-1',
      snapshotDate: '2026-05-08'
    })

    expect(String(mockedQuery.mock.calls[0][0])).toContain('LIMIT 1')
  })
})
