/**
 * TASK-982 — Navigation reachability: declared child routes.
 *
 * A "child route" is a real `(dashboard)` page that is intentionally NOT a
 * top-level item in `VerticalMenu.tsx` because it's reached from a PARENT
 * surface (a header CTA, a row action, an inline link, a wizard step). Declaring
 * it here is what keeps it from being flagged as an ORPHAN by the reachability
 * gate (`scripts/ci/route-reachability-gate.mjs`).
 *
 * The gate parses this file's `route: '...'` literals. **Keep that exact
 * format** (single-quoted string literal after `route:`) so the gate's parser
 * stays simple and dependency-free. This module is also the typed SSOT for any
 * future runtime consumer (e.g. a command palette that surfaces child routes).
 *
 * RULE (CLAUDE.md "Navigation Reachability Governance"): every real
 * `src/app/(dashboard)/**​/page.tsx` route MUST be reachable by ONE of:
 *   (a) a `href` in `VerticalMenu.tsx`, or
 *   (b) a declared child route here (with parent + via), or
 *   (c) a dynamic detail route (contains a `[segment]`, reached by row click).
 * Mockup routes (`**​/mockup/**`) are excluded.
 */

export type ChildRouteVia =
  | 'header-cta'
  | 'row-action'
  | 'inline-link'
  | 'wizard-step'
  | 'tab'
  | 'redirect-alias' // legacy URL that only redirects to the canonical surface (kept for old bookmarks)

export interface ChildRouteDeclaration {
  /** The child route that is intentionally NOT a top-level menu item. */
  route: string
  /** The menu-anchored parent surface it's reached from. */
  parent: string
  /** How the user reaches it from the parent. */
  via: ChildRouteVia
  /** Why it's a sub-action and not its own menu item. */
  reason: string
}

