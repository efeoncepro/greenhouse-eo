/**
 * TASK-1310 follow-up — reabrir la ventana expand/contract del cutover `seo_v1 → seo_v2`.
 *
 * Contexto: la migración `20260808131441444_task-1310-seo-client-view-codes.sql` hace expand
 * (crea `seo_v2` + asigna) Y contract (supersede `seo_v1`) en el MISMO paso. El contract llegó
 * antes de que todos los runtimes tuvieran el dual-read `SEO_MODULE_KEYS_READ`: Vercel producción
 * corre `main`, que todavía pide `seo_v1` literal, así que Grupo Berel y Efeonce pasaron a
 * `hasModule=false` y el lane ecosystem devolvió 404.
 *
 * Este script reabre la ventana: devuelve `effective_to = NULL` a los assignments `seo_v1`
 * superseded por esa migración, dejando AMBAS claves vigentes. El resolver hace
 * `ORDER BY created_at DESC LIMIT 1`, así que no hay doble conteo de cuota: el runtime con
 * dual-read toma `seo_v2` (más nuevo) y el runtime viejo toma `seo_v1`.
 *
 * El contract real (superseder `seo_v1`) se ejecuta en su propia migración, DESPUÉS de que
 * `main` tenga el dual-read desplegado.
 *
 * Uso (proxy en 127.0.0.1:15432):
 *   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-seo-module-reexpand.ts
 *
 * Idempotente: si no hay nada superseded, reporta 0 y no escribe.
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

type AssignmentRow = {
  assignment_id: string
  module_key: string
  organization_id: string
  status: string
  effective_to: string | null
}

const main = async () => {
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  const before = await runGreenhousePostgresQuery<AssignmentRow>(
    `SELECT assignment_id, module_key, organization_id, status, effective_to
       FROM greenhouse_client_portal.module_assignments
      WHERE module_key LIKE 'seo_v%'
      ORDER BY module_key, organization_id`
  )

  console.log('ANTES:')

  for (const row of before) {
    console.log(`  ${row.module_key} · ${row.organization_id} · ${row.status} · effective_to=${row.effective_to ?? 'NULL'}`)
  }

  const reopened = await runGreenhousePostgresQuery<{ assignment_id: string; organization_id: string }>(
    `UPDATE greenhouse_client_portal.module_assignments
        SET effective_to = NULL,
            updated_at = NOW()
      WHERE module_key = 'seo_v1'
        AND status IN ('active', 'pilot')
        AND effective_to IS NOT NULL
      RETURNING assignment_id, organization_id`
  )

  console.log(`\nREABIERTOS: ${reopened.length}`)
  for (const row of reopened) console.log(`  ${row.organization_id}`)

  const after = await runGreenhousePostgresQuery<AssignmentRow>(
    `SELECT module_key, organization_id, status, effective_to
       FROM greenhouse_client_portal.module_assignments
      WHERE module_key LIKE 'seo_v%' AND effective_to IS NULL AND status IN ('active', 'pilot')
      ORDER BY module_key, organization_id`
  )

  console.log('\nVIGENTES DESPUÉS:')
  for (const row of after) console.log(`  ${row.module_key} · ${row.organization_id} · ${row.status}`)

  const byKey = new Map<string, number>()

  for (const row of after) byKey.set(row.module_key, (byKey.get(row.module_key) ?? 0) + 1)

  const v1 = byKey.get('seo_v1') ?? 0
  const v2 = byKey.get('seo_v2') ?? 0

  if (v1 !== v2) {
    throw new Error(`ventana asimétrica: seo_v1=${v1} vigentes vs seo_v2=${v2}. Ambas claves deben cubrir las mismas orgs durante el expand.`)
  }

  console.log(`\n✓ ventana expand abierta y simétrica: ${v1} orgs en seo_v1 y ${v2} en seo_v2.`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
