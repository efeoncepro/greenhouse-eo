/**
 * TASK-997 Slice 3 — test del suggest reader de teamspaces Notion.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const notionRequestMock = vi.fn()

vi.mock('@/lib/space-notion/notion-client', () => ({
  notionRequest: (...args: unknown[]) => notionRequestMock(...args)
}))

import { listNotionTeamspaceSuggestions } from './notion-teamspace-suggestions'

beforeEach(() => {
  notionRequestMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('listNotionTeamspaceSuggestions — TASK-997 Slice 3', () => {
  it('mapea results database → {notionDatabaseId, title, parentType, url}', async () => {
    notionRequestMock.mockResolvedValueOnce({
      results: [
        {
          object: 'database',
          id: 'db-tareas',
          url: 'https://notion.so/db-tareas',
          parent: { type: 'page_id' },
          title: [{ plain_text: 'Berel · ' }, { plain_text: 'Tareas' }]
        },
        // ignora objetos que no son database
        { object: 'page', id: 'p-1', title: [{ plain_text: 'No es DB' }] }
      ]
    })

    const rows = await listNotionTeamspaceSuggestions('Berel')

    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      notionDatabaseId: 'db-tareas',
      title: 'Berel · Tareas',
      parentType: 'page_id',
      url: 'https://notion.so/db-tareas'
    })
  })

  it('POST /search con filtro object=database', async () => {
    notionRequestMock.mockResolvedValueOnce({ results: [] })
    await listNotionTeamspaceSuggestions('Sky')

    const [path, init] = notionRequestMock.mock.calls[0] as [string, { method?: string; body?: string }]

    expect(path).toBe('/search')
    expect(init.method).toBe('POST')
    expect(init.body).toContain('"value":"database"')
    expect(init.body).toContain('"query":"Sky"')
  })

  it('title cae al id cuando no hay rich_text', async () => {
    notionRequestMock.mockResolvedValueOnce({
      results: [{ object: 'database', id: 'db-x', parent: {} }]
    })

    const rows = await listNotionTeamspaceSuggestions('x')

    expect(rows[0].title).toBe('db-x')
    expect(rows[0].parentType).toBe('unknown')
  })
})
