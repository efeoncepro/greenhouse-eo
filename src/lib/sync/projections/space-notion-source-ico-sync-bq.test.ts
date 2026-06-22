/**
 * TASK-1171 Slice 4 — reactive consumer space_notion_source_ico_sync_bq.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { spaceNotionSourceIcoSyncBqProjection } from './space-notion-source-ico-sync-bq'

const runQueryMock = vi.fn()
const bqQueryMock = vi.fn()
const captureMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args)
}))
vi.mock('@/lib/bigquery', () => ({
  getBigQueryClient: () => ({ query: (...args: unknown[]) => bqQueryMock(...args) }),
  getBigQueryProjectId: () => 'efeonce-group'
}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: (...args: unknown[]) => captureMock(...args) }))

beforeEach(() => {
  vi.clearAllMocks()
  bqQueryMock.mockResolvedValue([])
})

describe('spaceNotionSourceIcoSyncBqProjection — contrato', () => {
  it('domain=delivery, trigger=space_notion_source.ico_sync_enabled, maxRetries=3', () => {
    expect(spaceNotionSourceIcoSyncBqProjection.name).toBe('space_notion_source_ico_sync_bq')
    expect(spaceNotionSourceIcoSyncBqProjection.domain).toBe('delivery')
    expect(spaceNotionSourceIcoSyncBqProjection.triggerEvents).toEqual(['space_notion_source.ico_sync_enabled'])
    expect(spaceNotionSourceIcoSyncBqProjection.maxRetries).toBe(3)
  })
})

describe('extractScope', () => {
  it('saca source_id del payload', () => {
    expect(spaceNotionSourceIcoSyncBqProjection.extractScope({ sourceId: 'sns-1', spaceId: 'sp-1' })).toEqual({
      entityType: 'space_notion_source',
      entityId: 'sns-1'
    })
  })

  it('null cuando no hay sourceId', () => {
    expect(spaceNotionSourceIcoSyncBqProjection.extractScope({ spaceId: 'sp-1' })).toBeNull()
    expect(spaceNotionSourceIcoSyncBqProjection.extractScope({ sourceId: '  ' })).toBeNull()
  })
})

describe('refresh', () => {
  const scope = { entityType: 'space_notion_source', entityId: 'sns-1' }

  it('re-lee PG y MERGEa BQ con el sync_enabled real', async () => {
    runQueryMock.mockResolvedValueOnce([
      {
        source_id: 'sns-1',
        space_id: 'sp-1',
        client_id: 'cli-1',
        notion_db_proyectos: 'a'.repeat(32),
        notion_db_tareas: 'b'.repeat(32),
        notion_db_sprints: null,
        notion_db_revisiones: null,
        sync_enabled: true,
        created_by: 'u-1'
      }
    ])

    const result = await spaceNotionSourceIcoSyncBqProjection.refresh(scope, { sourceId: 'sns-1' })

    expect(bqQueryMock).toHaveBeenCalledTimes(1)
    const arg = bqQueryMock.mock.calls[0][0] as { params: Record<string, unknown> }

    expect(arg.params.spaceId).toBe('sp-1')
    expect(arg.params.syncEnabled).toBe(true)
    expect(result).toContain('sync_enabled=true')
  })

  it('no-op cuando el source ya no existe en PG (no MERGE, no throw)', async () => {
    runQueryMock.mockResolvedValueOnce([])

    const result = await spaceNotionSourceIcoSyncBqProjection.refresh(scope, { sourceId: 'sns-1' })

    expect(bqQueryMock).not.toHaveBeenCalled()
    expect(result).toContain('no-op')
  })

  it('throw + capture cuando el MERGE BQ falla (dispara retry/dead-letter)', async () => {
    runQueryMock.mockResolvedValueOnce([
      {
        source_id: 'sns-1',
        space_id: 'sp-1',
        client_id: 'cli-1',
        notion_db_proyectos: 'a'.repeat(32),
        notion_db_tareas: 'b'.repeat(32),
        notion_db_sprints: null,
        notion_db_revisiones: null,
        sync_enabled: true,
        created_by: 'u-1'
      }
    ])
    bqQueryMock.mockRejectedValueOnce(new Error('bq down'))

    await expect(spaceNotionSourceIcoSyncBqProjection.refresh(scope, { sourceId: 'sns-1' })).rejects.toThrow('bq down')
    expect(captureMock).toHaveBeenCalled()
  })
})
