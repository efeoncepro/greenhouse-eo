import 'server-only'

import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { VIEW_REGISTRY } from '@/lib/admin/view-access-catalog'
import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1679 follow-up — viewCodes que un cliente PUEDE alcanzar y cuya página no existe.
 *
 * **Por qué es una señal y no un test.** `VIEW_REGISTRY` declara a propósito superficies
 * forward-looking: al 2026-08-09, **10 de los 25 viewCodes cliente** apuntan a rutas que no
 * están materializadas, y eso es correcto — el registry es la promesa del contrato y las
 * páginas llegan después. Un test que exija página para cada viewCode declarado sería una
 * lista de 10 exenciones que se podre.
 *
 * El riesgo no está en **declarar** la superficie: está en **asignarla**. Cuando una
 * organización recibe un módulo que declara un viewCode sin página, el menú del cliente
 * empieza a mostrar un enlace que no lleva a ninguna parte. La condición la crea un
 * assignment —un cambio de DATO— así que ningún gate de código la puede ver, y por eso
 * ningún deploy la detectó.
 *
 * Caso fuente: el 2026-08-09 se asignó `creative_hub_globe_v1` a Sky Airlines. El bundle
 * declara `cliente.creative_hub` → `/creative-hub`, esa página no existe, y sus 3 usuarios
 * activos pasaron a ver el enlace muerto. El defecto era latente desde el seed de `TASK-824`;
 * lo activó el assignment.
 *
 * **Complementa a `pnpm route-reachability-gate`, no lo duplica.** Ese gate verifica que toda
 * página bajo `(dashboard)` sea alcanzable desde la navegación — la dirección
 * página → enlace. Esta señal cubre la contraria, enlace → página, que quedaba descubierta:
 * el gate reporta "0 huérfanas" y el enlace muerto igual se renderiza.
 *
 * **Steady state: 0.** Al crearse reporta 1 (`cliente.creative_hub`), y eso es honesto: hay un
 * enlace muerto en producción. Baja a 0 cuando se materialice `/creative-hub` o cuando el
 * viewCode salga de `modules.view_codes` del bundle. Es una decisión de producto, no un fix
 * de código, y por eso la señal la nombra en vez de esconderla en un allowlist.
 *
 * **Kind**: `data_quality`. **Severidad**: 0 → `ok`; ≥1 → `warning`. Es `warning` y no `error`
 * porque el daño es de experiencia (un enlace que no lleva a nada), no de acceso ni de datos:
 * la página faltante no expone nada y el guard sigue decidiendo bien.
 *
 * **Subsystem rollup**: `identity`.
 *
 * **Acción de remediación**: por cada fila, decidir entre materializar la página o retirar el
 * viewCode de `view_codes` del módulo que lo declara. **NUNCA** resolverlo quitándole el módulo
 * a la organización: eso le saca superficies que sí funcionan.
 */
export const CLIENT_PORTAL_ASSIGNED_VIEW_WITHOUT_ROUTE_SIGNAL_ID =
  'identity.client_portal.assigned_view_without_route'

/**
 * ViewCodes alcanzables hoy: declarados por un módulo **vigente** que alguna organización
 * tiene **asignado y activo**. Un módulo deprecated o un assignment vencido no cuentan, porque
 * no producen enlace.
 */
const QUERY_SQL = `
  SELECT DISTINCT vc AS view_code, a.module_key
  FROM greenhouse_client_portal.module_assignments a
  JOIN greenhouse_client_portal.modules m
    ON m.module_key = a.module_key AND m.effective_to IS NULL
  CROSS JOIN LATERAL unnest(m.view_codes) AS vc
  WHERE a.effective_to IS NULL
    AND a.status IN ('active', 'pilot')
    AND (a.expires_at IS NULL OR a.expires_at > now())
  ORDER BY vc
`

/** Las rutas cliente viven en el route group `(dashboard)`. */
const hasMaterializedPage = (routePath: string): boolean => {
  const clean = routePath.replace(/^\//, '')

  if (!clean) return false

  // Las rutas dinámicas no se resuelven a un archivo directo; se asumen materializadas y su
  // cobertura la da el gate de alcanzabilidad.
  if (clean.includes('[') || clean.includes('?')) return true

  return ['tsx', 'ts'].some(ext =>
    existsSync(join(process.cwd(), 'src', 'app', '(dashboard)', clean, `page.${ext}`))
  )
}

const resolveSummary = (broken: string[]): string => {
  if (broken.length === 0) {
    return 'Toda vista alcanzable por una organización cliente tiene su página materializada.'
  }

  const noun = broken.length === 1 ? 'vista alcanzable' : 'vistas alcanzables'

  return `${broken.length} ${noun} sin página: ${broken.join(', ')}. El menú del cliente muestra un enlace que no lleva a ninguna parte. Materializar la página o retirar el viewCode del módulo que lo declara — NUNCA quitarle el módulo a la organización.`
}

export const getClientPortalAssignedViewWithoutRouteSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ view_code: string; module_key: string }>(QUERY_SQL)
    const routeByViewCode = new Map(VIEW_REGISTRY.map(view => [view.viewCode, view.routePath]))

    const broken = rows
      .filter(row => {
        const routePath = routeByViewCode.get(row.view_code)

        // Un viewCode sembrado que el registry TS no conoce es otro problema, y lo cubre el
        // parity test de `view-codes/parity.ts`. Acá no se cuenta para no reportar dos veces.
        if (!routePath) return false

        return !hasMaterializedPage(routePath)
      })
      .map(row => `${row.view_code} (${row.module_key} → ${routeByViewCode.get(row.view_code)})`)

    return {
      signalId: CLIENT_PORTAL_ASSIGNED_VIEW_WITHOUT_ROUTE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getClientPortalAssignedViewWithoutRouteSignal',
      label: 'Vistas cliente asignadas sin página',
      severity: broken.length === 0 ? 'ok' : 'warning',
      summary: resolveSummary(broken),
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'count',
          value: String(broken.length)
        },
        {
          kind: 'metric',
          label: 'vistas',
          value: broken.length === 0 ? 'ninguna' : broken.join(' · ')
        },
        {
          kind: 'sql',
          label: 'Query',
          value:
            "module_assignments JOIN modules (effective_to IS NULL) CROSS JOIN unnest(view_codes) WHERE status IN ('active','pilot')"
        },
        {
          kind: 'doc',
          label: 'Complementa',
          value: 'pnpm route-reachability-gate cubre página → enlace; esta señal cubre enlace → página'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_client_portal_assigned_view_without_route' }
    })

    return {
      signalId: CLIENT_PORTAL_ASSIGNED_VIEW_WITHOUT_ROUTE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getClientPortalAssignedViewWithoutRouteSignal',
      label: 'Vistas cliente asignadas sin página',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
