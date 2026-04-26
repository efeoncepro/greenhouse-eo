import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { MISSING_TITLE_PLACEHOLDER } = await import('./sync-notion-conformed')

/**
 * Title coercion regression tests.
 *
 * The BigQuery `delivery_tasks/projects/sprints` tables enforce REQUIRED on
 * the `*_name` columns. A single null-titled raw page (typically created by
 * Nexa Insights bulk-import automations that don't always set a title) used
 * to crash the entire daily conformed sync with:
 *
 *     Conformed sync failed: Query error: Required field task_name cannot
 *     be null at [5:1]
 *
 * Resolution lives in `coerceTitle()` (private) plus the exported sentinel
 * `MISSING_TITLE_PLACEHOLDER`. This test suite freezes the contract so the
 * placeholder marker can never be silently changed (which would break the
 * dashboard's "tareas sin título" counter that greps for it).
 */

describe('MISSING_TITLE_PLACEHOLDER contract', () => {
  it('exposes a stable sentinel value the dashboard can grep for', () => {
    // If you NEED to change this value:
    //   1. Update the dashboard query that counts placeholder rows.
    //   2. Add a backfill UPDATE in a migration so existing conformed rows
    //      using the old marker switch to the new one.
    //   3. Bump the test below.
    expect(MISSING_TITLE_PLACEHOLDER).toBe('⚠️ Sin título')
  })

  it('is a non-empty string (so BQ REQUIRED columns accept it)', () => {
    expect(typeof MISSING_TITLE_PLACEHOLDER).toBe('string')
    expect(MISSING_TITLE_PLACEHOLDER.length).toBeGreaterThan(0)
    expect(MISSING_TITLE_PLACEHOLDER.trim().length).toBeGreaterThan(0)
  })

  it('contains a visible warning marker so users notice it in the UI', () => {
    expect(MISSING_TITLE_PLACEHOLDER).toMatch(/⚠️|warning|sin título|missing/i)
  })
})
