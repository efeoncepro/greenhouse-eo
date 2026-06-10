/**
 * GreenhouseDisclosureTrigger — variant + kind controller.
 *
 * Owns the canonical contract per variant: default icon, the rotation applied while
 * open (the only motion this primitive expresses), and the idempotent `kind → variant`
 * resolver. Methodology: Primitive + Variants + Kinds. Variants are BEHAVIOUR (icon +
 * open-state rotation), never skins. The rotation is the disclosure signal; motion is
 * always tokenized + reduced-motion-aware at the component layer.
 */

/** Official V1 functional variants. */
export type GreenhouseDisclosureTriggerVariant = 'addToggle' | 'expand' | 'reveal'

/** Semantic domain/workflow kinds mapped onto a variant. */
export type GreenhouseDisclosureTriggerKind =
  | 'linkResource'
  | 'addEntry'
  | 'expandSection'
  | 'showFilters'
  | 'moreActions'
  | 'custom'

export interface GreenhouseDisclosureTriggerVariantConfig {
  variant: GreenhouseDisclosureTriggerVariant
  /** Default Tabler icon class. Consumers may override via `iconClassName`. */
  defaultIconClassName: string
  /** Degrees the icon rotates while open (clockwise). 45 turns a plus into an ×. */
  openRotationDeg: number
}

/** Canonical per-variant contract. Frozen — a new behaviour means a new variant. */
export const DISCLOSURE_TRIGGER_VARIANT_CONFIG: Readonly<
  Record<GreenhouseDisclosureTriggerVariant, GreenhouseDisclosureTriggerVariantConfig>
> = Object.freeze({
  // "+" that rotates 45° → reads as × (add / open ↔ close). Default.
  addToggle: { variant: 'addToggle', defaultIconClassName: 'tabler-plus', openRotationDeg: 45 },
  // Chevron that flips 180° (expand / collapse a section).
  expand: { variant: 'expand', defaultIconClassName: 'tabler-chevron-down', openRotationDeg: 180 },
  // Quarter turn (90°) — kebab → horizontal dots; for "more / options" menus. Use an
  // asymmetric icon so the 90° turn reads (a symmetric "+" would be a visual no-op).
  reveal: { variant: 'reveal', defaultIconClassName: 'tabler-dots-vertical', openRotationDeg: 90 }
})

const KIND_TO_VARIANT: Readonly<
  Record<GreenhouseDisclosureTriggerKind, GreenhouseDisclosureTriggerVariant>
> = Object.freeze({
  linkResource: 'addToggle',
  addEntry: 'addToggle',
  expandSection: 'expand',
  showFilters: 'expand',
  moreActions: 'reveal',
  custom: 'addToggle'
})

/** Resolve the functional variant. Explicit `variant` wins; else map `kind`; else default. */
export const resolveDisclosureTriggerVariant = ({
  variant,
  kind
}: {
  variant?: GreenhouseDisclosureTriggerVariant
  kind?: GreenhouseDisclosureTriggerKind
}): GreenhouseDisclosureTriggerVariant => variant ?? (kind ? KIND_TO_VARIANT[kind] : 'addToggle')

export const getDisclosureTriggerVariantConfig = (
  variant: GreenhouseDisclosureTriggerVariant
): GreenhouseDisclosureTriggerVariantConfig => DISCLOSURE_TRIGGER_VARIANT_CONFIG[variant]
