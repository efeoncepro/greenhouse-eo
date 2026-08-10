import 'server-only'

import { redirect } from 'next/navigation'

import { requireServerSession } from '@/lib/auth/require-server-session'
import { canOpenClientPortalView } from '@/lib/client-portal/visibility/resolve-client-portal-visibility'
import { captureWithDomain } from '@/lib/observability/capture'

import { mapViewCodeToPublicSlug } from '../composition/view-code-public-slug'

import { resolveClientPortalOrganizationId } from './resolve-client-portal-organization-id'

/**
 * TASK-827 Slice 4 — Page guard canonical para rutas client-facing.
 *
 * Server-only helper que valida acceso a un `viewCode` específico via el
 * resolver canónico (TASK-825) ANTES de renderizar la page. Si el cliente
 * NO tiene el módulo asignado, redirige a `/home?denied=<slug>` con slug
 * user-facing (NUNCA leak `module_key` técnico).
 *
 * Contract canónico (D1-D7 cerrados 2026-05-13):
 *
 *   - D1 boundary: si `session.user.isInternalPortalUser === true`, **EARLY
 *     RETURN** sin invocar resolver. Internal admins (EFEONCE_ADMIN,
 *     EFEONCE_OPERATIONS, support roles) acceden cualquier surface cliente
 *     para soporte legítimo. Writes están gated por capabilities específicas
 *     en endpoints (TASK-826 admin endpoints).
 *
 *   - D3 terminator: si guard rechaza acceso, SIEMPRE redirect a `/home`
 *     (terminator garantizado para `tenant_type='client'`, siempre accesible).
 *
 *   - D4 slug: el `?denied=<slug>` query param usa `mapViewCodeToPublicSlug`
 *     output. Page consumer (`/home/page.tsx`) renderiza
 *     `<ModuleNotAssignedEmpty publicSlug={params.denied}>`.
 *
 *   - Degradación honesta: si el resolver throw (PG down, cache miss en network
 *     failure, etc.), `captureWithDomain('client_portal', ...)` + redirect a
 *     `/home?error=resolver_unavailable`. Page consumer renderiza
 *     `<ClientPortalDegradedBanner mode='fallback'>`.
 *
 * Usage:
 *
 *     // src/app/(dashboard)/proyectos/page.tsx
 *     import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'
 *
 *     export const dynamic = 'force-dynamic'
 *
 *     export default async function ProyectosPage() {
 *       await requireViewCodeAccess('cliente.proyectos')
 *       return <ProyectosView />
 *     }
 *
 * NO devuelve nada — throw redirect o return undefined. El page consumer
 * NO maneja el caso de denied — el guard ya redirigió cuando ese return ocurre.
 */
export const requireViewCodeAccess = async (viewCode: string): Promise<void> => {
  const session = await requireServerSession()

  // D1: internal bypass — support pattern, no impersonation. `isInternalPortalUser`
  // se deriva del tenantType (NO existe como field directo en session.user; se
  // computa de routeGroups en VerticalMenu — replicamos la semántica más simple
  // acá: tenantType === 'efeonce_internal' es equivalente para D1 boundary).
  if (session.user.tenantType === 'efeonce_internal') return

  // TASK-1679 Slice 4 — la llave es la ORGANIZACIÓN, no el cliente (`ISSUE-146`).
  //
  // Acá vivía `session.user.clientId` asignado a una variable llamada `organizationId`
  // y pasado a un filtro sobre `module_assignments.organization_id`. Los dos espacios de
  // identificadores no se solapan —`cli-*`, `hubspot-company-*` y
  // `greenhouse-demo-client` contra `org-*`—, así que la comparación NUNCA podía ser
  // verdadera: el guard denegaba a todo cliente, en todas las páginas.
  //
  // La resolución vive en un helper único para que este error no pueda volver por otro
  // callsite, y para que el override de la persona de verificación se aplique en un solo
  // punto (si no, el menú resolvería una organización y las páginas otra).
  const organizationId = await resolveClientPortalOrganizationId({
    userId: session.user.userId,
    organizationId: session.user.organizationId
  })

  if (!organizationId) {
    // Sesión cliente sin organización resuelta. NO es lo mismo que "no tiene el módulo":
    // acá no hay contra qué evaluar módulos contratados, así que no se puede decir por qué
    // se deniega. La señal `identity.client_portal.client_without_organization` cuenta a los
    // usuarios en este estado; sin ella este camino sería mudo.
    redirect('/home?error=organization_unresolved')
  }

  let allowed = false

  // TASK-1679 Slice 3 — el `redirect()` va FUERA del `try`.
  //
  // `redirect()` de Next.js señaliza **lanzando** `NEXT_REDIRECT`. Con la llamada dentro
  // del `try`, el propio `catch` la interceptaba, y las tres consecuencias se verificaron
  // en producción el 2026-08-09:
  //
  //   1. el camino `denied` era inalcanzable — ninguna denegación legítima llegaba como tal;
  //   2. `ModuleNotAssignedEmpty` (TASK-827, anatomía de cinco elementos) estaba muerto en
  //      runtime: el usuario veía el banner de degradación, que invita a reintentar algo que
  //      nunca va a funcionar;
  //   3. **cada denegación legítima se reportaba a Sentry como error del resolver**, o sea
  //      el dominio `client_portal` acumulaba incidentes por el funcionamiento normal.
  //
  // El `try` ahora envuelve SÓLO la llamada que puede fallar de verdad.
  try {
    // TASK-1685 Slice 2 — la puerta consume EL primitive, no la mitad organización.
    //
    // Acá vivía `hasViewCodeAccess(organizationId, viewCode)`, que responde sólo "¿algún
    // módulo de la organización declara esta vista?". Faltaba la dimensión persona: un
    // `user_view_overrides` con `override_type='revoke'` se aplicaba dentro de
    // `resolveAuthorizedViewsForUser` —o sea sobre el claim— y este guard nunca leía el
    // claim. El repo tenía el instrumento canónico para decir "esta persona no debe ver
    // esto" y no cerraba nada (`ISSUE-148`).
    //
    // El bypass interno (D1) ya cortó arriba, así que acá el sujeto siempre es cliente; se
    // pasa `isInternalSession: false` explícito en vez de re-derivarlo.
    allowed = await canOpenClientPortalView(viewCode, {
      userId: session.user.userId,
      organizationId,
      isInternalSession: false
    })
  } catch (error) {
    // Resolver throw → degradación honesta. Page consumer renderiza
    // <ClientPortalDegradedBanner mode='fallback'> via ?error= param.
    captureWithDomain(error, 'client_portal', {
      tags: { source: 'page_guard', viewCode },
      extra: { organizationId }
    })

    redirect('/home?error=resolver_unavailable')
  }

  if (!allowed) {
    redirect(`/home?denied=${encodeURIComponent(mapViewCodeToPublicSlug(viewCode))}`)
  }
}
