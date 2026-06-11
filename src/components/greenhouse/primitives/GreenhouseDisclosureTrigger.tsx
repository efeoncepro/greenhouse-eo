'use client'

import { forwardRef } from 'react'

import IconButton from '@mui/material/IconButton'
import type { IconButtonProps } from '@mui/material/IconButton'

import { motion } from '@/libs/FramerMotion'
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
 * Nexa brand mark morph (TASK-1075 follow-up). Inherits `currentColor`, so the
 * trigger's idle-gray → hover-blue contract tints it for free. Closed: full mark
 * (arc + spark). Open: the arc fades + collapses, the spark glides to center and
 * grows — the brand mark itself signals state. Reduced-motion → instant swap.
 */
const NexaMarkMorph = ({ open, reduced, sizePx }: { open: boolean; reduced: boolean; sizePx: number }) => {
  const arcTransition = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 30, mass: 0.6 }
  const sparkTransition = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 300, damping: 18, mass: 0.7 }

  return (
    <svg
      viewBox='0 0 48 48'
      aria-hidden='true'
      width={Math.round(sizePx * 0.58)}
      height={Math.round(sizePx * 0.58)}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Arc — fades + collapses to its own center when open. */}
      <motion.path
        d='M9 27 Q19 39 29 27'
        fill='none'
        stroke='currentColor'
        strokeWidth={4}
        strokeLinecap='round'
        initial={false}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={open ? { opacity: 0, scale: 0.2 } : { opacity: 1, scale: 1 }}
        transition={arcTransition}
      />
      {/* Spark — glides to center + grows when open; returns home when closed. */}
      <motion.path
        d='M34 9 C35 12.5 36.5 14 40 15 C36.5 16 35 17.5 34 21 C33 17.5 31.5 16 28 15 C31.5 14 33 12.5 34 9 Z'
        fill='currentColor'
        initial={false}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={open ? { x: -10, y: 9, scale: 1.5, rotate: 8 } : { x: 0, y: 0, scale: 1, rotate: 0 }}
        transition={sparkTransition}
      />
    </svg>
  )
}

/**
 * GreenhouseDisclosureTrigger — canonical icon-only trigger that signals open/closed
 * via icon rotation, or the Nexa brand-mark morph (`variant='nexaMark'`, TASK-1075).
 * Atom of the Anchored Disclosure pattern, usable standalone (accordion chevron,
 * add-row toggle, Nexa panel…). a11y: `aria-expanded`, required `ariaLabel`. Motion:
 * tokenized (`theme.transitions` for the box; spring for the Nexa morph) + reduced-motion
 * baked. Zero hardcode — borders/hover/tint from theme via `currentColor`. Wraps MUI
 * `IconButton` (never reinvents the base); `forwardRef` so it spreads cleanly as a
 * FloatingSurface anchor.
 */
const GreenhouseDisclosureTrigger = forwardRef<HTMLButtonElement, GreenhouseDisclosureTriggerProps>(
  ({ variant, kind, open, iconClassName, size = 'small', ariaLabel, dataCapture, sx, ...rest }, ref) => {
    const reduced = useReducedMotion()
    const resolvedVariant = resolveDisclosureTriggerVariant({ variant, kind })
    const config = getDisclosureTriggerVariantConfig(resolvedVariant)

    const isOpen = open ?? (rest as Record<string, unknown>)['data-state'] === 'open'
    const px = SIZE_PX[size]
    const isNexaMark = config.morph === 'nexaMark'

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
        {isNexaMark ? (
          <NexaMarkMorph open={isOpen} reduced={reduced} sizePx={px} />
        ) : (
          <i className={iconClassName ?? config.defaultIconClassName} aria-hidden='true' />
        )}
      </IconButton>
    )
  }
)

GreenhouseDisclosureTrigger.displayName = 'GreenhouseDisclosureTrigger'

export default GreenhouseDisclosureTrigger
