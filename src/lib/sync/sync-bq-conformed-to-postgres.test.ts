import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const bigQueryQueryMock = vi.fn()
const runGreenhousePostgresQueryMock = vi.fn()
const projectNotionDeliveryToPostgresMock = vi.fn()
const reconcileNotionFreshnessToPostgresMock = vi.fn()

vi.mock('@/lib/bigquery', () => ({
  getBigQueryClient: () => ({ query: bigQueryQueryMock }),
  getBigQueryProjectId: () => 'greenhouse-test'
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runGreenhousePostgresQueryMock(...args)
}))

vi.mock('./project-notion-delivery-to-postgres', () => ({
  projectNotionDeliveryToPostgres: (...args: unknown[]) => projectNotionDeliveryToPostgresMock(...args)
}))

vi.mock('@/lib/integrations/notion-sync-freshness', () => ({
  reconcileNotionFreshnessToPostgres: (...args: unknown[]) => reconcileNotionFreshnessToPostgresMock(...args)
}))

const { syncBqConformedToPostgres } = await import('./sync-bq-conformed-to-postgres')

const zeroProjectionResult = {
  projectsWritten: 0,
  sprintsWritten: 0,
  tasksWritten: 0,
  projectsMarkedDeleted: 0,
  sprintsMarkedDeleted: 0,
  tasksMarkedDeleted: 0,
  projectsSkipped: 0,
  sprintsSkipped: 0,
  tasksSkipped: 0,
  failureSamples: []
}

beforeEach(() => {
  vi.clearAllMocks()
  // Every BQ read resolves to an empty rows array ([rows] tuple shape).
  bigQueryQueryMock.mockResolvedValue([[]])
  projectNotionDeliveryToPostgresMock.mockResolvedValue(zeroProjectionResult)
  reconcileNotionFreshnessToPostgresMock.mockResolvedValue({ candidateSpaces: 0, updatedSpaces: 0 })
  runGreenhousePostgresQueryMock.mockResolvedValue({ rows: [] })
})

const pgCalls = () => runGreenhousePostgresQueryMock.mock.calls.map(([sql]) => String(sql))

describe('syncBqConformedToPostgres — sync_run_id FK ownership (regression for tasks/projects/sprints_sync_run_id_fkey)', () => {
  it('opens its own source_sync_runs row (status running) BEFORE stamping delivery rows', async () => {
    const result = await syncBqConformedToPostgres()

    // First PG write is the INSERT into source_sync_runs as 'running'.
    const firstSql = pgCalls()[0]

    expect(firstSql).toContain('INSERT INTO greenhouse_sync.source_sync_runs')
    expect(firstSql).toContain("'running'")

    // The opened run id is self-owned (bq-pg-*) and is the SAME id stamped on
    // the delivery rows — guaranteeing the FK parent exists.
    expect(result.syncRunId).toMatch(/^bq-pg-/)
    expect(projectNotionDeliveryToPostgresMock).toHaveBeenCalledWith(
      expect.objectContaining({ syncRunId: result.syncRunId })
    )

    // Ordering: the run row is created before the children are written.
    const openOrder = runGreenhousePostgresQueryMock.mock.invocationCallOrder[0]
    const projectOrder = projectNotionDeliveryToPostgresMock.mock.invocationCallOrder[0]

    expect(openOrder).toBeLessThan(projectOrder)
  })

  it('never reuses the orchestration run id as the FK-stamped id; records it as lineage only', async () => {
    const result = await syncBqConformedToPostgres({
      parentOrchestrationRunId: 'sync-cron-orchestration-123'
    })

    // Self-owned id, NOT the orchestration id (avoids clobbering the
    // orchestration's own conformed run record via ON CONFLICT).
    expect(result.syncRunId).not.toBe('sync-cron-orchestration-123')
    expect(result.syncRunId).toMatch(/^bq-pg-/)

    // The orchestration id is preserved as lineage in the run notes.
    const [, openParams] = runGreenhousePostgresQueryMock.mock.calls[0]

    expect(JSON.stringify(openParams)).toContain('sync-cron-orchestration-123')
  })

  it('finalizes the run as succeeded on completion', async () => {
    await syncBqConformedToPostgres()

    const updateCall = runGreenhousePostgresQueryMock.mock.calls.find(([sql]) =>
      String(sql).includes('UPDATE greenhouse_sync.source_sync_runs')
    )

    expect(updateCall).toBeDefined()
    expect(updateCall?.[1]).toContain('succeeded')
  })

  it('finalizes the run as failed and rethrows when the projection write fails', async () => {
    projectNotionDeliveryToPostgresMock.mockRejectedValueOnce(new Error('boom'))

    await expect(syncBqConformedToPostgres()).rejects.toThrow('boom')

    const updateCall = runGreenhousePostgresQueryMock.mock.calls.find(([sql]) =>
      String(sql).includes('UPDATE greenhouse_sync.source_sync_runs')
    )

    expect(updateCall).toBeDefined()
    expect(updateCall?.[1]).toContain('failed')
  })

  it('aborts loud (does not stamp children) when opening the run row fails', async () => {
    // First PG call is the open INSERT — make it throw.
    runGreenhousePostgresQueryMock.mockRejectedValueOnce(new Error('pg down'))

    await expect(syncBqConformedToPostgres()).rejects.toThrow('pg down')

    // The projection must NOT run if the FK parent could not be created.
    expect(projectNotionDeliveryToPostgresMock).not.toHaveBeenCalled()
  })
})
