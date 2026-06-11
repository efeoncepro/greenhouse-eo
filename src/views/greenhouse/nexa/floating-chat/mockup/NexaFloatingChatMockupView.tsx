'use client'

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import Tooltip from '@mui/material/Tooltip'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Divider from '@mui/material/Divider'
import { alpha, useTheme } from '@mui/material/styles'


import { AssistantRuntimeProvider, useAui, useAuiState, useLocalRuntime } from '@assistant-ui/react'
import type { ChatModelAdapter, ChatModelRunResult } from '@assistant-ui/react'

import CustomTextField from '@core/components/mui/TextField'

import { DEFAULT_NEXA_MODEL, type NexaModelId } from '@/config/nexa-models'
import { GREENHOUSE_NEXA_BRAND_COLORS } from '@/components/greenhouse/primitives/greenhouse-nexa-brand-controller'

import NexaThread from '@/views/greenhouse/home/components/NexaThread'

// aria-labels + copy (extraídos a consts — patrón NexaFloatingButton; copy runtime → src/lib/copy)
const ARIA_NEXA_PANEL = 'Nexa AI'
const ARIA_CERRAR_NEXA = 'Cerrar Nexa'
const ARIA_NUEVA_CONVERSACION = 'Nueva conversación'
const ARIA_EXPANDIR_PANEL = 'Expandir panel'
const ARIA_COLAPSAR_PANEL = 'Colapsar panel'
const ARIA_BUSCAR_CONVERSACION = 'Buscar conversación'
const ARIA_LIMPIAR_BUSQUEDA = 'Limpiar búsqueda'
const COPY_BUSCAR_PLACEHOLDER = 'Buscar conversación'
const COPY_LIMPIAR_BUSQUEDA = 'Limpiar búsqueda'
const COPY_RENOMBRAR = 'Renombrar'
const COPY_ELIMINAR = 'Eliminar'
const buildThreadActionsAria = (title: string) => `Acciones de ${title}`

// Cara "real" de Nexa (persona influencer IA) — para presencia/hero. El Nexa Mark
// (glyph) queda para contextos chicos/repetidos (per-mensaje, pensando, FAB).
// Optimizada para runtime: 256px webp (5.8KB) vs 2.8MB del PNG original; se muestra
// a 40px (header) y 76px (empty hero).
const NEXA_FACE_SRC = '/images/avatar-nexa/nexa-face.webp'

// ── Mock data (TASK-1078, sin datos productivos) ──────────────────────────────

const SEEDED_MESSAGES = [
  { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'Hola, Marie. Soy Nexa, tu copiloto de análisis. ¿Sobre qué quieres que revise hoy?' }] },
  { role: 'user' as const, content: [{ type: 'text' as const, text: '¿Cómo viene el MRR este mes contra el anterior?' }] },
  {
    role: 'assistant' as const,
    content: [
      {
        type: 'text' as const,
        text: 'El MRR de mayo va en **$1.250.000**, +6,2% sobre abril ($1.177.000). El empuje viene de 3 upgrades a plan Enterprise; la contracción se mantiene baja (1,18% de churn). ¿Quieres el desglose por cuenta o la proyección a fin de mes?'
      }
    ]
  }
] as const

// Prompts sugeridos CONTEXTUALES: dependen de la pantalla/contexto donde el usuario
// abre a Nexa. En runtime el contexto sale de la ruta + entidad en vista + rol (Tier 1
// frontend resolver); el Tier 2 (backend, follow-up TASK-1078) los hace data-aware.
// El mockup simula 4 contextos para demostrar el cambio.
interface NexaPromptContext {
  key: string
  label: string
  icon: string
  prompts: string[]
}