export const DECLARED_CHILD_ROUTES: readonly ChildRouteDeclaration[] = [
  {
    route: '/hr/contractors/new',
    parent: '/hr/contractors',
    via: 'header-cta',
    reason:
      'Onboarding wizard (TASK-976) — reached via the "Nuevo contractor" primary CTA in the contractors workbench header (TASK-982 Slice 1). Create-action, not a standalone nav item.'
  },
  {
    // TASK-992 Slice 2b / TASK-1013 — single front door wizard to onboard a client.
    // Gated by CLIENT_LIFECYCLE_ONBOARDING_ENABLED (OFF by default → route 404s).
    // The discoverable entry is the onboarding cockpit (/agency/clients/onboarding,
    // the flag-gated "Alta de cliente" nav item); the wizard is reached from the
    // cockpit's primary "Nuevo cliente" CTA. Create-action, not a standalone menu item.
    route: '/agency/clients/new',
    parent: '/agency/clients/onboarding',
    via: 'header-cta',
    reason:
      'Client onboarding wizard (TASK-992 Slice 2b) — single canonical front door, flag-gated (CLIENT_LIFECYCLE_ONBOARDING_ENABLED). Reached from the onboarding cockpit (TASK-1013) via its primary "Nuevo cliente" CTA.'
  },
  {
    // TASK-983 triage: legacy redirect-only page → /agency?tab=capacidad.
    route: '/agency/capacity',
    parent: '/agency',
    via: 'redirect-alias',
    reason:
      'Legacy URL kept for old bookmarks; the page only `redirect("/agency?tab=capacidad")`. Canonical surface is the Agency capacity tab.'
  },
  {
    // TASK-983 triage: legacy redirect-only page → /admin (LEGACY_INTERNAL_DASHBOARD_PATH).
    route: '/internal/dashboard',
    parent: '/admin',
    via: 'redirect-alias',
    reason:
      'Legacy LEGACY_INTERNAL_DASHBOARD_PATH (resolve-portal-home-path); the page only `redirect("/admin")`. Canonical surface is the Admin Center.'
  },
  {
    route: '/admin/operations',
    parent: '/admin/ops-health',
    via: 'redirect-alias',
    reason:
      'Legacy reliability URL kept for older links, docs and bookmarks; the page only `redirect("/admin/ops-health")`. Canonical incident-facing surface is Ops Health.'
  },
  {
    // TASK-983 triage: quote share dashboard — genuine sub-surface of the quotes flow.
    route: '/finance/quotes/share-dashboard',
    parent: '/finance/quotes',
    via: 'inline-link',
    reason:
      'Dashboard de cotizaciones compartidas (TASK-631) — sub-surface del flujo de quotes, alcanzable desde la cola de cotizaciones.'
  },
  {
    // TASK-983 triage: create sub-action. FOLLOW-UP: wire a "Nuevo sample sprint" CTA in
    // SampleSprintsWorkspace (mirror contractor onboarding). Reachable by direct URL meanwhile.
    route: '/agency/sample-sprints/new',
    parent: '/agency/sample-sprints',
    via: 'header-cta',
    reason:
      'Create sample sprint — sub-acción del workspace de Sample Sprints. CTA en el header pendiente (TASK-983 follow-up); alcanzable por URL directa mientras tanto.'
  },
  {
    // TASK-983 triage: alive finance ops surface (TASK-708) without a menu item.
    // FOLLOW-UP: add a proper Finanzas menu item + viewCode (needs migration, TASK-827).
    route: '/finance/external-signals',
    parent: '/finance',
    via: 'inline-link',
    reason:
      'External cash signals ops (TASK-708). Item de menú Finanzas + viewCode pendiente (requiere migración, TASK-983 follow-up); alcanzable por URL directa mientras tanto.'
  },
  {
    // TASK-983 triage: personal notification settings without a link.
    // FOLLOW-UP: add a link in UserDropdown / settings. Reachable by direct URL meanwhile.
    route: '/notifications/preferences',
    parent: '/home',
    via: 'inline-link',
    reason:
      'Preferencias personales de notificaciones. Link en UserDropdown pendiente (TASK-983 follow-up); alcanzable por URL directa mientras tanto.'
  },
  {
    route: '/admin/design-system/loaders',
    parent: '/admin/design-system',
    via: 'inline-link',
    reason:
      'Loading Lab (TASK-1037) — child surface del Design System, alcanzable desde la referencia interna de tokens AXIS sin mezclar loaders en la pagina canonica de color.'
  },
  {
    route: '/admin/design-system/microinteractions',
    parent: '/admin/design-system',
    via: 'inline-link',
    reason:
      'Microinteractions Lab — child surface del Design System para primitives de feedback de comandos async, alcanzable desde la card "Ver microinteracciones" en DesignSystemView.'
  },
  {
    route: '/admin/design-system/typography',
    parent: '/admin/design-system',
    via: 'inline-link',
    reason:
      'Referencia canonica de tipografia (TASK-1044) — child surface del Design System, alcanzable desde la card "Ver tipografia" en DesignSystemView (href={TYPOGRAPHY_ROUTE}, const no detectado por el gate estatico).'
  },
  {
    route: '/admin/design-system/chips',
    parent: '/admin/design-system',
    via: 'inline-link',
    reason:
      'Chips Lab — child surface del Design System para la primitive GreenhouseChip, alcanzable desde la card "Ver chips" en DesignSystemView.'
  },
  {
    route: '/admin/design-system/charts',
    parent: '/admin/design-system',
    via: 'inline-link',
    reason:
      'Charts Lab — child surface del Design System para primitives de visualizacion de datos, alcanzable desde la card "Ver charts" en DesignSystemView.'
  },
  {
    route: '/admin/design-system/utilities',
    parent: '/admin/design-system',
    via: 'inline-link',
    reason:
      'Utilities Lab — child surface del Design System para primitives utilitarias como Activity Timeline, alcanzable desde la card "Ver utilities" en DesignSystemView.'
  },
  {
    route: '/admin/design-system/floating-surfaces',
    parent: '/admin/design-system',
    via: 'inline-link',
    reason:
      'Floating Surfaces Lab (TASK-1033) — child surface del Design System para la primitive GreenhouseFloatingSurface y sus 6 variants, alcanzable desde la card "Ver floating surfaces" en DesignSystemView.'
  }
]

export const DECLARED_CHILD_ROUTE_PATHS: readonly string[] = DECLARED_CHILD_ROUTES.map(d => d.route)
