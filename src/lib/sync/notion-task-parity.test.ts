import { describe, expect, it } from 'vitest'

import { validateRawToConformedTaskParity } from '@/lib/sync/notion-task-parity'

describe('validateRawToConformedTaskParity', () => {
  it('passes when transformed rows preserve counts, status, due date, assignee and hierarchy', () => {
    const result = validateRawToConformedTaskParity({
      rawRows: [
        {
          task_source_id: 'task-1',
          space_id: 'space-1',
          task_status: 'Sin empezar',
          due_date: '2026-04-10',
          assignee_source_id: 'notion-user-1',
          tarea_principal_ids: ['parent-1'],
          subtareas_ids: ['child-1']
        }
      ],
      conformedRows: [
        {
          task_source_id: 'task-1',
          space_id: 'space-1',
          task_status: 'Sin empezar',
          due_date: '2026-04-10',
          assignee_source_id: 'notion-user-1',
          tarea_principal_ids: ['parent-1'],
          subtareas_ids: ['child-1']
        }
      ]
    })

    expect(result.ok).toBe(true)
    expect(result.failingSpaces).toHaveLength(0)
  })

  it('fails when hierarchy or parity drift appears inside a space', () => {
    const result = validateRawToConformedTaskParity({
      rawRows: [
        {
          task_source_id: 'task-1',
          space_id: 'space-1',
          task_status: 'Sin empezar',
          due_date: '2026-04-10',
          assignee_source_id: 'notion-user-1',
          tarea_principal_ids: ['parent-1'],
          subtareas_ids: ['child-1']
        },
        {
          task_source_id: 'task-2',
          space_id: 'space-1',
          task_status: 'Aprobado',
          due_date: null,
          assignee_source_id: null,
          tarea_principal_ids: [],
          subtareas_ids: []
        }
      ],
      conformedRows: [
        {
          task_source_id: 'task-1',
          space_id: 'space-1',
          task_status: 'En curso',
          due_date: '2026-04-11',
          assignee_source_id: 'notion-user-1',
          tarea_principal_ids: [],
          subtareas_ids: []
        }
      ]
    })

    expect(result.ok).toBe(false)
    expect(result.failingSpaces).toHaveLength(1)
    expect(result.failingSpaces[0]).toMatchObject({
      spaceId: 'space-1',
      rawCount: 2,
      conformedCount: 1,
      missingTaskIds: 1,
      statusMismatches: 1,
      dueDateMismatches: 1,
      hierarchyCountDelta: 1,
      hierarchyContentMismatches: 1
    })
  })
})
