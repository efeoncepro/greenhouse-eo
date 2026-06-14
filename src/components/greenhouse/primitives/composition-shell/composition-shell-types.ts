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

/** Composiciones — los variants funcionales (canonical layouts de Greenhouse, framing M3). NO skins. */
export type CompositionShellComposition = 'single' | 'leadPlusContext' | 'split' | 'focused'

/** Kinds semánticos de dominio/workflow → resuelven a una composición EXISTENTE (nunca una nueva por dominio). */
export type CompositionShellKind =
  | 'dashboard' // → single
  | 'nexaMoment' // → leadPlusContext (AI Overviews in-place)
  | 'queueInspector' // → split (cola + inspector)
  | 'workspaceDetail' // → split (org workspace shell)
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
  /** Label accesible de la región `aside` (a11y). */
  asideLabel?: string
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
  /** sx passthrough opcional para el contenedor raíz. */
  className?: string
}
