/**
 * TASK-535 Fase A — Organization Lifecycle Backfill (CLI)
 *
 * Reclassifies every row in greenhouse_core.organizations using the rules in
 * GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1 §10.1 (adapted to the real schema —
 * see the M2 migration comment for why spec fields `client_id` / `is_provider`
 * are resolved via the client_profiles bridge + hubspot_company_id join).
 *
 * Idempotent by default: only rows where `lifecycle_stage_source='bootstrap'`
 * and no history entry exists are touched. A second run is a no-op.
 *
 * Usage:
 *   npx tsx scripts/backfill-organization-lifecycle.ts           # apply
 *   npx tsx scripts/backfill-organization-lifecycle.ts --dry-run # preview
 *   npx tsx scripts/backfill-organization-lifecycle.ts --force   # re-run even
 *                                                                  # if history rows exist
 *
 * Operationally this CLI duplicates what the M2 migration already performed,
 * and exists so operators can rerun backfill against a refreshed snapshot
 * (e.g. staging bootstrap) without running a full migrate down/up.
 */

import {
  closeGreenhousePostgres,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '../src/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

type LifecycleStage =
  | 'prospect'
  | 'opportunity'
  | 'active_client'
  | 'inactive'
  | 'churned'
  | 'provider_only'
  | 'disqualified'

interface ClassificationRow extends Record<string, unknown> {
  organization_id: string
  commercial_party_id: string
  current_stage: LifecycleStage
  has_client_link: boolean
  has_active_contract: boolean
  has_recent_income: boolean
  has_history: boolean
}

const parseArgs = () => {
  const args = process.argv.slice(2)

  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force')
  }
}

const classifyStage = (row: ClassificationRow): LifecycleStage => {
  if (row.has_client_link && row.has_active_contract) return 'active_client'
  if (row.has_client_link && !row.has_recent_income) return 'inactive'
  if (row.has_client_link) return 'active_client'

  return 'prospect'
}

const run = async () => {
  const { dryRun, force } = parseArgs()

  console.log(`[backfill] mode=${dryRun ? 'dry-run' : 'apply'} force=${force}`)

  const snapshot = await runGreenhousePostgresQuery<ClassificationRow>(
    `WITH org AS (
       SELECT
         o.organization_id,
         o.commercial_party_id::text AS commercial_party_id,
         o.lifecycle_stage AS current_stage,
         EXISTS (
           SELECT 1
           FROM greenhouse_finance.client_profiles cp
           WHERE cp.organization_id = o.organization_id
         ) OR EXISTS (
           SELECT 1
           FROM greenhouse_core.clients c
           WHERE c.hubspot_company_id IS NOT NULL
             AND c.hubspot_company_id = o.hubspot_company_id
         ) AS has_client_link,
         EXISTS (
           SELECT 1
           FROM greenhouse_commercial.contracts k
           WHERE k.organization_id = o.organization_id
             AND k.status = 'active'
             AND (k.end_date IS NULL OR k.end_date > CURRENT_DATE)
         ) AS has_active_contract,
         EXISTS (
           SELECT 1
           FROM greenhouse_finance.income i
           WHERE i.organization_id = o.organization_id
             AND i.invoice_date > (CURRENT_DATE - INTERVAL '6 months')
         ) AS has_recent_income,
         EXISTS (
           SELECT 1
           FROM greenhouse_core.organization_lifecycle_history h
           WHERE h.organization_id = o.organization_id
         ) AS has_history
       FROM greenhouse_core.organizations o
       WHERE o.lifecycle_stage_source = 'bootstrap'
     )
     SELECT * FROM org
     ORDER BY organization_id`
  )

  const candidates = snapshot.filter(row => (force ? true : !row.has_history))

  const distribution = new Map<LifecycleStage, number>()

  for (const row of candidates) {
    const target = classifyStage(row)

    distribution.set(target, (distribution.get(target) ?? 0) + 1)
  }

  console.log(`[backfill] total organizations inspected: ${snapshot.length}`)
  console.log(`[backfill] candidates to (re)classify: ${candidates.length}`)

  for (const [stage, count] of distribution) {
    console.log(`  → ${stage}: ${count}`)
  }

  if (dryRun || candidates.length === 0) {
    console.log('[backfill] no writes performed.')
    
return
  }

  await withGreenhousePostgresTransaction(async txClient => {
    for (const row of candidates) {
      const target = classifyStage(row)

      await txClient.query(
        `UPDATE greenhouse_core.organizations
            SET lifecycle_stage = $2,
                lifecycle_stage_since = NOW(),
                lifecycle_stage_source = 'bootstrap',
                lifecycle_stage_by = 'system',
                updated_at = NOW()
          WHERE organization_id = $1
            AND (lifecycle_stage_source = 'bootstrap' OR $3::boolean)`,
        [row.organization_id, target, force]
      )

      if (!row.has_history || force) {
        await txClient.query(
          `INSERT INTO greenhouse_core.organization_lifecycle_history (
             organization_id, commercial_party_id, from_stage, to_stage,
             transition_source, transitioned_by, metadata
           ) VALUES ($1, $2, $3, $4, 'bootstrap', 'system', $5::jsonb)
           ON CONFLICT DO NOTHING`,
          [
            row.organization_id,
            row.commercial_party_id,
            force ? row.current_stage : null,
            target,
            JSON.stringify({ backfill_task: 'TASK-535', source: 'cli' })
          ]
        )
      }
    }
  })

  console.log(`[backfill] wrote ${candidates.length} rows.`)
}

run()
  .catch(error => {
    console.error('[backfill] failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
