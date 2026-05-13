/**
 * TASK-827 Slice 3 — Shape canonical del Client Portal nav (types + pure helpers).
 *
 * Este módulo es **client-safe**: zero `server-only`, zero VIEW_REGISTRY imports,
 * zero runtime side effects. Solo expone tipos + helpers puros que pueden
 * importarse desde Client Components sin contaminar el bundle.
 *
 * **Por qué existe** (canonical split de TASK-827 follow-up CI fix 2026-05-13):
 *
 * `menu-builder.ts` declara `import 'server-only'` porque `composeNavItemsFromModules`
 * consume `VIEW_REGISTRY` (800+ líneas de governance data) cuyo bundle client
 * impact es indeseable. Pero `ClientPortalNavigationList.tsx` es `'use client'`
 * (necesita `usePathname()` + DOM events) y solo necesita los TIPOS + el
 * helper PURO `groupNavItems` — NO el composer server-side.
 *
 * Turbopack en build production detecta `'server-only'` transitivo en client
 * bundle y rompe (canonical behavior). Solución canonical: split — types y
 * helpers puros viven acá (client-safe), `composeNavItemsFromModules` queda
 * en `menu-builder.ts` con `'server-only'` preservado.
 *
 * Imports canonical:
 *   - Server components: `from '@/lib/client-portal/composition/menu-builder'`
 *     (incluye composer + re-exports tipos vía este módulo para back-compat)
 *   - Client components: `from '@/lib/client-portal/composition/menu-builder-shape'`
 *     (solo tipos + helpers puros)
 *
 * Pattern fuente: similar al split de `account-balances-types.ts` vs
 * `account-balances.ts`. Cuando emerja otra impl server-only cuyos tipos
 * deban consumirse desde client, replicar este split.
 */

export type NavItemGroup = 'primary' | 'capabilities' | 'account'

export type NavItemTier = 'standard' | 'addon' | 'pilot'

export interface ClientNavItem {
  /** ViewCode canonical (e.g. `'cliente.pulse'`). */
  readonly viewCode: string

  /** Label es-CL desde VIEW_REGISTRY (sentence case, user-facing). */
  readonly label: string

  /** Ruta destino (desde VIEW_REGISTRY.routePath). */
  readonly route: string

  /** Icono Tabler (e.g. `'tabler-smart-home'`). */
  readonly icon: string

  /** Group ordering para sectioning del menú. */
  readonly group: NavItemGroup

  /**
   * Tier del módulo ganador del dedup (cuando un viewCode aparece en N
   * modules, gana el de tier prioritario: standard > addon > pilot).
   */
  readonly tier: NavItemTier
}

/**
 * Agrupa nav items por `group` canonical preservando orden interno.
 *
 * Pure function — NO side effects, NO server-only deps. Safe para client.
 *
 * Usado por `ClientPortalNavigationList` (client) para renderizar secciones
 * separadas (primary / capabilities / account). El composer server-side
 * (`composeNavItemsFromModules`) ya entrega items ordenados; este helper
 * solo los particiona en buckets por group.
 */
export const groupNavItems = (
  items: readonly ClientNavItem[]
): Record<NavItemGroup, readonly ClientNavItem[]> => {
  const grouped: Record<NavItemGroup, ClientNavItem[]> = {
    primary: [],
    capabilities: [],
    account: []
  }

  for (const item of items) {
    grouped[item.group].push(item)
  }

  return grouped
}
