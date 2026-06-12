'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { usePathname } from 'next/navigation'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Fab from '@mui/material/Fab'
import Fade from '@mui/material/Fade'
import FocusTrap from '@mui/material/Unstable_TrapFocus'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import useMediaQuery from '@mui/material/useMediaQuery'
import { alpha, useTheme } from '@mui/material/styles'
import Drawer from '@mui/material/Drawer'

import {
  AssistantRuntimeProvider,
  useLocalRuntime
} from '@assistant-ui/react'
import type { ChatModelAdapter, ChatModelRunResult } from '@assistant-ui/react'
import type { ReadonlyJSONObject, ReadonlyJSONValue } from 'assistant-stream/utils'

import { DEFAULT_NEXA_MODEL, resolveNexaModel, type NexaModelId } from '@/config/nexa-models'
import type { NexaResponse } from '@/lib/nexa/nexa-contract'
import { isNexaFloatingExpandableEnabled } from '@/lib/nexa/flags'
import { GreenhouseNexaAnimatedMark, GreenhouseNexaBrandMark } from '@/components/greenhouse/primitives'
import { GREENHOUSE_NEXA_BRAND_COLORS } from '@/components/greenhouse/primitives/greenhouse-nexa-brand-controller'

import NexaThread from '@/views/greenhouse/home/components/NexaThread'
import NexaFloatingPanel from '@/views/greenhouse/nexa/floating-chat/NexaFloatingPanel'

const TASK407_ARIA_CERRAR_NEXA = "Cerrar Nexa"
const TASK407_ARIA_ABRIR_NEXA_AI = "Abrir Nexa AI"

const toJsonValue = (value: unknown): ReadonlyJSONValue => {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value

  if (Array.isArray(value)) return value.map(item => toJsonValue(item))

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toJsonValue(v)])) as ReadonlyJSONObject
  }

  return null
}

const createFloatingAdapter = (modelRef: React.MutableRefObject<NexaModelId>): ChatModelAdapter => ({
  async run({ messages, abortSignal }): Promise<ChatModelRunResult> {
    const lastMessage = messages[messages.length - 1]

    const prompt = lastMessage?.content
      ?.filter(p => p.type === 'text')
      .map(p => (p as { type: 'text'; text: string }).text)
      .join('') ?? ''

    const history = messages.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content?.filter(p => p.type === 'text').map(p => (p as { type: 'text'; text: string }).text).join('') ?? ''
    }))

    const res = await fetch('/api/home/nexa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, history, model: modelRef.current }),
      signal: abortSignal
    })

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null)

      throw new Error(errorBody?.error || `Error ${res.status}`)
    }

    const data = await res.json() as NexaResponse

    const toolParts = (data.toolInvocations || []).map(inv => ({
      type: 'tool-call' as const,
      toolCallId: inv.toolCallId,
      toolName: inv.toolName,
      args: toJsonValue(inv.args) as ReadonlyJSONObject,
      argsText: JSON.stringify(inv.args ?? {}),
      result: toJsonValue(inv.result)
    }))

    return {
      content: [...toolParts, { type: 'text' as const, text: data.content || '' }]
    }
  }
})

interface NexaFloatingButtonProps {
  docked?: boolean
}

