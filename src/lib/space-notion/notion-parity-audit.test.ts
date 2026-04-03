import { describe, expect, it } from 'vitest'

type NotionParityRow = {
  task_source_id: string
  space_id: string
  task_name: string
  task_status: string
  due_date: string | null
  assignee_source_id: string | null
  tarea_principal_ids: string[]
  subtareas_ids: string[]
  _synced_at: string
  synced_at?: string | null
}

type AuditBucketEntry = {
  task_source_id: string
  space_id: string
  task_name: string
  raw_synced_at: string
  conformed_synced_at: string | null
  mutations: Array<'task_status' | 'due_date' | 'assignee_source_id'>
}

type NotionParityAuditResult = {
  missing_in_conformed: AuditBucketEntry[]
  status_mismatch: AuditBucketEntry[]
  due_date_mismatch: AuditBucketEntry[]
  assignee_mismatch: AuditBucketEntry[]
  multiple_mutations: AuditBucketEntry[]
  fresh_raw_after_conformed_sync: AuditBucketEntry[]
  hierarchy_gap_candidate: AuditBucketEntry[]
}

type NotionParityAuditInput = {
  rawRows: NotionParityRow[]
  conformedRows: NotionParityRow[]
  conformedSyncedAt: string | null
}

const createRow = (overrides: Partial<NotionParityRow>): NotionParityRow => ({
  task_source_id: 'task-1',
  space_id: 'space-1',
  task_name: 'Task',
  task_status: 'Sin empezar',
  due_date: '2026-04-07',
  assignee_source_id: 'member-1',
  tarea_principal_ids: [],
  subtareas_ids: [],
  _synced_at: '2026-04-03T06:00:00.000Z',
  synced_at: '2026-04-03T03:45:00.000Z',
  ...overrides
})

const hasHierarchy = (row: NotionParityRow) =>
  row.tarea_principal_ids.length > 0 || row.subtareas_ids.length > 0

const classifyNotionParityAudit = ({
  rawRows,
  conformedRows,
  conformedSyncedAt
}: NotionParityAuditInput): NotionParityAuditResult => {
  const conformedByTaskId = new Map(conformedRows.map(row => [row.task_source_id, row]))

  const result: NotionParityAuditResult = {
    missing_in_conformed: [],
    status_mismatch: [],
    due_date_mismatch: [],
    assignee_mismatch: [],
    multiple_mutations: [],
    fresh_raw_after_conformed_sync: [],
    hierarchy_gap_candidate: []
  }

  for (const rawRow of rawRows) {
    const conformedRow = conformedByTaskId.get(rawRow.task_source_id) ?? null
    const mutations: AuditBucketEntry['mutations'] = []

    const entry: AuditBucketEntry = {
      task_source_id: rawRow.task_source_id,
      space_id: rawRow.space_id,
      task_name: rawRow.task_name,
      raw_synced_at: rawRow._synced_at,
      conformed_synced_at: conformedRow?.synced_at ?? null,
      mutations
    }

    if (!conformedRow) {
      result.missing_in_conformed.push(entry)

      if (conformedSyncedAt && rawRow._synced_at > conformedSyncedAt) {
        result.fresh_raw_after_conformed_sync.push(entry)
      }

      if (hasHierarchy(rawRow)) {
        result.hierarchy_gap_candidate.push(entry)
      }

      continue
    }

    if (rawRow._synced_at > (conformedRow.synced_at ?? conformedSyncedAt ?? '')) {
      result.fresh_raw_after_conformed_sync.push(entry)
    }

    if (rawRow.task_status !== conformedRow.task_status) {
      mutations.push('task_status')
      result.status_mismatch.push(entry)
    }

    if (rawRow.due_date !== conformedRow.due_date) {
      mutations.push('due_date')
      result.due_date_mismatch.push(entry)
    }

    if (rawRow.assignee_source_id !== conformedRow.assignee_source_id) {
      mutations.push('assignee_source_id')
      result.assignee_mismatch.push(entry)
    }

    if (mutations.length > 1) {
      result.multiple_mutations.push(entry)
    }

    if (hasHierarchy(rawRow) && !hasHierarchy(conformedRow)) {
      result.hierarchy_gap_candidate.push(entry)
    }
  }

  return result
}

