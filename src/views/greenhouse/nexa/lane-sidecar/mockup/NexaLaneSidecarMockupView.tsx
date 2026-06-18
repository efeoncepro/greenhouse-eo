'use client'

import { useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'
import { alpha, useTheme } from '@mui/material/styles'

import { AssistantRuntimeProvider, useAui, useAuiState, useLocalRuntime } from '@assistant-ui/react'
import type { ChatModelAdapter, ChatModelRunResult } from '@assistant-ui/react'

import { AdaptiveSidecarLayout, NexaFace, NexaPresenceMark } from '@/components/greenhouse/primitives'
import type { AdaptiveSidecarPreferredMode } from '@/components/greenhouse/primitives'
import { GREENHOUSE_NEXA_BRAND_COLORS } from '@/components/greenhouse/primitives/greenhouse-nexa-brand-controller'
import type { NexaModelSelectorValue } from '@/lib/nexa/use-nexa-runtime'

import NexaThread from '@/views/greenhouse/home/components/NexaThread'

// ── Copy local del mockup (los keys canónicos viven en GH_NEXA.floating; el wiring
//    productivo de Slice 2/3 los reusa + agrega los lane-específicos a src/lib/copy/nexa.ts) ──
const COPY = {
  lane_aria: 'Nexa AI',
  presence_online: 'En línea',
  presence_thinking: 'Pensando',
  new_conversation: 'Nueva conversación',
  history_toggle: 'Historial',
  pin: 'Anclar lane',
  unpin: 'Desanclar lane',
  close: 'Cerrar Nexa',
  empty_subtitle: 'Pregúntame por tus métricas, cuentas o proyecciones — el dashboard se queda abierto a tu lado.',
  rail_title: 'Recientes',
  open_lane: 'Abrir Nexa',
  search_aria: 'Buscar conversación'
} as const

// Cuerpo navy de marca: SoT de color de Nexa (no HEX inline en componentes de producto).
const NAVY = GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy
const TEAL = GREENHOUSE_NEXA_BRAND_COLORS.electricTeal

// ── Mock data (sin datos productivos) ─────────────────────────────────────────

const SEEDED_MESSAGES = [
  { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'Hola, Marie. Tienes el P&L de mayo abierto al lado — pregúntame lo que quieras sin perderlo de vista.' }] },
  { role: 'user' as const, content: [{ type: 'text' as const, text: '¿Dónde se concentró el gasto este mes?' }] },
  {
    role: 'assistant' as const,
    content: [
      {
        type: 'text' as const,
        text: 'El **62%** del gasto de mayo está en nómina y honorarios; le sigue tooling de IA (**18%**) y servicios cloud (**11%**). Lo que más se movió contra abril es el cloud (+$2.1M) por el backfill de BigQuery. ¿Quieres el detalle por proveedor o la comparación con el presupuesto?'
      }
    ]
  }
] as const

interface MockThread {
  id: string
  title: string
  group: 'Hoy' | 'Ayer' | 'Esta semana'
  active?: boolean
}

const MOCK_HISTORY: MockThread[] = [
  { id: 't1', title: 'Gasto de mayo por categoría', group: 'Hoy', active: true },
  { id: 't2', title: 'MRR mayo vs abril', group: 'Hoy' },
  { id: 't3', title: 'Cuentas en riesgo de churn', group: 'Ayer' },
  { id: 't4', title: 'Onboarding Sky Airline', group: 'Ayer' },
  { id: 't5', title: 'Proyección Q2', group: 'Esta semana' }
]

const MOCK_HISTORY_GROUPS = ['Hoy', 'Ayer', 'Esta semana'] as const

const NEXA_EMPTY_GREETINGS = [
  'Hola, Marie. ¿Qué número desarmamos?',
  'Marie, tus datos ya calientan motores.',
  'Hola, Marie. ¿Le tomamos el pulso al mes?',
  'Marie, de datos a decisiones.',
  'Hola, Marie. ¿Qué riesgo cazamos hoy?'
]

