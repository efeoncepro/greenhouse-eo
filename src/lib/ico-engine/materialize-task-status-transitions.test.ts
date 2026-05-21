import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  bqQuery: vi.fn(),
  runGreenhousePostgresQuery: vi.fn()
}))

vi.mock('@/lib/bigquery', () => ({
  getBigQueryClient: () => ({ query: mocks.bqQuery }),
  getBigQueryProjectId: () => 'efeonce-group'
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.runGreenhousePostgresQuery
}))

import { materializeTransitionsFromPg, __testing__ } from './materialize-task-status-transitions'

const { mergeTransitionRowToBq } = __testing__

beforeEach(() => {
  mocks.bqQuery.mockReset()
  mocks.runGreenhousePostgresQuery.mockReset()
  mocks.bqQuery.mockResolvedValue([[]])
})

const pgRow = {
  transition_id: 't-uuid-1',
  task_source_id: 'task-1',
  workspace_id: 'efeonce',
  from_status: 'En curso',
  to_status: 'Listo para revisión',
  transitioned_at: '2026-05-21T10:00:00.000Z',
  transitioned_by: 'user-1',
  source_event_id: 'evt-1',
  source_quality: 'canonical',
  captured_at: '2026-05-21T10:00:05.000Z',
  created_at: '2026-05-21T10:00:05.000Z'
}

describe('TASK-912 Slice 3 — materializeTransitionsFromPg', () => {
  it('por sourceEventIds: re-lee PG y MERGEa cada fila a BQ (ensureTable + merge)', async () => {
    mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([pgRow])

    const result = await materializeTransitionsFromPg({ sourceEventIds: ['evt-1'] })

    expect(result.merged).toBe(1)
    // PG re-read filtra por source_event_id = ANY
    const pgCall = mocks.runGreenhousePostgresQuery.mock.calls[0]

    expect(pgCall[0]).toContain('source_event_id = ANY')
    expect(pgCall[1][0]).toEqual(['evt-1'])
    // BQ: ensureTable (CREATE) + MERGE
    const bqQueries = mocks.bqQuery.mock.calls.map(c => c[0].query)

    expect(bqQueries.some(q => q.includes('CREATE TABLE IF NOT EXISTS'))).toBe(true)
    expect(bqQueries.some(q => q.includes('MERGE') && q.includes('transition_id'))).toBe(true)
  })

  it('por sinceTs: re-lee PG por created_at checkpoint (path backfill)', async () => {
    mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([pgRow, { ...pgRow, transition_id: 't-uuid-2', source_event_id: null }])

    const result = await materializeTransitionsFromPg({ sinceTs: '2026-05-01T00:00:00Z' })

    expect(result.merged).toBe(2)
    expect(mocks.runGreenhousePostgresQuery.mock.calls[0][0]).toContain('created_at >= $1')
  })

  it('sin sourceEventIds ni sinceTs → no-op (merged 0, sin re-read PG)', async () => {
    const result = await materializeTransitionsFromPg({})

    expect(result.merged).toBe(0)
    expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
  })

  it('MERGE usa ON transition_id + solo WHEN NOT MATCHED (append-only idempotente)', async () => {
    await mergeTransitionRowToBq({
      transition_id: 't-uuid-1',
      task_source_id: 'task-1',
      workspace_id: 'sky',
      from_status: 'Listo para revisión',
      to_status: 'Cambios solicitados',
      transitioned_at: '2026-05-21T10:00:00.000Z',
      transitioned_by: null,
      source_event_id: 'evt-9',
      source_quality: 'canonical',
      captured_at: null,
      created_at: null
    })

    const mergeQuery = mocks.bqQuery.mock.calls[0][0].query

    expect(mergeQuery).toContain('ON T.transition_id = S.transition_id')
    expect(mergeQuery).toContain('WHEN NOT MATCHED THEN INSERT')
    expect(mergeQuery).not.toContain('WHEN MATCHED')
    // captured_at null → CAST(NULL AS TIMESTAMP), no param
    expect(mergeQuery).toContain('CAST(NULL AS TIMESTAMP) AS captured_at')
    expect(mocks.bqQuery.mock.calls[0][0].params).not.toHaveProperty('captured_at')
  })

  it('límite defensivo: clamp 1..5000 (default 500)', async () => {
    mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])

    await materializeTransitionsFromPg({ sinceTs: '2026-05-01T00:00:00Z', limit: 99999 })

    expect(mocks.runGreenhousePostgresQuery.mock.calls[0][1][1]).toBe(5000)
  })
})
