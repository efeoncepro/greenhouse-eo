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

  it('marks spaces stale when core (tasks/projects) is missing or older than the boundary — sprints ya NO es un reason (TASK-1008)', () => {
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

    // space-1: tareas stale + proyectos vacío. NUNCA un reason de sprints (opcional).
    expect(result.staleSpaces[0]?.spaceId).toBe('space-1')
    expect(result.staleSpaces[0]?.reasons).toEqual(
      expect.arrayContaining([
        'sin filas en notion_ops.proyectos',
        'tareas stale (2026-04-02T23:59:59.000Z)'
      ])
    )
    expect(result.staleSpaces[0]?.reasons.some(r => r.includes('sprints'))).toBe(false)

    // space-2: sin data → tareas + proyectos requeridos; sprints NO aparece.
    expect(result.staleSpaces[1]?.spaceId).toBe('space-2')
    expect(result.staleSpaces[1]?.reasons).toEqual(
      expect.arrayContaining([
        'sin filas en notion_ops.tareas',
        'sin filas en notion_ops.proyectos'
      ])
    )
    expect(result.staleSpaces[1]?.reasons.some(r => r.includes('sprints'))).toBe(false)
  })

  it('TASK-1008: un cliente de contenido con tareas+proyectos frescos pero 0 sprints es READY', () => {
    const result = evaluateNotionRawFreshnessGate({
      spaceIds: ['space-berel'],
      boundaryStartAt: '2026-04-03T00:00:00.000Z',
      taskRows: [{ space_id: 'space-berel', row_count: 80, max_synced_at: '2026-04-03T06:01:00.000Z' }],
      projectRows: [{ space_id: 'space-berel', row_count: 4, max_synced_at: '2026-04-03T06:01:00.000Z' }],
      // sin sprints: la DB existe pero está vacía → NO bloquea
      sprintRows: []
    })

    expect(result.ready).toBe(true)
    expect(result.staleSpaces).toHaveLength(0)
  })

  it('TASK-1008: sprints OPCIONAL solo en ausencia — si el space SÍ tiene sprints pero quedaron stale, NO ready', () => {
    const result = evaluateNotionRawFreshnessGate({
      spaceIds: ['space-sky'],
      boundaryStartAt: '2026-04-03T00:00:00.000Z',
      taskRows: [{ space_id: 'space-sky', row_count: 4118, max_synced_at: '2026-04-03T06:05:00.000Z' }],
      projectRows: [{ space_id: 'space-sky', row_count: 88, max_synced_at: '2026-04-03T06:05:00.000Z' }],
      // sprints presentes pero stale (< boundary) → la dimensión existe y no refrescó → es un problema real
      sprintRows: [{ space_id: 'space-sky', row_count: 16, max_synced_at: '2026-04-02T23:00:00.000Z' }]
    })

    expect(result.ready).toBe(false)
    expect(result.staleSpaces[0]?.reasons).toEqual(
      expect.arrayContaining(['sprints stale (2026-04-02T23:00:00.000Z)'])
    )
  })
})
