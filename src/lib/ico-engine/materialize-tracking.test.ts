import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  query: mocks.query
}))

import {
  beginIcoMaterializationRun,
  completeIcoMaterializationRun,
  failIcoMaterializationRun,
  skipIcoMaterializationRun,
  getLastSuccessfulMaterializationAt,
  countRecentSkippedSafetyRuns
} from './materialize-tracking'

describe('beginIcoMaterializationRun', () => {
  beforeEach(() => {
    mocks.query.mockReset()
  })

  it('inserta row con status=running y devuelve materialization_id', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000123'
    const startedAt = new Date('2026-05-18T03:15:00.000Z')

    mocks.query.mockResolvedValueOnce([
      { materialization_id: fakeId, started_at: startedAt }
    ])

    const result = await beginIcoMaterializationRun({
      tableName: 'metrics_by_member',
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result.materializationId).toBe(fakeId)
    expect(result.startedAt).toEqual(startedAt)
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO greenhouse_sync.ico_materialization_runs"),
      ['metrics_by_member', 2026, 5]
    )
    expect(mocks.query.mock.calls[0][0]).toContain("status")
    expect(mocks.query.mock.calls[0][0]).toContain("'running'")
  })

  it('throws cuando INSERT no devuelve row', async () => {
    mocks.query.mockResolvedValueOnce([])

    await expect(
      beginIcoMaterializationRun({
        tableName: 'metrics_by_project',
        periodYear: 2026,
        periodMonth: 5
      })
    ).rejects.toThrow(/did not return a row/)
  })
})

describe('completeIcoMaterializationRun', () => {
  beforeEach(() => {
    mocks.query.mockReset()
    mocks.query.mockResolvedValue([])
  })

  it('patchea status=succeeded con rows_merged', async () => {
    await completeIcoMaterializationRun({
      materializationId: 'abc',
      rowsMerged: 42
    })

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("status = 'succeeded'"),
      ['abc', 42, null]
    )
    expect(mocks.query.mock.calls[0][0]).toContain('completed_at = NOW()')
  })

  it('persiste notes opcional cuando provided', async () => {
    await completeIcoMaterializationRun({
      materializationId: 'abc',
      rowsMerged: 7,
      notes: 'incremental from 2026-05-17T03:15:00Z'
    })

    expect(mocks.query.mock.calls[0][1]).toEqual([
      'abc',
      7,
      'incremental from 2026-05-17T03:15:00Z'
    ])
  })
})

describe('skipIcoMaterializationRun', () => {
  beforeEach(() => {
    mocks.query.mockReset()
  })

  it('inserta row status=skipped_safety con blocking_signals JSONB', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000456'

    mocks.query.mockResolvedValueOnce([{ materialization_id: fakeId }])

    const result = await skipIcoMaterializationRun({
      tableName: 'metrics_by_member',
      periodYear: 2026,
      periodMonth: 5,
      blockingSignals: [
        {
          signalId: 'identity.notion_bridge.coverage_drift',
          severity: 'error',
          label: 'Cobertura bridge Notion↔member',
          summary: 'Regresión sistémica del bridge: cobertura 3.7%'
        }
      ],
      reason: 'identity.notion_bridge.coverage_drift=error'
    })

    expect(result.materializationId).toBe(fakeId)
    expect(mocks.query.mock.calls[0][1]).toEqual([
      'metrics_by_member',
      2026,
      5,
      JSON.stringify([
        {
          signalId: 'identity.notion_bridge.coverage_drift',
          severity: 'error',
          label: 'Cobertura bridge Notion↔member',
          summary: 'Regresión sistémica del bridge: cobertura 3.7%'
        }
      ]),
      'identity.notion_bridge.coverage_drift=error'
    ])
    expect(mocks.query.mock.calls[0][0]).toContain("'skipped_safety'")
    expect(mocks.query.mock.calls[0][0]).toContain('completed_at')
  })

  it('throws cuando INSERT no devuelve row', async () => {
    mocks.query.mockResolvedValueOnce([])

    await expect(
      skipIcoMaterializationRun({
        tableName: 'metrics_by_member',
        periodYear: 2026,
        periodMonth: 5,
        blockingSignals: [],
        reason: 'forced'
      })
    ).rejects.toThrow(/did not return a row/)
  })
})

