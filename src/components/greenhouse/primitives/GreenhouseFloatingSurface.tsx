'use client'

import { useCallback, useId, useState, type ReactNode } from 'react'

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
import Paper from '@mui/material/Paper'
import type { SxProps, Theme } from '@mui/material/styles'

import { motionCss } from '@/components/theme/motion-tokens'

import {
  FLOATING_SURFACE_CHROME_TOKENS,
  FLOATING_SURFACE_MOTION_TOKENS,
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

const FADE_TRANSITION = `opacity ${motionCss.duration[FLOATING_SURFACE_MOTION_TOKENS.fadeDuration]} ${motionCss.ease[FLOATING_SURFACE_MOTION_TOKENS.fadeEase]}`

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

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  const { refs, floatingStyles, context, isPositioned } = useFloating({
    open,
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
  const reduceMotion = config.motion === 'none'

  const surface = (
    <Paper
      ref={refs.setFloating}
      elevation={6}
      style={floatingStyles}
      {...getFloatingProps()}
      aria-label={ariaLabel}
      data-gh-floating-surface={variant}
      data-gh-floating-surface-kind={kind ?? ''}
      data-capture={dataCapture}
      sx={[
        theme => ({
          width: resolvedWidth,
          maxWidth: `calc(100vw - ${FLOATING_SURFACE_CHROME_TOKENS.viewportMargin * 2}px)`,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          border: `1px solid ${theme.palette.divider}`,
          p: FLOATING_SURFACE_CHROME_TOKENS.densityPadding[config.density],
          zIndex: theme.zIndex.modal + 1,
          opacity: isPositioned ? 1 : 0,
          transition: reduceMotion ? 'none' : FADE_TRANSITION,
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
        }),
        ...(Array.isArray(surfaceSx) ? surfaceSx : surfaceSx ? [surfaceSx] : [])
      ]}
    >
      {content({ close, variant })}
    </Paper>
  )

  return (
    <>
      {anchor(anchorProps)}

      {open ? (
        <FloatingPortal id={`gh-floating-surface-${surfaceId}`}>
          {config.focusManaged ? (
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
