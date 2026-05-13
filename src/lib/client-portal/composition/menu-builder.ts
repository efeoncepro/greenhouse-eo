import 'server-only'

import { VIEW_REGISTRY, type GovernanceViewRegistryEntry } from '@/lib/admin/view-access-catalog'

import type { ResolvedClientPortalModule } from '../dto/module'
import { groupNavItems, type ClientNavItem, type NavItemGroup, type NavItemTier } from './menu-builder-shape'

// Re-export shape para back-compat con consumers existentes que importan
// types desde menu-builder.ts. Client components deben importar directo de
// `menu-builder-shape` para evitar pull-in de `'server-only'` al bundle.
export { groupNavItems }
export type { ClientNavItem, NavItemGroup, NavItemTier }

/**
 * TASK-827 Slice 3 — Menu builder canonical del Client Portal Composition Layer.
 *
 * Pure function que recibe el output del resolver canónico
 * (`resolveClientPortalModulesForOrganization`, TASK-825) y produce los
 * nav items ordenados para `<ClientPortalNavigation>` (server component).
 *
 * Pipeline determinístico:
 *   1. Flatten modules → viewCodes (cada módulo declara N viewCodes)
 *   2. Dedup por viewCode (un viewCode puede aparecer en múltiples módulos
 *      cuando hay pilot + standard concurrent). Winner por tier:
 *        standard > addon > pilot
 *   3. Lookup en VIEW_REGISTRY para label/routePath/section
 *   4. Filter defensive: ocultar viewCodes que NO están en VIEW_REGISTRY
 *      (drift latente — el parity test live lo detecta en CI, pero defense
 *      in depth en runtime)
 *   5. Lookup en VIEW_CODE_NAV_DESCRIPTOR para icon + group ordering
 *   6. Sort canonical: groupOrder ASC → tier priority ASC → label ASC
 *
 * Server-only enforced por `import 'server-only'`. NO debe importarse desde
 * Client Components — el resolver corre server-side y este builder se
 * invoca dentro del server component `<ClientPortalNavigation>`.
 *
 * Tests anti-regresión cubren los 5 estados del pipeline (`menu-builder.test.ts`).
 */

// `NavItemGroup`, `NavItemTier`, `ClientNavItem` re-exportados desde
// `menu-builder-shape` arriba para back-compat. La declaración canonical
// vive en el shape file (client-safe).

/**
 * Mapping declarativo `viewCode → { icon, group }`. Cuando emerge un viewCode
 * nuevo en VIEW_REGISTRY + seed modules, agregar entry aquí. Sin entry, el
 * fallback es `tabler-app-window` + `'capabilities'` (degradación honesta —
 * el menu item se renderiza pero sin icono distintivo, NO se rompe).
 *
 * El grupo determina dónde aparece el item en el menú:
 *   - `'primary'`: items principales (Pulse, Proyectos, Ciclos, Equipo, Reviews)
 *   - `'capabilities'`: addons + módulos especializados (Creative Hub, Brand Intelligence, etc.)
 *   - `'account'`: Mi Cuenta (Notificaciones, Settings, Updates)
 */
const VIEW_CODE_NAV_DESCRIPTOR: Record<string, { icon: string; group: NavItemGroup }> = {
  // Primary nav (canonical client surfaces)
  'cliente.pulse': { icon: 'tabler-smart-home', group: 'primary' },
  'cliente.home': { icon: 'tabler-home', group: 'primary' },
  'cliente.proyectos': { icon: 'tabler-folders', group: 'primary' },
  'cliente.ciclos': { icon: 'tabler-bolt', group: 'primary' },
  'cliente.equipo': { icon: 'tabler-users', group: 'primary' },
  'cliente.revisiones': { icon: 'tabler-git-pull-request', group: 'primary' },
  'cliente.reviews': { icon: 'tabler-git-pull-request', group: 'primary' },
  'cliente.analytics': { icon: 'tabler-chart-dots', group: 'primary' },
  'cliente.campanas': { icon: 'tabler-speakerphone', group: 'primary' },

  // Capabilities (modules forward-looking — addons + bundles)
  'cliente.creative_hub': { icon: 'tabler-palette', group: 'capabilities' },
  'cliente.brand_intelligence': { icon: 'tabler-bulb', group: 'capabilities' },
  'cliente.csc_pipeline': { icon: 'tabler-route', group: 'capabilities' },
  'cliente.cvr_quarterly': { icon: 'tabler-presentation-analytics', group: 'capabilities' },
  'cliente.roi_reports': { icon: 'tabler-report-money', group: 'capabilities' },
  'cliente.exports': { icon: 'tabler-file-export', group: 'capabilities' },
  'cliente.staff_aug': { icon: 'tabler-users-group', group: 'capabilities' },
  'cliente.crm_command': { icon: 'tabler-address-book', group: 'capabilities' },
  'cliente.web_delivery': { icon: 'tabler-world-www', group: 'capabilities' },
  'cliente.modulos': { icon: 'tabler-puzzle', group: 'capabilities' },

  // Mi Cuenta (transversal, siempre accesibles)
  'cliente.actualizaciones': { icon: 'tabler-bell', group: 'account' },
  'cliente.notificaciones': { icon: 'tabler-notification', group: 'account' },
  'cliente.configuracion': { icon: 'tabler-settings', group: 'account' }
}

