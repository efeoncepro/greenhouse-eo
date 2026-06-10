'use client'

import type { ReactNode } from 'react'

import Stack from '@mui/material/Stack'
import type { Placement } from '@floating-ui/react'

import GreenhouseFloatingSurface from './GreenhouseFloatingSurface'
import GreenhouseDisclosureTrigger from './GreenhouseDisclosureTrigger'
import {
  getAnchoredDisclosureVariantConfig,
  resolveAnchoredDisclosureVariant,
  type GreenhouseAnchoredDisclosureKind,
  type GreenhouseAnchoredDisclosureVariant
} from './anchored-disclosure-controller'

export interface GreenhouseAnchoredDisclosureContentProps {
  close: () => void
}

export interface GreenhouseAnchoredDisclosureProps {
  /** Official functional variant. Overrides `kind`. */
  variant?: GreenhouseAnchoredDisclosureVariant
  /** Semantic kind resolved to a variant via the controller. */
  kind?: GreenhouseAnchoredDisclosureKind

  /** Required — the trigger is icon-only. */
  triggerAriaLabel: string
  /** Override the trigger's default icon (Tabler class). */
  triggerIconClassName?: string
  /** 32px (`small`, default) or 40px (`medium`). */
  triggerSize?: 'small' | 'medium'
  triggerDataCapture?: string

  /** Optional action rendered to the RIGHT of the trigger (e.g. an open/primary button). */
  companion?: ReactNode

  /** Surface content render-prop. Receives `close`. */
  content: (props: GreenhouseAnchoredDisclosureContentProps) => ReactNode

  /** Controlled open state. Omit for uncontrolled. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean

  /** Surface width in px (defaults to the resolved floating-surface variant default). */
  surfaceWidth?: number
  /** Placement override (defaults to the variant's canonical placement). */
  placement?: Placement
  /** Override the surface's outside-press dismissal. */
  dismissOnOutsidePress?: boolean

  dataCapture?: string
}

/**
 * GreenhouseAnchoredDisclosure — a `GreenhouseDisclosureTrigger` that anchors a
 * `GreenhouseFloatingSurface` to reveal contextual UI in place, with an optional
 * companion action beside it (TASK-1072). Higher-order primitive: COMPOSES the two
 * underlying primitives (never forks them) — a11y/dismissal/placement/motion come from
 * `GreenhouseFloatingSurface`, the open-state rotation from `GreenhouseDisclosureTrigger`.
 * Each variant maps to a (surface variant + trigger variant) pair via the controller.
 */
const GreenhouseAnchoredDisclosure = ({
  variant,
  kind,
  triggerAriaLabel,
  triggerIconClassName,
  triggerSize = 'small',
  triggerDataCapture,
  companion,
  content,
  open,
  onOpenChange,
  defaultOpen,
  surfaceWidth,
  placement,
  dismissOnOutsidePress,
  dataCapture
}: GreenhouseAnchoredDisclosureProps) => {
  const resolvedVariant = resolveAnchoredDisclosureVariant({ variant, kind })
  const config = getAnchoredDisclosureVariantConfig(resolvedVariant)

  return (
    <Stack direction='row' alignItems='center' spacing={2} data-capture={dataCapture}>
      <GreenhouseFloatingSurface
        variant={config.floatingSurfaceVariant}
        open={open}
        onOpenChange={onOpenChange}
        defaultOpen={defaultOpen}
        width={surfaceWidth}
        placement={placement}
        dismissOnOutsidePress={dismissOnOutsidePress}
        anchor={anchorProps => (
          <GreenhouseDisclosureTrigger
            {...anchorProps}
            variant={config.triggerVariant}
            ariaLabel={triggerAriaLabel}
            iconClassName={triggerIconClassName}
            size={triggerSize}
            dataCapture={triggerDataCapture}
          />
        )}
        content={({ close }) => content({ close })}
      />
      {companion}
    </Stack>
  )
}

export default GreenhouseAnchoredDisclosure
