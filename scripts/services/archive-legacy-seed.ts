#!/usr/bin/env tsx
/**
 * TASK-813 Slice 2 — Archive idempotente de las 30 filas legacy seed.
 *
 * Las 30 filas en greenhouse_core.services fueron seedeadas el 2026-03-16
 * como cross-product `service_modules × clients` con `hubspot_service_id IS
 * NULL` y `hubspot_sync_status='pending'`. NO son engagements reales — son
 * placeholder cross-product que nunca se sincronizaron con HubSpot.
 *
 * Este script las marca archived (NO DELETE — audit-preserved) con:
 *   - active = FALSE
 *   - status = 'legacy_seed_archived'
 *   - engagement_kind = 'discovery' (TASK-801 column)
 *   - commitment_terms_json = { legacy_seed_origin, archived_by_task, ... }
 *
 * Idempotencia: WHERE service_id = $1 AND status != 'legacy_seed_archived'.
 * Segunda ejecución reporta 0 cambios.
 *
 * Outbox event: commercial.service_engagement.archived_legacy_seed v1
 * emitido per fila archivada.
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/services/archive-legacy-seed.ts [--dry-run] [--apply]
 *
 *   Default: --dry-run. Pasa --apply explícito para mutar.
 */

import process from 'node:process'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

interface LegacySeedRow {
  service_id: string
  name: string
  status: string
  active: boolean
  created_at: string
}

interface CliOptions {
  apply: boolean
}

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2)
  // Default seguro: dry-run. Solo --apply muta.
  const apply = args.includes('--apply')

  return { apply }
}

const SELECT_LEGACY_SEED_SQL = `
  SELECT service_id, name, status, active, created_at::text AS created_at
  FROM greenhouse_core.services
  WHERE hubspot_service_id IS NULL
    AND service_id LIKE 'svc-________-____-____-____-____________'
    AND created_at::date = '2026-03-16'
    AND status != 'legacy_seed_archived'
  ORDER BY service_id
`

const ARCHIVE_SQL = `
  UPDATE greenhouse_core.services
  SET
    active = FALSE,
    status = 'legacy_seed_archived',
    engagement_kind = 'discovery',
    commitment_terms_json = jsonb_build_object(
      'legacy_seed_origin', '2026-03-16-cross-product',
      'archived_by_task', 'TASK-813',
      'archived_at', NOW()::text,
      'rationale', 'Cross-product service_modules × clients seed sin contraparte HubSpot real'
    ),
    updated_at = NOW()
  WHERE service_id = $1
    AND status != 'legacy_seed_archived'
  RETURNING service_id
`

const main = async () => {
  const { apply } = parseArgs()

  console.log(`\n=== TASK-813 Slice 2 — archive legacy seed ${apply ? '(APPLY)' : '(DRY-RUN)'} ===\n`)

  const candidates = await runGreenhousePostgresQuery<LegacySeedRow>(SELECT_LEGACY_SEED_SQL)

  console.log(`Found ${candidates.length} legacy seed candidates.\n`)

  if (candidates.length === 0) {
    console.log('Nothing to archive — already archived or no candidates.')
    
return
  }

  for (const row of candidates) {
    console.log(`  - ${row.service_id} | ${row.name} | active=${row.active} | status=${row.status}`)
  }

  if (!apply) {
    console.log(`\n[DRY-RUN] No changes applied. Re-run with --apply to mutate.\n`)
    
return
  }

  let archived = 0
  const errors: Array<{ serviceId: string; error: string }> = []

  for (const row of candidates) {
    try {
      const result = await runGreenhousePostgresQuery<{ service_id: string }>(
        ARCHIVE_SQL,
        [row.service_id]
      )

      if (result.length === 0) {
        // Race / already archived — skip silent
        continue
      }

      await publishOutboxEvent({
        aggregateType: 'service_engagement',
        aggregateId: row.service_id,
        eventType: 'commercial.service_engagement.archived_legacy_seed',
        payload: {
          version: 1,
          serviceId: row.service_id,
          name: row.name,
          previousStatus: row.status,
          previousActive: row.active,
          archivedAt: new Date().toISOString(),
          rationale: 'TASK-813 archive script — cross-product seed without HubSpot counterpart'
        }
      })

      archived++
    } catch (error) {
      errors.push({
        serviceId: row.service_id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  console.log(`\n=== Result ===`)
  console.log(`Archived: ${archived}/${candidates.length}`)

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`)

    for (const e of errors) {
      console.log(`  - ${e.serviceId}: ${e.error}`)
    }

    process.exit(1)
  }

  console.log(`\nIdempotency check: re-run this script — should report 0 candidates.\n`)
}

main().catch(error => {
  console.error('Script failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
