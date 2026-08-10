import 'server-only'

import { resolveAuthorizedViewsForUser } from '@/lib/admin/view-access-store'
import {
  isClientPortalBaseViewCode,
  resolveClientPortalModulesForOrganization
} from '@/lib/client-portal/readers/native/module-resolver'
import { CLIENT_PORTAL_NAV_CATALOG } from '@/lib/client-portal/visibility/client-portal-nav-catalog'
import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1685 Slice 3 — Divergencia entre lo que el menú del portal cliente OFRECE y lo que la
 * puerta ABRE.
 *
 * **El invariante.** Para cada usuario cliente activo y cada superficie del catálogo de
 * navegación base, lo que el menú renderiza y lo que `requireViewCodeAccess` autoriza tienen
 * que coincidir. Un enlace que el guard niega no es un permiso de más: es una promesa rota —
 * el usuario hace clic y aterriza en `/home?denied=…`.
 *
 * **Por qué existe.** `ISSUE-148` encontró que la respuesta a *"¿esta persona puede ver esta
 * vista?"* vivía repartida: el menú aplicaba el ROL sobre su lista base y el guard aplicaba el
 * MÓDULO contratado. Nadie lo notó en meses porque ninguna de las dos mitades es observable
 * desde la otra. Medido contra PG el 2026-08-10, antes del Slice 2: **36 pares divergentes en
 * 8 de 8 usuarios cliente**, todos en la dirección "el menú promete y la puerta niega" —
 * incluidos los 3 usuarios reales de Sky Airlines, que veían "Ciclos" y "Analytics" muertos.
 *
 * ## Qué mide, y qué NO — leer antes de confiar en el cero
 *
 * La señal **no replica** la lógica de ninguno de los dos lados: invoca las primitives reales.
 * El lado puerta llama a los mismos helpers que el guard (`isClientPortalBaseViewCode` +
 * `resolveClientPortalModulesForOrganization`); el lado menú llama a la derivación real del
 * claim (`resolveAuthorizedViewsForUser`) más el merge aditivo de ítems de módulo. Replicar
 * las reglas acá habría creado la tercera fuente de verdad justo en el detector de que hay
 * dos.
 *
 * **Después del Slice 2 el cero es estructural para la DECISIÓN**, y conviene decirlo en vez
 * de dejar creer que el cero prueba más de lo que prueba: menú y puerta pasan a consumir el
 * mismo predicado, así que no pueden discrepar sobre los mismos insumos. Lo que esta señal
 * sigue detectando después:
 *
 *   - **drift de insumos** — el menú resuelve sus módulos en `(dashboard)/layout.tsx` y la
 *     página los resuelve en su propio render, cada uno contra un cache de 60s por instancia.
 *     Un assignment recién cambiado puede dejarlos desalineados de forma transitoria;
 *   - **una segunda fuente reintroducida** — si alguien vuelve a derivar visibilidad desde el
 *     claim de rol en cualquiera de los dos lados, los conjuntos se separan y la señal sube;
 *   - **claim degradado** — cuando la derivación falla, el menú cae a su fallback permisivo y
 *     ofrece superficies que la organización no contrató.
 *
 * Lo que esta señal **no** puede ver es una regresión a nivel JSX (alguien agrega un `&&`
 * extra dentro del componente). Eso lo cubren el test de `VerticalMenu` y el lint del carril.
 * Defensa en capas, no una capa pretendiendo ser todas.
 *
 * **Steady state: 0.** Cualquier valor > 0 es un enlace que el usuario puede clickear y que no
 * lo lleva a ninguna parte.
 *
 * **Kind**: `data_quality`. **Severidad**: 0 → `ok`; ≥1 → `warning`. Es `warning` y no `error`
 * por la misma razón que `assigned_view_without_route`: el daño es de experiencia, no de
 * acceso — la puerta sigue decidiendo bien y no se expone nada de más. La dirección contraria
 * (la puerta abre algo que el menú oculta) sí sería `error`, y por eso se cuenta aparte.
 *
 * **Subsystem rollup**: `identity`.
 *
 * **Acción de remediación**:
 *   1. Leer la evidencia: cada par viene como `email · viewCode · dirección`.
 *   2. Si es "el menú promete": o la organización debe tener un módulo que declare ese
 *      viewCode —y entonces falta el assignment—, o no debe, y entonces el ítem no debería
 *      renderizarse. **NUNCA** resolverlo agregando el viewCode al catálogo de navegación:
 *      eso no concede acceso, sólo mueve el enlace muerto de lugar.
 *   3. Si es "sólo por URL": la puerta abre algo que el menú no ofrece. Revisar que el
 *      viewCode tenga entrada en `VIEW_CODE_NAV_DESCRIPTOR` del composer.
 */
export const CLIENT_PORTAL_MENU_GATE_DIVERGENCE_SIGNAL_ID = 'identity.client_portal.menu_gate_divergence'

/**
 * Techo de usuarios evaluados por corrida. La señal hace I/O por usuario (derivación del claim
 * + resolver de módulos, ambos cacheados), así que no puede crecer sin límite en el path del
 * dashboard. Al 2026-08-10 hay 8 usuarios cliente activos, tres órdenes de magnitud por debajo.
 *
 * Si alguna vez se alcanza, la señal **lo dice en su summary** en vez de reportar un número
 * parcial como si fuera total: un techo silencioso se lee como "cubrí todo" cuando no lo hizo.
 */
const MAX_USERS_PER_RUN = 500

interface ClientUserRow extends Record<string, unknown> {
  user_id: string
  email: string
  organization_id: string | null
  role_codes: string[] | null
  route_groups: string[] | null
}

