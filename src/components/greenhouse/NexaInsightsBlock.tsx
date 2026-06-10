'use client'

import { useState } from 'react'

import Link from 'next/link'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
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
import NexaSeveritySparkline from '@/components/greenhouse/NexaSeveritySparkline'
import GreenhouseNexaAnimatedMark from '@/components/greenhouse/primitives/GreenhouseNexaAnimatedMark'
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

// Severity icon canonical — matches the `/nexa/insights` list card contract
// (icon + label, NUNCA color-only — WCAG 2.2 AA).
const SEVERITY_ICON: Record<string, string> = {
  critical: 'tabler-alert-octagon',
  warning: 'tabler-alert-triangle',
  info: 'tabler-info-circle'
}

const SEVERITY_ICON_UNKNOWN = 'tabler-help-circle'

const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.25, ease: 'easeOut' as const }
  })
}

const InsightCard = ({
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
  const metricName = getMetricDisplayName(item.metricId)
  // TASK-947 — signal-anchored drill (stable). Fallback to enrichment id.
  const drillHref = buildNexaInsightDrillHref(item.signalId ?? item.id)

  // TASK-945 — lifecycle gating: sparkline solo si >= 2 observations.
  // resolved badge solo si lifecycleStatus === 'resolved'.
  const lifecycleObservations = item.lifecycle ?? []
  const showSparkline = lifecycleObservations.length >= 2
  const isResolved = item.lifecycleStatus === 'resolved'

  const content = (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: theme => `1px solid ${theme.palette.customColors.lightAlloy}`,
        borderLeft: theme => `4px solid ${theme.palette[severityColor]?.main ?? theme.palette.text.secondary}`,
        bgcolor: 'background.paper',
        transition: theme => theme.transitions.create(['box-shadow'], { duration: theme.transitions.duration.shorter }),
        '&:hover': { boxShadow: theme => theme.greenhouseElevation.raised.boxShadow },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
      }}
    >
      <Stack spacing={1.5}>
        {/* Header: severity (icon + label, not color-only) + metric + signal type + sparkline + resolved */}
        <Stack direction='row' spacing={1} alignItems='center' sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
          <CustomChip
            round='true'
            size='small'
            variant='tonal'
            color={severityColor}
            icon={<i className={severityIcon} style={{ fontSize: 13 }} aria-hidden='true' />}
            label={severityLabel}
            sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600, '& .MuiChip-icon': { ml: 0.5 } }}
          />
          <Typography variant='subtitle2' sx={{ color: theme => theme.palette.customColors.midnight }}>
            {metricName}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.disabled' }}>
            · {signalLabel}
          </Typography>
          {showSparkline && (
            <Box sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              <NexaSeveritySparkline observations={lifecycleObservations} />
            </Box>
          )}
          {showSparkline && (
            <Box sx={{ display: { xs: 'inline-flex', sm: 'none' } }}>
              <NexaSeveritySparkline observations={lifecycleObservations} compact />
            </Box>
          )}
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

        {/* Headline = explanation (promoted: the insight a person reads first) */}
        {item.explanation && (
          <NexaMentionText
            text={item.explanation}
            variant='body1'
            safeMode={mentionSafeMode}
            sx={{
              fontWeight: 500,
              color: theme => theme.palette.customColors.midnight,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          />
        )}

        {/* Root cause narrative (collapsible) */}
        {item.rootCauseNarrative && item.rootCauseNarrative.trim() && (
          <NexaInsightRootCauseSection
            narrative={item.rootCauseNarrative}
            insightId={item.id}
            safeMode={mentionSafeMode}
          />
        )}

        {/* Recommended action — the actionable block */}
        {item.recommendedAction && (
          <Stack
            direction='row'
            spacing={1.25}
            sx={{
              p: 1.5,
              borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
              bgcolor: theme => alpha(theme.palette.primary.main, 0.06),
              border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`
            }}
          >
            <i className='tabler-bulb' style={{ fontSize: 16, marginTop: 2, color: theme.palette.primary.main }} aria-hidden='true' />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant='caption' sx={{ fontWeight: 700, color: 'primary.main', display: 'block', mb: 0.25 }}>
                {GH_NEXA.insights_action_label}
              </Typography>
              <NexaMentionText
                text={item.recommendedAction}
                variant='body2'
                safeMode={mentionSafeMode}
                sx={{ color: theme => theme.palette.customColors.midnight }}
              />
            </Box>
          </Stack>
        )}

        {/* Drill CTA — the path to the full root-cause detail */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
          <Typography
            component={Link}
            href={drillHref}
            variant='button'
            aria-label={GH_NEXA.list_card_aria_label(metricName, severityLabel)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              color: 'primary.main',
              fontWeight: 600,
              textTransform: 'none',
              textDecoration: 'none',
              borderRadius: '4px',
              '&:hover': { textDecoration: 'underline' },
              '&:focus-visible': { outline: theme => `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
            }}
          >
            {GH_NEXA.list_card_drill_cta}
            <i className='tabler-arrow-right' style={{ fontSize: 16 }} aria-hidden='true' />
          </Typography>
        </Box>
      </Stack>
    </Box>
  )

  if (!animate) return content

  return (
    <motion.div
      custom={index}
      initial='hidden'
      animate='visible'
      variants={STAGGER_ITEM}
    >
      {content}
    </motion.div>
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
  mentionSafeMode = false
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
              <GreenhouseNexaAnimatedMark kind='badgeIcon' tone='fullColor' size='small' decorative />
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

  return (
    <Card elevation={0} data-capture='nexa-insights-block' sx={{ border: `1px solid ${theme.palette.customColors.lightAlloy}` }}>
      <Accordion disableGutters elevation={0} defaultExpanded={defaultExpanded}>
        <AccordionSummary expandIcon={<i className='tabler-chevron-down' aria-hidden='true' />}>
          <Stack direction='row' alignItems='center' spacing={2} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
            <GreenhouseNexaAnimatedMark kind='badgeIcon' tone='fullColor' size='small' decorative />
            <Typography variant='h6'>{GH_NEXA.insights_title}</Typography>
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={chip.color}
              label={chip.label}
              sx={{ height: 20, fontSize: '0.64rem', fontWeight: 600 }}
            />
            {lastAnalysis && (
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'inline' } }}
              >
                · {GH_NEXA.insights_last_analysis(formatTimestamp(lastAnalysis))}
              </Typography>
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={4}>
            {/* Summary strip — slim, no heavy avatar cards */}
            <Stack direction='row' spacing={4} alignItems='center' divider={<Divider orientation='vertical' flexItem />}>
              <Stack spacing={0.25}>
                <Typography variant='h4' sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  <AnimatedCounter value={totalAnalyzed} format='integer' />
                </Typography>
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                  {GH_NEXA.kpi_analyzed}
                </Typography>
              </Stack>
              <Stack spacing={0.25}>
                <Stack direction='row' alignItems='center' spacing={0.75}>
                  <i className='tabler-bulb' style={{ fontSize: 18, color: theme.palette.primary.main }} aria-hidden='true' />
                  <Typography variant='h4' sx={{ color: 'primary.main', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                    <AnimatedCounter value={countWithActions} format='integer' />
                  </Typography>
                </Stack>
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                  {GH_NEXA.kpi_actionable}
                </Typography>
              </Stack>
            </Stack>

            {/* View mode toggle (shown only when historical data is available) */}
            {timelineAvailable && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <ToggleButtonGroup
                  value={activeView}
                  exclusive
                  onChange={(_, next) => {
                    if (next === 'recent' || next === 'timeline') setViewMode(next)
                  }}
                  size='small'
                  aria-label={GH_NEXA.insights_view_mode_aria}
                  sx={{
                    '& .MuiToggleButton-root': {
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      px: 2,
                      py: 0.5,
                      lineHeight: 1.5,
                      minHeight: 32
                    }
                  }}
                >
                  <ToggleButton value='recent' aria-label={GH_NEXA.insights_view_mode_recent}>
                    <i className='tabler-list-details' style={{ fontSize: 16, marginRight: 6 }} aria-hidden='true' />
                    {GH_NEXA.insights_view_mode_recent}
                  </ToggleButton>
                  <ToggleButton value='timeline' aria-label={GH_NEXA.insights_view_mode_timeline}>
                    <i className='tabler-history' style={{ fontSize: 16, marginRight: 6 }} aria-hidden='true' />
                    {GH_NEXA.insights_view_mode_timeline}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}

            {/* Content: recent cards (default) or timeline (when enabled) */}
            {activeView === 'recent' && insights.length > 0 && (
              <div>
                <Typography variant='overline' sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}>
                  {GH_NEXA.insights_list_title}
                </Typography>
                <AnimatePresence>
                  <Stack spacing={1.5}>
                    {insights.map((item, i) => (
                      <InsightCard
                        key={item.id}
                        item={item}
                        index={i}
                        animate={!prefersReduced}
                        mentionSafeMode={mentionSafeMode}
                      />
                    ))}
                  </Stack>
                </AnimatePresence>
              </div>
            )}

            {activeView === 'timeline' && timelineInsights && (
              <NexaInsightsTimeline insights={timelineInsights} safeMode={mentionSafeMode} />
            )}

            {/* Nexa disclaimer */}
            <Typography
              variant='caption'
              sx={{
                color: 'text.secondary',
                textAlign: 'center',
                display: 'block',
                pt: 2,
                borderTop: `1px solid ${theme.palette.customColors.lightAlloy}`
              }}
            >
              {GH_NEXA.disclaimer}
            </Typography>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Card>
  )
}

export default NexaInsightsBlock