const FALLBACK_NAV_DESCRIPTOR = { icon: 'tabler-app-window', group: 'capabilities' as const }

/**
 * Tier priority para dedup: menor número gana cuando un viewCode aparece en
 * múltiples módulos. Determinístico: `standard > addon > pilot`.
 */
const TIER_PRIORITY: Record<string, number> = {
  standard: 0,
  enterprise: 0,
  addon: 1,
  pilot: 2,
  internal: 3
}

/**
 * Group ordering para sort final. Garantiza que primary items aparezcan
 * antes que capabilities, y account siempre al final.
 */
const GROUP_ORDER: Record<NavItemGroup, number> = {
  primary: 0,
  capabilities: 1,
  account: 2
}

const buildRegistryIndex = (): Map<string, GovernanceViewRegistryEntry> => {
  const map = new Map<string, GovernanceViewRegistryEntry>()

  for (const entry of VIEW_REGISTRY) {
    if (entry.routeGroup === 'client') {
      map.set(entry.viewCode, entry)
    }
  }

  return map
}

/**
 * Pure function canonical. Server-only invocación esperada desde
 * `<ClientPortalNavigation>` (server component) en cada page load.
 *
 * Idempotente: dos llamadas con el mismo input devuelven el mismo output
 * (same order, same items). Determinístico para visual regression testing.
 *
 * Returns `readonly ClientNavItem[]` — los items YA filtrados, dedupeados,
 * sorted. El consumer solo renderiza.
 */
export const composeNavItemsFromModules = (
  modules: readonly ResolvedClientPortalModule[]
): readonly ClientNavItem[] => {
  const registryIndex = buildRegistryIndex()

  // 1 + 2: Flatten + dedup por viewCode con tier priority winner
  type Candidate = { viewCode: string; tier: string; winnerPriority: number }
  const candidates = new Map<string, Candidate>()

  for (const mod of modules) {
    const tierPriority = TIER_PRIORITY[mod.tier] ?? Number.MAX_SAFE_INTEGER

    for (const viewCode of mod.viewCodes) {
      // Solo client-facing viewCodes (defense: seed puede declarar otros prefixes futuros)
      if (!viewCode.startsWith('cliente.')) continue

      const existing = candidates.get(viewCode)

      if (!existing || tierPriority < existing.winnerPriority) {
        candidates.set(viewCode, {
          viewCode,
          tier: mod.tier,
          winnerPriority: tierPriority
        })
      }
    }
  }

  // 3 + 4: Lookup VIEW_REGISTRY + filter defensive
  const items: ClientNavItem[] = []

  for (const candidate of candidates.values()) {
    const registryEntry = registryIndex.get(candidate.viewCode)

    if (!registryEntry) continue // Defensive: viewCode no registrado, skip

    const descriptor = VIEW_CODE_NAV_DESCRIPTOR[candidate.viewCode] ?? FALLBACK_NAV_DESCRIPTOR

    // Map module tier (catalog values) → NavItemTier enum
    const navTier: NavItemTier =
      candidate.tier === 'addon' ? 'addon' : candidate.tier === 'pilot' ? 'pilot' : 'standard'

    items.push({
      viewCode: candidate.viewCode,
      label: registryEntry.label,
      route: registryEntry.routePath,
      icon: descriptor.icon,
      group: descriptor.group,
      tier: navTier
    })
  }

  // 6: Sort canonical
  items.sort((a, b) => {
    const groupDiff = GROUP_ORDER[a.group] - GROUP_ORDER[b.group]

    if (groupDiff !== 0) return groupDiff

    const tierDiff = TIER_PRIORITY[a.tier] - TIER_PRIORITY[b.tier]

    if (tierDiff !== 0) return tierDiff

    return a.label.localeCompare(b.label, 'es')
  })

  return items
}

// `groupNavItems` re-exportado desde `menu-builder-shape` arriba para
// back-compat. La declaración canonical vive en el shape file (client-safe,
// pure function sin server-only). Helper para agrupar nav items por section
// con dividers entre groups.