const NEXA_PROMPT_CONTEXTS: NexaPromptContext[] = [
  {
    key: 'general',
    label: 'Vista general',
    icon: '',
    prompts: [
      'Resumen ejecutivo de mayo',
      '¿Qué cuentas están en riesgo de churn?',
      'Compara ingresos por línea de servicio',
      'Proyecta el MRR a fin de mes'
    ]
  },
  {
    key: 'finance',
    label: 'Finanzas · P&L mayo',
    icon: 'tabler-chart-pie',
    prompts: [
      'Desglosa el P&L de mayo',
      '¿Dónde se fue el gasto este mes?',
      'Margen por línea de servicio',
      'Flujo de caja a 30 días'
    ]
  },
  {
    key: 'client',
    label: 'Cliente · Sky Airline',
    icon: 'tabler-building-store',
    prompts: [
      '¿Cómo viene Sky Airline este mes?',
      'Riesgo de churn de Sky Airline',
      'Rentabilidad de Sky Airline',
      'Próximas renovaciones de Sky'
    ]
  },
  {
    key: 'payroll',
    label: 'Nómina · Mayo 2026',
    icon: 'tabler-cash',
    prompts: [
      'Resumen de la nómina de mayo',
      '¿Quién tiene variaciones este mes?',
      'Costo laboral por equipo',
      'Pendientes antes del cierre'
    ]
  }
]

// Nombre del usuario (en runtime vendría de la sesión). Mockup: Marie.
const NEXA_USER_NAME = 'Marie'

// Saludo del empty hero — rota en cada nueva conversación. Cortos (1 línea para no
// romper la estética), ocurrentes, contextuales a datos/operación, es-CL tuteo. En
// runtime el nombre se inyecta desde la sesión.
const NEXA_EMPTY_GREETINGS = [
  `Hola, ${NEXA_USER_NAME}. ¿Qué número desarmamos?`,
  `${NEXA_USER_NAME}, tus datos ya calientan motores.`,
  `Hola, ${NEXA_USER_NAME}. ¿Qué te quita el sueño?`,
  `${NEXA_USER_NAME}, los insights no se me esconden.`,
  `Hola, ${NEXA_USER_NAME}. ¿Le tomamos el pulso al mes?`,
  `${NEXA_USER_NAME}, de datos a decisiones.`,
  `Hola, ${NEXA_USER_NAME}. ¿Por dónde cavamos hoy?`,
  `${NEXA_USER_NAME}, el churn no se analiza solo.`,
  `Hola, ${NEXA_USER_NAME}. Pregúntame lo difícil.`,
  `${NEXA_USER_NAME}, hoy los KPIs hablan claro.`,
  `Hola, ${NEXA_USER_NAME}. ¿Qué dicen tus métricas?`,
  `${NEXA_USER_NAME}, démosle sentido a los números.`,
  `${NEXA_USER_NAME}, tu operación sin letra chica.`,
  `Hola, ${NEXA_USER_NAME}. ¿Proyectamos el cierre?`,
  `Hola, ${NEXA_USER_NAME}. Tírame una cuenta.`,
  `${NEXA_USER_NAME}, no hay dato que se me resista.`,
  `Hola, ${NEXA_USER_NAME}. ¿Qué decisión preparamos?`,
  `${NEXA_USER_NAME}, leo entre líneas de datos.`,
  `Hola, ${NEXA_USER_NAME}. ¿Quién sube y quién baja?`,
  `${NEXA_USER_NAME}, tus dashboards me conocen.`,
  `Hola, ${NEXA_USER_NAME}. Cero rodeos, puro insight.`,
  `${NEXA_USER_NAME}, ¿el pulso de los ingresos?`,
  `Hola, ${NEXA_USER_NAME}. ¿El porqué del número?`,
  `${NEXA_USER_NAME}, convierto ruido en señal.`,
  `Hola, ${NEXA_USER_NAME}. ¿Qué riesgo cazamos hoy?`,
  `${NEXA_USER_NAME}, tú traes datos, yo traduzco.`,
  `Hola, ${NEXA_USER_NAME}. ¿Empezamos por lo urgente?`,
  `${NEXA_USER_NAME}, miro lo que nadie mira.`,
  `Hola, ${NEXA_USER_NAME}. Tu copiloto, café en mano.`,
  `${NEXA_USER_NAME}, dame el qué y te doy el porqué.`
]

