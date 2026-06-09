'use client'

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'

import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  safePolygon,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  type Placement
} from '@floating-ui/react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import type { SxProps, Theme } from '@mui/material/styles'

import { MOTION_DURATION_MS, motionCss } from '@/components/theme/motion-tokens'
import useReducedMotion from '@/hooks/useReducedMotion'

import {
  FLOATING_SURFACE_CHROME_TOKENS,
  FLOATING_SURFACE_MOTION_TOKENS,
  getFloatingSurfaceMotionVector,
  getFloatingSurfaceTransformOrigin,
  getFloatingSurfaceVariantConfig,
  resolveFloatingSurfaceVariant,
  type GreenhouseFloatingSurfaceKind,
  type GreenhouseFloatingSurfaceVariant
} from './floating-surface-controller'

/**
 * GreenhouseFloatingSurface — canonical anchored contextual surface primitive
 * (TASK-1033). Wraps `@floating-ui/react` so product views never import the
 * engine directly. Governs positioning, focus, dismissal, role, motion and GVC
 * hooks through the variant contract in `floating-surface-controller`.
 *
 * Canonical shape:
 *
 *   <GreenhouseFloatingSurface
 *     variant='evidencePeek'
 *     kind='costProvenance'
 *     open={open}
 *     onOpenChange={setOpen}
 *     anchor={anchorProps => <button {...anchorProps}>Ver evidencia</button>}
 *     content={({ close }) => <EvidenceContent onClose={close} />}
 *   />
 *
 * Boundaries (ADR GREENHOUSE_FLOATING_SURFACE_DECISION_V1):
 * - Anchored, transient, contextual UI only.
 * - NOT a replacement for AdaptiveSidecar (full-height lanes) nor MUI Dialog
 *   (destructive/legal/financial/irreversible/maker-checker decisions).
 * - No domain business logic inside the primitive.
 */

export interface GreenhouseFloatingSurfaceAnchorProps {
  ref: (node: HTMLElement | null) => void
  'data-gh-floating-anchor': GreenhouseFloatingSurfaceVariant
  'data-state': 'open' | 'closed'
  [key: string]: unknown
}

export interface GreenhouseFloatingSurfaceContentProps {
  /** Close the surface (e.g. inline editor apply/cancel, action menu item). */
  close: () => void
  /** Resolved variant — useful for content that adapts density. */
  variant: GreenhouseFloatingSurfaceVariant
}

export interface GreenhouseFloatingSurfaceProps {
  /** Official functional variant. Overrides `kind`. */
  variant?: GreenhouseFloatingSurfaceVariant

  /** Semantic kind resolved to a variant via the controller. */
  kind?: GreenhouseFloatingSurfaceKind

  /** Placement override. Defaults to the variant's canonical placement. */
  placement?: Placement

  /** Controlled open state. Omit for uncontrolled. */
  open?: boolean

  /** Open-change callback (controlled or uncontrolled). */
  onOpenChange?: (open: boolean) => void

  /** Initial open state in uncontrolled mode. */
  defaultOpen?: boolean

  /** Anchor render-prop. Spread `anchorProps` onto the trigger element. */
  anchor: (anchorProps: GreenhouseFloatingSurfaceAnchorProps) => ReactNode

  /** Surface content render-prop, rendered inside the managed Paper chrome. */
  content: (contentProps: GreenhouseFloatingSurfaceContentProps) => ReactNode

  /** Surface width in px. Defaults to the variant's `defaultWidth`. */
  width?: number

  /** Accessible label for the surface (recommended for dialog/menu roles). */
  ariaLabel?: string

  /** Override the variant's outside-press dismissal (e.g. dirty inline editor). */
  dismissOnOutsidePress?: boolean

  /** Stable hook for GVC clip selectors — sets `data-capture` on the surface. */
  dataCapture?: string

  /** Extra surface chrome styling (merged after the canonical chrome). */
  surfaceSx?: SxProps<Theme>
}

