/**
 * GreenhouseAnchoredDisclosure — variant + kind controller.
 *
 * The Anchored Disclosure is a higher-order primitive: a `GreenhouseDisclosureTrigger`
 * that anchors a `GreenhouseFloatingSurface` to reveal contextual UI in place, with an
 * optional companion action beside it. It COMPOSES those primitives (never forks them).
 * Each variant resolves to a (floating-surface variant + trigger variant) pair, so the
 * a11y/dismissal/placement/motion contracts come from the underlying primitives.
 * Methodology: Primitive + Variants + Kinds.
 */

import type { GreenhouseFloatingSurfaceVariant } from './floating-surface-controller'
import type { GreenhouseDisclosureTriggerVariant } from './disclosure-trigger-controller'

/** Official V1 functional variants. Behaviour, not skins. */
export type GreenhouseAnchoredDisclosureVariant = 'contextualEditor' | 'actionMenu' | 'quickPeek'

/** Semantic domain/workflow kinds mapped onto a variant. */
export type GreenhouseAnchoredDisclosureKind =
  | 'figmaNodeLink'
  | 'quickAdd'
  | 'contextualOptions'
  | 'evidence'
  | 'custom'

export interface GreenhouseAnchoredDisclosureVariantConfig {
  variant: GreenhouseAnchoredDisclosureVariant
  floatingSurfaceVariant: GreenhouseFloatingSurfaceVariant
  triggerVariant: GreenhouseDisclosureTriggerVariant
}

/** Canonical per-variant contract. Frozen — a new behaviour means a new variant. */
export const ANCHORED_DISCLOSURE_VARIANT_CONFIG: Readonly<
  Record<GreenhouseAnchoredDisclosureVariant, GreenhouseAnchoredDisclosureVariantConfig>
> = Object.freeze({
  // Low-risk in-place editing (link a node, rename, quick form). Dirty-safe surface.
  contextualEditor: { variant: 'contextualEditor', floatingSurfaceVariant: 'inlineEditor', triggerVariant: 'addToggle' },
  // A menu of actions revealed from the trigger.
  actionMenu: { variant: 'actionMenu', floatingSurfaceVariant: 'actionMenu', triggerVariant: 'reveal' },
  // A transient peek at evidence/detail.
  quickPeek: { variant: 'quickPeek', floatingSurfaceVariant: 'evidencePeek', triggerVariant: 'reveal' }
})

const KIND_TO_VARIANT: Readonly<
  Record<GreenhouseAnchoredDisclosureKind, GreenhouseAnchoredDisclosureVariant>
> = Object.freeze({
  figmaNodeLink: 'contextualEditor',
  quickAdd: 'actionMenu',
  contextualOptions: 'actionMenu',
  evidence: 'quickPeek',
  custom: 'contextualEditor'
})

/** Resolve the functional variant. Explicit `variant` wins; else map `kind`; else default. */
export const resolveAnchoredDisclosureVariant = ({
  variant,
  kind
}: {
  variant?: GreenhouseAnchoredDisclosureVariant
  kind?: GreenhouseAnchoredDisclosureKind
}): GreenhouseAnchoredDisclosureVariant => variant ?? (kind ? KIND_TO_VARIANT[kind] : 'contextualEditor')

export const getAnchoredDisclosureVariantConfig = (
  variant: GreenhouseAnchoredDisclosureVariant
): GreenhouseAnchoredDisclosureVariantConfig => ANCHORED_DISCLOSURE_VARIANT_CONFIG[variant]
