import type {
  CompositionShellComposition,
  CompositionShellCompositionConfig,
  CompositionShellKind,
  CompositionShellRegion,
  CompositionShellRegionMeta,
  CompositionShellSizeClass,
  CompositionShellTelemetryEvent,
  CompositionShellTelemetryEventName
} from './composition-shell-types'

export type { CompositionShellTelemetryEvent, CompositionShellTelemetryEventName } from './composition-shell-types'

/**
 * Controller del CompositionShell — puro, idempotente, testeable sin DOM.
 * Resuelve kind→composición, config por composición, metadata de regiones, layout por size class y el
 * reducer de estado (morph + collision/dirty-guard). Espeja `resolveAdaptiveSidecarMode` /
 * `reduceAdaptiveSidecarState` (TASK-1028) y `resolveNexaMomentCompositionVariant` (TASK-1110).
 */

// ── Region metadata (singleton view-transition-name + min-inline-size) ────────
// minInlineSize son constraints de layout (no spacing scale). Derivados de resolveAdaptiveSidecarMode
// (mainMinWidth 760 / sidecarWidth 420) ajustados al modelo de regiones; se afinan con GVC.
export const COMPOSITION_SHELL_REGION_META: Record<CompositionShellRegion, CompositionShellRegionMeta> = {
  primary: { region: 'primary', viewTransitionName: 'gh-region-primary', minInlineSize: 480 },
  aside: { region: 'aside', viewTransitionName: 'gh-region-aside', minInlineSize: 360 },
  lead: { region: 'lead', viewTransitionName: 'gh-region-lead', minInlineSize: 0 },
  dock: { region: 'dock', viewTransitionName: 'gh-region-dock', minInlineSize: 0 },
  overlay: { region: 'overlay', viewTransitionName: 'gh-region-overlay', minInlineSize: 0 }
}

/**
 * `view-transition-name` POR INSTANCIA. La metadata define el nombre BASE (`gh-region-primary`);
 * el componente lo escopa con un id único de instancia (`useId`) → dos shells en la misma página NO
 * colisionan (constraint VT: ≤1 elemento por nombre) y el morph entre composiciones de UNA instancia
 * sigue funcionando (nombre estable por región dentro de esa instancia). Espeja el patrón de
 * `NexaMomentComposition` (per-instance VT names). Surfaced por el gate de TASK-1114 (Lab = 2 instancias).
 */
export const regionViewTransitionName = (region: CompositionShellRegion, instanceId: string): string =>
  `${COMPOSITION_SHELL_REGION_META[region].viewTransitionName}-${instanceId}`

// ── Composition config (the canonical layouts) ───────────────────────────────
export const COMPOSITION_SHELL_COMPOSITION_CONFIG: Record<
  CompositionShellComposition,
  CompositionShellCompositionConfig
> = {
  single: { composition: 'single', layout: 'stack', contentRegions: ['primary'], condensesPrimary: false },
  leadPlusContext: {
    composition: 'leadPlusContext',
    layout: 'stack',
    contentRegions: ['lead', 'primary'],
    condensesPrimary: true
  },
  split: { composition: 'split', layout: 'split', contentRegions: ['primary', 'aside'], condensesPrimary: false },
  focused: { composition: 'focused', layout: 'stack', contentRegions: ['primary'], condensesPrimary: false }
}

const KIND_TO_COMPOSITION: Record<CompositionShellKind, CompositionShellComposition> = {
  dashboard: 'single',
  nexaMoment: 'leadPlusContext',
  queueInspector: 'split',
  workspaceDetail: 'split',
  reader: 'focused',
  custom: 'single'
}

/** Precedencia: `composition` explícita > resolución del `kind` > default `single`. */
export const resolveComposition = (input?: {
  composition?: CompositionShellComposition
  kind?: CompositionShellKind
}): CompositionShellComposition => {
  if (input?.composition) return input.composition
  if (input?.kind) return KIND_TO_COMPOSITION[input.kind]

  return 'single'
}

export const resolveCompositionConfig = (input?: {
  composition?: CompositionShellComposition
  kind?: CompositionShellKind
}): CompositionShellCompositionConfig => COMPOSITION_SHELL_COMPOSITION_CONFIG[resolveComposition(input)]

// ── Size class resolution (M3 breakpoints) ───────────────────────────────────
// Mirror de resolveAdaptiveSidecarMode: < medio → compact, < expandido → medium, else expanded.
export const COMPOSITION_SHELL_BREAKPOINTS = { compact: 840, expanded: 1200 } as const

export const resolveSizeClass = (availableWidth?: number): CompositionShellSizeClass => {
  if (availableWidth === undefined) return 'expanded'
  if (availableWidth < COMPOSITION_SHELL_BREAKPOINTS.compact) return 'compact'
  if (availableWidth < COMPOSITION_SHELL_BREAKPOINTS.expanded) return 'medium'

  return 'expanded'
}

