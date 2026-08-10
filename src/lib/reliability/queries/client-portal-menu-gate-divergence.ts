import 'server-only'

import { CLIENT_PORTAL_NAV_CATALOG } from '@/lib/client-portal/visibility/client-portal-nav-catalog'
import {
  canSeeClientPortalView,
  isClientPortalBaseViewCode
} from '@/lib/client-portal/visibility/client-portal-view-visibility'
import {
  canOpenClientPortalView,
  resolveClientPortalVisibilityInputs
} from '@/lib/client-portal/visibility/resolve-client-portal-visibility'
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
 * ## La pregunta que responde: ¿el menú declara superficies inalcanzables?
 *
 * Hay dos formas de que la respuesta sea "sí", y ambas las crea un cambio de **dato**, no de
 * código — por eso ningún gate de CI las puede ver y por eso esto es una señal:
 *
 * **(1) Por organización.** Una superficie del catálogo que el menú ofrece a una persona
 * concreta y que su page guard niega. Es lo que `ISSUE-148` midió en 36 pares. Desde el
 * Slice 2 el menú y la puerta consumen el mismo predicado, así que este conteo es 0 **por
 * construcción**, y conviene decirlo en vez de dejar creer que el cero prueba más de lo que
 * prueba. Se sigue evaluando porque es barato y porque es la aserción explícita del
 * invariante: si alguien reintroduce una segunda fuente en el camino del menú, sube.
 *
 * **(2) Por catálogo — la que sí puede romperse sola.** Una superficie que el menú declara y
 * que **ningún módulo del catálogo comercial vende**. No es que a esta organización le falte
 * el assignment: es que **ninguna organización puede alcanzarla jamás**, porque no existe
 * producto que la conceda. El menú declara una puerta para la que nadie fabricó llave.
 *
 * Al 2026-08-10 el conteo (2) es **2**: `cliente.ciclos` y `cliente.analytics` están en el
 * catálogo de navegación y ningún módulo las declara. Eso es honesto y es el estado real —
 * misma postura que `assigned_view_without_route`, que nació en 1 en vez de esconder su caso
 * en un allowlist. Antes del Slice 2 esas dos rutas eran enlaces muertos (el rol las mostraba,
 * la puerta las negaba); ahora simplemente no se muestran. **No se perdió acceso**: nadie
 * podía abrirlas antes tampoco.
 *
 * Lo que esta señal **no** puede ver es una regresión a nivel JSX (alguien agrega un `&&`
 * extra dentro del componente). Eso lo cubren el test de `VerticalMenu` y el lint
 * `greenhouse/no-client-portal-view-visibility-bypass`. Defensa en capas, no una capa
 * pretendiendo ser todas.
 *
 * **Steady state: 0.**
 *
 * **Kind**: `data_quality`. **Severidad**: 0 → `ok`; ≥1 → `warning`. Es `warning` y no `error`
 * por la misma razón que `assigned_view_without_route`: el daño es de experiencia y de
 * gobernanza, no de acceso — la puerta sigue decidiendo bien y no se expone nada de más.
 *
 * **Subsystem rollup**: `identity`.
 *
 * **Acción de remediación**:
 *   1. Para (1): o la organización debe tener un módulo que declare ese viewCode —y entonces
 *      falta el assignment—, o no debe, y entonces hay una segunda fuente en el menú.
 *      **NUNCA** resolverlo agregando el viewCode al catálogo de navegación: eso no concede
 *      acceso, sólo mueve el problema de lugar.
 *   2. Para (2) hay exactamente dos salidas honestas: **declarar la vista en el módulo que la
 *      vende** (si es una superficie que Efeonce ofrece), o **retirarla del catálogo de
 *      navegación y de sus rutas** (si no lo es). Dejarla declarada sin producto que la
 *      conceda es prometer algo que el sistema no puede cumplir.
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

/** ViewCodes que ALGÚN módulo vigente del catálogo declara — o sea, que existe producto que los concede. */
const SOLD_VIEW_CODES_SQL = `
  SELECT DISTINCT unnest(view_codes) AS view_code
  FROM greenhouse_client_portal.modules
  WHERE effective_to IS NULL
`

type DivergenceDirection = 'menu_promises_gate_denies' | 'reachable_by_url_only'

interface DivergentPair {
  readonly email: string
  readonly viewCode: string
  readonly direction: DivergenceDirection
}

