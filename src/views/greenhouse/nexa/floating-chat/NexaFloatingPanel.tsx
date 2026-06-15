'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { usePathname } from 'next/navigation'

import { useSession } from 'next-auth/react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { AssistantRuntimeProvider, useAui, useAuiState } from '@assistant-ui/react'

import { GREENHOUSE_NEXA_BRAND_COLORS } from '@/components/greenhouse/primitives/greenhouse-nexa-brand-controller'
import { NexaFace, NexaPresenceMark } from '@/components/greenhouse/primitives'
import { GH_NEXA } from '@/lib/copy/nexa'
import {
  mapThreadMessagesToInitial,
  useNexaPersistentRuntime,
  type NexaInitialMessage
} from '@/lib/nexa/use-nexa-runtime'
import { useNexaThreadHistory } from '@/lib/nexa/use-nexa-thread-history'
import { resolveNexaPromptContext, type NexaPromptContext } from '@/lib/nexa/suggested-prompts'
import { useDataAwareSuggestedPrompts } from '@/lib/nexa/use-data-aware-suggested-prompts'
import { useNexaPageContext } from '@/lib/nexa/nexa-page-context'
import type { NexaThreadDetail } from '@/lib/nexa/nexa-contract'

import NexaThread from '@/views/greenhouse/home/components/NexaThread'

import NexaHistoryRail from './NexaHistoryRail'

const COPY = GH_NEXA.floating

const resolveGreeting = (conversationKey: number, firstName: string): string => {
  const pool = firstName ? COPY.greetings : COPY.greetings.filter(g => !g.includes('{name}'))

  if (pool.length === 0) return COPY.greeting_no_name

  return pool[conversationKey % pool.length].replace('{name}', firstName)
}

// ── Empty hero (cara real + saludo + grilla de prompts) — port verbatim del mockup ──

const NexaEmptyHero = ({ greeting, promptContext }: { greeting: string; promptContext: NexaPromptContext }) => {
  const theme = useTheme()
  const aui = useAui()

  const send = (text: string) => aui.thread().append({ role: 'user', content: [{ type: 'text' as const, text }] })

  return (
    <Stack
      alignItems='center'
      justifyContent='center'
      spacing={2.5}
      sx={{ position: 'absolute', inset: 0, bottom: 108, px: 4, overflowY: 'auto', zIndex: 2 }}
    >
      <NexaFace variant='hero' />
      <Stack spacing={1} alignItems='center'>
        <Typography variant='h4' sx={{ textAlign: 'center' }}>{greeting}</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center', maxWidth: 400, lineHeight: 1.55 }}>
          {COPY.empty_subtitle}
        </Typography>
        {/* Chip de contexto: indica de qué pantalla/contexto vienen las sugerencias. */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            color: 'primary.main'
          }}
        >
          {promptContext.icon ? <i className={promptContext.icon} style={{ fontSize: '0.9rem' }} /> : null}
          <Typography variant='caption' sx={{ fontWeight: 600, letterSpacing: 0.1 }}>
            {promptContext.label}
          </Typography>
        </Box>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1.5,
          width: '100%',
          maxWidth: 460
        }}
      >
        {promptContext.prompts.map(prompt => (
          <Box
            key={prompt}
            role='button'
            tabIndex={0}
            onClick={() => send(prompt)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                send(prompt)
              }
            }}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              px: 2,
              py: 1.5,
              cursor: 'pointer',
              bgcolor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              transition: theme.transitions.create(['border-color', 'box-shadow', 'transform'], {
                duration: theme.transitions.duration.shorter
              }),
              '& .nexa-hero-arrow': {
                opacity: 0,
                transform: 'translateX(-4px)',
                transition: 'opacity 0.15s ease, transform 0.15s ease',
                color: 'primary.main',
                flexShrink: 0
              },
              '&:hover': {
                borderColor: 'primary.main',
                boxShadow: theme.greenhouseElevation.raised.boxShadow,
                transform: 'translateY(-1px)'
              },
              '&:hover .nexa-hero-arrow': { opacity: 1, transform: 'translateX(0)' },
              '&:focus-visible': { outline: '2px solid var(--mui-palette-primary-main)', outlineOffset: 2 },
              '&:active': { transform: 'translateY(0)' },
              '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } }
            }}
          >
            <Typography variant='body2' sx={{ lineHeight: 1.4 }}>{prompt}</Typography>
            <i className='tabler-arrow-up-right nexa-hero-arrow' style={{ fontSize: '0.9rem' }} />
          </Box>
        ))}
      </Box>

      {/* Firma de marca Efeonce — SOLO en el empty state. Wordmark canónico recoloreado
          a gris SÓLIDO vía mask (no opacidad, que se ve watermark). */}
      <Box sx={{ position: 'absolute', bottom: 14, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <Box
          aria-hidden
          sx={{
            width: 66,
            height: 15,
            bgcolor: 'grey.400',
            maskImage: 'url(/branding/logo-full.svg)',
            WebkitMaskImage: 'url(/branding/logo-full.svg)',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskPosition: 'center',
            WebkitMaskPosition: 'center'
          }}
        />
      </Box>
    </Stack>
  )
}

