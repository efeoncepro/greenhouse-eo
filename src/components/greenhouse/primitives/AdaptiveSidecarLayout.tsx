'use client'

import type { KeyboardEvent, PointerEvent, ReactNode, RefObject } from 'react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import type { Breakpoint } from '@mui/material/styles'
import { alpha, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

import { GH_PLATFORM_UI } from '@/config/greenhouse-nomenclature'
import useReducedMotion from '@/hooks/useReducedMotion'
import { AnimatePresence, motion } from '@/libs/FramerMotion'

import type {
  AdaptiveSidecarKind,
  AdaptiveSidecarPreferredMode,
  AdaptiveSidecarResolvedMode,
  AdaptiveSidecarSide,
  AdaptiveSidecarTelemetryEvent
} from './adaptive-sidecar-controller'
import {
  createAdaptiveSidecarEvent,
  resolveAdaptiveSidecarMode
} from './adaptive-sidecar-controller'
import { useAdaptiveSidecarShell } from './adaptive-sidecar-shell-context'

export interface AdaptiveSidecarLayoutProps {
  children: ReactNode
  sidecar: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  kind?: AdaptiveSidecarKind
  preferredMode?: AdaptiveSidecarPreferredMode
  side?: AdaptiveSidecarSide
  sidecarWidth?: number | string
  sidecarMinWidth?: number
  sidecarMaxWidth?: number
  resizable?: boolean
  onSidecarWidthChange?: (width: number) => void
  sidecarExtent?: 'content' | 'viewport'
  viewportOffsetTop?: number | string
  viewportShellReflow?: 'none' | 'greenhouse-vertical-navbar'
  viewportShellGap?: number | string
  minHeight?: number | string
  mainMinWidth?: number
  temporaryBreakpoint?: Breakpoint
  temporaryPlacement?: 'left' | 'right' | 'bottom'
  dirty?: boolean
  onDirtyCloseAttempt?: () => void
  restoreFocusRef?: RefObject<HTMLElement | null>
  dataCapture?: string
  source?: string
  onTelemetry?: (event: AdaptiveSidecarTelemetryEvent) => void
}

const DEFAULT_SIDECAR_WIDTH = 420
const DEFAULT_SIDECAR_MIN_WIDTH = 360
const DEFAULT_SIDECAR_MAX_WIDTH = 560
const DEFAULT_MAIN_MIN_WIDTH = 760
const DEFAULT_VIEWPORT_SHELL_GAP = 0
const DEFAULT_VIEWPORT_CONTENT_GUTTER = 12
const RESIZE_HANDLE_WIDTH = 10
const SIDECAR_LAYOUT_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

const SIDECAR_PANEL_TRANSITION = {
  type: 'spring',
  stiffness: 430,
  damping: 42,
  mass: 0.9
} as const

const SIDECAR_PANEL_EXIT_TRANSITION = {
  duration: 0.16,
  ease: 'easeInOut'
} as const

const SIDECAR_INLINE_EXIT_PRESENCE_MS = 220

const toCssSize = (value: number | string) => (typeof value === 'number' ? `${value}px` : value)

const toNumericWidth = (value: number | string) => (typeof value === 'number' ? value : DEFAULT_SIDECAR_WIDTH)

const isInlineMode = (mode: AdaptiveSidecarResolvedMode) => mode === 'push' || mode === 'inline'

const clampWidth = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const AdaptiveSidecarLayout = ({
  children,
  sidecar,
  open,
  onOpenChange,
  kind = 'inspector',
  preferredMode = 'push',
  side = 'right',
  sidecarWidth = DEFAULT_SIDECAR_WIDTH,
  sidecarMinWidth = DEFAULT_SIDECAR_MIN_WIDTH,
  sidecarMaxWidth = DEFAULT_SIDECAR_MAX_WIDTH,
  resizable = false,
  onSidecarWidthChange,
  sidecarExtent = 'content',
  viewportOffsetTop = 0,
  viewportShellReflow = 'none',
  viewportShellGap = DEFAULT_VIEWPORT_SHELL_GAP,
  minHeight,
  mainMinWidth = DEFAULT_MAIN_MIN_WIDTH,
  temporaryBreakpoint = 'md',
  temporaryPlacement,
  dirty = false,
  onDirtyCloseAttempt,
  restoreFocusRef,
  dataCapture,
  source,
  onTelemetry
}: AdaptiveSidecarLayoutProps) => {
  const theme = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const isTemporaryViewport = useMediaQuery(theme.breakpoints.down(temporaryBreakpoint), { noSsr: true })
  const shell = useAdaptiveSidecarShell()
  const registerShellReservation = shell?.registerReservation
  const unregisterShellReservation = shell?.unregisterReservation
  const shellReservationId = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const previousModeRef = useRef<AdaptiveSidecarResolvedMode>('closed')
  const resizeStartRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null)
  const [availableWidth, setAvailableWidth] = useState<number>()
  const [viewportInlineOffsets, setViewportInlineOffsets] = useState({ start: 0, end: 0 })
  const [userSidecarWidth, setUserSidecarWidth] = useState<number>()
  const [resizing, setResizing] = useState(false)
  const [inlineLayoutPresent, setInlineLayoutPresent] = useState(false)
  const [mounted, setMounted] = useState(false)
  const temporaryBreakpointWidth = theme.breakpoints.values[temporaryBreakpoint]

  const effectiveSidecarWidth = useMemo(() => {
    if (typeof sidecarWidth !== 'number') {
      return sidecarWidth
    }

    return clampWidth(userSidecarWidth ?? sidecarWidth, sidecarMinWidth, sidecarMaxWidth)
  }, [sidecarMaxWidth, sidecarMinWidth, sidecarWidth, userSidecarWidth])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const element = rootRef.current

    if (!element) {
      return undefined
    }

    const updateMetrics = () => {
      const rect = element.getBoundingClientRect()

      setAvailableWidth(rect.width)
      setViewportInlineOffsets({
        start: rect.left,
        end: Math.max(0, window.innerWidth - rect.right)
      })
    }

    updateMetrics()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateMetrics)

      return () => window.removeEventListener('resize', updateMetrics)
    }

    const observer = new ResizeObserver(() => updateMetrics())

    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const resolvedMode = useMemo(() => {
    if (!mounted) {
      return 'closed'
    }

    const numericSidecarWidth = toNumericWidth(effectiveSidecarWidth)

    return resolveAdaptiveSidecarMode({
      open,
      preferredMode,
      viewportWidth: isTemporaryViewport ? 0 : temporaryBreakpointWidth + 1,
      availableWidth,
      breakpointWidth: temporaryBreakpointWidth,
      mainMinWidth,
      sidecarWidth: numericSidecarWidth
    })
  }, [
    availableWidth,
    isTemporaryViewport,
    mainMinWidth,
    mounted,
    open,
    preferredMode,
    effectiveSidecarWidth,
    temporaryBreakpointWidth
  ])

  const emit = useCallback(
    (name: AdaptiveSidecarTelemetryEvent['name'], mode: AdaptiveSidecarResolvedMode, previousMode?: AdaptiveSidecarResolvedMode) => {
      onTelemetry?.(
        createAdaptiveSidecarEvent({
          name,
          kind,
          mode,
          previousMode,
          source
        })
      )
    },
    [kind, onTelemetry, source]
  )

  useEffect(() => {
    const previousMode = previousModeRef.current

    if (previousMode !== resolvedMode) {
      emit('sidecar.mode_change', resolvedMode, previousMode)
      previousModeRef.current = resolvedMode
    }
  }, [emit, resolvedMode])

  const requestClose = useCallback(() => {
    if (dirty) {
      onDirtyCloseAttempt?.()
      emit('sidecar.dirty_close_attempt', resolvedMode, resolvedMode)

      return
    }

    onOpenChange(false)
    emit('sidecar.close', 'closed', resolvedMode)
    window.setTimeout(() => restoreFocusRef?.current?.focus(), 0)
  }, [dirty, emit, onDirtyCloseAttempt, onOpenChange, resolvedMode, restoreFocusRef])

  const sidecarSize = toCssSize(effectiveSidecarWidth)
  const viewportOffsetSize = toCssSize(viewportOffsetTop)
  const inlineOpen = open && isInlineMode(resolvedMode)
  const layoutInlineOpen = inlineOpen || inlineLayoutPresent
  const viewportExtent = layoutInlineOpen && sidecarExtent === 'viewport'
  const resizeEnabled = inlineOpen && resizable && typeof effectiveSidecarWidth === 'number'
  const resizeHandleInFlow = resizeEnabled && !viewportExtent
  const shellReflowConfigured = sidecarExtent === 'viewport' && viewportShellReflow === 'greenhouse-vertical-navbar'
  const shellReflowEnabled = viewportExtent && viewportShellReflow === 'greenhouse-vertical-navbar'

  const reservedSidecarSize =
    viewportExtent && typeof effectiveSidecarWidth === 'number'
      ? `${Math.max(
          0,
          effectiveSidecarWidth -
            (side === 'right' ? viewportInlineOffsets.end : viewportInlineOffsets.start) +
            (shellReflowEnabled ? DEFAULT_VIEWPORT_CONTENT_GUTTER : 0)
        )}px`
      : sidecarSize

  const gridTemplateColumns = layoutInlineOpen
    ? resizeHandleInFlow
      ? side === 'right'
        ? `minmax(${mainMinWidth}px, 1fr) ${RESIZE_HANDLE_WIDTH}px ${reservedSidecarSize}`
        : `${reservedSidecarSize} ${RESIZE_HANDLE_WIDTH}px minmax(${mainMinWidth}px, 1fr)`
      : side === 'right'
        ? `minmax(${mainMinWidth}px, 1fr) ${reservedSidecarSize}`
        : `${reservedSidecarSize} minmax(${mainMinWidth}px, 1fr)`
    : 'minmax(0, 1fr)'

  const drawerAnchor = temporaryPlacement ?? (side === 'left' ? 'left' : 'right')
  const numericEffectiveSidecarWidth = toNumericWidth(effectiveSidecarWidth)

  const inlinePanelInitial = prefersReducedMotion
    ? false
    : {
        opacity: 0,
        x: side === 'right' ? 22 : -22,
        scale: 0.992,
        filter: 'blur(3px)'
      }

  const inlinePanelAnimate = prefersReducedMotion
    ? undefined
    : {
        opacity: 1,
        x: 0,
        scale: 1,
        filter: 'blur(0px)'
      }

  const inlinePanelExit = prefersReducedMotion
    ? undefined
    : {
        opacity: 0,
        x: side === 'right' ? 10 : -10,
        scale: 0.998,
        filter: 'blur(1px)',
        transition: SIDECAR_PANEL_EXIT_TRANSITION
      }

  useEffect(() => {
    if (inlineOpen) {
      setInlineLayoutPresent(true)

      return undefined
    }

    if (!inlineLayoutPresent) {
      return undefined
    }

    if (prefersReducedMotion) {
      setInlineLayoutPresent(false)

      return undefined
    }

    const timeout = window.setTimeout(() => setInlineLayoutPresent(false), SIDECAR_INLINE_EXIT_PRESENCE_MS)

    return () => window.clearTimeout(timeout)
  }, [inlineLayoutPresent, inlineOpen, prefersReducedMotion])

  useEffect(() => {
    if (!registerShellReservation || !unregisterShellReservation || !shellReflowConfigured || typeof effectiveSidecarWidth !== 'number') {
      unregisterShellReservation?.(shellReservationId)

      return undefined
    }

    registerShellReservation({
      id: shellReservationId,
      target: 'greenhouse-vertical-navbar',
      side,
      width: layoutInlineOpen ? effectiveSidecarWidth : 0,
      resizeHandleWidth: layoutInlineOpen && resizeHandleInFlow ? RESIZE_HANDLE_WIDTH : 0,
      gap: viewportShellGap,
      breakpoint: temporaryBreakpointWidth
    })

    return () => unregisterShellReservation(shellReservationId)
  }, [
    effectiveSidecarWidth,
    inlineOpen,
    layoutInlineOpen,
    registerShellReservation,
    resizeHandleInFlow,
    shellReflowConfigured,
    shellReservationId,
    side,
    temporaryBreakpointWidth,
    unregisterShellReservation,
    viewportShellGap
  ])

  const updateSidecarWidth = useCallback(
    (nextWidth: number) => {
      const clampedWidth = clampWidth(nextWidth, sidecarMinWidth, sidecarMaxWidth)

      setUserSidecarWidth(clampedWidth)
      onSidecarWidthChange?.(clampedWidth)
    },
    [onSidecarWidthChange, sidecarMaxWidth, sidecarMinWidth]
  )

  const handleResizePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!resizeEnabled) {
        return
      }

      resizeStartRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: numericEffectiveSidecarWidth
      }
      setResizing(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [numericEffectiveSidecarWidth, resizeEnabled]
  )

  const handleResizePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const resizeStart = resizeStartRef.current

      if (!resizeStart) {
        return
      }

      const delta = side === 'right' ? resizeStart.startX - event.clientX : event.clientX - resizeStart.startX

      updateSidecarWidth(resizeStart.startWidth + delta)
    },
    [side, updateSidecarWidth]
  )

  const handleResizePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const resizeStart = resizeStartRef.current

    if (!resizeStart) {
      return
    }

    resizeStartRef.current = null
    setResizing(false)
    event.currentTarget.releasePointerCapture(resizeStart.pointerId)
  }, [])

  const handleResizeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!resizeEnabled) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        updateSidecarWidth(numericEffectiveSidecarWidth + (side === 'right' ? 1 : -1) * (event.shiftKey ? 32 : 16))
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        updateSidecarWidth(numericEffectiveSidecarWidth + (side === 'right' ? -1 : 1) * (event.shiftKey ? 32 : 16))
      }
    },
    [numericEffectiveSidecarWidth, resizeEnabled, side, updateSidecarWidth]
  )

  const resizeHandle = resizeEnabled ? (
    <Box
      role='separator'
      aria-label={GH_PLATFORM_UI.adaptiveSidecarResizeHandleAria}
      aria-orientation='vertical'
      aria-valuemin={sidecarMinWidth}
      aria-valuemax={sidecarMaxWidth}
      aria-valuenow={numericEffectiveSidecarWidth}
      tabIndex={0}
      data-capture={dataCapture ? `${dataCapture}-resize-handle` : undefined}
      data-resizing={resizing ? 'true' : 'false'}
      onPointerDown={handleResizePointerDown}
      onPointerMove={handleResizePointerMove}
      onPointerUp={handleResizePointerUp}
      onPointerCancel={handleResizePointerUp}
      onKeyDown={handleResizeKeyDown}
      sx={theme => ({
        position: viewportExtent ? 'fixed' : 'relative',
        zIndex: viewportExtent ? (shellReflowEnabled ? theme.zIndex.appBar + 1 : theme.zIndex.appBar - 1) : 2,
        insetBlockStart: viewportExtent ? viewportOffsetSize : 'auto',
        insetBlockEnd: viewportExtent ? 0 : 'auto',
        insetInlineEnd: viewportExtent && side === 'right' ? sidecarSize : 'auto',
        insetInlineStart: viewportExtent && side === 'left' ? sidecarSize : 'auto',
        minWidth: `${RESIZE_HANDLE_WIDTH}px`,
        cursor: 'col-resize',
        bgcolor: resizing ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
        outline: 0,
        transition: theme.transitions.create(['background-color'], {
          duration: theme.transitions.duration.shorter
        }),
        '&::before': {
          content: '""',
          position: 'absolute',
          insetBlock: 12,
          insetInlineStart: '50%',
          width: '1px',
          transform: 'translateX(-50%)',
          bgcolor: resizing ? alpha(theme.palette.primary.main, 0.48) : alpha(theme.palette.divider, 0.42)
        },
        '&::after': {
          content: '"••"',
          position: 'absolute',
          insetBlockStart: '50%',
          insetInlineStart: '50%',
          display: 'grid',
          placeItems: 'center',
          width: 14,
          height: 42,
          borderRadius: 999,
          transform: 'translate(-50%, -50%)',
          color: resizing ? theme.palette.primary.contrastText : alpha(theme.palette.text.secondary, 0.58),
          fontSize: 10,
          lineHeight: 1,
          writingMode: 'vertical-rl',
          letterSpacing: 1,
          bgcolor: resizing ? theme.palette.primary.main : alpha(theme.palette.background.paper, 0.92),
          border: `1px solid ${resizing ? alpha(theme.palette.primary.main, 0.76) : alpha(theme.palette.divider, 0.82)}`,
          boxShadow: `0 6px 18px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.3 : 0.1)}`
        },
        '&:hover, &:focus-visible': {
          bgcolor: alpha(theme.palette.primary.main, 0.08),
          '&::before': {
            bgcolor: theme.palette.primary.main
          },
          '&::after': {
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            borderColor: alpha(theme.palette.primary.main, 0.76)
          }
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none'
        }
      })}
    />
  ) : null

  return (
    <Box
      ref={rootRef}
      data-capture={dataCapture}
      data-sidecar-open={open ? 'true' : 'false'}
      data-sidecar-mode={resolvedMode}
      data-sidecar-extent={viewportExtent ? 'viewport' : 'content'}
      data-sidecar-motion={prefersReducedMotion ? 'reduced' : 'enterprise'}
      data-sidecar-shell-reflow={shellReflowEnabled ? viewportShellReflow : 'none'}
      data-sidecar-width={layoutInlineOpen ? numericEffectiveSidecarWidth : undefined}
      sx={{
        minWidth: 0,
        width: '100%',
        minHeight,
        position: 'relative'
      }}
    >
      {resolvedMode === 'temporary' ? (
        <>
          <Box data-capture={dataCapture ? `${dataCapture}-main` : undefined} sx={{ minWidth: 0 }}>
            {children}
          </Box>
          <Drawer
            open={open}
            anchor={drawerAnchor}
            onClose={requestClose}
            ModalProps={{ keepMounted: true }}
            slotProps={{
              paper: {
                sx: theme => ({
                  width: drawerAnchor === 'bottom' ? '100%' : { xs: '100%', sm: sidecarSize },
                  height: drawerAnchor === 'bottom' ? { xs: '86vh', sm: '78vh' } : '100%',
                  maxWidth: drawerAnchor === 'bottom' ? '100%' : '100vw',
                  borderRadius:
                    drawerAnchor === 'bottom'
                      ? `${theme.shape.customBorderRadius.lg}px ${theme.shape.customBorderRadius.lg}px 0 0`
                      : 0,
                  overflow: 'hidden'
                })
              }
            }}
          >
            {sidecar}
          </Drawer>
        </>
      ) : null}
      {resolvedMode === 'overlay' ? (
        <>
          <Box data-capture={dataCapture ? `${dataCapture}-main` : undefined} sx={{ minWidth: 0 }}>
            {children}
          </Box>
          <AnimatePresence initial={false}>
            {open ? (
              <Box
                component={motion.div}
                initial={inlinePanelInitial}
                animate={inlinePanelAnimate}
                exit={inlinePanelExit}
                transition={prefersReducedMotion ? undefined : SIDECAR_PANEL_TRANSITION}
                data-capture={dataCapture ? `${dataCapture}-panel` : undefined}
                sx={{
                  position: 'fixed',
                  insetBlockStart: { xs: 12, md: 24 },
                  insetInlineEnd: side === 'right' ? { xs: 12, md: 24 } : 'auto',
                  insetInlineStart: side === 'left' ? { xs: 12, md: 24 } : 'auto',
                  width: { xs: 'calc(100vw - 24px)', sm: sidecarSize },
                  maxWidth: 'calc(100vw - 24px)',
                  height: { xs: 'calc(100vh - 24px)', md: 'calc(100vh - 48px)' },
                  zIndex: theme => theme.zIndex.modal - 1,
                  transformOrigin: side === 'right' ? '100% 50%' : '0% 50%',
                  willChange: open ? 'transform, opacity, filter' : undefined,
                  transition: theme =>
                    theme.transitions.create(['transform', 'opacity'], {
                      duration: theme.transitions.duration.shorter,
                      easing: theme.transitions.easing.easeOut
                    }),
                  '@media (prefers-reduced-motion: reduce)': {
                    transition: 'none'
                  }
                }}
              >
                {sidecar}
              </Box>
            ) : null}
          </AnimatePresence>
        </>
      ) : null}
      {resolvedMode === 'closed' || isInlineMode(resolvedMode) || inlineLayoutPresent ? (
        <Box
          data-capture={dataCapture ? `${dataCapture}-inline` : undefined}
          sx={theme => ({
            display: 'grid',
            gridTemplateColumns,
            gap: 0,
            alignItems: 'stretch',
            minWidth: 0,
            minHeight,
            overflow: 'hidden',
            borderRadius: inlineOpen && !viewportExtent ? `${theme.shape.customBorderRadius.lg}px` : 0,
            border: inlineOpen && !viewportExtent ? `1px solid ${theme.palette.divider}` : 0,
            bgcolor: inlineOpen && !viewportExtent ? 'background.paper' : 'transparent',
            boxShadow: inlineOpen && !viewportExtent
              ? `0 18px 54px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.32 : 0.08)}`
              : 'none',
            transition: theme.transitions.create(['grid-template-columns', 'gap', 'border-radius', 'box-shadow'], {
              duration: theme.transitions.duration.complex,
              easing: SIDECAR_LAYOUT_EASING
            }),
            willChange: open ? 'grid-template-columns' : undefined,
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none'
            }
          })}
        >
          <AnimatePresence initial={false}>
            {inlineOpen && side === 'left' ? (
              <Box
                component={motion.div}
                initial={inlinePanelInitial}
                animate={inlinePanelAnimate}
                exit={inlinePanelExit}
                transition={prefersReducedMotion ? undefined : SIDECAR_PANEL_TRANSITION}
                data-capture={dataCapture ? `${dataCapture}-panel` : undefined}
                sx={theme => ({
                  minWidth: 0,
                  minHeight: 0,
                  position: viewportExtent ? 'fixed' : 'relative',
                  insetBlockStart: viewportExtent ? viewportOffsetSize : 'auto',
                  insetBlockEnd: viewportExtent ? 0 : 'auto',
                  insetInlineStart: viewportExtent ? 0 : 'auto',
                  width: viewportExtent ? sidecarSize : 'auto',
                  zIndex: viewportExtent ? (shellReflowEnabled ? theme.zIndex.appBar + 1 : theme.zIndex.appBar - 1) : 'auto',
                  transformOrigin: '0% 50%',
                  willChange: open ? 'transform, opacity, filter' : undefined,
                  borderInlineEnd: `1px solid ${alpha(theme.palette.divider, 0.88)}`,
                  bgcolor: 'background.paper',
                  boxShadow: viewportExtent
                    ? `1px 0 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.08 : 0.9)}, 8px 0 22px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.26 : 0.035)}`
                    : `inset -1px 0 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.04 : 0.44)}`
                })}
              >
                {sidecar}
              </Box>
            ) : null}
          </AnimatePresence>
          {inlineOpen && side === 'left' ? resizeHandle : null}
          <Box data-capture={dataCapture ? `${dataCapture}-main` : undefined} sx={{ minWidth: 0 }}>
            {children}
          </Box>
          {inlineOpen && side === 'right' ? resizeHandle : null}
          <AnimatePresence initial={false}>
            {inlineOpen && side === 'right' ? (
              <Box
                component={motion.div}
                initial={inlinePanelInitial}
                animate={inlinePanelAnimate}
                exit={inlinePanelExit}
                transition={prefersReducedMotion ? undefined : SIDECAR_PANEL_TRANSITION}
                data-capture={dataCapture ? `${dataCapture}-panel` : undefined}
                sx={theme => ({
                  minWidth: 0,
                  minHeight: 0,
                  position: viewportExtent ? 'fixed' : 'relative',
                  insetBlockStart: viewportExtent ? viewportOffsetSize : 'auto',
                  insetBlockEnd: viewportExtent ? 0 : 'auto',
                  insetInlineEnd: viewportExtent ? 0 : 'auto',
                  width: viewportExtent ? sidecarSize : 'auto',
                  zIndex: viewportExtent ? (shellReflowEnabled ? theme.zIndex.appBar + 1 : theme.zIndex.appBar - 1) : 'auto',
                  transformOrigin: '100% 50%',
                  willChange: open ? 'transform, opacity, filter' : undefined,
                  borderInlineStart: `1px solid ${alpha(theme.palette.divider, 0.88)}`,
                  bgcolor: 'background.paper',
                  boxShadow: viewportExtent
                    ? `-1px 0 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.08 : 0.9)}, -8px 0 22px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.26 : 0.035)}`
                    : `inset 1px 0 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.04 : 0.44)}`
                })}
              >
                {sidecar}
              </Box>
            ) : null}
          </AnimatePresence>
        </Box>
      ) : null}
    </Box>
  )
}

export default AdaptiveSidecarLayout
