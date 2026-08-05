'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Fab from '@mui/material/Fab'
import Fade from '@mui/material/Fade'
import FocusTrap from '@mui/material/Unstable_TrapFocus'
import useMediaQuery from '@mui/material/useMediaQuery'
import { alpha, useTheme } from '@mui/material/styles'

import { NEXA_FLOATING_OPEN_EVENT } from '@/lib/nexa/floating-events'
import { useNexaInteractionMode } from '@/lib/nexa/nexa-interaction-mode-context'
import { GreenhouseNexaAnimatedMark, GreenhouseSpectrumBeam } from '@/components/greenhouse/primitives'
import { GREENHOUSE_NEXA_BRAND_COLORS } from '@/components/greenhouse/primitives/greenhouse-nexa-brand-controller'

import NexaFloatingPanel from '@/views/greenhouse/nexa/floating-chat/NexaFloatingPanel'

const TASK407_ARIA_ABRIR_NEXA_AI = "Abrir Nexa AI"

interface NexaFloatingButtonProps {
  docked?: boolean
}

const NexaFloatingButton = ({ docked = false }: NexaFloatingButtonProps) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const fabRef = useRef<HTMLButtonElement>(null)

  // TASK-1079 — el modo de interacción decide el form-factor del flotante:
  // - lane: la burbuja togglea el lane (no abre panel flotante); el lane lo monta
  //   NexaLaneContentHost en el contenido.
  // - expandible: panel ampliable con historial persistido (comportamiento base).
  const { mode, laneOpen, setLaneOpen } = useNexaInteractionMode()
  const isLaneMode = mode === 'lane'

  // Estado de apertura visible de la burbuja según el modo.
  const fabOpen = isLaneMode ? laneOpen : open

  const handleFabClick = useCallback(() => {
    if (isLaneMode) {
      setLaneOpen(!laneOpen)

      return
    }

    setOpen(prev => !prev)
  }, [isLaneMode, laneOpen, setLaneOpen])

  const closePanel = useCallback(() => {
    setOpen(false)
    // Non-modal: el foco vuelve al FAB al cerrar (Escape / click-fuera / botón cerrar).
    requestAnimationFrame(() => fabRef.current?.focus())
  }, [])

  const handleClickAway = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const target = event.target

      // El FAB togglea aparte; no dejar que el click-away lo trate como "fuera".
      if (fabRef.current && target instanceof Node && fabRef.current.contains(target)) return

      closePanel()
    },
    [closePanel]
  )

  // Escape cierra; al cerrar, el panel vuelve a compacto para el próximo open.
  useEffect(() => {
    if (!open) {
      setExpanded(false)

      return
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [open, closePanel])

  // Apertura programática desde el portal (CTAs "Pregúntale a Nexa" de insights,
  // bento del home, knowledge) vía el CustomEvent canónico.
  useEffect(() => {
    const onOpen = () => {
      if (isLaneMode) {
        setLaneOpen(true)

        return
      }

      setOpen(true)
      setExpanded(true)
    }

    window.addEventListener(NEXA_FLOATING_OPEN_EVENT, onOpen)

    return () => window.removeEventListener(NEXA_FLOATING_OPEN_EVENT, onOpen)
  }, [isLaneMode, setLaneOpen])

  const nexaFabRestShadow = fabOpen ? 'none' : `0 12px 30px ${alpha(GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy, 0.28)}`

  const nexaFabHoverShadow = fabOpen ? 'none' : `0 14px 34px ${alpha(GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy, 0.34)}`

  const nexaFabAuraSx = {
    position: docked ? 'relative' : 'fixed',
    ...(docked
      ? {}
      : {
          bottom: 24,
          right: 24,
          zIndex: theme.zIndex.speedDial
        }),
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    isolation: 'isolate',
    overflow: 'visible',
    borderRadius: '50%',
    '& [data-nexa-floating-spectrum="true"]': {
      position: 'absolute',
      inset: 0,
      zIndex: 2,
      borderRadius: '50%',
      opacity: 0,
      pointerEvents: 'none',
      transform: 'scale(0.86)',
      transition: theme.transitions.create(['opacity', 'transform'], {
        duration: 620,
        easing: theme.transitions.easing.easeOut
      })
    },
    '& [data-nexa-floating-spectrum="true"] [data-gh-border-beam], & [data-nexa-floating-spectrum="true"] [data-gh-border-beam-glow]': {
      animationPlayState: 'paused'
    },
    '&:hover [data-nexa-floating-spectrum="true"], &:focus-within [data-nexa-floating-spectrum="true"]': {
      opacity: fabOpen ? 0 : 1,
      transform: 'scale(1)',
      transitionDuration: '180ms'
    },
    '&:hover [data-nexa-floating-spectrum="true"] [data-gh-border-beam], &:focus-within [data-nexa-floating-spectrum="true"] [data-gh-border-beam], &:hover [data-nexa-floating-spectrum="true"] [data-gh-border-beam-glow], &:focus-within [data-nexa-floating-spectrum="true"] [data-gh-border-beam-glow]': {
      animationPlayState: fabOpen ? 'paused' : 'running'
    },
    '& > .MuiFab-root': {
      position: 'relative',
      zIndex: 1
    },
    '@media (prefers-reduced-motion: reduce)': {
      '& [data-nexa-floating-spectrum="true"], &:hover [data-nexa-floating-spectrum="true"], &:focus-within [data-nexa-floating-spectrum="true"]': {
        transform: 'none',
        transitionDuration: '1ms'
      }
    }
  }

  return (
    <>
      {/* FAB trigger */}
      <Box
        data-nexa-floating-trigger='true'
        data-capture='nexa-floating-trigger'
        sx={nexaFabAuraSx}
      >
        <Box aria-hidden data-nexa-floating-spectrum='true'>
          <GreenhouseSpectrumBeam
            active
            animated
            borderWidth={2}
            durationSec={16}
            intensity='strong'
            kind='promptDock'
            spectrumPalette='nexa'
            variant='interactive'
          />
        </Box>
        <Fab
          ref={fabRef}
          color='primary'
          size='medium'
          aria-label={TASK407_ARIA_ABRIR_NEXA_AI}
          aria-expanded={fabOpen}
          onClick={handleFabClick}
          sx={{
            position: 'static',
            zIndex: 'inherit',
            bgcolor: GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy,
            color: 'common.white',
            boxShadow: nexaFabRestShadow,
            '&:hover': {
              bgcolor: GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy,
              boxShadow: nexaFabHoverShadow
            },
            '&:focus-visible': {
              outline: `3px solid ${alpha(GREENHOUSE_NEXA_BRAND_COLORS.electricTeal, 0.42)}`,
              outlineOffset: 3,
              boxShadow: nexaFabHoverShadow
            }
          }}
        >
          {fabOpen ? (
            <i className='tabler-x' style={{ fontSize: '1.25rem' }} />
          ) : (
            <GreenhouseNexaAnimatedMark
              autoBlink
              ambientMoments
              chrome='none'
              tone='onNavy'
              size='medium'
              ariaLabel='Nexa'
              sx={{ inlineSize: 30, blockSize: 30 }}
            />
          )}
        </Fab>
      </Box>

      {/* Panel ampliable persistido (TASK-1078) — comportamiento base del flotante.
          En modo lane la burbuja no abre panel: solo togglea el lane (lo monta
          NexaLaneContentHost en el contenido). */}
      {isLaneMode ? null : (
        <Fade in={open} unmountOnExit>
          <Box
            sx={{
              position: 'fixed',
              bottom: isMobile
                ? 12
                : docked
                  ? 'calc(var(--gh-floating-actions-safe-block-size) + var(--gh-floating-actions-gap))'
                  : 88,
              right: isMobile ? 12 : docked ? 'var(--gh-floating-actions-inline-offset)' : 24,
              zIndex: theme.zIndex.speedDial - 1
            }}
          >
            <FocusTrap open={open}>
              <Box tabIndex={-1} sx={{ outline: 'none' }}>
                <ClickAwayListener onClickAway={handleClickAway} mouseEvent='onMouseDown' touchEvent='onTouchStart'>
                  <Box>
                    <NexaFloatingPanel
                      expanded={expanded}
                      onToggleExpanded={() => setExpanded(v => !v)}
                      onClose={closePanel}
                    />
                  </Box>
                </ClickAwayListener>
              </Box>
            </FocusTrap>
          </Box>
        </Fade>
      )}
    </>
  )
}

export default NexaFloatingButton