interface MockThread {
  id: string
  title: string
  group: 'Hoy' | 'Ayer' | 'Esta semana'
  active?: boolean
}

const MOCK_HISTORY: MockThread[] = [
  { id: 't1', title: 'MRR mayo vs abril', group: 'Hoy', active: true },
  { id: 't2', title: 'Cuentas en riesgo de churn', group: 'Hoy' },
  { id: 't3', title: 'Ingresos por línea de servicio', group: 'Ayer' },
  { id: 't4', title: 'Onboarding Sky Airline', group: 'Ayer' },
  { id: 't5', title: 'Proyección Q2', group: 'Esta semana' }
]

const MOCK_HISTORY_GROUPS = ['Hoy', 'Ayer', 'Esta semana'] as const

// Adapter mock: responde canned para que el composer funcione en el demo, sin API real.
const createMockAdapter = (): ChatModelAdapter => ({
  async run(): Promise<ChatModelRunResult> {
    await new Promise(resolve => setTimeout(resolve, 600))

    return {
      content: [
        {
          type: 'text' as const,
          text: 'Demo: en runtime, esto consulta a Nexa con el modelo seleccionado y persiste la conversación. (Mockup TASK-1078)'
        }
      ]
    }
  }
})

// ── History rail ──────────────────────────────────────────────────────────────

/* Fila de conversación: interactiva + accesible (teclado/focus/press), barra de
   acento en activo, kebab de acciones revelado en hover/focus, entrada en stagger. */
const ThreadRow = ({
  thread,
  index,
  onOpenMenu
}: {
  thread: MockThread
  index: number
  onOpenMenu: (anchor: HTMLElement, thread: MockThread) => void
}) => {
  const theme = useTheme()

  return (
    <Box
      role='button'
      tabIndex={0}
      aria-current={thread.active ? 'true' : undefined}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') e.preventDefault()
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        pl: 1.5,
        pr: 1.25,
        py: 1,
        borderRadius: `${theme.shape.customBorderRadius.sm}px`,
        cursor: 'pointer',
        // Activa = píldora de fondo tintado + texto 600 primary (sin barra de acento:
        // patrón de lista de chat, no de nav-rail). El fondo redondeado ES el indicador.
        bgcolor: thread.active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
        color: thread.active ? 'primary.main' : 'text.primary',
        transition: theme.transitions.create(['background-color', 'transform'], { duration: theme.transitions.duration.shortest }),
        '@keyframes nexa-rail-in': {
          '0%': { opacity: 0, transform: 'translateX(-4px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' }
        },
        animation: `nexa-rail-in 0.22s cubic-bezier(0.2, 0, 0, 1) ${0.03 * index}s both`,
        '&:hover': { bgcolor: thread.active ? alpha(theme.palette.primary.main, 0.14) : 'action.hover' },
        '&:hover .nexa-thread-kebab, &:focus-within .nexa-thread-kebab': { opacity: 1 },
        '&:active': { transform: 'scale(0.99)' },
        '&:focus-visible': { outline: '2px solid var(--mui-palette-primary-main)', outlineOffset: -2 },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none', animation: 'none', '&:active': { transform: 'none' } }
      }}
    >
      <Typography variant='body2' noWrap sx={{ flex: 1, minWidth: 0, fontWeight: thread.active ? 600 : 400 }}>
        {thread.title}
      </Typography>
      <IconButton
        className='nexa-thread-kebab'
        size='small'
        aria-label={buildThreadActionsAria(thread.title)}
        onClick={e => {
          e.stopPropagation()
          onOpenMenu(e.currentTarget, thread)
        }}
        sx={{
          flexShrink: 0,
          width: 24,
          height: 24,
          color: 'text.secondary',
          opacity: 0,
          transition: theme.transitions.create('opacity', { duration: theme.transitions.duration.shortest }),
          '&:hover': { color: 'text.primary', bgcolor: 'action.selected' },
          '&:focus-visible': { opacity: 1 },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
        }}
      >
        <i className='tabler-dots' style={{ fontSize: '0.95rem' }} />
      </IconButton>
    </Box>
  )
}

