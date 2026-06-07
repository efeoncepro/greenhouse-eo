import type { Placement } from '@floating-ui/react'

/**
 * floating-surface-controller — single source of truth for the Greenhouse
 * Floating Surface primitive (TASK-1033). Pure, render-free, testable.
 *
 * Owns the canonical contract per variant (role, interaction, focus, dismissal,
 * placement, density, motion) and the idempotent `kind -> variant` resolver.
 * The component (`GreenhouseFloatingSurface.tsx`) consumes this config; it never
 * inlines per-surface positioning/a11y decisions.
 *
 * ADR: docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md
 * Methodology: Primitive + Variants + Kinds
 *   (docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md)
 */

/** Official V1 functional variants. Behaviour, not skins. */
export type GreenhouseFloatingSurfaceVariant =
  | 'richTooltip'
  | 'actionMenu'
  | 'evidencePeek'
  | 'inlineEditor'
  | 'validationBubble'
  | 'commandPreview'

/** Semantic domain/workflow kinds mapped onto a variant. */
export type GreenhouseFloatingSurfaceKind =
  | 'metricHelp'
  | 'fieldHelp'
  | 'rowActions'
  | 'headerActions'
  | 'costProvenance'
  | 'totalsAddons'
  | 'fieldProvenance'
  | 'inlineFieldEdit'
  | 'fieldValidation'
  | 'commandResultPreview'

/** Primary open interaction the variant ships with. */
export type GreenhouseFloatingSurfaceInteraction = 'click' | 'hover'

/** ARIA role passed to `useRole`. Kept to the safe non-modal subset. */
export type GreenhouseFloatingSurfaceRole = 'tooltip' | 'menu' | 'dialog'

export type GreenhouseFloatingSurfaceDensity = 'compact' | 'comfortable'

export type GreenhouseFloatingSurfaceMotion = 'fade' | 'none'

export const FLOATING_SURFACE_CHROME_TOKENS = Object.freeze({
  /** Viewport collision padding and max-width inset share the same gutter. */
  viewportMargin: 16,
  /** MUI spacing units. The surface component resolves these through theme spacing. */
  densityPadding: {
    compact: 1.5,
    comfortable: 2
  }
} as const satisfies {
  viewportMargin: number
  densityPadding: Record<GreenhouseFloatingSurfaceDensity, number>
})

export const FLOATING_SURFACE_MOTION_TOKENS = Object.freeze({
  fadeDuration: 'short',
  fadeEase: 'emphasized'
} as const)

export interface GreenhouseFloatingSurfaceVariantConfig {
  /** ARIA role for `useRole`. Non-modal surfaces never claim `aria-modal`. */
  role: GreenhouseFloatingSurfaceRole

  /** How the surface opens by default. */
  interaction: GreenhouseFloatingSurfaceInteraction

  /** Wrap content in `FloatingFocusManager` (trap-light + return focus). */
  focusManaged: boolean

  /** Return focus to the anchor on close (only meaningful when focusManaged). */
  returnFocus: boolean

  /** Dismiss on outside press. Editors default to `false` (dirty state lives in the consumer). */
  dismissOnOutsidePress: boolean

  /** Dismiss on Escape. */
  dismissOnEscape: boolean

  /** `offset()` middleware distance in px. */
  offset: number

  /** Default placement before flip/shift collision handling. */
  placement: Placement

  /** Visual density hint for the surface chrome. */
  density: GreenhouseFloatingSurfaceDensity

  /** Open/close motion. Always overridden to `none` under reduced-motion. */
  motion: GreenhouseFloatingSurfaceMotion

  /** Default surface width in px (consumer may override). */
  defaultWidth: number
}

/**
 * Canonical per-variant contract. Frozen — a new behaviour means a new variant,
 * not an ad-hoc override at the call site.
 */
export const FLOATING_SURFACE_VARIANT_CONFIG: Readonly<
  Record<GreenhouseFloatingSurfaceVariant, GreenhouseFloatingSurfaceVariantConfig>
