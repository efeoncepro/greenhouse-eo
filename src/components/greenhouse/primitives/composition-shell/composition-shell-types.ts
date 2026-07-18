import type { ReactNode } from 'react'

/**
 * CompositionShell — substrato de coreografía de layout (TASK-1114).
 *
 * Layout primitive de shell, domain-neutral, aditiva y opt-in: una superficie DECLARA una composición
 * y el substrato aporta el grid de regiones + el morph in-place (View Transitions) + el reflow adaptativo
 * (container queries) + el gobierno del estado. NO reemplaza `LayoutContent` (la surface que no opta queda
 * igual). NO conoce el dominio: `regions` son slots ReactNode; la política (qué composición/contenido) viene
 * del consumer. Contrato: `GREENHOUSE_COMPOSITION_SHELL_UI_PLATFORM_V1.md`.
 *
 * Primitive + Variants + Kinds: la primitive es `CompositionShell`; los variants son las composiciones
 * nombradas (canonical layouts); los kinds semánticos de dominio resuelven a una composición EXISTENTE.
 */

/** Regiones — roles SINGLETON (constraint View Transitions: ≤1 elemento por `view-transition-name`). */
export type CompositionShellRegion = 'primary' | 'aside' | 'lead' | 'dock' | 'overlay'

/**
 * Composiciones — los variants funcionales (canonical layouts de Greenhouse, framing M3). NO skins.
 * - `masterDetail` (TASK-1248): navigator angosto IZQUIERDA + detail canvas ancho DERECHA. Inverso del
 *   `split` (primary ancho + aside angosto): acá `aside` = navigator (angosto) y `primary` = detail (ancho).
 *   En compact colapsa el DETAIL (`primary`) a drawer temporal y el navigator (`aside`) se queda — semántica
 *   de drawer invertida vs `split` (que colapsa el `aside`). Gobernado por config (`compactDrawerRegion`,
 *   `splitTemplateColumns`, `regionMinInlineSize`), NO por ramas `composition===` en el componente.
 */
export type CompositionShellComposition = 'single' | 'leadPlusContext' | 'split' | 'focused' | 'masterDetail'

/** Kinds semánticos de dominio/workflow → resuelven a una composición EXISTENTE (nunca una nueva por dominio). */
export type CompositionShellKind =
  | 'dashboard' // → single
  | 'nexaMoment' // → leadPlusContext (AI Overviews in-place)
  | 'queueInspector' // → split (cola + inspector)
  | 'workspaceDetail' // → split (org workspace shell)
  | 'workbench' // → masterDetail (navigator + detail canvas)
  | 'reader' // → focused
  | 'custom'

/** Estado del morph. El host conduce el estado (igual que la lente y el sidecar). */
export type CompositionShellState = 'dormant' | 'composing' | 'composed'

/** Window size class (M3) — el shell resuelve el layout por el ancho de SU contenedor. */
export type CompositionShellSizeClass = 'compact' | 'medium' | 'expanded'

/** Telemetry opt-in de cambios de composición (observabilidad de uso real). Mirror del shape del sidecar. */
export type CompositionShellTelemetryEventName =
  | 'composition.compose'
  | 'composition.settle'
  | 'composition.reset'
  | 'composition.blocked_dirty'

export interface CompositionShellTelemetryEvent {
  name: CompositionShellTelemetryEventName
  composition: CompositionShellComposition
  previousComposition?: CompositionShellComposition
  sizeClass?: CompositionShellSizeClass
  source?: string
  timestamp: string
}

export interface CompositionShellCompositionConfig {
  composition: CompositionShellComposition
  /** Cómo se acomodan las regiones de contenido. `split` = 2 lanes; `stack` = apiladas. */
  layout: 'stack' | 'split'
  /** Regiones de CONTENIDO que monta (además de `dock`/`overlay`, que son aditivos a cualquier composición). */
  contentRegions: readonly CompositionShellRegion[]
  /** `primary` cede espacio (condensa, nunca desaparece) cuando otra región lidera. */
  condensesPrimary: boolean
  /**
   * Qué región de contenido colapsa a drawer temporal (semántica modal) en compact (solo aplica a
   * `layout: 'split'`). `split` → `aside` (el inspector se esconde); `masterDetail` → `primary` (el detail
   * se esconde y el navigator se queda). `undefined` → no hay drawer (la composición ya es stack).
   */
  compactDrawerRegion?: CompositionShellRegion
  /**
   * `grid-template-columns` responsive cuando `layout: 'split'` se sostiene (expanded/medium). Data, no CSS
   * inline: el componente lo aplica via sx. `undefined` → el default histórico de `split`
   * (`minmax(0,1fr) clamp(320px,32%,480px)`). El orden de columnas espeja el orden de `contentRegions`.
   */
  splitTemplateColumns?: { xs: string; sm: string }
  /**
   * Override per-composición del `min-inline-size` de una región (layout constraint, no spacing scale).
   * Necesario cuando una composición usa una región con un ancho distinto al de su rol default — p.ej.
   * `masterDetail` usa `aside` como navigator angosto, así que baja su min para que el clamp del grid
   * gobierne y no fuerce overflow en compact stack (clase ISSUE-015).
   */
  regionMinInlineSize?: Partial<Record<CompositionShellRegion, number>>
}

