import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockBigQueryQuery = vi.fn()

vi.mock('@/lib/bigquery', () => ({
  getBigQueryProjectId: () => 'test-project',
  getBigQueryClient: () => ({
    query: (...args: unknown[]) => mockBigQueryQuery(...args)
  })
}))

import { getNotionFreshnessFromBigQuery } from '@/lib/integrations/notion-sync-freshness'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getNotionFreshnessFromBigQuery (TASK-1007 — fuente canónica notion_ops, no mirror legacy)', () => {
  it('deriva la freshness de notion_ops.raw_pages_snapshot.synced_at, NO del mirror BQ legacy', async () => {
    mockBigQueryQuery.mockResolvedValueOnce([[
      { space_id: 'spc-efeonce', last_synced_at: { value: '2026-06-04T10:48:00Z' } }
    ]])

    await getNotionFreshnessFromBigQuery()

    const sql = (mockBigQueryQuery.mock.calls[0][0] as { query: string }).query

    // fuente canónica
    expect(sql).toContain('notion_ops.raw_pages_snapshot')
    expect(sql).toContain('MAX(synced_at)')
    // NUNCA el mirror legacy (raíz del bug TASK-1004/1007)
    expect(sql).not.toContain('greenhouse.space_notion_sources')
    // el guard sync_enabled NO va aquí (no es columna en raw; lo enforce el UPDATE PG)
    expect(sql).not.toContain('sync_enabled')
  })

  it('resuelve la freshness de un cliente nuevo que NO existe en el mirror legacy (caso Berel)', async () => {
    // raw_pages_snapshot tiene a TODOS los spaces → el cliente nuevo entra solo, sin código
    mockBigQueryQuery.mockResolvedValueOnce([[
      { space_id: 'space-cli-berel', last_synced_at: { value: '2026-06-04T10:51:00Z' } }
    ]])

    const freshness = await getNotionFreshnessFromBigQuery()

    expect(freshness.get('space-cli-berel')).toBe('2026-06-04T10:51:00Z')
  })

  it('aplica el filtro por space_id cuando se pasa (reconcile con targetSpaceIds)', async () => {
    mockBigQueryQuery.mockResolvedValueOnce([[]])

    await getNotionFreshnessFromBigQuery(['space-cli-berel', 'spc-sky'])

    const sql = (mockBigQueryQuery.mock.calls[0][0] as { query: string }).query

    expect(sql).toContain("space_id IN ('space-cli-berel', 'spc-sky')")
  })

  it('ignora filas sin space_id o sin synced_at (degradación honesta)', async () => {
    mockBigQueryQuery.mockResolvedValueOnce([[
      { space_id: null, last_synced_at: { value: '2026-06-04T10:00:00Z' } },
      { space_id: 'spc-ok', last_synced_at: { value: '2026-06-04T10:48:00Z' } },
      { space_id: 'spc-null', last_synced_at: null }
    ]])

    const freshness = await getNotionFreshnessFromBigQuery()

    expect(freshness.size).toBe(1)
    expect(freshness.get('spc-ok')).toBe('2026-06-04T10:48:00Z')
  })
})
