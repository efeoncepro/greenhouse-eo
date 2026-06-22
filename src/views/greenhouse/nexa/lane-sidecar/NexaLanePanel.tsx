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
import NexaModeMenu from '@/components/greenhouse/NexaModeMenu'
import { GH_NEXA } from '@/lib/copy/nexa'
import {
  mapThreadMessagesToInitial,
  useNexaPersistentRuntime,
  type NexaInitialMessage
} from '@/lib/nexa/use-nexa-runtime'
import { useNexaThreadHistory } from '@/lib/nexa/use-nexa-thread-history'
import { resolveNexaPromptContext, type NexaPromptContext } from '@/lib/nexa/suggested-prompts'
import { useDataAwareSuggestedPrompts } from '@/lib/nexa/use-data-aware-suggested-prompts'
import type { NexaSuggestedPrompt, NexaSuggestedPromptHint } from '@/lib/nexa/suggested-prompts-contract'
import { useNexaPageContext } from '@/lib/nexa/nexa-page-context'
import type { NexaThreadDetail } from '@/lib/nexa/nexa-contract'

import NexaThread from '@/views/greenhouse/home/components/NexaThread'

import NexaHistoryRail from '../floating-chat/NexaHistoryRail'

const COPY = GH_NEXA.floating
const MODE_COPY = GH_NEXA.interactionMode

// Afordance por categoría de señal del prompt data-aware (mismo contrato que el panel B).
const HINT_AFFORDANCE: Record<NexaSuggestedPromptHint, { icon: string; color: 'warning' | 'error' | 'info' | 'primary' }> = {
  anomaly: { icon: 'tabler-alert-triangle', color: 'warning' },
  risk: { icon: 'tabler-flame', color: 'error' },
  pending: { icon: 'tabler-clock', color: 'info' },
  kpi: { icon: 'tabler-chart-dots', color: 'primary' }
}

const resolveGreeting = (conversationKey: number, firstName: string): string => {
  const pool = firstName ? COPY.greetings : COPY.greetings.filter(g => !g.includes('{name}'))

  if (pool.length === 0) return COPY.greeting_no_name

  return pool[conversationKey % pool.length].replace('{name}', firstName)
}

// ── Empty hero (cara real + saludo + grilla de prompts) — mismo contrato que el panel ──

const NexaLaneEmptyHero = ({
  greeting,
  promptContext,
  prompts
}: {
  greeting: string
  promptContext: NexaPromptContext
  prompts: NexaSuggestedPrompt[]
}) => {
  const theme = useTheme()
  const aui = useAui()

  const send = (text: string) => aui.thread().append({ role: 'user', content: [{ type: 'text' as const, text }] })

  return (
    <Stack alignItems='center' justifyContent='center' spacing={2.5} sx={{ position: 'absolute', inset: 0, bottom: 108, px: 4, overflowY: 'auto', zIndex: 2 }}>
      <NexaFace variant='hero' />
      <Stack spacing={1} alignItems='center'>
        <Typography variant='h4' sx={{ textAlign: 'center' }}>{greeting}</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center', maxWidth: 400, lineHeight: 1.55 }}>
          {COPY.empty_subtitle}
        </Typography>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: 999, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' }}>
          {promptContext.icon ? <i className={promptContext.icon} style={{ fontSize: '0.9rem' }} /> : null}
          <Typography variant='caption' sx={{ fontWeight: 600, letterSpacing: 0.1 }}>{promptContext.label}</Typography>
        </Box>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, width: '100%', maxWidth: 460 }}>
        {prompts.map(({ text, hint }) => {
          const affordance = hint ? HINT_AFFORDANCE[hint] : null

          return (
            <Box
              key={text}
              role='button'
              tabIndex={0}
              onClick={() => send(text)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  send(text)
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
                transition: theme.transitions.create(['border-color', 'box-shadow', 'transform'], { duration: theme.transitions.duration.shorter }),
                '& .nexa-lane-arrow': { opacity: 0, transform: 'translateX(-4px)', transition: 'opacity 0.15s ease, transform 0.15s ease', color: 'primary.main', flexShrink: 0 },
                '&:hover': { borderColor: 'primary.main', boxShadow: theme.greenhouseElevation.raised.boxShadow, transform: 'translateY(-1px)' },
                '&:hover .nexa-lane-arrow': { opacity: 1, transform: 'translateX(0)' },
                '&:focus-visible': { outline: '2px solid var(--mui-palette-primary-main)', outlineOffset: 2 },
                '&:active': { transform: 'translateY(0)' },
                '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                {affordance ? (
                  <i className={affordance.icon} aria-hidden style={{ fontSize: '0.95rem', color: theme.palette[affordance.color].main, flexShrink: 0 }} />
                ) : null}
                <Typography variant='body2' sx={{ lineHeight: 1.4 }}>{text}</Typography>
              </Box>
              <i className='tabler-arrow-up-right nexa-lane-arrow' style={{ fontSize: '0.9rem' }} />
            </Box>
          )
        })}
      </Box>
    </Stack>
  )
}

