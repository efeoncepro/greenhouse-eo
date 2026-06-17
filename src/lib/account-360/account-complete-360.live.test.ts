import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getAccountComplete360 } from './account-complete-360'

/**
 * Account 360 facet readers — live drift regression guard.
 *
 * Root cause of the empty org-detail tabs (Team = 0, Delivery ICO/tasks = null) was a class of
 * silent SQL drift: facet sub-queries referenced columns/joins that no longer existed
 * (`projects.project_id`, `tasks.status`, `period_closure_status.period_closed`,
 * `organization_360.source_id`) and the `.catch(() => [])` wrapper turned the SQL error into an
 * indistinguishable "no rows" result. The fix hardened those readers so a real error surfaces in
 * `_meta.errors` instead of silently emptying a facet.
 *
 * This guard exercises the readers against the richest live org and asserts:
 *   1. ZERO `_meta.errors` — if a future migration drifts a referenced column, the hardened reader
 *      now throws → the resolver records it here → this test fails loud (instead of a silently
 *      blank tab shipping to production). This is the canonical guard for ISSUE-087 (the delivery
 *      facet's `rpa_median` 42703): the unified operational reader (TASK-1106) re-throws schema-drift
 *      (42703 / 42P01) so re-introducing a missing column surfaces here, not as Sentry-only noise.
 *      The same `getAccountComplete360` path backs BOTH `GET /api/organization/[id]/360?facets=delivery`
 *      and `GET /api/organizations/[id]/workspace/compact-signals`, so this one guard covers both routes.
 *   2. The Team facet returns members for an org that has active memberships (the NULL-start_date
 *      temporal fix — HubSpot contacts carry NULL start_date and must not be filtered out).
 *   3. The Delivery facet, when present, returns coherent numeric task counts AND a structurally
 *      complete ICO contract (rpaMedian / pipelineVelocity / stuckAssetPct present as number|null,
 *      never `undefined`) — the canonical task_status vocabulary + project_record_id join + the
 *      unified operational serving ⊕ ico ⊕ BigQuery reader.
 *
 * Skips automatically when no DB is connected (CI without pg:connect, lint runs). The schema/shape
 * contract is also covered structurally by the silent-catch hardening itself.
 */

const requiresLiveDb = (): boolean =>
  Boolean(
    process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME ||
      process.env.GREENHOUSE_POSTGRES_HOST
  )

describe.runIf(requiresLiveDb())('Account 360 facet readers — live drift guard', () => {
  type QueryFn = <T>(sql: string, params?: unknown[]) => Promise<T[]>

  let runQuery: QueryFn | null = null
  let richestOrgId: string | null = null
  let richestOrgMembers = 0

  beforeAll(async () => {
    const { query } = await import('@/lib/db')

    runQuery = query as QueryFn

    // Pick the org with the most active memberships AND at least one active space — the org most
    // likely to exercise every facet (team, delivery, economics, finance, crm, services).
    const rows = await runQuery<{ organization_id: string; member_count: number }>(
      `SELECT pm.organization_id, COUNT(*)::int AS member_count
       FROM greenhouse_core.person_memberships pm
       WHERE pm.active = TRUE
         AND EXISTS (
           SELECT 1 FROM greenhouse_core.spaces s
           WHERE s.organization_id = pm.organization_id AND s.active = TRUE
         )
       GROUP BY pm.organization_id
       ORDER BY member_count DESC
       LIMIT 1`
    )

    richestOrgId = rows[0]?.organization_id ?? null
    richestOrgMembers = rows[0]?.member_count ?? 0
  })

  afterAll(() => {
    runQuery = null
  })

  it('resolves every facet for the richest org with ZERO silent drift errors', async () => {
    if (!richestOrgId) {
      // No org with both active spaces and memberships in this DB — nothing to guard.
      expect(richestOrgId).toBeNull()

      return
    }

    const result = await getAccountComplete360(richestOrgId, {
      facets: ['identity', 'spaces', 'team', 'economics', 'delivery', 'finance', 'crm', 'services', 'staffAug'],
      asOf: '2026-05-31',
      cacheBypass: true,
      limit: 25,
      requesterRoleCodes: ['efeonce_admin'],
      requesterTenantType: 'efeonce_internal',
      requesterOrganizationId: null
    })

    expect(result).not.toBeNull()

    // The load-bearing assertion: a drifted column would surface here, not as a silent blank tab.
    expect(result?._meta.errors ?? []).toEqual([])

    // Team NULL-start_date temporal fix: an org with active memberships must show its members.
    expect(richestOrgMembers).toBeGreaterThan(0)
    expect(result?.team?.members.length ?? 0).toBeGreaterThan(0)

    // Delivery (when the org has spaces with delivery data) must yield coherent numeric counts.
    if (result?.delivery) {
      const counts = result.delivery.taskCounts

      expect(Number.isFinite(counts.total)).toBe(true)
      expect(Number.isFinite(counts.completed)).toBe(true)
      expect(counts.completed).toBeLessThanOrEqual(counts.total)

      // ISSUE-087 contract: the rich ICO columns the delivery facet reads (rpa_median /
      // pipeline_velocity / stuck_asset_pct) must resolve as number|null, never `undefined`. A
      // missing serving column would have surfaced as a non-empty `_meta.errors` above, but this
      // pins the shape so the parity contract can't silently drift back to a partial read.
      const ico = result.delivery.icoMetrics

      if (ico) {
        for (const value of [ico.rpaMedian, ico.pipelineVelocity, ico.stuckAssetPct]) {
          expect(value === null || Number.isFinite(value)).toBe(true)
        }
      }
    }
  })
})
