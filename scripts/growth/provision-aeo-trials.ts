import 'server-only'

/**
 * TASK-1277 Slice 4 — Provisión idempotente del tier TRIAL de AEO a client orgs existentes.
 *
 * AEO es entitlement per-org (módulo `ai_visibility_v1`). Grupo Berel ya quedó `active`
 * (contratado) en la migración de Slice 1. Este script asigna el tier TRIAL (PLG) a las
 * client orgs activas que NO tengan ya una asignación AEO, excluyendo demo/fixtures/Efeonce
 * y Berel. El run trial sigue gateado por `GROWTH_AI_VISIBILITY_TRIAL_ENABLED` (default OFF):
 * provisionar el assignment NO habilita runs hasta prender el flag tras sign-off comercial.
 *
 * DRY-RUN por defecto (no muta). `--apply` inserta los assignments (idempotente: NOT EXISTS).
 *
 * Uso:
 *   set -a && source .env.local && set +a
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/provision-aeo-trials.ts          # dry-run
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/provision-aeo-trials.ts --apply  # aplica (sign-off comercial)
 */

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const APPLY = process.argv.includes('--apply')

// Denylist de orgs que NO reciben trial automático (demo/fixtures/la propia agencia).
// Berel ya es contratado (excluido por tener assignment activo).
const NAME_DENYLIST_PATTERNS = ['demo', 'smoke', 'fixture', 'zzz', 'efeonce', 'ssilva']

interface CandidateRow extends Record<string, unknown> {
  organization_id: string
  organization_name: string
}

const isDenied = (name: string): boolean => {
  const lower = name.toLowerCase()

  return NAME_DENYLIST_PATTERNS.some(pattern => lower.includes(pattern))
}

const main = async (): Promise<void> => {
  // Client orgs activas SIN asignación AEO activa.
  const rows = await runGreenhousePostgresQuery<CandidateRow>(
    `SELECT o.organization_id, o.organization_name
       FROM greenhouse_core.organizations o
      WHERE o.organization_type = 'client'
        AND o.active = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM greenhouse_client_portal.module_assignments a
           WHERE a.organization_id = o.organization_id
             AND a.module_key = 'ai_visibility_v1'
             AND a.effective_to IS NULL
        )
      ORDER BY o.organization_name`
  )

  const candidates = rows.filter(r => !isDenied(r.organization_name))
  const skipped = rows.filter(r => isDenied(r.organization_name))

  console.log(`AEO trial provisioning — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Candidatos (client activos sin AEO, no denylist): ${candidates.length}`)
  candidates.forEach(c => console.log(`  + ${c.organization_name} (${c.organization_id})`))
  console.log(`Excluidos por denylist (demo/fixture/efeonce): ${skipped.length}`)
  skipped.forEach(c => console.log(`  - ${c.organization_name}`))

  if (!APPLY) {
    console.log('\nDRY-RUN: sin cambios. Re-correr con --apply tras sign-off comercial.')

    return
  }

  let inserted = 0

  for (const c of candidates) {
    const result = await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_client_portal.module_assignments
         (assignment_id, organization_id, module_key, status, source, source_ref_json,
          effective_from, metadata_json, created_at, updated_at)
       SELECT $1, $2, 'ai_visibility_v1', 'active', 'default_business_line',
              jsonb_build_object('task', 'TASK-1277', 'note', 'AEO trial PLG default'),
              CURRENT_DATE, jsonb_build_object('aeo_tier', 'trial'), now(), now()
       WHERE NOT EXISTS (
         SELECT 1 FROM greenhouse_client_portal.module_assignments
          WHERE organization_id = $2 AND module_key = 'ai_visibility_v1' AND effective_to IS NULL
       )
       RETURNING assignment_id`,
      [`cpma-${randomUUID()}`, c.organization_id]
    )

    if (result.length > 0) {
      inserted += 1
      console.log(`  ✓ trial provisionado: ${c.organization_name}`)
    }
  }

  console.log(`\nAPPLY completo: ${inserted} trial assignments creados.`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('FAIL:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