const ConversationBody = ({
  selectedModel,
  onModelChange,
  suggestions,
  greeting,
  promptContext,
  heroPrompts,
  onThinkingChange
}: {
  selectedModel: ReturnType<typeof useNexaPersistentRuntime>['selectedModel']
  onModelChange: ReturnType<typeof useNexaPersistentRuntime>['handleModelChange']
  suggestions: string[]
  greeting: string
  promptContext: NexaPromptContext
  heroPrompts: NexaSuggestedPrompt[]
  onThinkingChange: (thinking: boolean) => void
}) => {
  const isEmpty = useAuiState(s => s.thread.messages.length === 0)
  const isRunning = useAuiState(s => s.thread.isRunning)

  useEffect(() => {
    onThinkingChange(isRunning)

    return () => onThinkingChange(false)
  }, [isRunning, onThinkingChange])

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        bgcolor: 'background.paper'
      }}
    >
      {isEmpty && <NexaLaneEmptyHero greeting={greeting} promptContext={promptContext} prompts={heroPrompts} />}
      <NexaThread hideHeader selectedModel={selectedModel} onModelChange={onModelChange} suggestions={suggestions} />
    </Box>
  )
}

/* Área de conversación con runtime persistente propio. Cambiar su `key` = nuevo chat. */
const NexaConversationArea = ({
  initialMessages,
  initialThreadId,
  greeting,
  promptContext,
  heroPrompts,
  onThreadIdResolved,
  onThinkingChange
}: {
  initialMessages: NexaInitialMessage[]
  initialThreadId: string | null
  greeting: string
  promptContext: NexaPromptContext
  heroPrompts: NexaSuggestedPrompt[]
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
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        suggestions={suggestions}
        greeting={greeting}
        promptContext={promptContext}
        heroPrompts={heroPrompts}
        onThinkingChange={onThinkingChange}
      />
    </AssistantRuntimeProvider>
  )
}

const LaneHeaderButton = ({
  icon,
  label,
  onClick,
  active
}: {
  icon: string
  label: string
  onClick?: () => void
  active?: boolean
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
        aria-pressed={active}
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
          bgcolor: active ? alpha(theme.palette.common.white, 0.2) : 'transparent',
          color: alpha(theme.palette.common.white, active ? 1 : 0.85),
          transition: theme.transitions.create(['background-color', 'color'], { duration: theme.transitions.duration.shorter }),
          '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.2), color: 'common.white' },
          '&:focus-visible': { bgcolor: alpha(theme.palette.common.white, 0.2), color: 'common.white', outline: `2px solid ${alpha(teal, 0.7)}`, outlineOffset: 2 }
        }}
      >
        <i className={icon} style={{ fontSize: '1.1rem' }} />
      </Box>
    </Tooltip>
  )
}

