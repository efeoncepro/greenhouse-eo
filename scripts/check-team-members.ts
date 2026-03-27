import process from 'node:process'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)
_require('module').Module._cache[_require.resolve('server-only')] = { id: 'server-only', exports: {} }

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

const main = async () => {
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  const members = await runGreenhousePostgresQuery<{
    display_name: string
    member_id: string
    assignment_count: string
    external_count: string
    has_snapshot: string
    usage_kind: string | null
  }>(`
    SELECT
      m.display_name,
      m.member_id,
      (SELECT COUNT(*) FROM greenhouse_core.client_team_assignments a
       WHERE a.member_id = m.member_id AND a.active = TRUE
         AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)) AS assignment_count,
      (SELECT COUNT(*) FROM greenhouse_core.client_team_assignments a
       WHERE a.member_id = m.member_id AND a.active = TRUE
         AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
         AND COALESCE(NULLIF(LOWER(TRIM(a.client_id)), ''), '__missing__')
             NOT IN ('efeonce_internal', 'client_internal', 'space-efeonce')) AS external_count,
      EXISTS(SELECT 1 FROM greenhouse_serving.member_capacity_economics e
             WHERE e.member_id = m.member_id AND e.period_year = 2026 AND e.period_month = 3)::text AS has_snapshot,
      (SELECT e.usage_kind FROM greenhouse_serving.member_capacity_economics e
       WHERE e.member_id = m.member_id AND e.period_year = 2026 AND e.period_month = 3
       LIMIT 1) AS usage_kind
    FROM greenhouse_core.members m
    WHERE m.active = TRUE
    ORDER BY m.display_name
  `)

  console.log('Name'.padEnd(25), 'Assign'.padStart(6), 'External'.padStart(9), 'Snap'.padStart(5), 'UsageKind'.padStart(12), 'Visible?')

  for (const m of members) {
    const hasExternal = Number(m.external_count) > 0
    const hasSnapshot = m.has_snapshot === 'true'
    const usageNotNone = m.usage_kind && m.usage_kind !== 'none'
    const visible = hasExternal && hasSnapshot && usageNotNone

    console.log(
      m.display_name.padEnd(25),
      String(m.assignment_count).padStart(6),
      String(m.external_count).padStart(9),
      (hasSnapshot ? '✓' : '✗').padStart(5),
      (m.usage_kind || '—').padStart(12),
      visible ? '✓ YES' : '✗ NO ← filtered out'
    )
  }

  const { closeGreenhousePostgres } = await import('@/lib/postgres/client')
  await closeGreenhousePostgres()
}

main()
