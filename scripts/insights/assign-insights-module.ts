/**
 * Assignment del módulo `insights_v1` (Efeonce Insights, TASK-1845) a una organización.
 *
 * Pasa por el command canónico `enableClientPortalModule` y NO por SQL: es el único camino
 * que hace INSERT + audit + outbox en una sola transacción, valida el `applicability_scope`
 * contra las business lines canónicas de la organización e invalida el cache del resolver.
 * Idempotente: si el assignment ya existe activo, devuelve el existente con `idempotent: true`.
 *
 * Usage:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/insights/assign-insights-module.ts --org=org-... [--reason="..."] [--apply]
 *
 * Sin `--apply` es dry-run: reporta el estado actual y lo que haría, sin escribir.
 */

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

import { query } from '@/lib/db'

const MODULE_KEY = 'insights_v1'

/** Persona superadmin provisionada por migración; queda en el audit row. */
const APPROVED_BY_USER_ID = 'user-agent-e2e-001'

const arg = (name: string): string | undefined => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))

  return hit ? hit.slice(name.length + 3) : undefined
}

const ORGANIZATION_ID = arg('org')

const REASON =
  arg('reason') ??
  'Canary de rollout de Efeonce Insights (TASK-1845) sobre organización sintética; habilita el módulo insights_v1 para ejercitar los lanes App/Ecosystem en staging.'

const APPLY = process.argv.includes('--apply')

const listActive = (organizationId: string) =>
  query<{ module_key: string; status: string }>(
    `
      SELECT module_key, status
      FROM greenhouse_client_portal.module_assignments
      WHERE organization_id = $1 AND effective_to IS NULL
      ORDER BY module_key
    `,
    [organizationId]
  )

const main = async () => {
  if (!ORGANIZATION_ID) throw new Error('Falta --org=<organization_id>')

  const orgRows = await query<{ organization_name: string }>(
    `SELECT organization_name FROM greenhouse_core.organizations WHERE organization_id = $1`,
    [ORGANIZATION_ID]
  )

  if (orgRows.length === 0) throw new Error(`Organización ${ORGANIZATION_ID} no existe`)

  const before = await listActive(ORGANIZATION_ID)

  console.log(`Organización: ${orgRows[0].organization_name} (${ORGANIZATION_ID})`)
  console.log(`Módulos vigentes ANTES: ${before.map(r => `${r.module_key}[${r.status}]`).join(', ') || '(ninguno)'}`)
  console.log(`Módulo a asignar: ${MODULE_KEY}\n`)

  if (!APPLY) {
    console.log('DRY-RUN — sin `--apply` no se escribe nada. Vuelve a correr con --apply para aplicar.')

    return
  }

  const { enableClientPortalModule } = await import('@/lib/client-portal/commands/enable-module')

  const result = await enableClientPortalModule({
    organizationId: ORGANIZATION_ID,
    moduleKey: MODULE_KEY,
    status: 'active',
    source: 'manual_admin',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    approvedByUserId: APPROVED_BY_USER_ID,
    reason: REASON
  })

  console.log(
    `Assignment ${result.idempotent ? 'YA EXISTÍA (idempotente)' : 'CREADO'}: ${result.assignmentId} status=${result.status}`
  )

  const after = await listActive(ORGANIZATION_ID)

  console.log(`Módulos vigentes DESPUÉS: ${after.map(r => `${r.module_key}[${r.status}]`).join(', ')}`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[assign-insights-module] falló:', error)
    process.exit(1)
  })
