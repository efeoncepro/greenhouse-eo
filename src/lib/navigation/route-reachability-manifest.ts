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

export type ChildRouteVia = 'header-cta' | 'row-action' | 'inline-link' | 'wizard-step' | 'tab'

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
  }
]

export const DECLARED_CHILD_ROUTE_PATHS: readonly string[] = DECLARED_CHILD_ROUTES.map(d => d.route)
