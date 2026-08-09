/**
 * TASK-1679 Slice 7 — Verificación de las 9 páginas del portal cliente.
 *
 * Declara el resultado ESPERADO por ruta antes de correr, y lo compara contra lo que el
 * resolver canónico responde para cada organización real. El orden importa: si el esperado
 * se escribe después de ver el resultado, el check no prueba nada.
 *
 * Los tres resultados posibles del guard, que antes de TASK-1679 eran indistinguibles porque
 * los tres salían como `?error=resolver_unavailable`:
 *
 *   - `abre`         — vista base, o módulo contratado que la declara
 *   - `empty_state`  — module-gated y la organización no tiene ese módulo (fail-closed correcto)
 *   - `sin_org`      — la sesión no tiene organización resuelta (no hay contra qué evaluar)
 *
 * Usage:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/identity/client-portal-page-access-check.ts
 *
 * Exit 1 si algún resultado real difiere del esperado.
 */

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

import { query } from '@/lib/db'

type Expectation = 'abre' | 'empty_state'

/** Las 9 rutas guardadas, con el viewCode que cada page pide hoy. */
const GUARDED_PAGES: readonly { route: string; viewCode: string; expected: Expectation }[] = [
  // Las 3 base: abren para toda organización resuelta, sin módulo.
  { route: '/notifications', viewCode: 'cliente.notificaciones', expected: 'abre' },
  { route: '/settings', viewCode: 'cliente.configuracion', expected: 'abre' },
  { route: '/updates', viewCode: 'cliente.actualizaciones', expected: 'abre' },

  // Las 6 module-gated. Ninguna organización tiene hoy `creative_hub_globe_v1` ni
  // `equipo_asignado`, y `cliente.ciclos`/`cliente.analytics` no las declara ningún módulo,
  // así que el esperado para TODAS es el empty state. Abrirlas es asignar su módulo.
  { route: '/proyectos', viewCode: 'cliente.proyectos', expected: 'empty_state' },
  { route: '/campanas', viewCode: 'cliente.campanas', expected: 'empty_state' },
  { route: '/equipo', viewCode: 'cliente.equipo', expected: 'empty_state' },
  { route: '/reviews', viewCode: 'cliente.reviews', expected: 'empty_state' },
  { route: '/sprints', viewCode: 'cliente.ciclos', expected: 'empty_state' },
  { route: '/analytics', viewCode: 'cliente.analytics', expected: 'empty_state' }
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

  console.log(`[TASK-1679 Slice 7] ${organizations.length} organizaciones cliente con sesión activa\n`)

  const failures: string[] = []

  for (const org of organizations) {
    console.log(`── ${org.organization_name} (${org.organization_id})`)

    for (const page of GUARDED_PAGES) {
      const allowed = await hasViewCodeAccess(org.organization_id, page.viewCode)
      const actual: Expectation = allowed ? 'abre' : 'empty_state'
      const ok = actual === page.expected
      const base = isClientPortalBaseViewCode(page.viewCode) ? ' [base]' : ''

      console.log(`   ${ok ? '✓' : '✗'} ${page.route.padEnd(16)} ${actual.padEnd(12)}${base}`)

      if (!ok) {
        failures.push(`${org.organization_name} ${page.route}: esperado ${page.expected}, real ${actual}`)
      }
    }

    console.log('')
  }

  console.log('─'.repeat(72))

  if (failures.length > 0) {
    console.error(`❌ ${failures.length} resultado(s) distinto(s) del esperado:`)
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exit(1)
  }

  const opens = GUARDED_PAGES.filter(p => p.expected === 'abre').length

  console.log(`✅ Las 9 rutas se comportan como se declaró: ${opens} abren y ${9 - opens} muestran el empty state.`)
  console.log('   Las 6 del empty state se abren asignando su módulo, no cambiando código.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[TASK-1679 Slice 7] falló:', error)
    process.exit(1)
  })