/** Metadata por región: `view-transition-name` estable (singleton) + ancho mínimo. */
export interface CompositionShellRegionMeta {
  region: CompositionShellRegion
  /** Estable across composiciones → el browser interpola pos+size (morph FLIP gratis). */
  viewTransitionName: string
  /** Ancho mínimo de la región (layout constraint, no spacing scale). 0 = full/sin mínimo. */
  minInlineSize: number
}

export interface CompositionShellProps {
  /** Composición explícita. Precedencia sobre `kind`. */
  composition?: CompositionShellComposition
  /** Kind semántico de dominio → resuelve a una composición existente. */
  kind?: CompositionShellKind
  /** Estado del morph (host-driven). Default `composed`. */
  state?: CompositionShellState
  /** Slots de contenido por región. El shell renderiza solo las que la composición monta + dock/overlay si vienen. */
  regions: Partial<Record<CompositionShellRegion, ReactNode>>
  /**
   * Override de size class. Por default el shell mide el ancho de su contenedor (ResizeObserver) y lo resuelve.
   * Útil para SSR/tests deterministas.
   */
  sizeClass?: CompositionShellSizeClass
  /** Label accesible de la región `lead` (a11y). */
  leadLabel?: string
  /** Label accesible de la región `aside` (a11y). En `masterDetail` el `aside` es el navigator. */
  asideLabel?: string
  /**
   * Label accesible + texto del trigger del detail-as-drawer (a11y). Solo aplica cuando una composición
   * colapsa `primary` a drawer en compact (`masterDetail`). Default `'Detalle'`.
   */
  detailLabel?: string
  /**
   * ID estable opcional para escopar view-transition-name por instancia sin depender de `useId`.
   * Útil en surfaces SSR donde el árbol puede montar widgets de terceros/MUI con IDs propios.
   */
  instanceId?: string
  /**
   * Enriquecimiento de coreografía (TASK-1117):
   * - `rich` (DEFAULT desde 2026-06-14, decisión del operador) = entrada orquestada con stagger del contenido
   *   + morph estructural (View Transitions) + (opcional) morph interrumpible. El estándar — coreografía
   *   moderna; reduced-motion horneado; el primer paint NO se retrasa (el stagger anima al cambiar de
   *   composición / montar contenido nuevo, no en el load inicial).
   * - `baseline` = opt-out explícito: morph estructural + condense por opacidad, sin stagger (V1).
   */
  fluidity?: 'baseline' | 'rich'
  /**
   * Estrategia de morph (solo aplica con `fluidity='rich'`):
   * - `viewTransition` (default) = morph estructural FLIP por View Transitions (el host dispara `startViewTransition`).
   * - `interruptible` = framer-motion `layout` (redirigible a media animación: drag, cambio de idea). Las dos
   *   capas NUNCA animan el mismo nodo a la vez — VT para lo estructural, framer-motion para lo interrumpible.
   */
  morphStrategy?: 'viewTransition' | 'interruptible'
  /**
   * Telemetry opt-in de cambios de composición (observabilidad de uso real). El substrato emite
   * `composition.compose` al cambiar de composición y `composition.settle` al asentarse. Mirror del patrón
   * `createAdaptiveSidecarEvent`. Sin sink declarado → no se emite nada (cero costo).
   */
  onTelemetry?: (event: CompositionShellTelemetryEvent) => void
  /** Etiqueta de origen para los eventos de telemetry (qué surface). */
  telemetrySource?: string
  /**
   * TASK-1430 — override data-driven de las columnas del grid en layouts `split`
   * (misma vía que la config canónica; NUNCA un sistema de regiones paralelo).
   * Útil cuando la proporción primary/aside del dominio difiere del default
   * (ej. cockpit CTA: detalle más ancho que el inventario). Ignorado en `stack`.
   */
  splitTemplateColumns?: Partial<Record<'xs' | 'sm' | 'md' | 'lg', string>>
  /** sx passthrough opcional para el contenedor raíz. */
  className?: string
}
