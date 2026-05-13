import 'server-only'

import { redirect } from 'next/navigation'

import { requireServerSession } from '@/lib/auth/require-server-session'
import { hasViewCodeAccess } from '@/lib/client-portal/readers/native/module-resolver'
import { captureWithDomain } from '@/lib/observability/capture'

import { mapViewCodeToPublicSlug } from '../composition/view-code-public-slug'

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

  const organizationId = session.user.clientId

  if (!organizationId) {
    // Client tenant sin clientId asignado — estado inválido. Terminator garantizado.
    redirect('/home')
  }

  try {
    const allowed = await hasViewCodeAccess(organizationId, viewCode)

    if (!allowed) {
      const slug = mapViewCodeToPublicSlug(viewCode)

      redirect(`/home?denied=${encodeURIComponent(slug)}`)
    }
  } catch (error) {
    // Resolver throw → degradación honesta. Page consumer renderiza
    // <ClientPortalDegradedBanner mode='fallback'> via ?error= param.
    captureWithDomain(error, 'client_portal', {
      tags: { source: 'page_guard', viewCode },
      extra: { organizationId }
    })

    redirect('/home?error=resolver_unavailable')
  }
}
