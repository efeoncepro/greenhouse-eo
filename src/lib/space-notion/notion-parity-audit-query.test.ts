import { beforeEach, describe, expect, it, vi } from 'vitest'

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn()
}))

vi.mock('@/lib/bigquery', () => ({
  getBigQueryClient: () => ({
    query: queryMock
  }),
  getBigQueryProjectId: () => 'test-project'
}))

describe('auditDeliveryNotionParity BigQuery params', () => {
  beforeEach(() => {
    queryMock.mockReset()
  })

  it('omits assigneeSourceId from BigQuery params when no assignee filter is requested', async () => {
    queryMock
      .mockResolvedValueOnce([[ // notion_ops column inventory
        { column_name: 'notion_page_id' },
        { column_name: 'space_id' },
        { column_name: 'nombre_de_tarea' },
        { column_name: 'created_time' },
        { column_name: '_synced_at' },
        { column_name: 'estado' },
        { column_name: 'fecha_límite' }
      ], undefined])
      .mockResolvedValueOnce([[ // conformed column inventory
        { column_name: 'task_source_id' },
        { column_name: 'space_id' },
        { column_name: 'task_name' },
        { column_name: 'task_status' },
        { column_name: 'due_date' },
        { column_name: 'assignee_source_id' },
        { column_name: 'synced_at' },
        { column_name: 'is_deleted' },
        { column_name: 'created_at' }
      ], undefined])
      .mockResolvedValueOnce([[{ synced_at: '2026-04-03T03:45:21.802Z' }], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined])

    const { auditDeliveryNotionParity } = await import('@/lib/space-notion/notion-parity-audit')

    await auditDeliveryNotionParity({
      spaceId: 'space-1',
      year: 2026,
      month: 4,
      periodField: 'due_date'
    })

    expect(queryMock).toHaveBeenCalledTimes(5)
    expect(queryMock.mock.calls[3]?.[0]?.params).toEqual({
      spaceId: 'space-1',
      startDate: '2026-04-01',
      endDate: '2026-04-30'
    })
    expect(queryMock.mock.calls[4]?.[0]?.params).toEqual({
      spaceId: 'space-1',
      startDate: '2026-04-01',
      endDate: '2026-04-30'
    })
  })
})
