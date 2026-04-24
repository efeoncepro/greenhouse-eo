import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const {
  buildCoalescingTitleExpression,
  NOTION_PROJECT_TITLE_CANDIDATES,
  NOTION_TASK_TITLE_CANDIDATES,
  NOTION_SPRINT_TITLE_CANDIDATES
} = await import('./sync-notion-conformed')

describe('buildCoalescingTitleExpression', () => {
  it('returns CAST(NULL AS STRING) when no candidate column exists', () => {
    const expr = buildCoalescingTitleExpression(new Set(['irrelevant']), NOTION_PROJECT_TITLE_CANDIDATES)

    expect(expr).toBe('CAST(NULL AS STRING)')
  })

  it('returns a single NULLIF(TRIM) when only one candidate exists (Efeonce shape)', () => {
    const expr = buildCoalescingTitleExpression(
      new Set(['nombre_del_proyecto']),
      NOTION_PROJECT_TITLE_CANDIDATES
    )

    expect(expr).toBe("NULLIF(TRIM(`nombre_del_proyecto`), '')")
  })

  it('returns a single NULLIF(TRIM) when only the alternate candidate exists (Sky shape)', () => {
    const expr = buildCoalescingTitleExpression(
      new Set(['project_name']),
      NOTION_PROJECT_TITLE_CANDIDATES
    )

    expect(expr).toBe("NULLIF(TRIM(`project_name`), '')")
  })

  it('returns COALESCE preserving declared candidate order when multiple columns exist', () => {
    const expr = buildCoalescingTitleExpression(
      new Set(['nombre_del_proyecto', 'project_name']),
      NOTION_PROJECT_TITLE_CANDIDATES
    )

    expect(expr).toBe(
      "COALESCE(NULLIF(TRIM(`nombre_del_proyecto`), ''), NULLIF(TRIM(`project_name`), ''))"
    )
  })

  it('ignores columns that are not in the candidate set', () => {
    const expr = buildCoalescingTitleExpression(
      new Set(['nombre_del_proyecto', 'project_name', 'something_else']),
      NOTION_PROJECT_TITLE_CANDIDATES
    )

    expect(expr).not.toContain('something_else')
  })

  it('works for tasks candidates (Efeonce uses nombre_de_tarea, Sky nombre_de_la_tarea)', () => {
    const expr = buildCoalescingTitleExpression(
      new Set(['nombre_de_tarea', 'nombre_de_la_tarea']),
      NOTION_TASK_TITLE_CANDIDATES
    )

    expect(expr).toBe(
      "COALESCE(NULLIF(TRIM(`nombre_de_tarea`), ''), NULLIF(TRIM(`nombre_de_la_tarea`), ''))"
    )
  })

  it('works for sprints candidates', () => {
    const expr = buildCoalescingTitleExpression(
      new Set(['nombre_del_sprint']),
      NOTION_SPRINT_TITLE_CANDIDATES
    )

    expect(expr).toBe("NULLIF(TRIM(`nombre_del_sprint`), '')")
  })
})
