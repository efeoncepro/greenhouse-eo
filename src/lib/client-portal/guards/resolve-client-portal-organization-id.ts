import 'server-only'

import { cookies } from 'next/headers'

import { captureMessageWithDomain } from '@/lib/observability/capture'

/**
 * TASK-1679 Slice 2 — Resolver canónico de la organización de una sesión cliente.
 *
 * **Single source of truth** de "¿contra qué organización se evalúan los módulos
 * contratados de esta sesión?". Lo consumen el page guard (`requireViewCodeAccess`) y
 * cualquier superficie que resuelva módulos per-org.
 *
 * Existe por dos razones, y la segunda es la que lo hace obligatorio:
 *
 *  1. `ISSUE-146`: el guard pasaba `session.user.clientId` a un filtro sobre
 *     `module_assignments.organization_id`. Son dos espacios de identificadores que no se
 *     solapan (`cli-*`, `hubspot-company-*`, `greenhouse-demo-client` contra `org-*`), así
 *     que la comparación nunca podía ser verdadera. Concentrar la resolución en un solo
 *     lugar hace que ese error no pueda repetirse callsite por callsite.
 *  2. El override de la persona agente (abajo) **tiene** que aplicarse en un único punto.
 *     Si viviera sólo en el guard, el menú resolvería una organización y las páginas
 *     abrirían otra: el operador vería un menú que no corresponde a lo que puede entrar.
 *
 * ## Override de organización para la persona agente
 *
 * Decisión del operador 2026-08-09: la persona de verificación tiene que poder recorrer el
 * portal de cualquier organización. El riesgo está declarado y aceptado — la credencial de
 * esa persona vive documentada en `CLAUDE.md`, así que con el override activo esa
 * credencial lee el portal de cualquier cliente.
 *
 * Por eso el override es **fail-closed en cuatro condiciones independientes**, y las cuatro
 * tienen que cumplirse:
 *
 *   1. `CLIENT_PORTAL_AGENT_ORG_OVERRIDE_ENABLED === 'true'` — flag default-OFF.
 *   2. `VERCEL_ENV !== 'production'` — bloqueo duro, **sin variable de escape**. Esto NO es
 *      configurable a propósito: un override de tenant en producción no tiene caso de uso
 *      legítimo, y dejar una puerta "por si acaso" es cómo estas cosas terminan encendidas.
 *   3. El `userId` de la sesión está en la allowlist de personas agente. No alcanza con ser
 *      un tenant cliente: tiene que ser una de las personas fixture.
 *   4. Hay un valor de override presente (cookie o env var).
 *
 * Y cada aplicación efectiva emite a Sentry, así que el uso deja rastro.
 *
 * **NUNCA** ampliar la allowlist a un usuario cliente real. **NUNCA** agregar un bypass del
 * gate de producción. **NUNCA** leer el override sin pasar por este helper.
 *
 * El valor no se valida contra la DB a propósito: un `organizationId` inexistente resuelve
 * a cero módulos, o sea al empty state. Es seguro por construcción y ahorra una query en el
 * hot path de cada page load.
 */

/** Cookie para cambiar de organización en una sesión de verificación sin redeploy. */
export const AGENT_ORG_OVERRIDE_COOKIE = 'gh_agent_org_override'

/**
 * Personas fixture autorizadas a usar el override. Son los `user_id` provisionados por
 * migración (`20260531020000000_task-954-agent-role-personas.sql` y la de superadmin), no
 * usuarios reales.
 */
const AGENT_PERSONA_USER_IDS = new Set(['user-agent-client-001', 'user-agent-e2e-001'])

interface OrganizationResolutionSubject {
  readonly userId?: string | null
  readonly organizationId?: string | null
}

const isOverrideAllowed = (userId: string | null | undefined): boolean => {
  if (process.env.CLIENT_PORTAL_AGENT_ORG_OVERRIDE_ENABLED !== 'true') return false

  // Bloqueo duro de producción, sin variable de escape.
  //
  // El discriminador es `VERCEL_ENV`, que es el canónico del repo para esto — mismo que
  // `src/app/api/auth/agent-session/route.ts` y `src/proxy.ts`. La primera versión de este
  // guard usaba `NODE_ENV`, y estaba mal por una razón que sólo se ve midiendo: Vercel
  // compila **todos** los deployments con `NODE_ENV=production`, así que el bloqueo también
  // apagaba el override en staging y lo dejaba efectivamente solo-local. Verificado contra
  // el runtime desplegado el 2026-08-09: staging reporta `VERCEL_ENV=preview`.
  //
  // **NUNCA** agregar acá una válvula de escape del estilo `..._ALLOW_PRODUCTION`. El
  // precedente de `agent-session` tiene una, y esa divergencia es deliberada: agent-session
  // concede una sesión como persona fixture, mientras este override concede **lectura
  // cross-tenant del portal de cualquier organización cliente**, con una credencial que vive
  // documentada en `CLAUDE.md`. No es el mismo orden de riesgo, y no hay caso de uso legítimo
  // para eso en producción.
  if (process.env.VERCEL_ENV === 'production') return false

  if (!userId) return false

  return AGENT_PERSONA_USER_IDS.has(userId)
}

const readOverrideValue = async (): Promise<string | null> => {
  const fromEnv = process.env.CLIENT_PORTAL_AGENT_ORG_OVERRIDE?.trim()

  if (fromEnv) return fromEnv

  try {
    const cookieStore = await cookies()

    return cookieStore.get(AGENT_ORG_OVERRIDE_COOKIE)?.value?.trim() || null
  } catch {
    // `cookies()` lanza fuera de un request scope (por ejemplo en un script CLI). Ahí el
    // override sólo puede venir del env, y no tener cookies no es un error.
    return null
  }
}

/**
 * Devuelve la organización contra la que se evalúan los módulos de esta sesión, o `null` si
 * la sesión no tiene organización resuelta.
 *
 * Un `null` **nunca** significa "permitir": el caller tiene que tratarlo como falta de
 * contexto y terminar el flujo. La señal `identity.client_portal.client_without_organization`
 * cuenta a los usuarios en ese estado.
 */
export const resolveClientPortalOrganizationId = async (
  subject: OrganizationResolutionSubject
): Promise<string | null> => {
  const sessionOrganizationId = subject.organizationId?.trim() || null

  if (!isOverrideAllowed(subject.userId)) return sessionOrganizationId

  const override = await readOverrideValue()

  if (!override || override === sessionOrganizationId) return sessionOrganizationId

  captureMessageWithDomain('client_portal_agent_org_override_applied', 'identity', {
    level: 'warning',
    tags: {
      source: 'resolve_client_portal_organization_id',
      userId: subject.userId ?? 'unknown'
    },
    extra: {
      sessionOrganizationId,
      overrideOrganizationId: override
    }
  })

  return override
}
