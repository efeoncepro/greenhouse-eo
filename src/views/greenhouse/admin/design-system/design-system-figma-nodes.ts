/**
 * Design System ↔ AXIS Figma node registry — SEED ONLY (TASK-1072).
 *
 * ⚠️ This is NO LONGER the runtime source of truth. As of TASK-1072 the canonical
 * SSOT is the DB table `greenhouse_core.design_system_figma_nodes` (the shell reads
 * it server-side via `getDesignSystemFigmaNodeMap()` and a designer links nodes from
 * the UI). These two rows were the migration seed; kept here as the historical seed
 * reference only. Do NOT add routes here to "activate" a page — link them in the UI
 * (the "+" affordance) or via `POST /api/design-system/figma-nodes`.
 */
export const DESIGN_SYSTEM_FIGMA_NODES: Record<string, string> = {
  '/design-system/breadcrumbs': '205:234905',
  '/design-system/colors': '11205:5341'
}

const normalize = (pathname: string) => (pathname === '/' ? pathname : pathname.replace(/\/+$/, ''))

/** Resolve the AXIS Figma node id for a design-system route, or null if unmapped. */
export const resolveDesignSystemFigmaNode = (pathname: string): string | null =>
  DESIGN_SYSTEM_FIGMA_NODES[normalize(pathname)] ?? null
