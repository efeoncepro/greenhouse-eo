'use client'

import { useCallback, useEffect, useId, useState } from 'react'

import Link from 'next/link'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { alpha, keyframes, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import EmptyState from '@/components/greenhouse/EmptyState'
import { motion, AnimatePresence } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'
import { GH_NEXA } from '@/lib/copy/nexa'
import { getMetricById } from '@/lib/ico-engine/metric-registry'
import NexaMentionText from '@/components/greenhouse/NexaMentionText'
import NexaInsightRootCauseSection from '@/components/greenhouse/NexaInsightRootCauseSection'
import NexaInsightsTimeline, {
  type NexaTimelineItem
} from '@/components/greenhouse/NexaInsightsTimeline'
import { GreenhouseButton, GreenhouseDisclosureTrigger, GreenhouseThinkingBeat } from '@/components/greenhouse/primitives'
import { GREENHOUSE_NEXA_BRAND_COLORS } from '@/components/greenhouse/primitives/greenhouse-nexa-brand-controller'
import { buildNexaInsightDrillHref } from '@/lib/ico-engine/ai/nexa-insight-href'
import type {
  NexaSignalLifecycleStatus,
  NexaSignalObservation
} from '@/lib/ico-engine/ai/llm-types'
import { formatDate as formatGreenhouseDate } from '@/lib/format'

// ─── Public Types ──────────────────────────────────────────────────────────

export type NexaInsightItem = {
  id: string
  /** TASK-947 — signal-anchored id (EO-AIS-*) for the canonical "Ver causa raíz"
   * drill to `/nexa/insights/[id]`. Stable cross-period. Optional for backward
   * compat: when absent, the card falls back to `id` (enrichment-anchored). */
  signalId?: string
  signalType: string
  metricId: string
  severity: string | null
  explanation: string | null
  rootCauseNarrative: string | null
  recommendedAction: string | null
  /** TASK-945 — lifecycle observations (signal evolution intra-period). Optional
   * for backward-compat: consumers that don't pass it degrade gracefully (sin
   * sparkline). Mostrar sparkline requiere length >= 2. */
  lifecycle?: NexaSignalObservation[]
  /** TASK-945 — lifecycle status derived server-side. When 'resolved', el
   * header del InsightCard muestra badge "Resuelta hace X". */
  lifecycleStatus?: NexaSignalLifecycleStatus
}

type NexaInsightsViewMode = 'recent' | 'timeline'

/**
 * TASK-946 — Honest degradation canonical UI states.
 *
 * Server-side derived (4 valores) + cliente añade `loading` local durante
 * fetch in-flight. Backward-compat: prop opcional; si los consumers no la
 * pasan, el bloque cae al comportamiento legacy (hasData-based).
 */
export type NexaInsightsDataStatusUi =
  | 'loading'
  | 'ready'
  | 'empty-pending'
  | 'empty-positive'
  | 'stale-degraded'

export type NexaInsightsBlockProps = {
  insights: NexaInsightItem[]
  totalAnalyzed: number
  lastAnalysis: string | null
  runStatus: 'succeeded' | 'partial' | 'failed' | null
  defaultExpanded?: boolean
  timelineInsights?: NexaTimelineItem[]
  /**
   * TASK-946 — Honest degradation state derived server-side. Opcional
   * (backward-compat); si no llega, el bloque usa la lógica legacy `hasData`.
   * Pattern: server-side SSOT; UI solo renderiza, no deriva.
   */
  dataStatus?: NexaInsightsDataStatusUi
  /**
   * TASK-1027 — Access-aware mentions. When `true`, every Nexa mention renders
   * as a non-navigable chip (no links to `/people`, `/agency/spaces`, …). Used
   * on self-service surfaces (`/my/*`). Default `false` keeps admin navigation.
   */
  mentionSafeMode?: boolean
  /**
   * Nombre del usuario en sesión (self lens). Algunas frases rotatorias del header
   * usan `{name}` (su primer nombre); si no se provee, esas frases se filtran.
   */
  viewerName?: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const getMetricDisplayName = (metricId: string): string => {
  const metric = getMetricById(metricId) ?? getMetricById(metricId.replace('_avg', '').replace('_pct', ''))

  return metric?.shortName ?? metric?.label ?? metricId
}

const formatTimestamp = (iso: string | null) => {
  if (!iso) return '—'

  try {
    const date = new Date(iso)

    if (isNaN(date.getTime())) return '—'

    return formatGreenhouseDate(date, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}, 'es-CL')
  } catch {
    return '—'
  }
}

const getRunChip = (status: string | null) => ({
  label: GH_NEXA.run_status[status ?? ''] ?? GH_NEXA.insights_chip_no_data,
  color: (GH_NEXA.run_status_color[status ?? ''] ?? 'secondary') as 'success' | 'warning' | 'error' | 'secondary'
})

// ─── Subcomponents ─────────────────────────────────────────────────────────

// Resumen priorizado: cuántas observaciones se muestran antes de "Ver más".
// El bloque es un feed embebido, no un destino "browse everything" — el cap
// evita el scroll interminable en superficies densas (ICO). Ajustable.
const INITIAL_VISIBLE_INSIGHTS = 4

// Severity icon canonical — matches the `/nexa/insights` list card contract
// (icon + label, NUNCA color-only — WCAG 2.2 AA).
const SEVERITY_ICON: Record<string, string> = {
  critical: 'tabler-alert-octagon',
  warning: 'tabler-alert-triangle',
  info: 'tabler-info-circle'
}

const SEVERITY_ICON_UNKNOWN = 'tabler-help-circle'

// Inline Nexa mark (arc + spark, no badge) — inlined here so we can size it freely
// to the header height and tint the spark Midnight Navy. Colors from the brand SSOT.
// Fills its wrapper, so callers control the size (responsive) via the parent Box.
const NexaMark = () => (
  <Box component='svg' viewBox='0 0 48 48' aria-hidden='true' sx={{ width: '100%', height: '100%', display: 'block' }}>
    <path
      d='M9 27 Q19 39 29 27'
      fill='none'
      stroke={GREENHOUSE_NEXA_BRAND_COLORS.electricTeal}
      strokeWidth={4}
      strokeLinecap='round'
    />
    <path
      d='M34 9 C35 12.5 36.5 14 40 15 C36.5 16 35 17.5 34 21 C33 17.5 31.5 16 28 15 C31.5 14 33 12.5 34 9 Z'
      fill={GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy}
    />
  </Box>
)

const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.25, ease: 'easeOut' as const }
  })
}

