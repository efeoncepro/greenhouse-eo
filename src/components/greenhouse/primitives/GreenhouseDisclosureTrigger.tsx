'use client'

import { forwardRef } from 'react'

import IconButton from '@mui/material/IconButton'
import type { IconButtonProps } from '@mui/material/IconButton'

import useReducedMotion from '@/hooks/useReducedMotion'

import {
  getDisclosureTriggerVariantConfig,
  resolveDisclosureTriggerVariant,
  type GreenhouseDisclosureTriggerKind,
  type GreenhouseDisclosureTriggerVariant
} from './disclosure-trigger-controller'

export interface GreenhouseDisclosureTriggerProps extends Omit<IconButtonProps, 'children' | 'size' | 'color'> {
  /** Official functional variant. Overrides `kind`. */
  variant?: GreenhouseDisclosureTriggerVariant
  /** Semantic kind resolved to a variant via the controller. */
  kind?: GreenhouseDisclosureTriggerKind
  /**
   * Open state — drives the rotation. If omitted, derived from the spread
   * `data-state` (so it works as a `GreenhouseFloatingSurface` anchor with zero wiring).
   */
  open?: boolean
  /** Override the variant's default icon (Tabler class). */
  iconClassName?: string
  /** 32px (`small`, default) or 40px (`medium`). */
  size?: 'small' | 'medium'
  /** Required — the trigger is icon-only. */
  ariaLabel: string
  dataCapture?: string
}

const SIZE_PX = { small: 32, medium: 40 } as const

/**
 * GreenhouseDisclosureTrigger — canonical icon-only trigger that signals open/closed
 * via icon rotation (TASK-1072). Atom of the Anchored Disclosure pattern, but usable
 * standalone (accordion chevron, add-row toggle…). a11y: `aria-expanded`, required
 * `ariaLabel`. Motion: tokenized (`theme.transitions`) + reduced-motion baked. Zero
 * hardcode — borders/hover from theme. Wraps MUI `IconButton` (never reinvents the base);
 * `forwardRef` so it spreads cleanly as a FloatingSurface anchor.
 */
const GreenhouseDisclosureTrigger = forwardRef<HTMLButtonElement, GreenhouseDisclosureTriggerProps>(
  ({ variant, kind, open, iconClassName, size = 'small', ariaLabel, dataCapture, sx, ...rest }, ref) => {
    const reduced = useReducedMotion()
    const resolvedVariant = resolveDisclosureTriggerVariant({ variant, kind })
    const config = getDisclosureTriggerVariantConfig(resolvedVariant)

    const isOpen = open ?? (rest as Record<string, unknown>)['data-state'] === 'open'
    const px = SIZE_PX[size]

    return (
      <IconButton
        {...rest}
        ref={ref}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        data-capture={dataCapture}
        sx={[
          {
            inlineSize: px,
            blockSize: px,
            color: 'text.secondary',
            border: theme => `1px solid ${theme.palette.divider}`,
            transition: reduced
              ? 'none'
              : theme => theme.transitions.create(['background-color', 'border-color', 'color']),
            '& i': {
              fontSize: size === 'small' ? 18 : 20,
              lineHeight: 1,
              transition: reduced
                ? 'none'
                : theme => theme.transitions.create('transform', { duration: theme.transitions.duration.standard }),
              transform: isOpen ? `rotate(${config.openRotationDeg}deg)` : 'rotate(0deg)'
            },
            '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main', color: 'primary.main' },
            '&.Mui-focusVisible': { borderColor: 'primary.main', color: 'primary.main' }
          },
          ...(Array.isArray(sx) ? sx : [sx])
        ]}
      >
        <i className={iconClassName ?? config.defaultIconClassName} aria-hidden='true' />
      </IconButton>
    )
  }
)

GreenhouseDisclosureTrigger.displayName = 'GreenhouseDisclosureTrigger'

export default GreenhouseDisclosureTrigger
