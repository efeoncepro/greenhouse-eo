/**
 * Design System ↔ AXIS Figma node registry.
 *
 * Maps each internal `/admin/design-system/*` route to its AXIS Figma node id
 * (master file `yyMksCoijfMaIoYplXKZaR`). The shell renders a
 * `GreenhouseFigmaNodeButton` resolved from this map: routes WITH a node get an
 * active "Nodo Figma" link; routes WITHOUT one render the button disabled — a
 * deliberate signal that the team still has to create + link that AXIS node.
 *
 * To activate a page: create its node in AXIS and add `route → 'NNN:MMM'` here.
 */
export const DESIGN_SYSTEM_FIGMA_NODES: Record<string, string> = {
  '/admin/design-system/breadcrumbs': '205:234905',
  '/admin/design-system/colors': '11205:5341'
}

const normalize = (pathname: string) => (pathname === '/' ? pathname : pathname.replace(/\/+$/, ''))

/** Resolve the AXIS Figma node id for a design-system route, or null if unmapped. */
export const resolveDesignSystemFigmaNode = (pathname: string): string | null =>
  DESIGN_SYSTEM_FIGMA_NODES[normalize(pathname)] ?? null
