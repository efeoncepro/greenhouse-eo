import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { findOrphanDocs } = await import('./reconcile')

describe('findOrphanDocs (detección pura de huérfanos)', () => {
  const docs = [
    { documentId: 'd1', slug: 'wiki-a-1', sourcePageId: 'p1' },
    { documentId: 'd2', slug: 'wiki-a-2', sourcePageId: 'p2' },
    { documentId: 'd3', slug: 'wiki-a-3', sourcePageId: 'p3' }
  ]

  it('marca como huérfanos los docs cuya página ya no está viva', () => {
    const live = new Set(['p1', 'p3']) // p2 ya no existe en Notion
    const orphans = findOrphanDocs(docs, live)

    expect(orphans.map(o => o.sourcePageId)).toEqual(['p2'])
  })

  it('sin huérfanos cuando todas las páginas siguen vivas', () => {
    expect(findOrphanDocs(docs, new Set(['p1', 'p2', 'p3']))).toEqual([])
  })

  it('todos huérfanos cuando ninguna página está viva', () => {
    expect(findOrphanDocs(docs, new Set())).toHaveLength(3)
  })
})