// Adapter mock: responde canned para que el composer funcione en el demo, sin API real.
const createMockAdapter = (): ChatModelAdapter => ({
  async run(): Promise<ChatModelRunResult> {
    await new Promise(resolve => setTimeout(resolve, 600))

    return {
      content: [
        {
          type: 'text' as const,
          text: 'Demo: en runtime, el lane consulta a Nexa con el runtime persistente compartido (mismo que el dock y el panel) y deja el dashboard 100% visible al lado. (Mockup TASK-1079)'
        }
      ]
    }
  }
})

// ── Dashboard backdrop (queda 100% visible al lado del lane — split, no atenuado) ──

const BACKDROP_KPIS = [
  { label: 'MRR mayo', value: '$1.250.000', delta: '+6,2%', tone: 'success' as const, icon: 'tabler-trending-up' },
  { label: 'Churn', value: '1,18%', delta: '-0,3 pts', tone: 'success' as const, icon: 'tabler-arrow-down-right' },
  { label: 'Gasto', value: '$842.000', delta: '+4,1%', tone: 'warning' as const, icon: 'tabler-receipt' },
  { label: 'Margen', value: '32,6%', delta: '+1,2 pts', tone: 'success' as const, icon: 'tabler-percentage' }
]

const BACKDROP_ROWS = [
  { client: 'Sky Airline', line: 'Performance', mrr: '$320.000', status: 'Saludable' },
  { client: 'Banco Andes', line: 'Brand', mrr: '$210.000', status: 'Saludable' },
  { client: 'Manufactura Sur', line: 'Always-on', mrr: '$148.000', status: 'En riesgo' },
  { client: 'Retail Norte', line: 'Performance', mrr: '$96.000', status: 'Saludable' }
]

