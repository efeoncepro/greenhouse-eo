#!/usr/bin/env tsx
/**
 * TASK-810 — read-only preflight for the engagement anti-zombie DB guard.
 *
 * Usage:
 *   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/commercial/preflight-zombie-check.ts
 *   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/commercial/preflight-zombie-check.ts --json
 */

import process from 'node:process'

import {
  applyGreenhousePostgresProfile,
  loadGreenhouseToolEnv
} from '../lib/load-greenhouse-tool-env'

export interface ZombiePreflightRow extends Record<string, unknown> {
  service_id: string
  space_id: string | null
  organization_id: string | null
  service_name: string
  engagement_kind: string
  status: string
  start_date: string | null
  days_since_start: number | string | null
}

export interface ZombiePreflightReport {
  generatedAt: string
  task: 'TASK-810'
  thresholdDays: 120
  violationCount: number
  rows: ZombiePreflightRow[]
}

export const ZOMBIE_PREFLIGHT_SQL = `
  SELECT
    s.service_id,
    s.space_id,
    s.organization_id,
    s.name AS service_name,
    s.engagement_kind,
    s.status,
    s.start_date::text AS start_date,
    (CURRENT_DATE - s.start_date::date)::int AS days_since_start
  FROM greenhouse_core.services s
  WHERE s.active = TRUE
    AND s.status = 'active'
    AND s.status != 'legacy_seed_archived'
    AND s.hubspot_sync_status IS DISTINCT FROM 'unmapped'
    AND s.engagement_kind <> 'regular'
    AND s.start_date < CURRENT_DATE - INTERVAL '120 days'
    AND NOT EXISTS (
      SELECT 1
      FROM greenhouse_commercial.engagement_outcomes o
      WHERE o.service_id = s.service_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM greenhouse_commercial.engagement_lineage l
      WHERE l.parent_service_id = s.service_id
         OR l.child_service_id = s.service_id
    )
  ORDER BY s.start_date NULLS FIRST, s.service_id
`

export const buildZombiePreflightReport = (
  rows: ZombiePreflightRow[],
  generatedAt = new Date().toISOString()
): ZombiePreflightReport => ({
  generatedAt,
  task: 'TASK-810',
  thresholdDays: 120,
  violationCount: rows.length,
  rows
})

export const formatZombiePreflightReport = (report: ZombiePreflightReport): string => {
  const lines = [
    `[TASK-810] Engagement anti-zombie preflight`,
    `generatedAt=${report.generatedAt}`,
    `thresholdDays=${report.thresholdDays}`,
    `violationCount=${report.violationCount}`
  ]

  if (report.violationCount === 0) {
    lines.push('OK: no active non-regular engagements older than 120 days without outcome or lineage.')

    return lines.join('\n')
  }

  lines.push('BLOCKED: resolve these engagements before applying or validating the guard:')

  for (const row of report.rows) {
    lines.push(
      [
        `- service_id=${row.service_id}`,
        `space_id=${row.space_id ?? 'null'}`,
        `organization_id=${row.organization_id ?? 'null'}`,
        `kind=${row.engagement_kind}`,
        `status=${row.status}`,
        `start_date=${row.start_date ?? 'null'}`,
        `days=${row.days_since_start ?? 'null'}`,
        `name="${row.service_name}"`
      ].join(' ')
    )
  }

  lines.push('Next: register an outcome in /agency/sample-sprints/[serviceId]/outcome or create valid lineage evidence.')

  return lines.join('\n')
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const { closeGreenhousePostgres, runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const rows = await runGreenhousePostgresQuery<ZombiePreflightRow>(ZOMBIE_PREFLIGHT_SQL)
  const report = buildZombiePreflightReport(rows)

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(formatZombiePreflightReport(report))
  }

  await closeGreenhousePostgres()

  if (report.violationCount > 0) {
    process.exitCode = 1
  }
}

if (process.argv[1]?.endsWith('preflight-zombie-check.ts')) {
  main().catch(error => {
    console.error('[TASK-810] preflight failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
