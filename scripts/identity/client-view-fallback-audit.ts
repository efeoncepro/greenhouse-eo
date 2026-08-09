/**
 * TASK-1678 Slice 1 — Medir qué se apaga antes de apagarlo.
 *
 * `computeRoleCanAccessViewFallback` otorga cuando el rol no tiene fila en
 * `role_view_assignments` y su routeGroup coincide con el de la vista. Un rol
 * `client_*` y una vista `cliente.*` comparten routeGroup `client`, así que
 * TODA vista `cliente.*` sin fila explícita se auto-otorga.
 *
 * Este audit es read-only y responde una sola pregunta: si invertimos ese
 * default para el routeGroup `client`, ¿qué viewCodes pierde cada rol cliente?
 *
 * Un viewCode aparece en la lista de pérdida cuando llega SÓLO por el fallback
 * permisivo, es decir cuando no tiene fila en `role_view_assignments`.
 *
 * Usage:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/identity/client-view-fallback-audit.ts
 *
 * Salida: por rol cliente, los viewCodes que se apagarían, marcando cuáles
 * están gobernados por un módulo contratado (`greenhouse_client_portal.modules`).
 * Los module-gated son apagado intencional: su carril correcto es el resolver
 * de módulos. Los que NO son module-gated exigen decisión explícita — seed
 * `granted=TRUE` o apagado deliberado.
 */

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

import { ROLE_CODES } from '@/config/role-codes'
import { VIEW_REGISTRY } from '@/lib/admin/view-access-catalog'
import { query } from '@/lib/db'

const CLIENT_ROLE_CODES = [
  ROLE_CODES.CLIENT_EXECUTIVE,
  ROLE_CODES.CLIENT_MANAGER,
  ROLE_CODES.CLIENT_SPECIALIST
] as const

interface AssignmentRow {
  role_code: string
  view_code: string
  granted: boolean
  [key: string]: unknown
}

interface RegistryRow {
  view_code: string
  route_group: string
  [key: string]: unknown
}

interface ModuleViewCodeRow {
  view_code: string
  [key: string]: unknown
}

const main = async () => {
  console.log('[TASK-1678 Slice 1] midiendo el impacto de invertir el default del routeGroup `client`…\n')

  const [assignments, registryRows, moduleViewCodes] = await Promise.all([
    query<AssignmentRow>(
      `
        SELECT role_code, view_code, granted
        FROM greenhouse_core.role_view_assignments
        WHERE role_code = ANY($1::text[])
      `,
      [CLIENT_ROLE_CODES]
    ),
    query<RegistryRow>(
      `
        SELECT view_code, route_group
        FROM greenhouse_core.view_registry
        WHERE active = TRUE
      `
    ),
    query<ModuleViewCodeRow>(
      `
        SELECT DISTINCT unnest(view_codes) AS view_code
        FROM greenhouse_client_portal.modules
      `
    )
  ])

  // Mismo merge que `toRegistryRows`: la DB manda, y lo que falta se completa
  // desde el registry TS. Se reproduce acá para medir el claim real, no un ideal.
  const persistedCodes = new Set(registryRows.map(row => row.view_code))

  const clientViewCodes = [
    ...registryRows.filter(row => row.route_group === 'client').map(row => row.view_code),
    ...VIEW_REGISTRY.filter(view => view.routeGroup === 'client' && !persistedCodes.has(view.viewCode)).map(
      view => view.viewCode
    )
  ].sort()

  const moduleGated = new Set(moduleViewCodes.map(row => row.view_code))

  console.log(`Vistas con routeGroup \`client\`: ${clientViewCodes.length}`)
  console.log(`De ésas, gobernadas por algún módulo contratado: ${clientViewCodes.filter(code => moduleGated.has(code)).length}`)
  console.log(`Filas en role_view_assignments para roles cliente: ${assignments.length}\n`)

  const needsDecision = new Set<string>()

  for (const roleCode of CLIENT_ROLE_CODES) {
    const rowsForRole = new Map(
      assignments.filter(row => row.role_code === roleCode).map(row => [row.view_code, row.granted])
    )

    // Hoy: con fila se respeta la fila; sin fila el fallback otorga por routeGroup.
    // Después: sin fila no hay acceso.
    const currentClaim = clientViewCodes.filter(code => rowsForRole.get(code) ?? true)
    const invertedClaim = clientViewCodes.filter(code => rowsForRole.get(code) === true)
    const lost = currentClaim.filter(code => !invertedClaim.includes(code))

    console.log(`── ${roleCode}`)
    console.log(`   claim actual: ${currentClaim.length} · claim invertido: ${invertedClaim.length} · pierde: ${lost.length}`)

    if (lost.length === 0) {
      console.log('   (no pierde ninguna)\n')
      continue
    }

    for (const code of lost) {
      const gated = moduleGated.has(code)

      if (!gated) needsDecision.add(code)

      console.log(`   - ${code.padEnd(32)} ${gated ? 'module-gated → apagado intencional' : '⚠️  NO module-gated → requiere decisión'}`)
    }

    console.log('')
  }

  console.log('─'.repeat(72))

  if (needsDecision.size === 0) {
    console.log('Todas las vistas que se apagan son module-gated: su carril correcto es el resolver de módulos.')
    console.log('No hace falta seed explícito.')
  } else {
    console.log(`${needsDecision.size} viewCode(s) que se apagan y NO son module-gated — decidir seed o apagado:`)
    for (const code of [...needsDecision].sort()) console.log(`  - ${code}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[TASK-1678 Slice 1] audit falló:', error)
    process.exit(1)
  })