export interface ResolvedCompositionLayout {
  /** `split` solo se sostiene si la composición es split Y hay espacio; sino colapsa a `stack`. */
  layout: 'stack' | 'split'
  /** En compact, `aside` se vuelve drawer temporal (semántica modal) en lugar de lane in-flow. */
  asideAsDrawer: boolean
}

/**
 * Resuelve el layout efectivo por composición + size class. Puro.
 * - `split` en expanded/medium → split lanes; en compact → stack + aside como drawer temporal.
 * - `leadPlusContext`/`single`/`focused` → siempre stack.
 */
export const resolveCompositionLayout = (
  composition: CompositionShellComposition,
  sizeClass: CompositionShellSizeClass
): ResolvedCompositionLayout => {
  const config = COMPOSITION_SHELL_COMPOSITION_CONFIG[composition]

  if (config.layout === 'split' && sizeClass !== 'compact') {
    return { layout: 'split', asideAsDrawer: false }
  }

  if (config.layout === 'split' && sizeClass === 'compact') {
    return { layout: 'stack', asideAsDrawer: true }
  }

  return { layout: 'stack', asideAsDrawer: false }
}

// ── State machine + collision / dirty-guard reducer ──────────────────────────
export type CompositionShellControllerLastAction =
  | 'idle'
  | 'composing'
  | 'composed'
  | 'reset'
  | 'dirty_changed'
  | 'blocked_dirty_compose'

export interface CompositionShellControllerState {
  composition: CompositionShellComposition
  phase: 'dormant' | 'composing' | 'composed'
  dirty?: boolean
  lastAction?: CompositionShellControllerLastAction
}

export type CompositionShellControllerAction =
  | { type: 'compose'; composition: CompositionShellComposition; force?: boolean }
  | { type: 'settle' }
  | { type: 'reset'; force?: boolean }
  | { type: 'markDirty'; dirty: boolean }

export const initialCompositionShellState: CompositionShellControllerState = {
  composition: 'single',
  phase: 'dormant',
  dirty: false,
  lastAction: 'idle'
}

/**
 * Reducer de estado del shell. Maneja el lifecycle del morph (`dormant → composing → composed`) +
 * collision/arbitration (dirty-guard al cambiar de composición). Mirror de `reduceAdaptiveSidecarState`.
 */
export const reduceCompositionShellState = (
  state: CompositionShellControllerState,
  action: CompositionShellControllerAction
): CompositionShellControllerState => {
  if (action.type === 'markDirty') {
    if (state.dirty === action.dirty) return state

    return { ...state, dirty: action.dirty, lastAction: 'dirty_changed' }
  }

  if (action.type === 'settle') {
    if (state.phase !== 'composing') return state

    return { ...state, phase: 'composed', lastAction: 'composed' }
  }

  if (action.type === 'reset') {
    if (state.dirty && !action.force) {
      return { ...state, lastAction: 'blocked_dirty_compose' }
    }

    return { composition: 'single', phase: 'dormant', dirty: false, lastAction: 'reset' }
  }

  // compose
  const sameTarget = state.composition === action.composition && state.phase !== 'dormant'

  if (sameTarget) return state

  if (state.phase !== 'dormant' && state.dirty && !action.force) {
    return { ...state, lastAction: 'blocked_dirty_compose' }
  }

  return { composition: action.composition, phase: 'composing', dirty: false, lastAction: 'composing' }
}

// ── Telemetry (opt-in observability of composition changes) ──────────────────
// A layout substrate has no runtime reliability signal (ADR §Resilience names this limit honestly).
// Telemetry is the opt-in observability of REAL usage: which compositions surfaces actually morph between.
// Pure factory mirror of `createAdaptiveSidecarEvent` (TASK-1028) — the consumer decides the sink.
// The telemetry types live in `composition-shell-types` (public contract) and are re-exported above.

export const createCompositionShellEvent = ({
  name,
  composition,
  previousComposition,
  sizeClass,
  source,
  timestamp = new Date().toISOString()
}: Omit<CompositionShellTelemetryEvent, 'timestamp'> & { timestamp?: string }): CompositionShellTelemetryEvent => ({
  name,
  composition,
  previousComposition,
  sizeClass,
  source,
  timestamp
})

/**
 * Maps a reducer `lastAction` to its telemetry event name, or `null` for non-emitting transitions
 * (idle / no-op / dirty bookkeeping). The host emits only when this returns a name → no event spam on
 * idempotent re-renders. Pure.
 */
export const compositionShellActionToTelemetryName = (
  lastAction: CompositionShellControllerLastAction | undefined
): CompositionShellTelemetryEventName | null => {
  switch (lastAction) {
    case 'composing':
      return 'composition.compose'
    case 'composed':
      return 'composition.settle'
    case 'reset':
      return 'composition.reset'
    case 'blocked_dirty_compose':
      return 'composition.blocked_dirty'
    default:
      return null
  }
}
