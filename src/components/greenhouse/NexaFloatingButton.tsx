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
  useAui,
  useAuiState,
  useLocalRuntime
} from '@assistant-ui/react'
import type { ChatModelAdapter, ChatModelRunResult } from '@assistant-ui/react'
import type { ReadonlyJSONObject, ReadonlyJSONValue } from 'assistant-stream/utils'

import { DEFAULT_NEXA_MODEL, resolveNexaModel, type NexaModelId, type NexaModelMode } from '@/config/nexa-models'
import type { NexaModelSelectorValue } from '@/lib/nexa/use-nexa-runtime'
import type { NexaFocusRef, NexaResponse } from '@/lib/nexa/nexa-contract'
import { isNexaFloatingExpandableEnabled } from '@/lib/nexa/flags'
import { NEXA_FLOATING_OPEN_EVENT } from '@/lib/nexa/floating-events'
import { useNexaInteractionMode } from '@/lib/nexa/nexa-interaction-mode-context'
import { GreenhouseNexaAnimatedMark, GreenhouseNexaBrandMark, GreenhouseSpectrumBeam } from '@/components/greenhouse/primitives'
import { GREENHOUSE_NEXA_BRAND_COLORS } from '@/components/greenhouse/primitives/greenhouse-nexa-brand-controller'
import NexaModeMenu from '@/components/greenhouse/NexaModeMenu'

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