const CLIENT_USERS_SQL = `
  SELECT user_id, email, organization_id, role_codes, route_groups
  FROM greenhouse_serving.session_360
  WHERE tenant_type = 'client'
    AND active
    AND organization_id IS NOT NULL
  ORDER BY email
  LIMIT ${MAX_USERS_PER_RUN + 1}
`

type DivergenceDirection = 'menu_promises_gate_denies' | 'reachable_by_url_only'

interface DivergentPair {
  readonly email: string
  readonly viewCode: string
  readonly direction: DivergenceDirection
}

const resolveSummary = (pairs: readonly DivergentPair[], truncated: boolean): string => {
  const truncatedNote = truncated
    ? ` Evaluación PARCIAL: se alcanzó el techo de ${MAX_USERS_PER_RUN} usuarios, así que el conteo es un piso, no un total.`
    : ''

  if (pairs.length === 0) {
    return `El menú del portal cliente y la puerta coinciden para todos los usuarios cliente activos.${truncatedNote}`
  }

  const dead = pairs.filter(pair => pair.direction === 'menu_promises_gate_denies').length
  const urlOnly = pairs.length - dead
  const affected = new Set(pairs.map(pair => pair.email)).size
  const parts: string[] = []

  if (dead > 0) {
    parts.push(`${dead} ${dead === 1 ? 'enlace que el menú ofrece y la puerta niega' : 'enlaces que el menú ofrece y la puerta niega'}`)
  }

  if (urlOnly > 0) {
    parts.push(`${urlOnly} ${urlOnly === 1 ? 'superficie alcanzable sólo por URL' : 'superficies alcanzables sólo por URL'}`)
  }

  return `${parts.join(' y ')}, sobre ${affected} ${affected === 1 ? 'usuario cliente' : 'usuarios cliente'}. Un enlace que la puerta niega termina en \`/home?denied=…\`.${truncatedNote}`
}

export const getClientPortalMenuGateDivergenceSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<ClientUserRow>(CLIENT_USERS_SQL)
    const truncated = rows.length > MAX_USERS_PER_RUN
    const users = truncated ? rows.slice(0, MAX_USERS_PER_RUN) : rows

    const pairs: DivergentPair[] = []

    for (const user of users) {
      const organizationId = user.organization_id

      if (!organizationId) continue

      // Los dos lados salen de las primitives reales, no de una réplica de sus reglas.
      const [claim, modules] = await Promise.all([
        resolveAuthorizedViewsForUser({
          userId: user.user_id,
          roleCodes: user.role_codes ?? [],
          tenantType: 'client',
          fallbackRouteGroups: user.route_groups ?? []
        }),
        resolveClientPortalModulesForOrganization(organizationId)
      ])

      const moduleViewCodes = new Set(modules.flatMap(module => module.viewCodes))
      const claimViewCodes = new Set(claim.authorizedViews)

      for (const entry of CLIENT_PORTAL_NAV_CATALOG) {
        // `/home` es el terminator del portal: no está guardada, así que no puede divergir.
        if (!entry.guarded) continue

        // Lado MENÚ: la lista base sale del claim; el merge de TASK-1675 repone, aditivo,
        // todo ítem que declare un módulo contratado.
        const menuOffers = claimViewCodes.has(entry.viewCode) || moduleViewCodes.has(entry.viewCode)

        // Lado PUERTA: exactamente lo que evalúa `hasViewCodeAccess`.
        const gateOpens = isClientPortalBaseViewCode(entry.viewCode) || moduleViewCodes.has(entry.viewCode)

        if (menuOffers === gateOpens) continue

        pairs.push({
          email: user.email,
          viewCode: entry.viewCode,
          direction: menuOffers ? 'menu_promises_gate_denies' : 'reachable_by_url_only'
        })
      }
    }

    const deadLinks = pairs.filter(pair => pair.direction === 'menu_promises_gate_denies')
    const urlOnly = pairs.filter(pair => pair.direction === 'reachable_by_url_only')

    // Una superficie alcanzable que el menú esconde es un problema de acceso, no de
    // experiencia: sube a `error`. Un enlace muerto se queda en `warning`.
    const severity = urlOnly.length > 0 ? 'error' : deadLinks.length > 0 ? 'warning' : 'ok'

    return {
      signalId: CLIENT_PORTAL_MENU_GATE_DIVERGENCE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getClientPortalMenuGateDivergenceSignal',
      label: 'Divergencia menú ↔ puerta del portal cliente',
      severity,
      summary: resolveSummary(pairs, truncated),
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(pairs.length) },
        { kind: 'metric', label: 'enlaces que la puerta niega', value: String(deadLinks.length) },
        { kind: 'metric', label: 'alcanzables sólo por URL', value: String(urlOnly.length) },
        { kind: 'metric', label: 'usuarios evaluados', value: `${users.length}${truncated ? ' (techo alcanzado)' : ''}` },
        {
          kind: 'metric',
          label: 'pares',
          value:
            pairs.length === 0
              ? 'ninguno'
              : pairs
                  .slice(0, 20)
                  .map(pair => `${pair.email} · ${pair.viewCode} · ${pair.direction}`)
                  .join(' | ') + (pairs.length > 20 ? ` | …y ${pairs.length - 20} más` : '')
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-1685-client-portal-single-visibility-primitive.md'
        },
        {
          kind: 'doc',
          label: 'Hallazgo',
          value: 'docs/issues/open/ISSUE-148-client-portal-role-and-module-neither-enforced-end-to-end.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_client_portal_menu_gate_divergence' }
    })

    return {
      signalId: CLIENT_PORTAL_MENU_GATE_DIVERGENCE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getClientPortalMenuGateDivergenceSignal',
      label: 'Divergencia menú ↔ puerta del portal cliente',
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
