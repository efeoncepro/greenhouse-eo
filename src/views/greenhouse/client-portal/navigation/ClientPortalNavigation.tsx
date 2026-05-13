import 'server-only'

import { resolveClientPortalModulesForOrganization } from '@/lib/client-portal/readers/native/module-resolver'
import { composeNavItemsFromModules, type ClientNavItem } from '@/lib/client-portal/composition/menu-builder'
import { captureWithDomain } from '@/lib/observability/capture'

import ClientPortalNavigationList from './ClientPortalNavigationList'

/**
 * TASK-827 Slice 3 — `<ClientPortalNavigation>` server component.
 *
 * Canonical surface que materializa el resolver canónico (TASK-825) en UI
 * cliente. Server component por construcción — invoca el resolver
 * (server-only) y produce nav items deterministas.
 *
 * Flujo:
 *   1. Recibe `organizationId` como prop (resuelto en layout/page padre via
 *      `requireServerSession` + tenant context)
 *   2. Invoca `resolveClientPortalModulesForOrganization(organizationId)` —
 *      cache TTL 60s warm hits ~99%
 *   3. Compone nav items via `composeNavItemsFromModules` (pure function,
 *      determinístico)
 *   4. Pasa items a `<ClientPortalNavigationList>` (client component) para
 *      render con Link interactivity
 *
 * Degradación honesta (5-state contract spec §13):
 *   - Resolver throw → captureWithDomain('client_portal', ...) +
 *     fallback empty items array (UI renderiza zero-state honesto sin caer
 *     en el menú degraded en este slice; el menu vacío es señal visible)
 *   - El page consumer detecta `items.length === 0` y puede mostrar
 *     `<ClientPortalDegradedBanner mode='partial'/>` ad hoc
 *
 * NO consume legacy `authorizedViews[]` — boundary explícito spec V1 §3.2 +
 * D1: para internal admin (`isInternalPortalUser=true`), el caller decide
 * NO renderizar este componente (Slice 6 refactor VerticalMenu lo enforce).
 *
 * NOTE: Slice 6 integrará estos items con el VerticalMenu canónico. Por
 * ahora `<ClientPortalNavigation>` puede consumirse standalone para mockup
 * (Slice 2) + page composition independiente.
 */

interface ClientPortalNavigationProps {
  /**
   * Organization ID del cliente authenticated. Resuelto server-side por el
   * caller via session.user.organizationId (D1 boundary explícito).
   */
  readonly organizationId: string
}

const ClientPortalNavigation = async ({ organizationId }: ClientPortalNavigationProps) => {
  let items: readonly ClientNavItem[] = []

  try {
    const modules = await resolveClientPortalModulesForOrganization(organizationId)

    items = composeNavItemsFromModules(modules)
  } catch (error) {
    // Degradación honesta — log + render menú vacío. Page consumer decide
    // si renderiza banner degraded encima.
    captureWithDomain(error, 'client_portal', {
      tags: { source: 'client_portal_navigation', stage: 'resolver' },
      extra: { organizationId }
    })
  }

  return <ClientPortalNavigationList items={items} />
}

export default ClientPortalNavigation