const resolveSummary = (
  pairs: readonly DivergentPair[],
  unsellableViewCodes: readonly string[],
  truncated: boolean
): string => {
  const truncatedNote = truncated
    ? ` Evaluación PARCIAL: se alcanzó el techo de ${MAX_USERS_PER_RUN} usuarios, así que el conteo por organización es un piso, no un total.`
    : ''

  if (pairs.length === 0 && unsellableViewCodes.length === 0) {
    return `El menú del portal cliente no declara ninguna superficie inalcanzable.${truncatedNote}`
  }

  const parts: string[] = []
  const dead = pairs.filter(pair => pair.direction === 'menu_promises_gate_denies').length
  const urlOnly = pairs.length - dead

  if (dead > 0) {
    const affected = new Set(
      pairs.filter(pair => pair.direction === 'menu_promises_gate_denies').map(pair => pair.email)
    ).size

    parts.push(
      `${dead} ${dead === 1 ? 'enlace que el menú ofrece y la puerta niega' : 'enlaces que el menú ofrece y la puerta niega'} sobre ${affected} ${affected === 1 ? 'usuario' : 'usuarios'}`
    )
  }

  if (urlOnly > 0) {
    parts.push(`${urlOnly} ${urlOnly === 1 ? 'superficie alcanzable sólo por URL' : 'superficies alcanzables sólo por URL'}`)
  }

  if (unsellableViewCodes.length > 0) {
    parts.push(
      `${unsellableViewCodes.length} ${unsellableViewCodes.length === 1 ? 'superficie que ningún módulo vende' : 'superficies que ningún módulo vende'} (${unsellableViewCodes.join(', ')}): ninguna organización puede alcanzarlas, porque no existe producto que las conceda`
    )
  }

  return `${parts.join('; ')}.${truncatedNote}`
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

      // El lado MENÚ sale del primitive con los insumos que resuelve `(dashboard)/layout.tsx`.
      // El lado PUERTA sale de `canOpenClientPortalView`, el camino real del page guard, que
      // vuelve a resolver contra PG por su cuenta.
      const menuInputs = await resolveClientPortalVisibilityInputs({
        userId: user.user_id,
        organizationId,
        isInternalSession: false
      })

      for (const entry of CLIENT_PORTAL_NAV_CATALOG) {
        // `/home` es el terminator del portal: no está guardada, así que no puede divergir.
        if (!entry.guarded) continue

        const menuOffers = canSeeClientPortalView(entry.viewCode, menuInputs)

        const gateOpens = await canOpenClientPortalView(entry.viewCode, {
          userId: user.user_id,
          organizationId,
          isInternalSession: false
        })

        if (menuOffers === gateOpens) continue

        pairs.push({
          email: user.email,
          viewCode: entry.viewCode,
          direction: menuOffers ? 'menu_promises_gate_denies' : 'reachable_by_url_only'
        })
      }
    }

    // (2) Coherencia de catálogo: superficies que el menú declara y que ningún módulo vende.
    // Se evalúa contra el catálogo COMPLETO de módulos, no contra los assignments: la
    // pregunta no es "¿a esta organización le falta?" sino "¿existe producto que la conceda?".
    const soldViewCodes = new Set(
      (await query<{ view_code: string } & Record<string, unknown>>(SOLD_VIEW_CODES_SQL)).map(row => row.view_code)
    )

    const unsellableViewCodes = CLIENT_PORTAL_NAV_CATALOG.filter(
      entry => entry.guarded && !isClientPortalBaseViewCode(entry.viewCode) && !soldViewCodes.has(entry.viewCode)
    ).map(entry => entry.viewCode)

    const deadLinks = pairs.filter(pair => pair.direction === 'menu_promises_gate_denies')
    const urlOnly = pairs.filter(pair => pair.direction === 'reachable_by_url_only')
    const total = pairs.length + unsellableViewCodes.length

    // Una superficie alcanzable que el menú esconde es un problema de acceso, no de
    // experiencia: sube a `error`. Lo demás se queda en `warning`.
    const severity = urlOnly.length > 0 ? 'error' : total > 0 ? 'warning' : 'ok'

    return {
      signalId: CLIENT_PORTAL_MENU_GATE_DIVERGENCE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getClientPortalMenuGateDivergenceSignal',
      label: 'Divergencia menú ↔ puerta del portal cliente',
      severity,
      summary: resolveSummary(pairs, unsellableViewCodes, truncated),
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(total) },
        { kind: 'metric', label: 'enlaces que la puerta niega', value: String(deadLinks.length) },
        { kind: 'metric', label: 'alcanzables sólo por URL', value: String(urlOnly.length) },
        {
          kind: 'metric',
          label: 'superficies que ningún módulo vende',
          value: unsellableViewCodes.length === 0 ? '0' : `${unsellableViewCodes.length} (${unsellableViewCodes.join(', ')})`
        },
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