/* Cuerpo de la conversación: el empty hero se decide por el conteo real de mensajes
   (se oculta solo al enviar) + entrada fluida al montar (nueva conversación). */
const ConversationBody = ({
  expanded,
  selectedModel,
  onModelChange,
  suggestions,
  greeting,
  promptContext,
  onThinkingChange
}: {
  expanded: boolean
  selectedModel: ReturnType<typeof useNexaPersistentRuntime>['selectedModel']
  onModelChange: ReturnType<typeof useNexaPersistentRuntime>['handleModelChange']
  suggestions: string[]
  greeting: string
  promptContext: NexaPromptContext
  onThinkingChange: (thinking: boolean) => void
}) => {
  const isEmpty = useAuiState(s => s.thread.messages.length === 0)
  const isRunning = useAuiState(s => s.thread.isRunning)

  // Reporta el estado "pensando" al header (que vive fuera del AssistantRuntimeProvider).
  // Cleanup → false al desmontar (switch de thread mientras corre no deja "Pensando" pegado).
  useEffect(() => {
    onThinkingChange(isRunning)

    return () => onThinkingChange(false)
  }, [isRunning, onThinkingChange])

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        // minHeight:0 propaga la contención de altura por la cadena flex → el Viewport
        // interno del thread scrollea en vez de empujar el panel (fix scroll del chat).
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        bgcolor: 'background.paper',
        '@keyframes nexa-convo-in': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        animation: 'nexa-convo-in 0.3s cubic-bezier(0.2, 0, 0, 1)',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
      }}
    >
      {isEmpty && <NexaEmptyHero greeting={greeting} promptContext={promptContext} />}
      <NexaThread hideHeader compact={!expanded} selectedModel={selectedModel} onModelChange={onModelChange} suggestions={suggestions} />
    </Box>
  )
}

/* Área de conversación con runtime persistente propio. Cambiar su `key` = nuevo chat
   (runtime sembrado con `initialMessages`) → empty hero si vacío, o thread rehidratado. */