const NexaFloatingButton = ({ docked = false }: NexaFloatingButtonProps) => {
  const pathname = usePathname()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const fabRef = useRef<HTMLButtonElement>(null)
  const expandableEnabled = isNexaFloatingExpandableEnabled()

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

    if (!expandableEnabled) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [open, expandableEnabled, closePanel])

  const [selectedModel, setSelectedModel] = useState<NexaModelId>(DEFAULT_NEXA_MODEL)
  const modelRef = useRef<NexaModelId>(DEFAULT_NEXA_MODEL)

  const handleModelChange = useCallback((model: NexaModelId) => {
    const resolved = resolveNexaModel({ requestedModel: model })

    setSelectedModel(resolved)
    modelRef.current = resolved
  }, [])

  const adapter = useMemo(() => createFloatingAdapter(modelRef), [])

  const runtime = useLocalRuntime(adapter, {
    initialMessages: [
      { role: 'assistant', content: [{ type: 'text' as const, text: 'Hola, soy Nexa. ¿En que puedo ayudarte?' }] }
    ]
  })

  const nexaFabRestShadow = open ? 'none' : `0 12px 30px ${alpha(GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy, 0.28)}`

  const nexaFabHoverShadow = open ? 'none' : `0 14px 34px ${alpha(GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy, 0.34)}`

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
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: -28,
      zIndex: 0,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${alpha(GREENHOUSE_NEXA_BRAND_COLORS.electricTeal, 0.3)} 0%, ${alpha(
        GREENHOUSE_NEXA_BRAND_COLORS.electricTeal,
        0.14
      )} 38%, ${alpha(GREENHOUSE_NEXA_BRAND_COLORS.electricTeal, 0)} 72%)`,
      filter: 'blur(18px)',
      opacity: 0,
      pointerEvents: 'none',
      transform: 'scale(0.74)',
      transition: theme.transitions.create(['opacity', 'transform'], {
        duration: 820,
        easing: theme.transitions.easing.easeOut
      })
    },
    '&:hover::before, &:focus-within::before': {
      opacity: open ? 0 : 1,
      transform: 'scale(1)',
      transitionDuration: '220ms'
    },
    '& > .MuiFab-root': {
      position: 'relative',
      zIndex: 1
    },
    '@media (prefers-reduced-motion: reduce)': {
      '&::before, &:hover::before, &:focus-within::before': {
        transform: 'none',
        transitionDuration: '1ms'
      }
    }
  }

  // Hide where Nexa already owns the surface inline.
  if (pathname === '/home') return null

  const panelContent = (
    <AssistantRuntimeProvider runtime={runtime}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Mini header */}
        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction='row' spacing={1.25} alignItems='center'>
            <GreenhouseNexaBrandMark kind='badgeIcon' size='small' sx={{ inlineSize: 24, blockSize: 24 }} />
            {/* Wordmark Nexa en Poppins (display SoT) a 16px/600 — presencia sin pesar.
                Es un one-off fuera del SoT (el tier display arranca en h4=20px; no hay
                variante Poppins-16) → se renderiza como Box, no Typography. Su home
                canónica es el NexaComposer/wordmark primitive (TASK-1078 follow-up). */}
            <Box
              component='span'
              sx={theme => ({ fontFamily: theme.typography.h4.fontFamily, fontWeight: 600, fontSize: '1rem', lineHeight: 1, letterSpacing: 0.1 })}
            >
              Nexa AI
            </Box>
          </Stack>
          <IconButton size='small' onClick={() => setOpen(false)} aria-label={TASK407_ARIA_CERRAR_NEXA}>
            <i className='tabler-x' style={{ fontSize: '1rem' }} />
          </IconButton>
        </Stack>

        {/* Thread */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <NexaThread
            compact
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
          />
        </Box>
      </Card>
    </AssistantRuntimeProvider>
  )

  return (
    <>
      {/* FAB trigger */}
      <Box
        data-nexa-floating-trigger='true'
        data-capture='nexa-floating-trigger'
        sx={nexaFabAuraSx}
      >
        <Fab
          ref={fabRef}
          color='primary'
          size='medium'
          aria-label={TASK407_ARIA_ABRIR_NEXA_AI}
          aria-expanded={open}
          onClick={() => setOpen(prev => !prev)}
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
          {open ? (
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

      {/* Panel expandible persistido (TASK-1078) detrás del flag; con flag OFF, el
          panel efímero histórico (Drawer mobile / Card desktop) bit-for-bit. */}
      {expandableEnabled ? (
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
      ) : isMobile ? (
        <Drawer
          anchor='bottom'
          open={open}
          onClose={() => setOpen(false)}
          PaperProps={{ sx: { height: '85vh', borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}
        >
          {panelContent}
        </Drawer>
      ) : (
        <Fade in={open}>
          <Box
            sx={{
              position: 'fixed',
              bottom: docked
                ? 'calc(var(--gh-floating-actions-safe-block-size) + var(--gh-floating-actions-gap))'
                : 88,
              right: docked ? 'var(--gh-floating-actions-inline-offset)' : 24,
              width: 400,
              height: 550,
              zIndex: theme.zIndex.speedDial - 1,
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: 24
            }}
          >
            {panelContent}
          </Box>
        </Fade>
      )}
    </>
  )
}

export default NexaFloatingButton