const DashboardBackdrop = () => {
  const theme = useTheme()

  return (
    <Stack spacing={3} data-capture='nexa-lane-backdrop' sx={{ px: { xs: 2, md: 4 }, py: { xs: 2, md: 4 } }}>
      <Stack spacing={0.5}>
        <Typography variant='h4'>P&amp;L · Mayo 2026</Typography>
        <Typography variant='body2' color='text.secondary'>
          Tu contexto de trabajo permanece abierto mientras conversas con Nexa.
        </Typography>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2.5 }}>
        {BACKDROP_KPIS.map(kpi => (
          <Card key={kpi.label} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
                <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600, letterSpacing: '0.04em' }}>
                  {kpi.label}
                </Typography>
                <i className={kpi.icon} style={{ fontSize: '1.05rem', color: theme.palette[kpi.tone].main }} />
              </Stack>
              <Typography variant='h4' sx={{ mt: 1.5, mb: 0.5 }}>
                {kpi.value}
              </Typography>
              <Chip
                size='small'
                label={kpi.delta}
                sx={{
                  height: 22,
                  fontWeight: 600,
                  color: theme.palette[kpi.tone].main,
                  bgcolor: alpha(theme.palette[kpi.tone].main, 0.12)
                }}
              />
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Typography variant='h6' sx={{ mb: 2 }}>
            Ingresos por cuenta
          </Typography>
          <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
            {BACKDROP_ROWS.map(row => (
              <Stack key={row.client} direction='row' alignItems='center' spacing={2} sx={{ py: 1.5 }}>
                <Typography variant='body2' sx={{ flex: 1, fontWeight: 600, minWidth: 0 }} noWrap>
                  {row.client}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ width: 120 }} noWrap>
                  {row.line}
                </Typography>
                <Typography variant='body2' sx={{ width: 96, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {row.mrr}
                </Typography>
                <Chip
                  size='small'
                  label={row.status}
                  sx={{
                    height: 22,
                    fontWeight: 600,
                    color: row.status === 'En riesgo' ? theme.palette.warning.main : theme.palette.success.main,
                    bgcolor: alpha(row.status === 'En riesgo' ? theme.palette.warning.main : theme.palette.success.main, 0.12)
                  }}
                />
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

// ── History rail (lane full-height) ────────────────────────────────────────────

const LaneHistoryRail = ({ onSelect }: { onSelect: (id: string) => void }) => {
  const theme = useTheme()

  return (
    <Stack
      sx={{
        width: 232,
        flexShrink: 0,
        borderInlineEnd: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.4 : 0.6),
        overflowY: 'auto'
      }}
    >
      <Typography
        variant='overline'
        component='div'
        sx={{ px: 2.5, pt: 2.5, pb: 1, color: 'text.disabled', letterSpacing: '0.09em', fontWeight: 600 }}
      >
        {COPY.rail_title}
      </Typography>
      {MOCK_HISTORY_GROUPS.map(group => {
        const items = MOCK_HISTORY.filter(t => t.group === group)

        if (items.length === 0) return null

        return (
          <Box key={group} sx={{ px: 2, pb: 0.5 }}>
            <Typography variant='caption' sx={{ px: 1.5, color: 'text.disabled', fontWeight: 600 }}>
              {group}
            </Typography>
            <Stack role='list' sx={{ gap: 0.25, mt: 0.5 }}>
              {items.map((thread, i) => (
                <Box
                  key={thread.id}
                  role='button'
                  tabIndex={0}
                  aria-current={thread.active ? 'true' : undefined}
                  onClick={() => onSelect(thread.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelect(thread.id)
                    }
                  }}
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                    cursor: 'pointer',
                    bgcolor: thread.active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    color: thread.active ? 'primary.main' : 'text.primary',
                    transition: theme.transitions.create(['background-color'], { duration: theme.transitions.duration.shortest }),
                    '@keyframes nexa-lane-rail-in': {
                      '0%': { opacity: 0, transform: 'translateX(-4px)' },
                      '100%': { opacity: 1, transform: 'translateX(0)' }
                    },
                    animation: `nexa-lane-rail-in 0.22s cubic-bezier(0.2, 0, 0, 1) ${0.03 * i}s both`,
                    '&:hover': { bgcolor: thread.active ? alpha(theme.palette.primary.main, 0.14) : 'action.hover' },
                    '&:focus-visible': { outline: '2px solid var(--mui-palette-primary-main)', outlineOffset: -2 },
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none', animation: 'none' }
                  }}
                >
                  <Typography variant='body2' noWrap sx={{ fontWeight: thread.active ? 600 : 400 }}>
                    {thread.title}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )
      })}
    </Stack>
  )
}

// ── Empty hero del lane (cara real + saludo + grilla de prompts) ────────────────

const LaneEmptyHero = ({ greeting }: { greeting: string }) => {
  const theme = useTheme()
  const aui = useAui()

  const prompts = ['Resumen ejecutivo del mes', '¿Qué cuentas están en riesgo?', 'Compara ingresos por línea', 'Proyecta el cierre del mes']

  const send = (text: string) => aui.thread().append({ role: 'user', content: [{ type: 'text' as const, text }] })

  return (
    <Stack alignItems='center' justifyContent='center' spacing={2.5} sx={{ position: 'absolute', inset: 0, bottom: 108, px: 4, overflowY: 'auto', zIndex: 2 }}>
      <NexaFace variant='hero' />
      <Stack spacing={1} alignItems='center'>
        <Typography variant='h4' sx={{ textAlign: 'center' }}>
          {greeting}
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center', maxWidth: 360, lineHeight: 1.55 }}>
          {COPY.empty_subtitle}
        </Typography>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, width: '100%', maxWidth: 460 }}>
        {prompts.map(text => (
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
              '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } }
            }}
          >
            <Typography variant='body2' sx={{ lineHeight: 1.4 }}>
              {text}
            </Typography>
            <i className='tabler-arrow-up-right nexa-lane-arrow' style={{ fontSize: '0.9rem' }} />
          </Box>
        ))}
      </Box>
    </Stack>
  )
}