const createFloatingAdapter = (
  modelRef: React.MutableRefObject<NexaModelId>,
  modelModeRef: React.MutableRefObject<NexaModelMode>,
  // TASK-1182 — conciencia de superficie: el insight enfocado (set por el CTA del detalle) viaja en
  // el body para que el servidor ancle la respuesta. null = conversación normal (sin ancla).
  focusRefRef: React.MutableRefObject<NexaFocusRef | null>
): ChatModelAdapter => ({
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
      // TASK-1134 — `modelMode` auto (default) deja correr el router; manual fija el modelo del picker.
      // TASK-1182 — `focusRef` (si hay) ancla el turno al insight enfocado.
      body: JSON.stringify({
        prompt,
        history,
        model: modelRef.current,
        modelMode: modelModeRef.current,
        ...(focusRefRef.current ? { focusRef: focusRefRef.current } : {})
      }),
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

// TASK-1182 — auto-envío de la pregunta semilla del insight enfocado. Se monta DENTRO del
// AssistantRuntimeProvider y usa el MISMO API probado que las follow-up suggestions del chat
// (`aui.thread().append({ role:'user', ... })` vía el store `useAui`): el outer runtime expone un
// thread placeholder que no envía; este es el camino vivo. Se envía una vez, cuando el thread no
// está corriendo, en un effect (fuera del render).
const NexaSeedAutoSend = ({ seed, onSent }: { seed: string; onSent: () => void }) => {
  const aui = useAui()
  const isRunning = useAuiState(s => s.thread.isRunning)
  const sentRef = useRef(false)

  useEffect(() => {
    if (sentRef.current || isRunning) return

    sentRef.current = true
    aui.thread().append({ role: 'user', content: [{ type: 'text' as const, text: seed }] })
    onSent()
  }, [aui, isRunning, seed, onSent])

  return null
}

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

  // TASK-1182 — conciencia de superficie. `focusRefRef` ancla el turno al insight enfocado (lo lee el
  // adapter para el body). `pendingSeed` (estado) dispara el auto-envío de la pregunta semilla DESDE
  // DENTRO del provider (un thread del outer runtime queda en placeholder; el envío válido es vía el
  // primitive `ThreadPrimitive.Suggestion` montado en el contexto del store).
  const focusRefRef = useRef<NexaFocusRef | null>(null)
  const [pendingSeed, setPendingSeed] = useState<string | null>(null)

  // TASK-1079 — el modo de interacción decide el form-factor del flotante:
  // - lane (C): la burbuja togglea el lane (no abre panel flotante); el lane lo monta
  //   NexaLaneContentHost en el contenido.
  // - expandible (B): panel ampliable (requiere además el flag de plataforma).
  // - dock (A): panel compacto (Drawer mobile / Card desktop).
  const { mode, laneOpen, setLaneOpen } = useNexaInteractionMode()
  const isLaneMode = mode === 'lane'
  const expandableEnabled = mode === 'expandible' && isNexaFloatingExpandableEnabled()

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
    // TASK-1182 — al cerrar, se limpia el insight enfocado + el seed pendiente (sin arrastre stale).
    focusRefRef.current = null
    setPendingSeed(null)
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

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ focusRef?: NexaFocusRef; seedPrompt?: string }>).detail

      if (isLaneMode) {
        // El sidecar lane usa otro runtime; la conciencia de superficie V1 vive en el panel flotante.
        setLaneOpen(true)

        return
      }

      setOpen(true)
      if (expandableEnabled) setExpanded(true)

      if (detail?.focusRef?.kind === 'nexa_insight' && detail.focusRef.id) {
        focusRefRef.current = detail.focusRef

        // La pregunta semilla se agenda como estado: el auto-envío real lo hace `NexaSeedAutoSend`
        // (montado dentro del AssistantRuntimeProvider, donde el thread sí está vivo). Enviar desde
        // acá usaría el thread del outer runtime (placeholder vacío) → no envía / crashea.
        const seed = typeof detail.seedPrompt === 'string' ? detail.seedPrompt.trim() : ''

        setPendingSeed(seed || null)
      } else {
        focusRefRef.current = null
        setPendingSeed(null)
      }
    }

    window.addEventListener(NEXA_FLOATING_OPEN_EVENT, onOpen)

    return () => window.removeEventListener(NEXA_FLOATING_OPEN_EVENT, onOpen)
  }, [expandableEnabled, isLaneMode, setLaneOpen])

  // TASK-1134 — auto es el default real (el runtime decide server-side); el picker fija un override
  // manual. El FAB no persiste (estado efímero por montaje), a diferencia de useNexaPersistentRuntime.
  const [modelMode, setModelMode] = useState<NexaModelMode>('auto')
  const [manualModel, setManualModel] = useState<NexaModelId>(DEFAULT_NEXA_MODEL)
  const modelRef = useRef<NexaModelId>(DEFAULT_NEXA_MODEL)
  const modelModeRef = useRef<NexaModelMode>('auto')

  const handleModelChange = useCallback((value: NexaModelSelectorValue) => {
    if (value === 'auto') {
      setModelMode('auto')
      modelModeRef.current = 'auto'

      return
    }

    const resolved = resolveNexaModel({ requestedModel: value })

    setModelMode('manual')
    setManualModel(resolved)
    modelModeRef.current = 'manual'
    modelRef.current = resolved
  }, [])

  const selectedModel: NexaModelSelectorValue = modelMode === 'auto' ? 'auto' : manualModel

  const adapter = useMemo(() => createFloatingAdapter(modelRef, modelModeRef, focusRefRef), [])

  const runtime = useLocalRuntime(adapter, {
    initialMessages: [
      { role: 'assistant', content: [{ type: 'text' as const, text: 'Hola, soy Nexa. ¿En que puedo ayudarte?' }] }
    ]
  })

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

  // Hide where Nexa already owns the surface inline.
  if (pathname === '/home') return null

  const panelContent = (
    <AssistantRuntimeProvider runtime={runtime}>
      {pendingSeed ? <NexaSeedAutoSend seed={pendingSeed} onSent={() => setPendingSeed(null)} /> : null}
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
          <Stack direction='row' spacing={0.5} alignItems='center'>
            <NexaModeMenu />
            <IconButton size='small' onClick={() => setOpen(false)} aria-label={TASK407_ARIA_CERRAR_NEXA}>
              <i className='tabler-x' style={{ fontSize: '1rem' }} />
            </IconButton>
          </Stack>
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

      {/* Panel expandible persistido (TASK-1078) detrás del flag; con flag OFF, el
          panel efímero histórico (Drawer mobile / Card desktop) bit-for-bit.
          En modo lane (C) la burbuja no abre panel: solo togglea el lane (lo monta
          NexaLaneContentHost en el contenido). */}
      {isLaneMode ? null : expandableEnabled ? (
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