describe('failIcoMaterializationRun', () => {
  beforeEach(() => {
    mocks.query.mockReset()
    mocks.query.mockResolvedValue([])
  })

  it('patchea status=failed con error message en notes', async () => {
    await failIcoMaterializationRun({
      materializationId: 'abc',
      errorMessage: 'BQ MERGE source has duplicate keys'
    })

    expect(mocks.query.mock.calls[0][1]).toEqual([
      'abc',
      'BQ MERGE source has duplicate keys'
    ])
    expect(mocks.query.mock.calls[0][0]).toContain("status = 'failed'")
  })
})

describe('getLastSuccessfulMaterializationAt', () => {
  beforeEach(() => {
    mocks.query.mockReset()
  })

  it('devuelve started_at de la última corrida succeeded', async () => {
    const startedAt = new Date('2026-05-17T03:15:00.000Z')

    mocks.query.mockResolvedValueOnce([{ started_at: startedAt }])

    const result = await getLastSuccessfulMaterializationAt({
      tableName: 'metrics_by_member',
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toEqual(startedAt)
    expect(mocks.query.mock.calls[0][1]).toEqual(['metrics_by_member', 2026, 5])
    expect(mocks.query.mock.calls[0][0]).toContain("status = 'succeeded'")
    expect(mocks.query.mock.calls[0][0]).toContain('ORDER BY started_at DESC')
    expect(mocks.query.mock.calls[0][0]).toContain('LIMIT 1')
  })

  it('devuelve null cuando no hay corridas succeeded previas', async () => {
    mocks.query.mockResolvedValueOnce([])

    const result = await getLastSuccessfulMaterializationAt({
      tableName: 'metrics_by_member',
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toBeNull()
  })

  it('parsea string ISO a Date cuando PG devuelve string', async () => {
    mocks.query.mockResolvedValueOnce([{ started_at: '2026-05-17T03:15:00.000Z' }])

    const result = await getLastSuccessfulMaterializationAt({
      tableName: 'metrics_by_project',
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toEqual(new Date('2026-05-17T03:15:00.000Z'))
  })

  it('NO matchea status=skipped_safety o status=failed o status=running', async () => {
    mocks.query.mockResolvedValueOnce([])

    await getLastSuccessfulMaterializationAt({
      tableName: 'metrics_by_member',
      periodYear: 2026,
      periodMonth: 5
    })

    expect(mocks.query.mock.calls[0][0]).not.toContain('skipped_safety')
    expect(mocks.query.mock.calls[0][0]).not.toContain("'failed'")
    expect(mocks.query.mock.calls[0][0]).not.toContain("'running'")
  })
})

describe('countRecentSkippedSafetyRuns', () => {
  beforeEach(() => {
    mocks.query.mockReset()
  })

  it('cuenta filas skipped_safety en ventana 24h por default', async () => {
    mocks.query.mockResolvedValueOnce([
      {
        cnt: 3,
        oldest: '2026-05-17T20:00:00.000Z',
        newest: '2026-05-18T03:15:00.000Z'
      }
    ])

    const result = await countRecentSkippedSafetyRuns()

    expect(result.count).toBe(3)
    expect(result.oldestStartedAt).toEqual(new Date('2026-05-17T20:00:00.000Z'))
    expect(result.newestStartedAt).toEqual(new Date('2026-05-18T03:15:00.000Z'))
    expect(mocks.query.mock.calls[0][1]).toEqual([24])
    expect(mocks.query.mock.calls[0][0]).toContain("status = 'skipped_safety'")
  })

  it('respeta windowHours custom', async () => {
    mocks.query.mockResolvedValueOnce([{ cnt: 0, oldest: null, newest: null }])

    const result = await countRecentSkippedSafetyRuns(48)

    expect(result.count).toBe(0)
    expect(result.oldestStartedAt).toBeNull()
    expect(result.newestStartedAt).toBeNull()
    expect(mocks.query.mock.calls[0][1]).toEqual([48])
  })

  it('devuelve count=0 cuando query retorna row vacío', async () => {
    mocks.query.mockResolvedValueOnce([])

    const result = await countRecentSkippedSafetyRuns()

    expect(result.count).toBe(0)
    expect(result.oldestStartedAt).toBeNull()
    expect(result.newestStartedAt).toBeNull()
  })
})
