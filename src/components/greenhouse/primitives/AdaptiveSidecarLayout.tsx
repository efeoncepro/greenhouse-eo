'use client'

import type { ReactNode, RefObject } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import type { Breakpoint } from '@mui/material/styles'
import { alpha, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

import useReducedMotion from '@/hooks/useReducedMotion'
import { motion } from '@/libs/FramerMotion'

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

export interface AdaptiveSidecarLayoutProps {
  children: ReactNode
  sidecar: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  kind?: AdaptiveSidecarKind
  preferredMode?: AdaptiveSidecarPreferredMode
  side?: AdaptiveSidecarSide
  sidecarWidth?: number | string
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
const DEFAULT_MAIN_MIN_WIDTH = 760

const toCssSize = (value: number | string) => (typeof value === 'number' ? `${value}px` : value)

const toNumericWidth = (value: number | string) => (typeof value === 'number' ? value : DEFAULT_SIDECAR_WIDTH)

const isInlineMode = (mode: AdaptiveSidecarResolvedMode) => mode === 'push' || mode === 'inline'

const AdaptiveSidecarLayout = ({
  children,
  sidecar,
  open,
  onOpenChange,
  kind = 'inspector',
  preferredMode = 'push',
  side = 'right',
  sidecarWidth = DEFAULT_SIDECAR_WIDTH,
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
  const rootRef = useRef<HTMLDivElement | null>(null)
  const previousModeRef = useRef<AdaptiveSidecarResolvedMode>('closed')
  const [availableWidth, setAvailableWidth] = useState<number>()

  useEffect(() => {
    const element = rootRef.current

    if (!element) {
      return undefined
    }

    const updateWidth = () => setAvailableWidth(element.getBoundingClientRect().width)

    updateWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth)

      return () => window.removeEventListener('resize', updateWidth)
    }

    const observer = new ResizeObserver(entries => {
      const entry = entries[0]

      if (entry) {
        setAvailableWidth(entry.contentRect.width)
      }
    })

    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const resolvedMode = useMemo(() => {
    const numericSidecarWidth = toNumericWidth(sidecarWidth)

    return resolveAdaptiveSidecarMode({
      open,
      preferredMode,
      viewportWidth: isTemporaryViewport ? 0 : theme.breakpoints.values[temporaryBreakpoint] + 1,
      availableWidth,
      breakpointWidth: theme.breakpoints.values[temporaryBreakpoint],
      mainMinWidth,
      sidecarWidth: numericSidecarWidth
    })
  }, [
    availableWidth,
    isTemporaryViewport,
    mainMinWidth,
    open,
    preferredMode,
    sidecarWidth,
    temporaryBreakpoint,
    theme.breakpoints.values
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

  const sidecarSize = toCssSize(sidecarWidth)
  const inlineOpen = open && isInlineMode(resolvedMode)

  const gridTemplateColumns = inlineOpen
    ? side === 'right'
      ? `minmax(${mainMinWidth}px, 1fr) ${sidecarSize}`
      : `${sidecarSize} minmax(${mainMinWidth}px, 1fr)`
    : 'minmax(0, 1fr)'

  const drawerAnchor = temporaryPlacement ?? (side === 'left' ? 'left' : 'right')

  return (
    <Box
      ref={rootRef}
      data-capture={dataCapture}
      data-sidecar-open={open ? 'true' : 'false'}
      data-sidecar-mode={resolvedMode}
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
          {open ? (
            <Box
              component={motion.div}
              initial={prefersReducedMotion ? false : { opacity: 0, x: side === 'right' ? 18 : -18, filter: 'blur(2px)' }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={prefersReducedMotion ? undefined : { duration: 0.24, ease: 'easeOut' }}
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
        </>
      ) : null}
      {resolvedMode === 'closed' || isInlineMode(resolvedMode) ? (
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
            borderRadius: inlineOpen ? `${theme.shape.customBorderRadius.lg}px` : 0,
            border: inlineOpen ? `1px solid ${theme.palette.divider}` : 0,
            bgcolor: inlineOpen ? 'background.paper' : 'transparent',
            boxShadow: inlineOpen
              ? `0 18px 54px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.32 : 0.08)}`
              : 'none',
            transition: theme.transitions.create(['grid-template-columns', 'gap'], {
              duration: theme.transitions.duration.complex,
              easing: 'cubic-bezier(0.2, 0, 0, 1)'
            }),
            willChange: open ? 'grid-template-columns' : undefined,
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none'
            }
          })}
        >
          {inlineOpen && side === 'left' ? (
            <Box
              component={motion.div}
              initial={prefersReducedMotion ? false : { opacity: 0, x: 14, filter: 'blur(1px)' }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={prefersReducedMotion ? undefined : { duration: 0.2, ease: 'easeOut' }}
              data-capture={dataCapture ? `${dataCapture}-panel` : undefined}
              sx={theme => ({
                minWidth: 0,
                minHeight: 0,
                borderInlineEnd: `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper',
                boxShadow: `inset -1px 0 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.04 : 0.44)}`
              })}
            >
              {sidecar}
            </Box>
          ) : null}
          <Box data-capture={dataCapture ? `${dataCapture}-main` : undefined} sx={{ minWidth: 0 }}>
            {children}
          </Box>
          {inlineOpen && side === 'right' ? (
            <Box
              component={motion.div}
              initial={prefersReducedMotion ? false : { opacity: 0, x: side === 'right' ? 14 : -14, filter: 'blur(1px)' }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={prefersReducedMotion ? undefined : { duration: 0.2, ease: 'easeOut' }}
              data-capture={dataCapture ? `${dataCapture}-panel` : undefined}
              sx={theme => ({
                minWidth: 0,
                minHeight: 0,
                borderInlineStart: `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper',
                boxShadow: `inset 1px 0 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.04 : 0.44)}`
              })}
            >
              {sidecar}
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Box>
  )
}

export default AdaptiveSidecarLayout