const NexaConversationArea = ({
  expanded,
  initialMessages,
  initialThreadId,
  greeting,
  promptContext,
  onThreadIdResolved,
  onThinkingChange
}: {
  expanded: boolean
  initialMessages: NexaInitialMessage[]
  initialThreadId: string | null
  greeting: string
  promptContext: NexaPromptContext
  onThreadIdResolved: (threadId: string) => void
  onThinkingChange: (thinking: boolean) => void
}) => {
  const { runtime, selectedModel, handleModelChange, suggestions } = useNexaPersistentRuntime({
    initialMessages,
    initialThreadId,
    onThreadIdResolved
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ConversationBody
        expanded={expanded}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        suggestions={suggestions}
        greeting={greeting}
        promptContext={promptContext}
        onThinkingChange={onThinkingChange}
      />
    </AssistantRuntimeProvider>
  )
}

/* Botón circular del header (navy): reposo = solo ícono, hover/focus = círculo gris
   detrás (Box component='button' para controlar el fondo sin el :hover del IconButton
   de MUI). Reusado por nueva conversación / expandir / cerrar → hover consistente. */
const HeaderIconButton = ({
  icon,
  label,
  onClick,
  iconSize = '1.1rem',
  restOpacity = 0.85
}: {
  icon: string
  label: string
  onClick?: () => void
  iconSize?: string
  restOpacity?: number
}) => {
  const theme = useTheme()
  const teal = GREENHOUSE_NEXA_BRAND_COLORS.electricTeal

  return (
    <Tooltip title={label}>
      <Box
        component='button'
        type='button'
        onClick={onClick}
        aria-label={label}
        sx={{
          width: 34,
          height: 34,
          flexShrink: 0,
          p: 0,
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'transparent',
          color: alpha(theme.palette.common.white, restOpacity),
          transition: theme.transitions.create(['background-color', 'color'], { duration: theme.transitions.duration.shorter }),
          '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.2), color: 'common.white' },
          '&:focus-visible': { bgcolor: alpha(theme.palette.common.white, 0.2), color: 'common.white', outline: `2px solid ${alpha(teal, 0.7)}`, outlineOffset: 2 }
        }}
      >
        <i className={icon} style={{ fontSize: iconSize }} />
      </Box>
    </Tooltip>
  )
}

export interface NexaFloatingPanelProps {
  expanded: boolean
  onToggleExpanded: () => void
  onClose: () => void
}

const NexaFloatingPanel = ({ expanded, onToggleExpanded, onClose }: NexaFloatingPanelProps) => {
  const theme = useTheme()
  const { data: session } = useSession()
  const navy = GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy
  const teal = GREENHOUSE_NEXA_BRAND_COLORS.electricTeal

  const firstName = (session?.user?.name || '').split(' ')[0] || ''

  const history = useNexaThreadHistory()

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [conversationKey, setConversationKey] = useState(0)
  const [initialMessages, setInitialMessages] = useState<NexaInitialMessage[]>([])
  const [isThinking, setIsThinking] = useState(false)

  const handleNewConversation = useCallback(() => {
    setActiveThreadId(null)
    setInitialMessages([])
    setConversationKey(k => k + 1)
  }, [])

  const handleSelectThread = useCallback(
    async (threadId: string) => {
      if (threadId === activeThreadId) return

      try {
        const res = await fetch(`/api/home/nexa/threads/${threadId}`)

        if (!res.ok) return

        const detail = (await res.json()) as NexaThreadDetail

        setInitialMessages(mapThreadMessagesToInitial(detail.messages ?? []))
        setActiveThreadId(threadId)
        setConversationKey(k => k + 1)
      } catch {
        // Silent fail — el rail sigue navegable; el thread no se carga.
      }
    },
    [activeThreadId]
  )

  const handleThreadIdResolved = useCallback(
    (threadId: string) => {
      setActiveThreadId(threadId)
      void history.refetch()
    },
    [history]
  )

  const greeting = useMemo(() => resolveGreeting(conversationKey, firstName), [conversationKey, firstName])

  // Prompts contextuales: ruta (Tier 1) + contexto declarado por la página (Tier 1.5 — nombre
  // real de la entidad, ej. "Cliente · Sky Airline"). Determinístico, cero datos/IA.
  const pathname = usePathname()
  const pageContext = useNexaPageContext()
  const basePromptContext = useMemo(() => resolveNexaPromptContext(pathname, pageContext), [pathname, pageContext])

  // TASK-1087 Tier 2 — capa data-aware sobre Tier 1/1.5: si el flag está on, la entidad tiene
  // `entityId` y hay señales reales, reemplaza los prompts por los data-aware; si no, devuelve los
  // de plantilla intactos (aditivo, byte-idéntico al comportamiento previo).
  const effectivePrompts = useDataAwareSuggestedPrompts(basePromptContext, pageContext)

  const promptContext = useMemo<NexaPromptContext>(
    () => (effectivePrompts === basePromptContext.prompts ? basePromptContext : { ...basePromptContext, prompts: effectivePrompts }),
    [basePromptContext, effectivePrompts]
  )

  return (
    <Box
      role='complementary'
      aria-label={COPY.panel_aria}
      data-capture='nexa-floating-panel'
      sx={{
        width: expanded ? 'min(760px, 92vw)' : 'min(400px, 92vw)',
        height: 'min(620px, 82vh)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        // Transparente: cada sección pinta su fondo (header navy, rail glass, conversación
        // blanca) → el rail glass puede ver/desenfocar la página detrás del panel.
        bgcolor: 'transparent',
        boxShadow: theme.greenhouseElevation.overlay.boxShadow,
        border: '1px solid',
        borderColor: theme.greenhouseElevation.overlay.borderColor ?? 'divider',
        transition: theme.transitions.create(['width'], { duration: theme.transitions.duration.standard })
      }}
    >
      {/* Header navy con presencia */}
      <Stack
        direction='row'
        alignItems='center'
        spacing={2.25}
        sx={{ px: 2.5, py: 2, bgcolor: navy, color: 'common.white', flexShrink: 0, minHeight: 64 }}
      >
        <NexaFace variant='header' />
        <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant='h4' component='span' sx={{ color: 'common.white', fontWeight: 600, lineHeight: 1.2 }}>
            Nexa
          </Typography>
          <Stack direction='row' alignItems='center' spacing={1.5}>
            {/* Presencia "encendida": glow constante + ping que respira. Reduced-motion
                → glow estático (sin ping). Decorativo (el texto "En línea" da el estado). */}
            <Box
              aria-hidden
              sx={{
                position: 'relative',
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: teal,
                flexShrink: 0,
                boxShadow: `0 0 6px 1px ${alpha(teal, 0.7)}`,
                '@keyframes nexa-presence-ping': {
                  '0%': { boxShadow: `0 0 0 0 ${alpha(teal, 0.55)}` },
                  '70%': { boxShadow: `0 0 0 7px ${alpha(teal, 0)}` },
                  '100%': { boxShadow: `0 0 0 0 ${alpha(teal, 0)}` }
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  animation: 'nexa-presence-ping 2.4s cubic-bezier(0.2, 0, 0, 1) infinite'
                },
                '@media (prefers-reduced-motion: reduce)': {
                  boxShadow: `0 0 0 3px ${alpha(teal, 0.25)}`,
                  '&::after': { animation: 'none' }
                }
              }}
            />
            <NexaPresenceMark thinking={isThinking} onlineLabel={COPY.presence_online} thinkingLabel={COPY.presence_thinking} />
          </Stack>
        </Stack>

        {/* Controles del header — mismo hover (círculo gris) en los tres, vía HeaderIconButton */}
        <HeaderIconButton icon='tabler-plus' label={COPY.new_conversation_aria} onClick={handleNewConversation} iconSize='1.15rem' restOpacity={1} />
        <HeaderIconButton
          icon={expanded ? 'tabler-arrows-diagonal-minimize-2' : 'tabler-arrows-diagonal'}
          label={expanded ? COPY.collapse_aria : COPY.expand_aria}
          onClick={onToggleExpanded}
        />
        <HeaderIconButton icon='tabler-x' label={COPY.close_aria} onClick={onClose} />
      </Stack>

      {/* Cuerpo: rail historial (solo expandido) + conversación con runtime persistente */}
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {expanded && (
          <NexaHistoryRail
            groups={history.groups}
            loading={history.loading}
            error={history.error}
            activeThreadId={activeThreadId}
            onSelectThread={handleSelectThread}
            onRefetch={() => void history.refetch()}
            onRename={history.rename}
            onRemove={history.remove}
          />
        )}
        <NexaConversationArea
          key={conversationKey}
          expanded={expanded}
          initialMessages={initialMessages}
          initialThreadId={activeThreadId}
          greeting={greeting}
          promptContext={promptContext}
          onThreadIdResolved={handleThreadIdResolved}
          onThinkingChange={setIsThinking}
        />
      </Box>
    </Box>
  )
}

export default NexaFloatingPanel