const ConversationBody = ({
  selectedModel,
  onModelChange,
  greeting,
  onThinkingChange
}: {
  selectedModel: NexaModelSelectorValue
  onModelChange: (value: NexaModelSelectorValue) => void
  greeting: string
  onThinkingChange: (thinking: boolean) => void
}) => {
  const isEmpty = useAuiState(s => s.thread.messages.length === 0)
  const isRunning = useAuiState(s => s.thread.isRunning)

  // Reportar el estado "pensando" al padre en un efecto, NO durante el render
  // (setState del padre durante el render del hijo dispara el warning de React).
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
      {isEmpty && <LaneEmptyHero greeting={greeting} />}
      <NexaThread hideHeader selectedModel={selectedModel} onModelChange={onModelChange} suggestions={[]} />
    </Box>
  )
}

const ConversationArea = ({
  initialEmpty,
  conversationKey,
  selectedModel,
  onModelChange,
  greeting,
  onThinkingChange
}: {
  initialEmpty: boolean
  conversationKey: number
  selectedModel: NexaModelSelectorValue
  onModelChange: (value: NexaModelSelectorValue) => void
  greeting: string
  onThinkingChange: (thinking: boolean) => void
}) => {
  const adapter = useMemo(() => createMockAdapter(), [])
  const runtime = useLocalRuntime(adapter, { initialMessages: initialEmpty ? [] : [...SEEDED_MESSAGES] })

  return (
    <AssistantRuntimeProvider key={conversationKey} runtime={runtime}>
      <ConversationBody selectedModel={selectedModel} onModelChange={onModelChange} greeting={greeting} onThinkingChange={onThinkingChange} />
    </AssistantRuntimeProvider>
  )
}

// Botón circular del header navy — mismo patrón que NexaFloatingPanel (hover gris).
const LaneHeaderButton = ({ icon, label, onClick, active }: { icon: string; label: string; onClick?: () => void; active?: boolean }) => {
  const theme = useTheme()

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
          '&:focus-visible': { bgcolor: alpha(theme.palette.common.white, 0.2), color: 'common.white', outline: `2px solid ${alpha(TEAL, 0.7)}`, outlineOffset: 2 }
        }}
      >
        <i className={icon} style={{ fontSize: '1.1rem' }} />
      </Box>
    </Tooltip>
  )
}

// ── Lane sidecar (concepto C): assistant full-height in-flow ────────────────────

const NexaLaneSidecar = ({ onClose }: { onClose: () => void }) => {
  // En compacto la conversación lidera (mobile = Drawer angosto); el rail se abre on-demand.
  const isCompact = useMediaQuery((t: Theme) => t.breakpoints.down('md'))
  const [conversationKey, setConversationKey] = useState(0)
  const [emptyConversation, setEmptyConversation] = useState(false)
  const [railOpen, setRailOpen] = useState(true)
  const [selectedModel, setSelectedModel] = useState<NexaModelSelectorValue>('auto')
  const [isThinking, setIsThinking] = useState(false)

  useEffect(() => {
    setRailOpen(!isCompact)
  }, [isCompact])

  const greeting = NEXA_EMPTY_GREETINGS[conversationKey % NEXA_EMPTY_GREETINGS.length]

  const handleNewConversation = () => {
    setEmptyConversation(true)
    setConversationKey(k => k + 1)
  }

  const handleSelectThread = () => {
    setEmptyConversation(false)
    setConversationKey(k => k + 1)
  }

  return (
    <Box
      role='complementary'
      aria-label={COPY.lane_aria}
      data-capture='nexa-lane-sidecar'
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.paper'
      }}
    >
      {/* Header navy con presencia */}
      <Stack direction='row' alignItems='center' spacing={2} sx={{ px: 2.5, py: 2, bgcolor: NAVY, color: 'common.white', flexShrink: 0, minHeight: 64 }}>
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
                bgcolor: TEAL,
                flexShrink: 0,
                boxShadow: `0 0 6px 1px ${alpha(TEAL, 0.7)}`,
                '@keyframes nexa-lane-ping': {
                  '0%': { boxShadow: `0 0 0 0 ${alpha(TEAL, 0.55)}` },
                  '70%': { boxShadow: `0 0 0 7px ${alpha(TEAL, 0)}` },
                  '100%': { boxShadow: `0 0 0 0 ${alpha(TEAL, 0)}` }
                },
                '&::after': { content: '""', position: 'absolute', inset: 0, borderRadius: '50%', animation: 'nexa-lane-ping 2.4s cubic-bezier(0.2, 0, 0, 1) infinite' },
                '@media (prefers-reduced-motion: reduce)': { boxShadow: `0 0 0 3px ${alpha(TEAL, 0.25)}`, '&::after': { animation: 'none' } }
              }}
            />
            <NexaPresenceMark thinking={isThinking} onlineLabel={COPY.presence_online} thinkingLabel={COPY.presence_thinking} />
          </Stack>
        </Stack>

        <LaneHeaderButton icon='tabler-layout-sidebar' label={COPY.history_toggle} onClick={() => setRailOpen(v => !v)} active={railOpen} />
        <LaneHeaderButton icon='tabler-plus' label={COPY.new_conversation} onClick={handleNewConversation} />
        <LaneHeaderButton icon='tabler-x' label={COPY.close} onClick={onClose} />
      </Stack>

      {/* Cuerpo: rail historial (toggle) + conversación full-height */}
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {railOpen && <LaneHistoryRail onSelect={handleSelectThread} />}
        <ConversationArea
          initialEmpty={emptyConversation}
          conversationKey={conversationKey}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          greeting={greeting}
          onThinkingChange={setIsThinking}
        />
      </Box>

      {/* Marca de modo (mockup): deja claro que es el concepto C. */}
      <Box sx={{ px: 2.5, py: 1, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Typography variant='caption' color='text.secondary'>
          Modo lane · el dashboard queda visible al lado (mockup TASK-1079)
        </Typography>
      </Box>
    </Box>
  )
}