> = Object.freeze({
  richTooltip: {
    role: 'tooltip',
    interaction: 'hover',
    focusManaged: false,
    returnFocus: false,
    dismissOnOutsidePress: true,
    dismissOnEscape: true,
    offset: 8,
    placement: 'top',
    density: 'compact',
    motion: 'fade',
    defaultWidth: 280
  },
  actionMenu: {
    role: 'menu',
    interaction: 'click',
    focusManaged: true,
    returnFocus: true,
    dismissOnOutsidePress: true,
    dismissOnEscape: true,
    offset: 8,
    placement: 'bottom-start',
    density: 'compact',
    motion: 'fade',
    defaultWidth: 240
  },
  evidencePeek: {
    role: 'dialog',
    interaction: 'click',
    focusManaged: true,
    returnFocus: true,
    dismissOnOutsidePress: true,
    dismissOnEscape: true,
    offset: 8,
    placement: 'bottom-start',
    density: 'comfortable',
    motion: 'fade',
    defaultWidth: 360
  },
  inlineEditor: {
    role: 'dialog',
    interaction: 'click',
    focusManaged: true,
    returnFocus: true,
    // Editors hold local dirty state — outside press must not silently discard.
    dismissOnOutsidePress: false,
    dismissOnEscape: true,
    offset: 8,
    placement: 'bottom-start',
    density: 'comfortable',
    motion: 'fade',
    defaultWidth: 320
  },
  validationBubble: {
    role: 'tooltip',
    interaction: 'hover',
    focusManaged: false,
    returnFocus: false,
    dismissOnOutsidePress: true,
    dismissOnEscape: true,
    offset: 6,
    placement: 'bottom-start',
    density: 'compact',
    motion: 'fade',
    defaultWidth: 280
  },
  commandPreview: {
    role: 'tooltip',
    interaction: 'hover',
    focusManaged: false,
    returnFocus: false,
    dismissOnOutsidePress: true,
    dismissOnEscape: true,
    offset: 8,
    placement: 'right-start',
    density: 'comfortable',
    motion: 'fade',
    defaultWidth: 320
  }
})

/** Idempotent semantic mapping. A kind always resolves to exactly one variant. */
const KIND_TO_VARIANT: Readonly<Record<GreenhouseFloatingSurfaceKind, GreenhouseFloatingSurfaceVariant>> =
  Object.freeze({
    metricHelp: 'richTooltip',
    fieldHelp: 'richTooltip',
    rowActions: 'actionMenu',
    headerActions: 'actionMenu',
    costProvenance: 'evidencePeek',
    totalsAddons: 'evidencePeek',
    fieldProvenance: 'evidencePeek',
    inlineFieldEdit: 'inlineEditor',
    fieldValidation: 'validationBubble',
    commandResultPreview: 'commandPreview'
  })

/** Conservative default when neither a variant nor a known kind is supplied. */
export const DEFAULT_FLOATING_SURFACE_VARIANT: GreenhouseFloatingSurfaceVariant = 'richTooltip'

export interface ResolveFloatingSurfaceVariantInput {
  variant?: GreenhouseFloatingSurfaceVariant
  kind?: GreenhouseFloatingSurfaceKind
}

/**
 * Resolve the effective variant. An explicit `variant` always wins; otherwise a
 * known `kind` maps to its variant; otherwise the conservative default. Pure and
 * idempotent: `resolve(resolve(x)) === resolve(x)` because the output is always a
 * canonical variant that maps to itself when fed back as `variant`.
 */
export const resolveFloatingSurfaceVariant = (
  input: ResolveFloatingSurfaceVariantInput = {}
): GreenhouseFloatingSurfaceVariant => {
  if (input.variant && input.variant in FLOATING_SURFACE_VARIANT_CONFIG) {
    return input.variant
  }

  if (input.kind && input.kind in KIND_TO_VARIANT) {
    return KIND_TO_VARIANT[input.kind]
  }

  return DEFAULT_FLOATING_SURFACE_VARIANT
}

/** Lookup the frozen contract for a resolved variant. */
export const getFloatingSurfaceVariantConfig = (
  variant: GreenhouseFloatingSurfaceVariant
): GreenhouseFloatingSurfaceVariantConfig => FLOATING_SURFACE_VARIANT_CONFIG[variant]

/** All official variants (stable order) — handy for labs/tests/iteration. */
export const FLOATING_SURFACE_VARIANTS: readonly GreenhouseFloatingSurfaceVariant[] = Object.freeze([
  'richTooltip',
  'actionMenu',
  'evidencePeek',
  'inlineEditor',
  'validationBubble',
  'commandPreview'
])
