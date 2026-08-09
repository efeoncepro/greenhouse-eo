/**
 * TASK-1679 Slice 7 — Verificación de las 9 páginas guardadas del portal cliente.
 *
 * Compara, para cada organización cliente real, lo que responde el resolver canónico contra
 * lo que los **datos** dicen que debería responder. No es un snapshot de resultados
 * esperados: la expectativa se deriva en cada corrida (ver el comentario de
 * `GUARDED_PAGES`), así que el check sobrevive a cualquier assignment de módulo nuevo.
 *
 * Los tres resultados que el guard puede producir, y que antes de TASK-1679 eran
 * indistinguibles porque los tres salían como `?error=resolver_unavailable`:
 *
 *   - abre         — vista base, o módulo contratado que declara el viewCode
 *   - empty_state  — module-gated y la organización no tiene ese módulo (fail-closed correcto)
 *   - sin_org      — la sesión no tiene organización resuelta; no hay contra qué evaluar
 *                    módulos. Este script sólo recorre organizaciones resueltas, así que ese
 *                    tercer camino lo cubre la señal
 *                    `identity.client_portal.client_without_organization`.
 *
 * Usage:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/identity/client-portal-page-access-check.ts
 *
 * Exit 1 si el resolver y los datos discrepan en alguna combinación.
 */

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

import { query } from '@/lib/db'

type Expectation = 'abre' | 'empty_state'

/**
 * Las 9 rutas guardadas, con el viewCode que cada page pide hoy.
 *
 * 🔴 **El resultado esperado se DERIVA de los datos, no se hardcodea.** La primera versión
 * de este script fijaba "3 abren y 6 empty state", que era el estado del día que se
 * escribió. En el momento en que a Sky Airlines se le asignó `creative_hub_globe_v1`, el
 * gate reportó cuatro desvíos **por hacer lo correcto** — y la salida fácil habría sido
 * editar los esperados uno por uno.
 *
 * Un gate que se edita por organización no prueba que el carril funcione: prueba que la
 * primera organización sigue igual. Así que la expectativa se computa de la misma fuente
 * que el producto: una ruta abre si su viewCode es vista base **o** si algún módulo vigente
 * de esa organización lo declara. Lo que el check verifica entonces es el invariante real —
 * que el resolver coincide con los datos — y sobrevive a cualquier assignment futuro.
 */
const GUARDED_PAGES: readonly { route: string; viewCode: string }[] = [
  { route: '/notifications', viewCode: 'cliente.notificaciones' },
  { route: '/settings', viewCode: 'cliente.configuracion' },
  { route: '/updates', viewCode: 'cliente.actualizaciones' },
  { route: '/proyectos', viewCode: 'cliente.proyectos' },
  { route: '/campanas', viewCode: 'cliente.campanas' },
  { route: '/equipo', viewCode: 'cliente.equipo' },
  { route: '/reviews', viewCode: 'cliente.reviews' },
  { route: '/sprints', viewCode: 'cliente.ciclos' },
  { route: '/analytics', viewCode: 'cliente.analytics' }
]

const main = async () => {
  const { hasViewCodeAccess, isClientPortalBaseViewCode } = await import(
    '@/lib/client-portal/readers/native/module-resolver'
  )

  const organizations = await query<{ organization_id: string; organization_name: string }>(
    `
      SELECT DISTINCT s.organization_id, s.organization_name
      FROM greenhouse_serving.session_360 s
      WHERE s.tenant_type = 'client'
        AND s.active = TRUE
        AND s.organization_id IS NOT NULL
      ORDER BY s.organization_name
    `
  )

  // La expectativa sale de los datos: qué viewCodes declara algún módulo VIGENTE de cada
  // organización. Misma fuente que el producto, distinto camino de lectura (SQL directo vs
  // el resolver con su cache), así que el check sigue siendo una comparación real.
  const declaredRows = await query<{ organization_id: string; view_code: string }>(
    `
      SELECT DISTINCT a.organization_id, vc AS view_code
      FROM greenhouse_client_portal.module_assignments a
      JOIN greenhouse_client_portal.modules m
        ON m.module_key = a.module_key AND m.effective_to IS NULL
      CROSS JOIN LATERAL unnest(m.view_codes) AS vc
      WHERE a.effective_to IS NULL
        AND a.status IN ('active', 'pilot')
        AND (a.expires_at IS NULL OR a.expires_at > now())
    `
  )

  const declaredByOrg = new Map<string, Set<string>>()

  for (const row of declaredRows) {
    const current = declaredByOrg.get(row.organization_id) ?? new Set<string>()

    current.add(row.view_code)
    declaredByOrg.set(row.organization_id, current)
  }

  console.log(`[TASK-1679 Slice 7] ${organizations.length} organizaciones cliente con sesión activa\n`)

  const failures: string[] = []
  let opens = 0
  let empties = 0

  for (const org of organizations) {
    const declared = declaredByOrg.get(org.organization_id) ?? new Set<string>()

    console.log(`── ${org.organization_name} (${org.organization_id})`)

    for (const page of GUARDED_PAGES) {
      const base = isClientPortalBaseViewCode(page.viewCode)
      const expected: Expectation = base || declared.has(page.viewCode) ? 'abre' : 'empty_state'

      const allowed = await hasViewCodeAccess(org.organization_id, page.viewCode)
      const actual: Expectation = allowed ? 'abre' : 'empty_state'
      const ok = actual === expected

      if (actual === 'abre') opens++
      else empties++

      const why = base ? '[base]' : declared.has(page.viewCode) ? '[módulo contratado]' : ''

      console.log(`   ${ok ? '✓' : '✗'} ${page.route.padEnd(16)} ${actual.padEnd(12)}${why}`)

      if (!ok) {
        failures.push(
          `${org.organization_name} ${page.route}: los datos dicen ${expected}, el resolver dice ${actual}`
        )
      }
    }

    console.log('')
  }

  console.log('─'.repeat(72))

  if (failures.length > 0) {
    console.error(`❌ ${failures.length} desvío(s) entre el resolver y los datos:`)
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exit(1)
  }

  console.log(`✅ El resolver coincide con los datos en las ${organizations.length * GUARDED_PAGES.length} combinaciones.`)
  console.log(`   ${opens} abren · ${empties} muestran el empty state.`)
  console.log('   Las del empty state se abren asignando su módulo, no cambiando código.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[TASK-1679 Slice 7] falló:', error)
    process.exit(1)
  })