// ── Vista del mockup ───────────────────────────────────────────────────────────

const NexaLaneSidecarMockupView = () => {
  const theme = useTheme()
  const [open, setOpen] = useState(true)
  const [mode, setMode] = useState<AdaptiveSidecarPreferredMode>('push')

  return (
    <Box data-capture='nexa-lane-sidecar-mockup'>
      <AdaptiveSidecarLayout
        open={open}
        onOpenChange={setOpen}
        kind='assistant'
        preferredMode={mode}
        side='right'
        sidecarWidth={520}
        sidecarMinWidth={440}
        sidecarMaxWidth={660}
        sidecarExtent='viewport'
        viewportShellReflow='greenhouse-vertical-navbar'
        minHeight='calc(100dvh - 160px)'
        mainMinWidth={520}
        temporaryPlacement='right'
        panelEntrance='slide'
        dataCapture='nexa-lane-adaptive-layout'
        source='nexa-lane-mockup'
        sidecar={<NexaLaneSidecar onClose={() => setOpen(false)} />}
      >
        <Stack spacing={2} data-capture='nexa-lane-main'>
          <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ px: { xs: 2, md: 4 }, pt: { xs: 2, md: 4 } }}>
            <Chip
              size='small'
              icon={<i className='tabler-layout-sidebar-right' style={{ fontSize: '0.95rem' }} />}
              label='Concepto C · lane sidecar'
              sx={{ fontWeight: 600, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}
            />
            <Stack direction='row' spacing={1} alignItems='center'>
              <Button size='small' variant={mode === 'push' ? 'contained' : 'outlined'} onClick={() => setMode('push')}>
                Push
              </Button>
              <Button size='small' variant={mode === 'inline' ? 'contained' : 'outlined'} onClick={() => setMode('inline')}>
                Inline
              </Button>
              {!open && (
                <Button size='small' variant='contained' startIcon={<i className='tabler-message-2' />} onClick={() => setOpen(true)}>
                  {COPY.open_lane}
                </Button>
              )}
              {open && (
                <IconButton size='small' aria-label={COPY.close} onClick={() => setOpen(false)}>
                  <i className='tabler-x' style={{ fontSize: '1rem' }} />
                </IconButton>
              )}
            </Stack>
          </Stack>
          <DashboardBackdrop />
        </Stack>
      </AdaptiveSidecarLayout>
    </Box>
  )
}

export default NexaLaneSidecarMockupView