const ENTER_ANIMATION = `gh-floating-surface-enter ${motionCss.duration[FLOATING_SURFACE_MOTION_TOKENS.enterDuration]} ${motionCss.ease[FLOATING_SURFACE_MOTION_TOKENS.enterEase]} both`
const EXIT_ANIMATION = `gh-floating-surface-exit ${motionCss.duration[FLOATING_SURFACE_MOTION_TOKENS.exitDuration]} ${motionCss.ease[FLOATING_SURFACE_MOTION_TOKENS.exitEase]} both`

const GreenhouseFloatingSurface = ({
  variant: variantProp,
  kind,
  placement: placementProp,
  open: openProp,
  onOpenChange,
  defaultOpen = false,
  anchor,
  content,
  width,
  ariaLabel,
  dismissOnOutsidePress,
  dataCapture,
  surfaceSx
}: GreenhouseFloatingSurfaceProps) => {
  const variant = resolveFloatingSurfaceVariant({ variant: variantProp, kind })
  const config = getFloatingSurfaceVariantConfig(variant)

  const isControlled = openProp !== undefined
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = isControlled ? (openProp as boolean) : internalOpen

  const surfaceId = useId()
  const prefersReducedMotion = useReducedMotion()
  const reduceMotion = config.motion === 'none' || prefersReducedMotion
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isSurfaceMounted, setIsSurfaceMounted] = useState(open)
  const isExiting = isSurfaceMounted && !open && !reduceMotion
  const floatingOpen = open || isExiting

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    if (open) {
      setIsSurfaceMounted(true)

      return
    }

    if (!isSurfaceMounted) return

    if (reduceMotion) {
      setIsSurfaceMounted(false)

      return
    }

    closeTimerRef.current = setTimeout(() => {
      setIsSurfaceMounted(false)
      closeTimerRef.current = null
    }, MOTION_DURATION_MS[FLOATING_SURFACE_MOTION_TOKENS.exitDuration])

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
  }, [isSurfaceMounted, open, reduceMotion])

  const {
    refs,
    floatingStyles,
    context,
    isPositioned,
    placement: resolvedPlacement
  } = useFloating({
    open: floatingOpen,
    onOpenChange: setOpen,
    placement: placementProp ?? config.placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(config.offset),
      flip({ fallbackAxisSideDirection: 'end' }),
      shift({ padding: FLOATING_SURFACE_CHROME_TOKENS.viewportMargin })
    ]
  })

  const isHover = config.interaction === 'hover'

  // Click variants open on press. Hover variants open on hover + focus so the
  // surface stays reachable by keyboard (read-only tooltips/peeks).
  const click = useClick(context, { enabled: !isHover })
  const hover = useHover(context, { enabled: isHover, handleClose: safePolygon(), move: false })
  const focus = useFocus(context, { enabled: isHover })

  const dismiss = useDismiss(context, {
    outsidePress: dismissOnOutsidePress ?? config.dismissOnOutsidePress,
    escapeKey: config.dismissOnEscape
  })

  const role = useRole(context, { role: config.role })

  const { getReferenceProps, getFloatingProps } = useInteractions([click, hover, focus, dismiss, role])

  const close = useCallback(() => setOpen(false), [setOpen])

  const anchorProps: GreenhouseFloatingSurfaceAnchorProps = {
    ...getReferenceProps(),
    ref: refs.setReference,
    'data-gh-floating-anchor': variant,
    'data-state': open ? 'open' : 'closed'
  }

  const resolvedWidth = width ?? config.defaultWidth
  const motionVector = getFloatingSurfaceMotionVector(resolvedPlacement)
  const transformOrigin = getFloatingSurfaceTransformOrigin(resolvedPlacement)

  const surface = (
    <Box
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        width: resolvedWidth,
        maxWidth: `calc(100vw - ${FLOATING_SURFACE_CHROME_TOKENS.viewportMargin * 2}px)`
      }}
      sx={theme => ({
        zIndex: theme.zIndex.modal + 1,
        opacity: isPositioned ? 1 : 0,
        pointerEvents: isPositioned && open ? undefined : 'none'
      })}
    >
      <Paper
        {...getFloatingProps()}
        aria-label={ariaLabel}
        // Semantic elevation (TASK-1049): chrome depth comes from the `floating`
        // role token (theme.greenhouseElevation), NOT the generic MUI
        // `theme.shadows[6]`. Paper renders no MUI shadow of its own (elevation 0);
        // the 1px border carries separation under forced-colors (box-shadow stripped).
        elevation={0}
        data-gh-floating-surface={variant}
        data-gh-floating-surface-kind={kind ?? ''}
        data-gh-floating-placement={resolvedPlacement}
        data-gh-floating-motion={config.motion}
        data-gh-floating-motion-state={isExiting ? 'exiting' : 'entering'}
        data-capture={dataCapture}
        role={config.role}
        sx={[
          theme => ({
            width: '100%',
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            border: `1px solid ${theme.greenhouseElevation.floating.borderColor}`,
            boxShadow: theme.greenhouseElevation.floating.boxShadow,
            p: FLOATING_SURFACE_CHROME_TOKENS.densityPadding[config.density],
            zIndex: theme.zIndex.modal + 1,
            transformOrigin,
            animation: reduceMotion || !isPositioned ? 'none' : isExiting ? EXIT_ANIMATION : ENTER_ANIMATION,
            willChange: reduceMotion ? 'auto' : 'opacity, transform',
            '--gh-floating-motion-x': `${motionVector.x}px`,
            '--gh-floating-motion-y': `${motionVector.y}px`,
            '--gh-floating-motion-start-scale': FLOATING_SURFACE_MOTION_TOKENS.startScale,
            '--gh-floating-motion-settle-scale': FLOATING_SURFACE_MOTION_TOKENS.settleScale,
            '--gh-floating-motion-snap-back-scale': FLOATING_SURFACE_MOTION_TOKENS.snapBackScale,
            '--gh-floating-motion-exit-scale': FLOATING_SURFACE_MOTION_TOKENS.exitScale,
            '@keyframes gh-floating-surface-enter': {
              '0%': {
                opacity: 0,
                transform:
                  'translate3d(var(--gh-floating-motion-x), var(--gh-floating-motion-y), 0) scale(var(--gh-floating-motion-start-scale))'
              },
              '64%': {
                opacity: 1,
                transform: 'translate3d(0, 0, 0) scale(var(--gh-floating-motion-settle-scale))'
              },
              '82%': {
                opacity: 1,
                transform: 'translate3d(0, 0, 0) scale(var(--gh-floating-motion-snap-back-scale))'
              },
              '100%': {
                opacity: 1,
                transform: 'translate3d(0, 0, 0) scale(1)'
              }
            },
            '@keyframes gh-floating-surface-exit': {
              '0%': {
                opacity: 1,
                transform: 'translate3d(0, 0, 0) scale(1)'
              },
              '100%': {
                opacity: 0,
                transform:
                  'translate3d(var(--gh-floating-motion-x), var(--gh-floating-motion-y), 0) scale(var(--gh-floating-motion-exit-scale))'
              }
            },
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              transform: 'none',
              willChange: 'auto'
            }
          }),
          ...(Array.isArray(surfaceSx) ? surfaceSx : surfaceSx ? [surfaceSx] : [])
        ]}
      >
        {content({ close, variant })}
      </Paper>
    </Box>
  )

  return (
    <>
      {anchor(anchorProps)}

      {isSurfaceMounted ? (
        <FloatingPortal id={`gh-floating-surface-${surfaceId}`}>
          {config.focusManaged && open ? (
            <FloatingFocusManager context={context} modal={false} returnFocus={config.returnFocus}>
              {surface}
            </FloatingFocusManager>
          ) : (
            surface
          )}
        </FloatingPortal>
      ) : null}
    </>
  )
}

export default GreenhouseFloatingSurface