/**
 * TASK-1079 — cuerpo del lane (concepto C). Full-height in-flow, reusa el runtime
 * persistente compartido (`useNexaPersistentRuntime`), el historial real
 * (`useNexaThreadHistory` + `NexaHistoryRail`) y `NexaThread` — cero lógica de chat
 * duplicada respecto del panel flotante. `onCollapse` contrae el lane (la burbuja lo
 * reabre).
 */
const NexaLanePanel = ({ onCollapse }: { onCollapse: () => void }) => {
  const { data: session } = useSession()
  const navy = GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy
  const teal = GREENHOUSE_NEXA_BRAND_COLORS.electricTeal

  const firstName = (session?.user?.name || '').split(' ')[0] || ''

  const history = useNexaThreadHistory()

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [conversationKey, setConversationKey] = useState(0)
  const [initialMessages, setInitialMessages] = useState<NexaInitialMessage[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [railOpen, setRailOpen] = useState(true)

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

  const pathname = usePathname()
  const pageContext = useNexaPageContext()
  const promptContext = useMemo(() => resolveNexaPromptContext(pathname, pageContext), [pathname, pageContext])
  const heroPrompts = useDataAwareSuggestedPrompts(promptContext, pageContext)

  return (
    <Box
      role='complementary'
      aria-label={MODE_COPY.lane_aria}
      data-capture='nexa-lane-panel'
      sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.paper' }}
    >
      {/* Header navy con presencia */}
      <Stack direction='row' alignItems='center' spacing={2} sx={{ px: 2.5, py: 2, bgcolor: navy, color: 'common.white', flexShrink: 0, minHeight: 64 }}>
        <NexaFace variant='header' />
        <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant='h4' component='span' sx={{ color: 'common.white', fontWeight: 600, lineHeight: 1.2 }}>
            Nexa
          </Typography>
          <Stack direction='row' alignItems='center' spacing={1.5}>
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
                '@keyframes nexa-lane-ping': {
                  '0%': { boxShadow: `0 0 0 0 ${alpha(teal, 0.55)}` },
                  '70%': { boxShadow: `0 0 0 7px ${alpha(teal, 0)}` },
                  '100%': { boxShadow: `0 0 0 0 ${alpha(teal, 0)}` }
                },
                '&::after': { content: '""', position: 'absolute', inset: 0, borderRadius: '50%', animation: 'nexa-lane-ping 2.4s cubic-bezier(0.2, 0, 0, 1) infinite' },
                '@media (prefers-reduced-motion: reduce)': { boxShadow: `0 0 0 3px ${alpha(teal, 0.25)}`, '&::after': { animation: 'none' } }
              }}
            />
            <NexaPresenceMark thinking={isThinking} onlineLabel={COPY.presence_online} thinkingLabel={COPY.presence_thinking} />
          </Stack>
        </Stack>

        <NexaModeMenu tone='onNavy' />
        <LaneHeaderButton icon='tabler-layout-sidebar' label={MODE_COPY.history_toggle_aria} onClick={() => setRailOpen(v => !v)} active={railOpen} />
        <LaneHeaderButton icon='tabler-plus' label={COPY.new_conversation_aria} onClick={handleNewConversation} />
        <LaneHeaderButton icon='tabler-x' label={MODE_COPY.collapse_lane_aria} onClick={onCollapse} />
      </Stack>

      {/* Cuerpo: rail historial (toggle) + conversación con runtime persistente */}
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {railOpen && (
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
          initialMessages={initialMessages}
          initialThreadId={activeThreadId}
          greeting={greeting}
          promptContext={promptContext}
          heroPrompts={heroPrompts}
          onThreadIdResolved={handleThreadIdResolved}
          onThinkingChange={setIsThinking}
        />
      </Box>
    </Box>
  )
}

export default NexaLanePanel
