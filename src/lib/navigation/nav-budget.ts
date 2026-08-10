/**
 * TASK-1389 — evaluador del presupuesto de navegación del rail interno.
 *
 * Recibe el `menuData` REAL que construye `VerticalMenu` (grabado por el
 * harness de tests con la sesión superadmin) y lo mide contra el presupuesto
 * del Contrato de Asignación de Superficies
 * (`docs/architecture/agent-invariants/NAVIGATION_SURFACE_ALLOCATION_CONTRACT.md`).
 * Evaluar el árbol vivo — y no un parse estático de `VerticalMenu.tsx` — es lo
 * que lo hace inmune al código imperativo/condicional del constructor.
 *
 * Consumers: `VerticalMenu.budget.test.tsx` (suite/CI) y
 * `scripts/ci/nav-budget-gate.mjs` (`pnpm nav:budget`).
 */

import type { VerticalMenuDataType } from '@/types/menuTypes'

import { buildMyNavItems, MY_NAV_HOME } from './my-nav-items'

/**
 * Presupuesto del rail interno. Editables SOLO con justificación en el PR +
 * update del contrato (sección "El presupuesto del sidebar interno").
 */
export const NAV_BUDGET = {
  /**
   * Slots de primer nivel interactivo (Home pineado + hijos directos de las
   * zonas `isSection`) para la sesión superadmin. Es la medición EXACTA
   * post-TASK-1388 — cero aire, deliberado: agregar un slot exige quitar otro
   * o justificar el aumento.
   */
  MAX_TOP_LEVEL_SLOTS: 8,

  /** Niveles colapsables anidados (dominio → sección). Hojas a profundidad ≤ 3. */
  MAX_INTERACTIVE_DEPTH: 2
} as const

export interface NavBudgetViolation {
  rule:
    | 'top_level_slots'
    | 'interactive_depth'
    | 'section_not_at_root'
    | 'root_outside_zone'
    | 'personal_route_in_rail'
  message: string
  /** Ubicación legible (cadena de labels/href) del nodo que viola. */
  location: string
  /** Conteo medido vs tope, cuando la regla es numérica. */
  measured?: number
  budget?: number
}

type AnyNode = {
  label?: unknown
  href?: string
  isSection?: boolean
  children?: VerticalMenuDataType[]
}

const labelOf = (node: AnyNode): string => {
  if (typeof node.label === 'string') return node.label
  if (node.href) return node.href

  // Labels ReactNode (NavLabel): identificar por href de su primer hijo si existe.
  return node.children?.length ? `(grupo con ${node.children.length} hijos)` : '(nodo)'
}

/** Set de rutas personales derivado del builder canónico — nunca hardcodeado. */
export const personalRailRoutes = (): ReadonlySet<string> => {
  const items = buildMyNavItems(
    {
      authorizedViews: [],
      hasActiveContractorEngagement: true,
      hasWorkforceContractingDocument: true
    },
    { includeHome: true }
  )

  return new Set([MY_NAV_HOME.href, ...items.map(item => item.href)])
}

/**
 * Evalúa el árbol del rail INTERNO contra el presupuesto.
 *
 * `homeHref` identifica el único leaf permitido en la raíz fuera de zonas
 * (el Home pineado del portal).
 */
export const evaluateNavBudget = (
  menuData: readonly VerticalMenuDataType[],
  options: { homeHref?: string } = {}
): NavBudgetViolation[] => {
  const homeHref = options.homeHref ?? '/home'
  const violations: NavBudgetViolation[] = []
  const personal = personalRailRoutes()

  // ── Regla: raíz solo para zonas + el Home pineado ──
  const rootEntries = menuData as AnyNode[]

  for (const entry of rootEntries) {
    if (entry.isSection) continue
    if (entry.href === homeHref) continue

    violations.push({
      rule: 'root_outside_zone',
      message:
        'Entrada de primer nivel fuera de una zona isSection (solo el Home pineado puede vivir en la raíz). Un destino nuevo entra DENTRO de un dominio o justifica dominio propio.',
      location: labelOf(entry)
    })
  }

  // ── Regla: slots de primer nivel interactivo ≤ MAX_TOP_LEVEL_SLOTS ──
  const topLevelSlots: AnyNode[] = []

  for (const entry of rootEntries) {
    if (entry.isSection) {
      topLevelSlots.push(...((entry.children ?? []) as AnyNode[]))
    } else {
      topLevelSlots.push(entry)
    }
  }

  if (topLevelSlots.length > NAV_BUDGET.MAX_TOP_LEVEL_SLOTS) {
    violations.push({
      rule: 'top_level_slots',
      message: `El rail tiene ${topLevelSlots.length} slots de primer nivel y el presupuesto es ${NAV_BUDGET.MAX_TOP_LEVEL_SLOTS}. Quita/fusiona un grupo o justifica el aumento en el contrato.`,
      location: topLevelSlots.map(labelOf).join(' · '),
      measured: topLevelSlots.length,
      budget: NAV_BUDGET.MAX_TOP_LEVEL_SLOTS
    })
  }

  // ── Reglas por recorrido: profundidad, zonas anidadas, rutas personales ──
  const walk = (nodes: readonly VerticalMenuDataType[], depth: number, trail: string) => {
    for (const raw of nodes) {
      const node = raw as AnyNode
      const here = trail ? `${trail} → ${labelOf(node)}` : labelOf(node)

      if (node.isSection && depth > 0) {
        violations.push({
          rule: 'section_not_at_root',
          message: 'Zona isSection anidada dentro de un grupo — las zonas solo viven en la raíz del rail.',
          location: here
        })
      }

      if (node.href && personal.has(node.href)) {
        violations.push({
          rule: 'personal_route_in_rail',
          message: `Ruta personal ${node.href} en el rail interno — lo personal vive en el menú del avatar (buildMyNavItems). (El rail del colaborador puro es otra rama y no pasa por este gate.)`,
          location: here
        })
      }

      if (node.children?.length) {
        // Las zonas isSection son headings: no consumen nivel interactivo.
        const nextDepth = node.isSection ? depth : depth + 1

        if (!node.isSection && nextDepth > NAV_BUDGET.MAX_INTERACTIVE_DEPTH) {
          violations.push({
            rule: 'interactive_depth',
            message: `Grupo colapsable a profundidad interactiva ${nextDepth} (tope ${NAV_BUDGET.MAX_INTERACTIVE_DEPTH}: dominio → sección). Aplana la jerarquía.`,
            location: here,
            measured: nextDepth,
            budget: NAV_BUDGET.MAX_INTERACTIVE_DEPTH
          })
        }

        walk(node.children, nextDepth, here)
      }
    }
  }

  walk(menuData, 0, '')

  return violations
}