// Concept C — conversational severity-led row. Severity icon circle (left) +
// metric/coaching/action content + per-row drill affordance. No boxed card.
const InsightRow = ({
  item,
  index,
  animate,
  mentionSafeMode
}: {
  item: NexaInsightItem
  index: number
  animate: boolean
  mentionSafeMode: boolean
}) => {
  const theme = useTheme()
  const signalLabel = GH_NEXA.signal_type[item.signalType] ?? item.signalType
  const severityKey = item.severity ?? 'unknown'
  const severityColor = GH_NEXA.severity_color[severityKey] ?? 'secondary'
  const severityLabel = GH_NEXA.severity_label[severityKey] ?? GH_NEXA.severity_label_unknown
  const severityIcon = SEVERITY_ICON[severityKey] ?? SEVERITY_ICON_UNKNOWN
  const severityMain = theme.palette[severityColor]?.main ?? theme.palette.text.secondary
  const metricName = getMetricDisplayName(item.metricId)
  // TASK-947 — signal-anchored drill (stable). Fallback to enrichment id.
  const drillHref = buildNexaInsightDrillHref(item.signalId ?? item.id)

  const isResolved = item.lifecycleStatus === 'resolved'

  const content = (
    <Stack direction='row' spacing={2} alignItems='flex-start' sx={{ py: 2.5 }}>
      {/* Severity icon circle — severity-led, not color-only (icon carries meaning) */}
      <Box
        sx={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(severityMain, 0.12),
          color: severityMain
        }}
      >
        <i className={severityIcon} style={{ fontSize: 18 }} aria-hidden='true' />
      </Box>

      {/* pr mirrors the left severity-icon gutter (icon 36 + spacing 16 ≈ 52px) so the
          narrative + callouts + drill don't run flush to the card's right edge —
          symmetric horizontal breathing within the card. */}
      <Stack spacing={1.25} sx={{ flex: 1, minWidth: 0, pr: { xs: 0, sm: 5, md: 6 } }}>
        {/* Header line: metric + severity label + signal type + (right) sparkline + resolved */}
        <Stack direction='row' spacing={1} alignItems='center' sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
          <Typography variant='subtitle2' sx={{ fontWeight: 700, color: theme => theme.palette.customColors.midnight }}>
            {metricName}
          </Typography>
          <Typography variant='caption' sx={{ color: severityMain, fontWeight: 700 }}>
            {severityLabel}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.disabled' }}>
            · {signalLabel}
          </Typography>
          {isResolved && (
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color='success'
              label={GH_NEXA.lifecycle_resolved_badge}
              icon={<i className='tabler-circle-check' style={{ fontSize: 12 }} aria-hidden='true' />}
              sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600, ml: 'auto', '& .MuiChip-icon': { ml: 0.5 } }}
              aria-label={GH_NEXA.lifecycle_status_resolved}
            />
          )}
        </Stack>

        {/* Coaching sentence = explanation (mentions render as chips — Nexa's richness) */}
        {item.explanation && (
          <NexaMentionText
            text={item.explanation}
            variant='body2'
            safeMode={mentionSafeMode}
            sx={{ color: theme => theme.palette.customColors.midnight }}
          />
        )}

        {/* Root cause narrative (collapsible progressive disclosure) */}
        {item.rootCauseNarrative && item.rootCauseNarrative.trim() && (
          <NexaInsightRootCauseSection
            narrative={item.rootCauseNarrative}
            insightId={item.id}
            safeMode={mentionSafeMode}
          />
        )}

        {/* Recommendation callout — labeled action zone, NOT a link. Prose in
            text.primary (the false-link blue prose is gone); the bulb + overline
            label frame it as "Acción sugerida". The only clickable element is the
            drill CTA below. */}
        {item.recommendedAction && (
          <Box
            sx={{
              px: 1.75,
              py: 1.25,
              borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
              bgcolor: alpha(theme.palette.primary.main, 0.06),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
              minWidth: 0
            }}
          >
            <Stack direction='row' spacing={0.75} alignItems='center' sx={{ mb: 0.5 }}>
              <i className='tabler-bulb' style={{ fontSize: 14, color: theme.palette.primary.main }} aria-hidden='true' />
              <Typography
                variant='caption'
                sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1 }}
              >
                {GH_NEXA.insights_action_label}
              </Typography>
            </Stack>
            <NexaMentionText
              text={item.recommendedAction}
              variant='body2'
              safeMode={mentionSafeMode}
              sx={{ color: theme => theme.palette.customColors.midnight }}
            />
          </Box>
        )}

        {/* Single drill CTA — opens the full analysis in Nexa (/nexa/insights/[id]).
            Distinct label from the inline "Ver causa raíz" disclosure above. */}
        <Box>
          <Typography
            component={Link}
            href={drillHref}
            variant='button'
            aria-label={GH_NEXA.insights_open_detail_aria(metricName, severityLabel)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'primary.main',
              fontWeight: 600,
              textTransform: 'none',
              textDecoration: 'none',
              borderRadius: '4px',
              '&:hover': { textDecoration: 'underline' },
              '&:focus-visible': { outline: theme => `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
            }}
          >
            {GH_NEXA.insights_open_detail_cta}
            <i className='tabler-arrow-right' style={{ fontSize: 15 }} aria-hidden='true' />
          </Typography>
        </Box>
      </Stack>
    </Stack>
  )

  if (!animate) return content

  return (
    <motion.div custom={index} initial='hidden' animate='visible' variants={STAGGER_ITEM}>
      {content}
    </motion.div>
  )
}

// Rotating headline — Nexa "narra en vivo": escribe una frase (typewriter + caret),
// la deja leer, y al terminar aparece el thinking-beat (está por "pensar" la próxima);
// entonces la frase se desvanece y escribe la siguiente. Cicla 30 paráfrasis.
// Máquina de fases: writing → reading → thinking → (next). SSR-safe (arranca en 0,
// solo cicla en cliente). Reduced-motion → frase estática, sin typing/ciclado.
// Sin aria-live (no spamea SR cada frase); el dato real vive en el chip + summary.
const NEXA_WRITE_MS_PER_CHAR = 48
const NEXA_READ_MS = 7600
const NEXA_THINK_MS = 2600

const nexaCaretBlink = keyframes({
  '0%, 45%': { opacity: 1 },
  '50%, 95%': { opacity: 0 },
  '100%': { opacity: 1 }
})

// Types `text` char-by-char, shows a blinking caret while writing, calls `onDone`
// when complete. Fresh instance per phrase (remounted by key) → types from empty.
const NexaTypewriter = ({ text, onDone }: { text: string; onDone: () => void }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (text.length === 0) {
      onDone()

      return
    }

    let i = 0

    const timer = setInterval(() => {
      i += 1
      setCount(i)

      if (i >= text.length) {
        clearInterval(timer)
        onDone()
      }
    }, NEXA_WRITE_MS_PER_CHAR)

    return () => clearInterval(timer)
  }, [text, onDone])

  const writing = count < text.length

  return (
    <>
      {text.slice(0, count)}
      {writing && (
        <Box
          component='span'
          aria-hidden='true'
          sx={{
            display: 'inline-block',
            inlineSize: '2px',
            blockSize: '1.05em',
            ml: '1px',
            verticalAlign: 'text-bottom',
            borderRadius: '1px',
            bgcolor: 'primary.main',
            animation: `${nexaCaretBlink} 1s steps(1) infinite`
          }}
        />
      )}
    </>
  )
}

const RotatingNexaHeadline = ({ messages, reduced }: { messages: string[]; reduced: boolean }) => {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'writing' | 'reading' | 'thinking'>('writing')

  // reading → thinking → advance (single timer per phase, clean teardown).
  useEffect(() => {
    if (reduced) return

    if (phase === 'reading') {
      const t = setTimeout(() => setPhase('thinking'), NEXA_READ_MS)

      return () => clearTimeout(t)
    }

    if (phase === 'thinking') {
      const t = setTimeout(() => {
        setIdx(prev => (prev + 1) % messages.length)
        setPhase('writing')
      }, NEXA_THINK_MS)

      return () => clearTimeout(t)
    }
  }, [phase, reduced, messages.length])

  const handleTyped = useCallback(() => setPhase('reading'), [])

  const text = messages[idx] ?? messages[0]

  // maxWidth holgado → las frases entran en 1 línea en desktop (sin wrap).
  // minHeight = 1 línea: SOLO evita que el renglón colapse durante el crossfade
  // (cuando la frase saliente ya se fue y la entrante aún no escribe) — así el
  // resumen de abajo no salta ni queda separado. Sin reservar 2 líneas.
  const lineSx = {
    mt: 0.75,
    color: 'text.secondary',
    textWrap: 'balance' as const,
    maxWidth: '70ch',
    minHeight: '1.6em'
  }

  if (reduced) {
    return (
      <Typography variant='body1' component='div' sx={lineSx}>
        {messages[0]}
        <GreenhouseThinkingBeat kind='nexa' variant='inline' decorative dotSize={6} sx={{ ml: 1.25 }} />
      </Typography>
    )
  }

  return (
    <Typography variant='body1' component='div' sx={lineSx}>
      <AnimatePresence mode='wait' initial={false}>
        <motion.span
          key={idx}
          style={{ display: 'inline' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <NexaTypewriter text={text} onDone={handleTyped} />
        </motion.span>
      </AnimatePresence>
      <AnimatePresence>
        {phase === 'thinking' && (
          <motion.span
            key='nexa-beat'
            style={{ display: 'inline-block', verticalAlign: 'middle' }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <GreenhouseThinkingBeat kind='nexa' variant='inline' decorative dotSize={6} sx={{ ml: 1.25 }} />
          </motion.span>
        )}
      </AnimatePresence>
    </Typography>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

const NexaInsightsBlock = ({
  insights,
  totalAnalyzed,
  lastAnalysis,
  runStatus,
  defaultExpanded,
  timelineInsights,
  dataStatus,
  mentionSafeMode = false,
  viewerName
}: NexaInsightsBlockProps) => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()
  const hasData = totalAnalyzed > 0
  const chip = getRunChip(runStatus)
  const countWithActions = insights.filter(i => i.recommendedAction).length
  const timelineCount = timelineInsights?.length ?? 0
  const timelineAvailable = timelineCount > 0
  const [viewMode, setViewMode] = useState<NexaInsightsViewMode>('recent')
  const activeView: NexaInsightsViewMode = timelineAvailable ? viewMode : 'recent'

  // Progressive disclosure: el bloque es un resumen priorizado. Cap a las
  // primeras N observaciones y revela el resto in-place con "Ver más" — evita
  // la lista interminable en superficies densas (ICO) sin sacar al usuario de
  // la vista. El footer "Ver todos" sigue yendo al full list page. NO paginación
  // numerada acá (eso es del destino dedicado /nexa/insights).
  // Panel disclosure — el bloque ready ahora colapsa como los hermanos de arriba,
  // pero el toggle es el Nexa Mark que morfa (variant 'nexaMark'). Default abierto:
  // es el tier de valor; colapsado-by-default lo escondería. defaultExpanded lo gobierna.
  const [panelOpen, setPanelOpen] = useState(defaultExpanded ?? true)
  const panelContentId = useId()

  const [showAllInsights, setShowAllInsights] = useState(false)

  const visibleInsights =
    showAllInsights || insights.length <= INITIAL_VISIBLE_INSIGHTS
      ? insights
      : insights.slice(0, INITIAL_VISIBLE_INSIGHTS)

  const remainingInsights = insights.length - visibleInsights.length

  // TASK-946 — Honest degradation dispatcher. Si el server pasa `dataStatus`,
  // routea al render canonical correspondiente. Si NO lo pasa (backward-compat
  // pre-TASK-946), cae al comportamiento legacy basado en `hasData`.
  const effectiveStatus: NexaInsightsDataStatusUi =
    dataStatus ?? (hasData ? 'ready' : 'empty-pending')

  if (effectiveStatus !== 'ready') {
    return (
      <Card elevation={0} sx={{ border: `1px solid ${theme.palette.customColors.lightAlloy}` }}>
        <Accordion disableGutters elevation={0} defaultExpanded={defaultExpanded}>
          <AccordionSummary expandIcon={<i className='tabler-chevron-down' aria-hidden='true' />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flexShrink: 0, width: 28, height: 28 }}>
                <NexaMark />
              </Box>
              <Typography variant='h6'>{GH_NEXA.insights_title}</Typography>
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color={
                  effectiveStatus === 'stale-degraded'
                    ? 'warning'
                    : effectiveStatus === 'empty-positive'
                      ? 'success'
                      : 'secondary'
                }
                label={GH_NEXA.insights_chip_no_data}
                sx={{ height: 20, fontSize: '0.64rem', fontWeight: 600 }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              role={effectiveStatus === 'stale-degraded' ? undefined : 'status'}
              aria-live='polite'
            >
              {effectiveStatus === 'loading' && (
                <EmptyState
                  icon='tabler-loader-2'
                  title={GH_NEXA.state_loading_aria}
                  description=''
                  minHeight={160}
                />
              )}
              {effectiveStatus === 'empty-pending' && (
                <EmptyState
                  icon='tabler-clock'
                  animatedIcon='/animations/empty-inbox.json'
                  title={GH_NEXA.state_empty_pending_title}
                  description={GH_NEXA.state_empty_pending_description}
                  minHeight={160}
                />
              )}
              {effectiveStatus === 'empty-positive' && (
                <EmptyState
                  icon='tabler-circle-check'
                  title={GH_NEXA.state_empty_positive_title}
                  description={GH_NEXA.state_empty_positive_description}
                  minHeight={160}
                />
              )}
              {effectiveStatus === 'stale-degraded' && (
                <Alert
                  severity='warning'
                  variant='outlined'
                  role='alert'
                  icon={<i className='tabler-alert-triangle' aria-hidden='true' />}
                >
                  <AlertTitle sx={{ fontWeight: 600 }}>
                    {GH_NEXA.state_stale_degraded_title}
                  </AlertTitle>
                  <Typography variant='body2'>
                    {GH_NEXA.state_stale_degraded_description(24)}
                  </Typography>
                </Alert>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Card>
    )
  }

  // Resuelve `{name}` con el primer nombre del usuario en sesión; si no hay nombre,
  // filtra las frases que lo requieren (en vez de mostrar un token vacío/raro).
  const viewerFirstName = viewerName?.trim().split(/\s+/)[0] ?? null

  const headlineRotation = (
    mentionSafeMode ? GH_NEXA.agent_headline_rotation_self : GH_NEXA.agent_headline_rotation_observer
  )
    .map(msg =>
      msg.includes('{name}') ? (viewerFirstName ? msg.replaceAll('{name}', viewerFirstName) : null) : msg
    )
    .filter((msg): msg is string => msg !== null)

  return (
    <Card elevation={0} data-capture='nexa-insights-block' sx={{ border: theme => `1px solid ${theme.palette.customColors.lightAlloy}` }}>
      {/* Horizontal padding > vertical: la card es ancha, así el contenido (icono a la
          izq, texto a la der) no queda apretado contra ambos bordes. TASK-1075 follow-up. */}
      <Box sx={{ py: { xs: 3, md: 5 }, px: { xs: 3, md: 7, lg: 8 } }}>
        {/* Nexa agent header — Nexa is the protagonist: the mark + the NAME lead;
            the sentence is what Nexa says (supporting subtitle). */}
        <Stack direction='row' spacing={{ xs: 2, md: 3 }} alignItems='center'>
          <Box data-capture='nexa-agent-mark' sx={{ flexShrink: 0, width: { xs: 64, md: 92 }, height: { xs: 64, md: 92 } }}>
            <NexaMark />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
              <Typography variant='h3' sx={{ color: theme => theme.palette.customColors.midnight }}>
                {GH_NEXA.insights_title}
              </Typography>
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color={chip.color}
                label={chip.label}
                sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }}
              />
              {lastAnalysis && (
                <Typography variant='caption' sx={{ color: 'text.disabled', display: { xs: 'none', sm: 'inline' } }}>
                  · {GH_NEXA.insights_last_analysis(formatTimestamp(lastAnalysis))}
                </Typography>
              )}
            </Stack>
            <RotatingNexaHeadline messages={headlineRotation} reduced={prefersReduced} />
            <Typography variant='caption' sx={{ display: 'block', color: 'text.disabled', mt: 0.75 }}>
              {GH_NEXA.agent_summary(totalAnalyzed, countWithActions)}
            </Typography>
          </Box>

          {/* Disclosure — el Nexa Mark ES el toggle: cerrado = mark completo,
              abierto = solo el spark. Idle gris → hover azul (contrato del primitive). */}
          <Box sx={{ flexShrink: 0, alignSelf: 'flex-start' }}>
            <GreenhouseDisclosureTrigger
              variant='nexaMark'
              size='medium'
              open={panelOpen}
              ariaLabel={panelOpen ? GH_NEXA.insights_collapse_aria : GH_NEXA.insights_expand_aria}
              aria-controls={panelContentId}
              dataCapture='nexa-insights-disclosure'
              onClick={() => setPanelOpen(prev => !prev)}
            />
          </Box>
        </Stack>

        <Collapse in={panelOpen} timeout='auto' unmountOnExit={false}>
          <Box id={panelContentId}>
            <Divider sx={{ mt: 3, mb: 1 }} />

        {/* View mode toggle — segmented control enterprise: track neutro + thumb
            blanco (elevation raised) que DESLIZA entre segmentos. Texto/icono
            activo en primary; inactivo en text.secondary → text.primary en hover.
            Motion tokenizado (spring) + reduced-motion (sin slide). a11y intacta
            (ToggleButtonGroup exclusive: role group + aria-pressed + flechas). */}
        {timelineAvailable && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Box
              data-capture='nexa-view-toggle'
              sx={{
                position: 'relative',
                display: 'inline-flex',
                p: 0.75,
                borderRadius: theme => `${theme.shape.customBorderRadius.lg}px`,
                bgcolor: theme => alpha(theme.palette.text.primary, 0.05)
              }}
            >
              {/* Thumb deslizante — la superficie elevada vive detrás de las labels. */}
              <motion.div
                aria-hidden='true'
                initial={false}
                animate={{ x: activeView === 'timeline' ? '100%' : '0%' }}
                transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }}
                style={{ position: 'absolute', top: 6, bottom: 6, left: 6, width: 'calc(50% - 6px)', zIndex: 0 }}
              >
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                    bgcolor: 'background.paper',
                    border: theme => `1px solid ${theme.palette.divider}`,
                    boxShadow: theme => theme.greenhouseElevation.raised.boxShadow
                  }}
                />
              </motion.div>
              <ToggleButtonGroup
                value={activeView}
                exclusive
                onChange={(_, next) => {
                  if (next === 'recent' || next === 'timeline') setViewMode(next)
                }}
                size='small'
                aria-label={GH_NEXA.insights_view_mode_aria}
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  gap: 0,
                  '& .MuiToggleButton-root': {
                    flex: 1,
                    whiteSpace: 'nowrap',
                    textTransform: 'none',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    px: 3.5,
                    py: 1.25,
                    lineHeight: 1.5,
                    minHeight: 44,
                    border: 0,
                    borderRadius: theme => `${theme.shape.customBorderRadius.md}px !important`,
                    color: 'text.secondary',
                    bgcolor: 'transparent',
                    transition: theme =>
                      prefersReduced
                        ? 'none'
                        : theme.transitions.create(['color', 'transform'], {
                            duration: theme.transitions.duration.shorter
                          }),
                    '& i': { transition: 'none' },
                    '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
                    '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'transparent', color: 'primary.main' },
                    '&:active': { transform: prefersReduced ? 'none' : 'scale(0.97)' },
                    '&.Mui-focusVisible': {
                      outline: theme => `2px solid ${theme.palette.primary.main}`,
                      outlineOffset: 2
                    }
                  }
                }}
              >
                <ToggleButton value='recent' aria-label={GH_NEXA.insights_view_mode_recent}>
                  <i className='tabler-list-details' style={{ fontSize: 16, marginRight: 8 }} aria-hidden='true' />
                  {GH_NEXA.insights_view_mode_recent}
                </ToggleButton>
                <ToggleButton value='timeline' aria-label={GH_NEXA.insights_view_mode_timeline}>
                  <i className='tabler-history' style={{ fontSize: 16, marginRight: 8 }} aria-hidden='true' />
                  {GH_NEXA.insights_view_mode_timeline}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        )}

        {/* Insight rows (conversational, hairline-separated) */}
        {activeView === 'recent' && insights.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <AnimatePresence>
              <Stack divider={<Divider />}>
                {visibleInsights.map((item, i) => (
                  <InsightRow
                    key={item.id}
                    item={item}
                    index={i}
                    animate={!prefersReduced}
                    mentionSafeMode={mentionSafeMode}
                  />
                ))}
              </Stack>
            </AnimatePresence>
          </Box>
        )}

        {activeView === 'timeline' && timelineInsights && (
          <Box sx={{ mt: 2 }}>
            <NexaInsightsTimeline insights={timelineInsights} safeMode={mentionSafeMode} />
          </Box>
        )}

        {/* Footer — affordances de navegación armonizadas + nota de Nexa.
            Ambas en el accent primary (familia Nexa): "Ver más" revela in-place
            (progressive disclosure, tonal button); "Ver todos" navega al full
            list page (gateway, text link). Side by side en desktop. */}
        <Stack
          spacing={1.5}
          alignItems='center'
          sx={{ mt: 3, pt: 3, borderTop: theme => `1px solid ${theme.palette.customColors.lightAlloy}` }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1.25, sm: 2 }}
            alignItems='center'
            justifyContent='center'
          >
            {activeView === 'recent' && insights.length > INITIAL_VISIBLE_INSIGHTS && (
              <GreenhouseButton
                variant='label'
                tone='primary'
                size='small'
                dataCapture='nexa-insights-show-more'
                onClick={() => setShowAllInsights(prev => !prev)}
                aria-expanded={showAllInsights}
                aria-label={
                  showAllInsights
                    ? GH_NEXA.insights_show_less_aria
                    : GH_NEXA.insights_show_more_aria(remainingInsights, insights.length)
                }
                trailingIconClassName={showAllInsights ? 'tabler-chevron-up' : 'tabler-chevron-down'}
              >
                {showAllInsights ? GH_NEXA.insights_show_less : GH_NEXA.insights_show_more(remainingInsights)}
              </GreenhouseButton>
            )}
            <Typography
              component={Link}
              href='/nexa/insights'
              variant='button'
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'primary.main',
                fontWeight: 600,
                textTransform: 'none',
                textDecoration: 'none',
                borderRadius: '4px',
                '&:hover': { textDecoration: 'underline' },
                '&:focus-visible': { outline: theme => `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
              }}
            >
              {GH_NEXA.home_bento_menu_view_all}
              <i className='tabler-arrow-right' style={{ fontSize: 15 }} aria-hidden='true' />
            </Typography>
          </Stack>
          <Typography variant='caption' sx={{ color: 'text.disabled', textAlign: 'center' }}>
            {GH_NEXA.agent_footer}
          </Typography>
        </Stack>
          </Box>
        </Collapse>
      </Box>
    </Card>
  )
}

export default NexaInsightsBlock
