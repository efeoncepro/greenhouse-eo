import { execSync } from 'node:child_process'

import { afterEach, describe, expect, it } from 'vitest'

import { __resetWorkItemIndexCache } from './cache'
import { getWorkItemIndex } from './reader'

/**
 * Reader integration tests: corren contra el repo real (`process.cwd()` = repo
 * root en vitest). Verifican que el índice no es cero por kind, que filtros y
 * paginación funcionan, y paridad de conteo vs filesystem (mitiga el riesgo
 * "el reader oculta trabajo" de la risk matrix).
 */

const countFiles = (glob: string): number => {
  const out = execSync(`bash -lc "ls -1 ${glob} 2>/dev/null | wc -l"`, { encoding: 'utf8' }).trim()

  return Number(out)
}

afterEach(() => {
  __resetWorkItemIndexCache()
})

describe('getWorkItemIndex — integration against real docs/**', () => {
  it('returns non-zero counts per kind and matches filesystem totals', async () => {
    const result = await getWorkItemIndex({}, { pageSize: 1 })

    expect(result.contractVersion).toBe('roadmap-work-item-index.v1')
    expect(result.facets.byKind.epic).toBeGreaterThan(0)
    expect(result.facets.byKind.task).toBeGreaterThan(0)
    expect(result.facets.byKind.mini_task).toBeGreaterThan(0)
    expect(result.facets.byKind.issue).toBeGreaterThan(0)

    // Filesystem parity (recursive .md count with the canonical prefix).
    const fsEpics = countFiles('docs/epics/*/EPIC-*.md')
    const fsTasks = countFiles('docs/tasks/*/TASK-*.md')
    const fsMini = countFiles('docs/mini-tasks/*/MINI-*.md')
    const fsIssues = countFiles('docs/issues/*/ISSUE-*.md')

    expect(result.facets.byKind.epic).toBe(fsEpics)
    expect(result.facets.byKind.task).toBe(fsTasks)
    expect(result.facets.byKind.mini_task).toBe(fsMini)
    expect(result.facets.byKind.issue).toBe(fsIssues)
  })

  it('does not break on legacy/degraded items (no throw, degraded counted)', async () => {
    const result = await getWorkItemIndex({}, { pageSize: 5 })

    expect(Array.isArray(result.items)).toBe(true)
    // Reader is tolerant: degraded items are counted, never thrown.
    expect(result.degradedItemCount).toBeGreaterThanOrEqual(0)

    // Every item has a health classification.
    for (const item of result.items) {
      expect(item.health).toBeDefined()
      expect(item.path.startsWith('/')).toBe(false) // relative, never absolute
    }
  })

  it('filters by kind', async () => {
    const result = await getWorkItemIndex({ kind: 'issue' }, { pageSize: 10 })

    expect(result.items.every(item => item.kind === 'issue')).toBe(true)
    expect(result.total).toBe(result.facets.byKind.issue)
  })

  it('filters by lifecycle', async () => {
    const result = await getWorkItemIndex({ kind: 'task', lifecycle: 'in-progress' }, { pageSize: 200 })

    expect(result.items.every(item => item.kind === 'task' && item.lifecycle === 'in-progress')).toBe(true)
  })

  it('paginates deterministically', async () => {
    const page1 = await getWorkItemIndex({ kind: 'task' }, { page: 1, pageSize: 3 })
    const page2 = await getWorkItemIndex({ kind: 'task' }, { page: 2, pageSize: 3 })

    expect(page1.items).toHaveLength(3)
    expect(page1.page).toBe(1)
    expect(page2.page).toBe(2)
    const overlap = page1.items.filter(a => page2.items.some(b => b.id === a.id))

    expect(overlap).toHaveLength(0)
  })

  it('text search narrows results', async () => {
    const result = await getWorkItemIndex({ search: 'TASK-1152' }, { pageSize: 10 })

    expect(result.total).toBeGreaterThan(0)
    expect(result.items.some(item => item.id === 'TASK-1152')).toBe(true)
  })

  it('clamps pageSize to the max', async () => {
    const result = await getWorkItemIndex({}, { pageSize: 99999 })

    expect(result.pageSize).toBeLessThanOrEqual(500)
  })
})