const RailEmptyFirstUse = () => (
  <Stack alignItems='center' spacing={1} sx={{ px: 3, py: 5, textAlign: 'center' }}>
    <i className='tabler-message-circle' style={{ fontSize: '1.5rem', color: 'var(--mui-palette-text-disabled)' }} />
    <Typography variant='body2' sx={{ fontWeight: 600 }}>Aún no tienes conversaciones</Typography>
    <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.5 }}>
      Inicia una nueva y aparecerá aquí.
    </Typography>
  </Stack>
)

const RailEmptyFiltered = ({ query, onClear }: { query: string; onClear: () => void }) => (
  <Stack alignItems='center' spacing={0.75} sx={{ px: 3, py: 4, textAlign: 'center' }}>
    <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.5 }}>
      Sin resultados para «{query}»
    </Typography>
    <Button size={"small"} variant={"text"} onClick={onClear}>{COPY_LIMPIAR_BUSQUEDA}</Button>
  </Stack>
)

const HistoryRail = () => {
  const theme = useTheme()
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState<{ anchor: HTMLElement; thread: MockThread } | null>(null)

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => MOCK_HISTORY.filter(t => !q || t.title.toLowerCase().includes(q)), [q])
  const hasAnyThreads = MOCK_HISTORY.length > 0
  const hasResults = filtered.length > 0

  return (
    <Stack
      sx={{
        width: 272,
        flexShrink: 0,
        // El backdrop-filter rompe el clip redondeado del panel (overflow:hidden) → la
        // esquina inferior-izquierda queda recta. Le damos su propio radio para matchear.
        borderBottomLeftRadius: `${theme.shape.customBorderRadius.lg}px`,
        borderRight: '1px solid',
        borderColor: alpha(theme.palette.common.white, 0.4),
        // Glassmorfismo blanco: capa única translúcida + backdrop-filter (ve la página
        // detrás del panel). Alpha alto + saturate → fondo claro y texto legible aunque
        // detrás haya color. Fallback opaco si el navegador no soporta backdrop-filter.
        bgcolor: alpha(theme.palette.common.white, 0.92),
        '@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))': {
          bgcolor: alpha(theme.palette.common.white, 0.68),
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)'
        },
        overflowY: 'auto'
      }}
    >
      {hasAnyThreads && (
        <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
          <CustomTextField
            fullWidth
            size='small'
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={COPY_BUSCAR_PLACEHOLDER}
            aria-label={ARIA_BUSCAR_CONVERSACION}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='tabler-search' style={{ fontSize: '0.95rem', color: 'var(--mui-palette-text-disabled)' }} />
                  </InputAdornment>
                ),
                endAdornment: query ? (
                  <InputAdornment position='end'>
                    <IconButton size='small' aria-label={ARIA_LIMPIAR_BUSQUEDA} onClick={() => setQuery('')} sx={{ width: 22, height: 22 }}>
                      <i className='tabler-x' style={{ fontSize: '0.8rem' }} />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }
            }}
          />
        </Box>
      )}

      {!hasAnyThreads && <RailEmptyFirstUse />}
      {hasAnyThreads && !hasResults && <RailEmptyFiltered query={query.trim()} onClear={() => setQuery('')} />}

      {hasResults &&
        MOCK_HISTORY_GROUPS.map(group => {
          const items = filtered.filter(t => t.group === group)

          if (items.length === 0) return null

          return (
            <Box key={group} sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
              <Typography
                variant='overline'
                component='div'
                sx={{ px: 1.5, mb: 0.75, color: 'text.disabled', letterSpacing: '0.09em', fontWeight: 600 }}
              >
                {group}
              </Typography>
              <Stack role='list' sx={{ gap: 0.25 }}>
                {items.map((thread, i) => (
                  <ThreadRow key={thread.id} thread={thread} index={i} onOpenMenu={(anchor, t) => setMenu({ anchor, thread: t })} />
                ))}
              </Stack>
            </Box>
          )
        })}

      <Menu
        anchorEl={menu?.anchor ?? null}
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => setMenu(null)} sx={{ gap: 1.5, fontSize: '0.875rem' }}>
          <i className='tabler-pencil' style={{ fontSize: '1rem' }} />
          {COPY_RENOMBRAR}
        </MenuItem>
        <MenuItem onClick={() => setMenu(null)} sx={{ gap: 1.5, fontSize: '0.875rem', color: 'error.main' }}>
          <i className='tabler-trash' style={{ fontSize: '1rem' }} />
          {COPY_ELIMINAR}
        </MenuItem>
      </Menu>
    </Stack>
  )
}

