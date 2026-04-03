import { describe, expect, it } from 'vitest'

import { evaluateNotionRawFreshnessGate } from '@/lib/integrations/notion-readiness'

describe('evaluateNotionRawFreshnessGate', () => {
  it('returns ready when every active space has fresh tasks and projects', () => {
    const result = evaluateNotionRawFreshnessGate({
      spaceIds: ['space-1', 'space-2'],
      boundaryStartAt: '2026-04-03T00:00:00.000Z',
      taskRows: [
        { space_id: 'space-1', row_count: 10, max_synced_at: '2026-04-03T06:01:00.000Z' },
        { space_id: 'space-2', row_count: 4, max_synced_at: '2026-04-03T06:05:00.000Z' }
      ],
      projectRows: [
        { space_id: 'space-1', row_count: 2, max_synced_at: '2026-04-03T06:01:00.000Z' },
        { space_id: 'space-2', row_count: 1, max_synced_at: '2026-04-03T06:05:00.000Z' }
      ],
      sprintRows: [
        { space_id: 'space-1', row_count: 1, max_synced_at: '2026-04-03T06:01:00.000Z' },
        { space_id: 'space-2', row_count: 1, max_synced_at: '2026-04-03T06:05:00.000Z' }
      ]
    })

    expect(result.ready).toBe(true)
    expect(result.staleSpaces).toHaveLength(0)
    expect(result.activeSpaceCount).toBe(2)
  })

  it('marks spaces stale when raw data is missing or older than the boundary', () => {
    const result = evaluateNotionRawFreshnessGate({
      spaceIds: ['space-1', 'space-2'],
      boundaryStartAt: '2026-04-03T00:00:00.000Z',
      taskRows: [
        { space_id: 'space-1', row_count: 10, max_synced_at: '2026-04-02T23:59:59.000Z' }
      ],
      projectRows: [
        { space_id: 'space-1', row_count: 0, max_synced_at: null }
      ],
      sprintRows: [
        { space_id: 'space-1', row_count: 0, max_synced_at: null }
      ]
    })

    expect(result.ready).toBe(false)
    expect(result.staleSpaces).toHaveLength(2)
    expect(result.staleSpaces[0]?.spaceId).toBe('space-1')
    expect(result.staleSpaces[0]?.reasons).toEqual(
      expect.arrayContaining([
        'sin filas en notion_ops.proyectos',
        'sin filas en notion_ops.sprints',
        'notion_ops.proyectos sin _synced_at',
        'notion_ops.sprints sin _synced_at',
        'tareas stale (2026-04-02T23:59:59.000Z)'
      ])
    )
    expect(result.staleSpaces[1]?.spaceId).toBe('space-2')
    expect(result.staleSpaces[1]?.reasons).toEqual(
      expect.arrayContaining([
        'sin filas en notion_ops.tareas',
        'sin filas en notion_ops.proyectos',
        'sin filas en notion_ops.sprints'
      ])
    )
  })
})
