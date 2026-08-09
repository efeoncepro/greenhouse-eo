/**
 * TASK-1678 — Verificación de runtime: ejercitar la derivación del claim contra PG real
 * con las tres personas agente y comparar el resultado contra lo esperado.
 *
 * Ejercita `resolveAuthorizedViewsForUser` —la primitive real, no una réplica— con los
 * roles que cada persona tiene en `session_360`, y verifica los invariantes que
 * TASK-1678 promete:
 *
 *   1. las personas internas conservan un claim no vacío (no-regresión del portal interno);
 *   2. la persona cliente no recibe ninguna vista `cliente.*` sin fila `granted=TRUE`;
 *   3. ninguna vista cliente module-gated llega por el carril rol→vista sin grant explícito.
 *
 * Usage:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/identity/client-view-rail-persona-check.ts
 *
 * Exit 1 si algún invariante falla, para que sirva como gate y no sólo como reporte.
 */

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

import { query } from '@/lib/db'

const PERSONA_EMAILS = [
  'agent@greenhouse.efeonce.org',
  'agent-collaborator@greenhouse.efeonce.org',
  'agent-client@greenhouse.efeonce.org'
]

interface PersonaRow {
  user_id: string
  email: string
  tenant_type: 'client' | 'efeonce_internal'
  role_codes: string[] | null
  route_groups: string[] | null
  [key: string]: unknown
}

const main = async () => {
  const { resolveAuthorizedViewsForUser } = await import('@/lib/admin/view-access-store')

  const personas = await query<PersonaRow>(
    `
      SELECT user_id, email, tenant_type, role_codes, route_groups
      FROM greenhouse_serving.session_360
      WHERE email = ANY($1::text[])
      ORDER BY email
    `,
    [PERSONA_EMAILS]
  )

  const grantedByRole = await query<{ role_code: string; view_code: string }>(
    `
      SELECT role_code, view_code
      FROM greenhouse_core.role_view_assignments
      WHERE granted = TRUE
    `
  )

  const moduleGated = await query<{ view_code: string }>(
    `SELECT DISTINCT unnest(view_codes) AS view_code FROM greenhouse_client_portal.modules`
  )

  const moduleGatedSet = new Set(moduleGated.map(row => row.view_code))

  const failures: string[] = []

  if (personas.length !== PERSONA_EMAILS.length) {
    const found = new Set(personas.map(p => p.email))

    for (const email of PERSONA_EMAILS) {
      if (!found.has(email)) failures.push(`persona ausente en session_360: ${email}`)
    }
  }

  for (const persona of personas) {
    const roleCodes = persona.role_codes ?? []
    const routeGroups = persona.route_groups ?? []

    const access = await resolveAuthorizedViewsForUser({
      userId: persona.user_id,
      roleCodes,
      tenantType: persona.tenant_type,
      fallbackRouteGroups: routeGroups
    })

    const clientViews = access.authorizedViews.filter(viewCode => viewCode.startsWith('cliente.'))

    const explicitlyGranted = new Set(
      grantedByRole.filter(row => roleCodes.includes(row.role_code)).map(row => row.view_code)
    )

    console.log(`\n── ${persona.email}`)
    console.log(`   tenant=${persona.tenant_type} roles=[${roleCodes.join(', ')}]`)
    console.log(`   claim: ${access.authorizedViews.length} viewCodes (${clientViews.length} cliente.*)`)

    if (persona.tenant_type === 'efeonce_internal') {
      if (access.authorizedViews.length === 0) {
        failures.push(`${persona.email}: persona interna con claim VACÍO — regresión del portal interno`)
      } else {
        console.log('   ✓ claim interno no vacío')
      }
    }

    const unearned = clientViews.filter(viewCode => !explicitlyGranted.has(viewCode))

    if (unearned.length > 0) {
      failures.push(
        `${persona.email}: ${unearned.length} vista(s) cliente sin grant explícito → ${unearned.join(', ')}`
      )
    } else {
      console.log('   ✓ ninguna vista cliente llega sin grant explícito')
    }

    const unearnedModuleGated = unearned.filter(viewCode => moduleGatedSet.has(viewCode))

    if (unearnedModuleGated.length > 0) {
      failures.push(
        `${persona.email}: vista(s) MODULE-GATED por el carril rol→vista sin grant → ${unearnedModuleGated.join(', ')}`
      )
    }
  }

  console.log(`\n${'─'.repeat(72)}`)

  if (failures.length > 0) {
    console.error(`❌ ${failures.length} invariante(s) roto(s):`)
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exit(1)
  }

  console.log('✅ Los invariantes de TASK-1678 se sostienen para las tres personas agente.')
}

// El pool de PG mantiene el proceso vivo, así que el exit es explícito: sin él el script
// imprime su veredicto y se queda colgado, que es justo lo que un gate no puede hacer.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[TASK-1678 persona-check] falló:', error)
    process.exit(1)
  })