// ── Empty hero (cara real + saludo + grilla de prompts cohesiva) ──────────────

const NexaEmptyHero = ({ greeting, promptContext }: { greeting: string; promptContext: NexaPromptContext }) => {
  const theme = useTheme()
  const aui = useAui()

  const send = (text: string) =>
    aui.thread().append({ role: 'user', content: [{ type: 'text' as const, text }] })

  return (
    <Stack
      alignItems='center'
      justifyContent='center'
      spacing={2.5}
      sx={{ position: 'absolute', inset: 0, bottom: 108, px: 4, overflowY: 'auto', zIndex: 2 }}
    >
      <Avatar src={NEXA_FACE_SRC} alt='Nexa' sx={{ width: 76, height: 76, boxShadow: theme.greenhouseElevation.raised.boxShadow }} />
      <Stack spacing={1} alignItems='center'>
        <Typography variant='h4' sx={{ textAlign: 'center' }}>{greeting}</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center', maxWidth: 400, lineHeight: 1.55 }}>
          Pregúntame por tus métricas, cuentas o proyecciones.
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

      {/* Firma de marca Efeonce — SOLO en el empty state (Nexa es el AI Agent de
          Efeonce). Wordmark canónico recoloreado a gris SÓLIDO vía mask (no opacidad,
          que se ve watermark). Pequeño, en el espacio negativo sobre el composer. */}
      <Box
        sx={{ position: 'absolute', bottom: 14, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}
      >
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

// ── Panel B (expandible) ────────────────────────────────────────────────────

interface NexaExpandablePanelProps {
  seeded: boolean
  expanded: boolean
  selectedModel: NexaModelId
  onModelChange: (model: NexaModelId) => void
  onToggleExpanded: () => void
  promptContext: NexaPromptContext
}

/* Cuerpo de la conversación: el empty hero se decide por el conteo real de mensajes
   (se oculta solo al enviar) + entrada fluida al montar (nueva conversación). */
const ConversationBody = ({
  expanded,
  selectedModel,
  onModelChange,
  greeting,
  promptContext
}: {
  expanded: boolean
  selectedModel: NexaModelId
  onModelChange: (model: NexaModelId) => void
  greeting: string
  promptContext: NexaPromptContext
}) => {
  const isEmpty = useAuiState(s => s.thread.messages.length === 0)

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        // Opaca (el panel ya no pinta el blanco de fondo → el rail glass ve la página).
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
      <NexaThread hideHeader compact={!expanded} selectedModel={selectedModel} onModelChange={onModelChange} suggestions={[]} />
    </Box>
  )
}

/* Área de conversación con runtime propio. Cambiar su `key` = nuevo chat limpio
   (runtime vacío) → el empty hero entra de forma fluida. */
const ConversationArea = ({
  initialEmpty,
  expanded,
  selectedModel,
  onModelChange,
  greeting,
  promptContext
}: {
  initialEmpty: boolean
  expanded: boolean
  selectedModel: NexaModelId
  onModelChange: (model: NexaModelId) => void
  greeting: string
  promptContext: NexaPromptContext
}) => {
  const adapter = useMemo(() => createMockAdapter(), [])
  const runtime = useLocalRuntime(adapter, { initialMessages: initialEmpty ? [] : [...SEEDED_MESSAGES] })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ConversationBody expanded={expanded} selectedModel={selectedModel} onModelChange={onModelChange} greeting={greeting} promptContext={promptContext} />
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

const NexaExpandablePanel = ({ seeded, expanded, selectedModel, onModelChange, onToggleExpanded, promptContext }: NexaExpandablePanelProps) => {
  const theme = useTheme()
  const navy = GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy
  const teal = GREENHOUSE_NEXA_BRAND_COLORS.electricTeal

  // Nueva conversación: re-monta el área (key) → runtime vacío + entrada fluida.
  const [conversationKey, setConversationKey] = useState(0)
  const [emptyConversation, setEmptyConversation] = useState(!seeded)

  const handleNewConversation = () => {
    setEmptyConversation(true)
    setConversationKey(k => k + 1)
  }

  // El saludo del empty hero rota con cada nueva conversación (conversationKey++).
  const greeting = NEXA_EMPTY_GREETINGS[conversationKey % NEXA_EMPTY_GREETINGS.length]

  return (
    <Box
      role='complementary'
      aria-label={ARIA_NEXA_PANEL}
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
        <Avatar src={NEXA_FACE_SRC} alt='Nexa' sx={{ width: 44, height: 44, border: '2px solid', borderColor: alpha(teal, 0.55) }} />
        <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant='h4'
            component='span'
            sx={{ color: 'common.white', fontWeight: 600, lineHeight: 1.2 }}
          >
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
            <Typography variant='caption' sx={{ color: alpha(theme.palette.common.white, 0.72) }}>En línea</Typography>
          </Stack>
        </Stack>

        {/* Controles del header — mismo hover (círculo gris) en los tres, vía HeaderIconButton */}
        <HeaderIconButton icon='tabler-plus' label={ARIA_NUEVA_CONVERSACION} onClick={handleNewConversation} iconSize='1.15rem' restOpacity={1} />
        <HeaderIconButton
          icon={expanded ? 'tabler-arrows-diagonal-minimize-2' : 'tabler-arrows-diagonal'}
          label={expanded ? ARIA_COLAPSAR_PANEL : ARIA_EXPANDIR_PANEL}
          onClick={onToggleExpanded}
        />
        <HeaderIconButton icon='tabler-x' label={ARIA_CERRAR_NEXA} />
      </Stack>

      {/* Cuerpo: rail historial (solo expandido) + conversación con runtime propio */}
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {expanded && <HistoryRail />}
        <ConversationArea
          key={conversationKey}
          initialEmpty={emptyConversation}
          expanded={expanded}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          greeting={greeting}
          promptContext={promptContext}
        />
      </Box>
    </Box>
  )
}

// ── Mockup shell (controles + backdrop) ───────────────────────────────────────

const NexaFloatingChatMockupView = () => {
  const theme = useTheme()

  // Deep-link de estados para GVC + review (?state=empty&footprint=compact). Client-only.
  const initial = useMemo(() => {
    if (typeof window === 'undefined') return { seeded: true, expanded: true }
    const params = new URLSearchParams(window.location.search)

    return {
      seeded: params.get('state') !== 'empty',
      expanded: params.get('footprint') !== 'compact'
    }
  }, [])

  const [seeded, setSeeded] = useState(initial.seeded)
  const [expanded, setExpanded] = useState(initial.expanded)
  const [selectedModel, setSelectedModel] = useState<NexaModelId>(DEFAULT_NEXA_MODEL)
  // Simula el contexto/pantalla desde donde se abre Nexa (en runtime: ruta + entidad + rol).
  const [promptContextKey, setPromptContextKey] = useState(NEXA_PROMPT_CONTEXTS[0].key)
  const promptContext = NEXA_PROMPT_CONTEXTS.find(c => c.key === promptContextKey) ?? NEXA_PROMPT_CONTEXTS[0]

  return (
    <Box>
      {/* Controles del mockup (no son parte del diseño) */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 4 }}>
        <Typography variant='h4'>Nexa · chat flotante (concepto B)</Typography>
        <Box sx={{ flex: 1 }} />
        <Stack direction='row' spacing={1} alignItems='center'>
          <Typography variant='caption' color='text.secondary'>Estado</Typography>
          <ToggleButtonGroup
            size='small'
            exclusive
            value={seeded ? 'conv' : 'empty'}
            onChange={(_e, v) => v && setSeeded(v === 'conv')}
          >
            <ToggleButton value='conv'>Con conversación</ToggleButton>
            <ToggleButton value='empty'>Vacío</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Stack direction='row' spacing={1} alignItems='center'>
          <Typography variant='caption' color='text.secondary'>Footprint</Typography>
          <ToggleButtonGroup
            size='small'
            exclusive
            value={expanded ? 'exp' : 'comp'}
            onChange={(_e, v) => v && setExpanded(v === 'exp')}
          >
            <ToggleButton value='comp'>Compacto</ToggleButton>
            <ToggleButton value='exp'>Expandido</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Stack direction='row' spacing={1} alignItems='center'>
          <Typography variant='caption' color='text.secondary'>Contexto</Typography>
          <ToggleButtonGroup
            size='small'
            exclusive
            value={promptContextKey}
            onChange={(_e, v) => v && setPromptContextKey(v)}
          >
            <ToggleButton value='general'>General</ToggleButton>
            <ToggleButton value='finance'>Finanzas</ToggleButton>
            <ToggleButton value='client'>Cliente</ToggleButton>
            <ToggleButton value='payroll'>Nómina</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <Divider sx={{ mb: 4 }} />

      {/* Backdrop tenue que evoca "flotando sobre el contexto" + panel anclado derecha */}
      <Box
        sx={{
          position: 'relative',
          minHeight: 'min(680px, 86vh)',
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          bgcolor: alpha(theme.palette.text.primary, 0.03),
          border: '1px dashed',
          borderColor: 'divider',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          p: { xs: 2, md: 4 }
        }}
      >
        <Typography
          variant='caption'
          color='text.disabled'
          sx={{ position: 'absolute', top: 16, left: 20, zIndex: 1 }}
        >
          (contexto de la página detrás)
        </Typography>

        {/* Mock tenue del dashboard detrás — SOLO para que el glass del rail tenga algo
            que desenfocar en el demo. NO es parte del diseño del panel. */}
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, p: 4, opacity: 0.5, pointerEvents: 'none', display: { xs: 'none', sm: 'block' } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: '92px', gap: 2.5, mt: 6 }}>
            {[
              theme.palette.primary.main,
              theme.palette.success.main,
              theme.palette.warning.main,
              theme.palette.info.main,
              theme.palette.text.primary,
              theme.palette.primary.main,
              theme.palette.info.main,
              theme.palette.success.main,
              theme.palette.primary.main,
              theme.palette.warning.main,
              theme.palette.text.primary,
              theme.palette.info.main
            ].map((c, i) => (
              <Box
                key={i}
                sx={{
                  gridRow: i % 5 === 0 ? 'span 2' : 'span 1',
                  borderRadius: 3,
                  bgcolor: alpha(c, i % 5 === 0 ? 0.16 : 0.1)
                }}
              />
            ))}
          </Box>
        </Box>

        <Box key={`${seeded ? 'conv' : 'empty'}-${expanded ? 'exp' : 'comp'}`} sx={{ position: 'relative', zIndex: 1 }}>
          <NexaExpandablePanel
            seeded={seeded}
            expanded={expanded}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            onToggleExpanded={() => setExpanded(v => !v)}
            promptContext={promptContext}
          />
        </Box>
      </Box>
    </Box>
  )
}

export default NexaFloatingChatMockupView
