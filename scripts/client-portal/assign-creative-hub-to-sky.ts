/**
 * Assignment del módulo Creative Hub Globe a Sky Airlines.
 *
 * Cierra el pendiente comercial que dejó `TASK-1679`: las páginas `/proyectos`,
 * `/campanas`, `/equipo` y `/reviews` del portal cliente están gobernadas por
 * `creative_hub_globe_v1`, y ninguna organización lo tenía asignado — así que mostraban
 * el empty state correcto y eran inalcanzables para todos.
 *
 * Decisión del operador 2026-08-09: **Creative es de Sky Airlines y de nadie más**, con el
 * bundle completo. Vale dejar explícito qué otorga, porque es más que las 4 páginas:
 *
 *   viewCodes:    cliente.pulse, cliente.proyectos, cliente.campanas,
 *                 cliente.creative_hub, cliente.equipo, cliente.reviews
 *   capabilities: client_portal.creative_hub.read, client_portal.csc_pipeline.read,
 *                 client_portal.brand_intelligence.read, client_portal.cvr.read
 *
 * Pasa por el command canónico `enableClientPortalModule` y NO por SQL: ése es el único
 * camino que hace el INSERT + audit + outbox v1 en una sola transacción, valida el
 * `applicability_scope` contra las business lines canónicas de la organización, y
 * después invalida el cache del resolver scoped al org. Un INSERT a mano deja el
 * assignment sin rastro y con el cache caliente.
 *
 * Idempotente por construcción: si el assignment ya existe activo, el command devuelve el
 * existente con `idempotent: true` sin emitir audit ni outbox duplicado.
 *
 * Usage:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/client-portal/assign-creative-hub-to-sky.ts [--apply]
 *
 * Sin `--apply` es dry-run: reporta el estado actual y lo que haría, sin escribir.
 */

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

import { query } from '@/lib/db'

const ORGANIZATION_ID = 'org-b9977f96-f7ef-4afb-bb26-7355d78c981f'
const MODULE_KEY = 'creative_hub_globe_v1'

/** Persona superadmin provisionada por migración; queda en el audit row. */
const APPROVED_BY_USER_ID = 'user-agent-e2e-001'

const REASON =
  'Sky Airlines contrato el servicio creativo; decision del operador 2026-08-09 registrada en TASK-1679. Cierra el pendiente comercial que dejaba /proyectos, /campanas, /equipo y /reviews inalcanzables para todos.'

const APPLY = process.argv.includes('--apply')

const main = async () => {
  const orgRows = await query<{ organization_name: string }>(
    `SELECT organization_name FROM greenhouse_core.organizations WHERE organization_id = $1`,
    [ORGANIZATION_ID]
  )

  if (orgRows.length === 0) throw new Error(`Organización ${ORGANIZATION_ID} no existe`)

  const before = await query<{ module_key: string; status: string }>(
    `
      SELECT module_key, status
      FROM greenhouse_client_portal.module_assignments
      WHERE organization_id = $1 AND effective_to IS NULL
      ORDER BY module_key
    `,
    [ORGANIZATION_ID]
  )

  console.log(`Organización: ${orgRows[0].organization_name} (${ORGANIZATION_ID})`)
  console.log(`Módulos vigentes ANTES: ${before.map(r => `${r.module_key}[${r.status}]`).join(', ') || '(ninguno)'}`)
  console.log(`Módulo a asignar: ${MODULE_KEY}\n`)

  if (!APPLY) {
    console.log('DRY-RUN — sin `--apply` no se escribe nada. Volvé a correr con --apply para aplicar.')

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

  const after = await query<{ module_key: string; status: string }>(
    `
      SELECT module_key, status
      FROM greenhouse_client_portal.module_assignments
      WHERE organization_id = $1 AND effective_to IS NULL
      ORDER BY module_key
    `,
    [ORGANIZATION_ID]
  )

  console.log(`Módulos vigentes DESPUÉS: ${after.map(r => `${r.module_key}[${r.status}]`).join(', ')}`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[assign-creative-hub-to-sky] falló:', error)
    process.exit(1)
  })