describe('notion parity audit helper contract', () => {
  it('marks missing rows, fresher raw evidence and hierarchy gaps together', () => {
    const rawRow = createRow({
      task_source_id: 'task-missing',
      task_name: 'Prom perú (4)',
      _synced_at: '2026-04-03T06:01:53.473Z',
      tarea_principal_ids: ['parent-1'],
      subtareas_ids: ['child-1']
    })

    const result = classifyNotionParityAudit({
      rawRows: [rawRow],
      conformedRows: [],
      conformedSyncedAt: '2026-04-03T03:45:21.802Z'
    })

    expect(result.missing_in_conformed).toHaveLength(1)
    expect(result.fresh_raw_after_conformed_sync).toHaveLength(1)
    expect(result.hierarchy_gap_candidate).toHaveLength(1)
    expect(result.missing_in_conformed[0]).toMatchObject({
      task_source_id: 'task-missing',
      task_name: 'Prom perú (4)',
      space_id: 'space-1'
    })
  })

  it('splits single-field mutations from multi-field drift', () => {
    const statusOnly = createRow({
      task_source_id: 'task-status',
      task_name: 'Status drift',
      task_status: 'Sin empezar'
    })

    const dueOnly = createRow({
      task_source_id: 'task-due',
      task_name: 'Due drift',
      due_date: '2026-04-10'
    })

    const assigneeOnly = createRow({
      task_source_id: 'task-assignee',
      task_name: 'Assignee drift',
      assignee_source_id: 'member-2'
    })

    const multiple = createRow({
      task_source_id: 'task-multiple',
      task_name: 'Multiple drift',
      task_status: 'Aprobado',
      due_date: '2026-04-10',
      assignee_source_id: 'member-2'
    })

    const result = classifyNotionParityAudit({
      rawRows: [
        statusOnly,
        dueOnly,
        assigneeOnly,
        multiple
      ],
      conformedRows: [
        createRow({
          task_source_id: 'task-status',
          task_status: 'Aprobado'
        }),
        createRow({
          task_source_id: 'task-due',
          due_date: '2026-04-07'
        }),
        createRow({
          task_source_id: 'task-assignee',
          assignee_source_id: 'member-1'
        }),
        createRow({
          task_source_id: 'task-multiple',
          task_status: 'Sin empezar',
          due_date: '2026-04-07',
          assignee_source_id: 'member-1'
        })
      ],
      conformedSyncedAt: '2026-04-03T03:45:21.802Z'
    })

    expect(result.status_mismatch.map(row => row.task_source_id)).toEqual(['task-status', 'task-multiple'])
    expect(result.due_date_mismatch.map(row => row.task_source_id)).toEqual(['task-due', 'task-multiple'])
    expect(result.assignee_mismatch.map(row => row.task_source_id)).toEqual(['task-assignee', 'task-multiple'])
    expect(result.multiple_mutations.map(row => row.task_source_id)).toEqual(['task-multiple'])
  })

  it('keeps clean rows out of every bucket', () => {
    const cleanRow = createRow({
      task_source_id: 'task-clean',
      task_name: 'Stable task',
      _synced_at: '2026-04-03T03:30:00.000Z',
      synced_at: '2026-04-03T03:45:21.802Z'
    })

    const result = classifyNotionParityAudit({
      rawRows: [cleanRow],
      conformedRows: [cleanRow],
      conformedSyncedAt: '2026-04-03T03:45:21.802Z'
    })

    expect(result.missing_in_conformed).toHaveLength(0)
    expect(result.status_mismatch).toHaveLength(0)
    expect(result.due_date_mismatch).toHaveLength(0)
    expect(result.assignee_mismatch).toHaveLength(0)
    expect(result.multiple_mutations).toHaveLength(0)
    expect(result.fresh_raw_after_conformed_sync).toHaveLength(0)
    expect(result.hierarchy_gap_candidate).toHaveLength(0)
  })
})
