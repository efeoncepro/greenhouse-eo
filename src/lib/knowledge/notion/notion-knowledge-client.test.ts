import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { NotionKnowledgeClient } = await import('./notion-knowledge-client')

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: async () => body
  }) as unknown as Response

describe('NotionKnowledgeClient', () => {
  it('isConfigured reflects token presence', async () => {
    expect(await new NotionKnowledgeClient({ tokenOverride: null }).isConfigured()).toBe(false)
    expect(await new NotionKnowledgeClient({ tokenOverride: 'tok' }).isConfigured()).toBe(true)
  })

  it('paginates children and filters in_trash blocks', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url)

      if (u.includes('start_cursor=CUR2')) {
        return jsonResponse({
          results: [{ id: 'b3', type: 'paragraph', has_children: false }],
          has_more: false,
          next_cursor: null
        })
      }

      return jsonResponse({
        results: [
          { id: 'b1', type: 'paragraph', has_children: false },
          { id: 'trash', type: 'paragraph', has_children: false, in_trash: true }
        ],
        has_more: true,
        next_cursor: 'CUR2'
      })
    })

    const client = new NotionKnowledgeClient({ fetchImpl: fetchImpl as never, tokenOverride: 'tok' })
    const tree = await client.fetchBlockTree('page-1')

    // trash filtrado + segunda página incluida
    expect(tree.map(b => b.id)).toEqual(['b1', 'b3'])
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('recurses into has_children blocks', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url)

      if (u.includes('/blocks/parent/children')) {
        return jsonResponse({
          results: [{ id: 'child1', type: 'bulleted_list_item', has_children: true }],
          has_more: false,
          next_cursor: null
        })
      }

      if (u.includes('/blocks/child1/children')) {
        return jsonResponse({
          results: [{ id: 'grandchild', type: 'paragraph', has_children: false }],
          has_more: false,
          next_cursor: null
        })
      }

      return jsonResponse({ results: [], has_more: false, next_cursor: null })
    })

    const client = new NotionKnowledgeClient({ fetchImpl: fetchImpl as never, tokenOverride: 'tok' })
    const tree = await client.fetchBlockTree('parent')

    expect(tree[0].children?.[0]?.id).toBe('grandchild')
  })

  it('throws a sanitized error on auth rejection (never leaks the token)', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 401))
    const client = new NotionKnowledgeClient({ fetchImpl: fetchImpl as never, tokenOverride: 'secret-token' })

    await expect(client.fetchBlockTree('p')).rejects.toThrow(/token de knowledge \(auth\)/)
  })

  it('reads page provenance (created/edited/url) + parent data_source + in_trash', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        url: 'https://notion.so/p',
        created_time: '2026-01-01T00:00:00.000Z',
        last_edited_time: '2026-02-01T00:00:00.000Z',
        in_trash: true,
        parent: { type: 'data_source_id', data_source_id: 'ds-77' },
        properties: { Name: { type: 'title', title: [{ plain_text: 'Mi artículo' }] } }
      })
    )

    const client = new NotionKnowledgeClient({ fetchImpl: fetchImpl as never, tokenOverride: 'tok' })
    const provenance = await client.fetchPageProvenance('p')

    expect(provenance).toEqual({
      pageId: 'p',
      title: 'Mi artículo',
      url: 'https://notion.so/p',
      createdTime: '2026-01-01T00:00:00.000Z',
      lastEditedTime: '2026-02-01T00:00:00.000Z',
      parentDataSourceId: 'ds-77',
      inTrash: true
    })
  })
})

const titleProp = (text: string) => ({ Name: { type: 'title', title: [{ plain_text: text }] } })

describe('NotionKnowledgeClient.queryDataSourcePages', () => {
  it('paginates rows, extracts titles, and filters in_trash', async () => {
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}'))

      if (body.start_cursor === 'CUR2') {
        return jsonResponse({
          results: [{ id: 'r3', properties: titleProp('Tercero') }],
          has_more: false,
          next_cursor: null
        })
      }

      return jsonResponse({
        results: [
          { id: 'r1', properties: titleProp('Primero'), url: 'https://notion.so/r1' },
          { id: 'trash', properties: titleProp('Borrado'), in_trash: true }
        ],
        has_more: true,
        next_cursor: 'CUR2'
      })
    })

    const client = new NotionKnowledgeClient({ fetchImpl: fetchImpl as never, tokenOverride: 'tok' })
    const result = await client.queryDataSourcePages('ds-1')

    expect(result.hitResultLimit).toBe(false)
    expect(result.rows.map(r => r.pageId)).toEqual(['r1', 'r3']) // trash filtrado, paginado
    expect(result.rows[0].title).toBe('Primero')
    expect(result.rows[0].url).toBe('https://notion.so/r1')
    // POST al endpoint canónico de data_sources (no /databases/)
    expect(String(fetchImpl.mock.calls[0][0])).toContain('/data_sources/ds-1/query')
  })

  it('detects the 10k result cap (request_status.incomplete) and stops', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        results: [{ id: 'r1', properties: titleProp('Uno') }],
        has_more: true,
        next_cursor: 'NEXT',
        request_status: { type: 'incomplete' }
      })
    )

    const client = new NotionKnowledgeClient({ fetchImpl: fetchImpl as never, tokenOverride: 'tok' })
    const result = await client.queryDataSourcePages('ds-1')

    expect(result.hitResultLimit).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(1) // no siguió paginando pese a has_more
  })
})
