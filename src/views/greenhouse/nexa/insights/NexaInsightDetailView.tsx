'use client'

// ─── TASK-947 — Nexa Insights detail page canonical view ────────────────────
//
// Render shell del detail page `/nexa/insights/[id]`. Consume el discriminated
// union de `readNexaInsightDrill` (server-side) y dispatcha al state UI
// canonical TASK-946 framework: current → default | superseded → partial +
// banner | expired → empty-positive | degraded → degraded banner.
//
// Notas canonical:
// - `not_found` y `error` viven en `not-found.tsx` / `error.tsx` del page
//   chrome — el view solo recibe estados que renderizan contenido real.
// - Server-side handoff: page resuelve `readNexaInsightDrill` y pasa el
//   resultado serializado. Cliente añade interacciones locales (copy link).

import { useState } from 'react'

import Link from 'next/link'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'

import EmptyState from '@/components/greenhouse/EmptyState'
import NexaInsightRootCauseSection from '@/components/greenhouse/NexaInsightRootCauseSection'
import NexaMentionText from '@/components/greenhouse/NexaMentionText'
import { GH_NEXA } from '@/lib/copy/nexa'
import { formatDate as formatGreenhouseDate } from '@/lib/format'

import type { NexaInsightDrillResult } from '@/lib/ico-engine/ai/nexa-insight-drill-reader'

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Subset del discriminated union que el view acepta. `not_found` queda fuera —
 * el page chrome (`not-found.tsx`) lo intercepta antes via `notFound()`.
 */
export type NexaInsightDetailRenderableResult = Exclude<NexaInsightDrillResult, { state: 'not_found' }>

export interface NexaInsightDetailViewProps {
  /** Result canonical del helper `readNexaInsightDrill` (server-side). */
  result: NexaInsightDetailRenderableResult
  /** Drill ID original recibido por el page (para copy-link share semantic). */
  drillId: string
  /** Path canonical Home (back link). */
  homeHref: string
}

// ─── Severity helpers (reusan tokens canonical GH_NEXA) ─────────────────────

const resolveSeverityColor = (severity: string | null): 'error' | 'warning' | 'info' | 'secondary' => {
  if (!severity) return 'secondary'
  const key = severity.toLowerCase()

  return GH_NEXA.severity_color[key] ?? 'secondary'
}

const resolveSeverityLabel = (severity: string | null): string => {
  if (!severity) return GH_NEXA.severity_label_unknown
  const key = severity.toLowerCase()

  return GH_NEXA.severity_label[key] ?? GH_NEXA.severity_label_unknown
}

const resolveSeverityIcon = (severity: string | null): string => {
  if (!severity) return 'tabler-info-circle'
  const key = severity.toLowerCase()

  if (key === 'critical') return 'tabler-alert-octagon'
  if (key === 'warning') return 'tabler-alert-triangle'

  return 'tabler-info-circle'
}

const formatProcessedAt = (iso: string | null): string => {
  if (!iso) return '—'

  try {
    return formatGreenhouseDate(iso) ?? '—'
  } catch {
    return '—'
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const BackLink = ({ homeHref }: { homeHref: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Link
      href={homeHref}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'inherit', textDecoration: 'none' }}
    >
      <i className='tabler-arrow-left' style={{ fontSize: 16 }} aria-hidden='true' />
      <Typography variant='caption' color='text.secondary'>
        {GH_NEXA.detail_back_to_home}
      </Typography>
    </Link>
  </Box>
)

const TitleRow = ({
  metricLabel,
  severity,
  scopeChips,
  lastUpdatedLabel
}: {
  metricLabel: string
  severity: string | null
  scopeChips: string[]
  lastUpdatedLabel: string | null
}) => {
  const severityColor = resolveSeverityColor(severity)
  const severityLabel = resolveSeverityLabel(severity)
  const severityIcon = resolveSeverityIcon(severity)

  return (
    <Stack spacing={2}>
      {lastUpdatedLabel && (
        <Typography variant='caption' color='text.secondary'>
          {GH_NEXA.detail_last_updated(lastUpdatedLabel)}
        </Typography>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={3}>
        <Typography variant='h4' sx={{ flex: 1, lineHeight: 1.25 }}>
          {GH_NEXA.detail_title_template(metricLabel)}
        </Typography>
        {severity && (
          <CustomChip
            round='true'
            size='small'
            variant='tonal'
            color={severityColor}
            label={severityLabel}
            icon={<i className={severityIcon} aria-hidden='true' />}
            aria-label={GH_NEXA.detail_aria_severity(severityLabel)}
          />
        )}
      </Stack>
      {scopeChips.length > 0 && (
        <Stack direction='row' spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          {scopeChips.map(label => (
            <CustomChip
              key={label}
              round='true'
              size='small'
              variant='outlined'
              color='secondary'
              label={label}
            />
          ))}
        </Stack>
      )}
    </Stack>
  )
}

const SectionCard = ({
  title,
  avatarColor,
  avatarIcon,
  accentColor,
  children
}: {
  title: string
  avatarColor: 'error' | 'warning' | 'info' | 'primary' | 'secondary'
  avatarIcon: string
  accentColor: 'error' | 'warning' | 'info' | 'primary' | 'secondary'
  children: React.ReactNode
}) => (
  <Card
    elevation={0}
    sx={theme => ({
      border: `1px solid ${theme.palette.divider}`,
      borderLeft: `4px solid ${theme.palette[accentColor].main}`
    })}
  >
    <CardHeader
      title={
        <Typography variant='h5' component='h2'>
          {title}
        </Typography>
      }
      avatar={
        <CustomAvatar variant='rounded' skin='light' color={avatarColor}>
          <i className={avatarIcon} aria-hidden='true' />
        </CustomAvatar>
      }
    />
    <Divider />
    <CardContent>{children}</CardContent>
  </Card>
)

const MetadataAccordion = ({
  enrichmentId,
  signalId,
  signalType,
  metricName,
  processedAt,
  confidence,
  qualityScore,
  periodYear,
  periodMonth
}: {
  enrichmentId: string
  signalId: string
  signalType: string
  metricName: string
  processedAt: string
  confidence: number | null
  qualityScore: number | null
  periodYear: number | null
  periodMonth: number | null
}) => {
  const periodLabel = periodYear && periodMonth ? `${String(periodMonth).padStart(2, '0')}/${periodYear}` : '—'

  const rows: { label: string; value: string }[] = [
    { label: GH_NEXA.detail_metadata_label_enrichment_id, value: enrichmentId },
    { label: GH_NEXA.detail_metadata_label_signal_id, value: signalId },
    { label: GH_NEXA.detail_metadata_label_signal_type, value: signalType || '—' },
    { label: GH_NEXA.detail_metadata_label_metric, value: metricName || '—' },
    { label: GH_NEXA.detail_metadata_label_period, value: periodLabel },
    { label: GH_NEXA.detail_metadata_label_processed_at, value: formatProcessedAt(processedAt) },
    {
      label: GH_NEXA.detail_metadata_label_confidence,
      value: confidence !== null ? `${Math.round(confidence * 100)}%` : '—'
    },
    {
      label: GH_NEXA.detail_metadata_label_quality_score,
      value: qualityScore !== null ? qualityScore.toFixed(1) : '—'
    }
  ]

  return (
    <Card elevation={0} sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}>
      <Accordion disableGutters elevation={0}>
        <AccordionSummary expandIcon={<i className='tabler-chevron-down' aria-hidden='true' />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CustomAvatar variant='rounded' skin='light' color='secondary'>
              <i className='tabler-database-cog' aria-hidden='true' />
            </CustomAvatar>
            <Typography variant='subtitle1' component='h2'>
              {GH_NEXA.detail_metadata_title}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack divider={<Divider flexItem />} spacing={1.5}>
            {rows.map(row => (
              <Stack
                key={row.label}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 0.5, sm: 2 }}
                sx={{ alignItems: { sm: 'baseline' }, justifyContent: 'space-between' }}
              >
                <Typography variant='caption' color='text.secondary'>
                  {row.label}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontVariantNumeric: 'tabular-nums', textAlign: { sm: 'right' } }}
                >
                  {row.value}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Card>
  )
}

// ─── Main view ──────────────────────────────────────────────────────────────

const NexaInsightDetailView = ({ result, drillId, homeHref }: NexaInsightDetailViewProps) => {
  // State: expired (TASK-946 empty-positive). No render del detalle completo —
  // honestidad operativa: el operador necesita saber "ya no hay nada que hacer".
  if (result.state === 'expired') {
    return (
      <Stack spacing={6} sx={{ py: 4 }} component='main' role='main'>
        <BackLink homeHref={homeHref} />
        <Card
          elevation={0}
          sx={theme => ({
            border: `1px solid ${theme.palette.divider}`
          })}
        >
          <CardContent>
            <EmptyState
              icon='tabler-circle-check'
              title={GH_NEXA.detail_expired_title}
              description={GH_NEXA.detail_expired_body(formatProcessedAt(result.resolvedAt))}
              minHeight={220}
              action={
                <Button
                  variant='contained'
                  color='primary'
                  component={Link}
                  href={homeHref}
                  startIcon={<i className='tabler-home' aria-hidden='true' />}
                >
                  {GH_NEXA.detail_back_to_home}
                </Button>
              }
            />
          </CardContent>
        </Card>
      </Stack>
    )
  }

  // State: degraded sin partial (TASK-946 stale-degraded). Banner solo.
  if (result.state === 'degraded' && !result.partial) {
    return (
      <Stack spacing={6} sx={{ py: 4 }} component='main' role='main'>
        <BackLink homeHref={homeHref} />
        <Alert
          severity='error'
          variant='outlined'
          role='alert'
          icon={<i className='tabler-alert-triangle' aria-hidden='true' />}
          action={
            <Button
              size='small'
              variant='text'
              color='inherit'
              component={Link}
              href='/admin/ops-health'
            >
              {GH_NEXA.detail_banner_degraded_cta}
            </Button>
          }
        >
          <AlertTitle sx={{ fontWeight: 600 }}>{GH_NEXA.detail_banner_degraded_title}</AlertTitle>
          <Typography variant='body2'>{GH_NEXA.detail_banner_degraded_body}</Typography>
        </Alert>
      </Stack>
    )
  }

  // State: current | superseded | degraded(partial). Detalle real renderea.
  const insight =
    result.state === 'current' || result.state === 'superseded'
      ? result.insight
      : result.partial // degraded with partial

  if (!insight) {
    // Defensa runtime: si state es degraded sin partial, ya devolvimos arriba.
    // Caso edge: no debería llegar aquí, pero TS necesita el narrow.
    return null
  }

  const scopeChips: string[] = []

  if (insight.periodYear && insight.periodMonth) {
    scopeChips.push(`${String(insight.periodMonth).padStart(2, '0')}/${insight.periodYear}`)
  }

  if (insight.signalType) {
    scopeChips.push(insight.signalType)
  }

  return (
    <Stack spacing={6} sx={{ py: 4 }} component='main' role='main'>
      <BackLink homeHref={homeHref} />

      {/* Banner: superseded (TASK-946 partial state) */}
      {result.state === 'superseded' && (
        <Alert
          severity='warning'
          variant='outlined'
          role='alert'
          icon={<i className='tabler-history' aria-hidden='true' />}
          action={
            result.currentSignalDrillId ? (
              <Button
                size='small'
                variant='text'
                color='inherit'
                component={Link}
                href={`/nexa/insights/${result.currentSignalDrillId}`}
              >
                {GH_NEXA.detail_banner_superseded_cta}
              </Button>
            ) : null
          }
        >
          <AlertTitle sx={{ fontWeight: 600 }}>{GH_NEXA.detail_banner_superseded_title}</AlertTitle>
          <Typography variant='body2'>{GH_NEXA.detail_banner_superseded_body}</Typography>
        </Alert>
      )}

      {/* Banner: degraded(partial) */}
      {result.state === 'degraded' && (
        <Alert
          severity='error'
          variant='outlined'
          role='alert'
          icon={<i className='tabler-alert-triangle' aria-hidden='true' />}
          action={
            <Button
              size='small'
              variant='text'
              color='inherit'
              component={Link}
              href='/admin/ops-health'
            >
              {GH_NEXA.detail_banner_degraded_cta}
            </Button>
          }
        >
          <AlertTitle sx={{ fontWeight: 600 }}>{GH_NEXA.detail_banner_degraded_title}</AlertTitle>
          <Typography variant='body2'>{GH_NEXA.detail_banner_degraded_body}</Typography>
        </Alert>
      )}

      <TitleRow
        metricLabel={insight.metricName || GH_NEXA.detail_metadata_label_metric}
        severity={insight.severity}
        scopeChips={scopeChips}
        lastUpdatedLabel={formatProcessedAt(insight.processedAt)}
      />

      {/* Card: Anomalía observada */}
      <SectionCard
        title={GH_NEXA.detail_section_anomaly_title}
        avatarColor={resolveSeverityColor(insight.severity)}
        avatarIcon='tabler-activity-heartbeat'
        accentColor={resolveSeverityColor(insight.severity)}
      >
        {insight.explanationSummary ? (
          <NexaMentionText text={insight.explanationSummary} variant='body1' />
        ) : (
          <Typography variant='body2' color='text.secondary'>
            —
          </Typography>
        )}
      </SectionCard>

      {/* Card: Causa raíz (reuse del componente existente TASK-696) */}
      <SectionCard
        title={GH_NEXA.detail_section_root_cause_title}
        avatarColor='info'
        avatarIcon='tabler-zoom-scan'
        accentColor='info'
      >
        {insight.rootCauseNarrative ? (
          <NexaInsightRootCauseSection
            narrative={insight.rootCauseNarrative}
            insightId={insight.enrichmentId}
          />
        ) : (
          <Typography variant='body2' color='text.secondary'>
            —
          </Typography>
        )}
      </SectionCard>

      {/* Card: Acción sugerida */}
      <SectionCard
        title={GH_NEXA.detail_section_action_title}
        avatarColor='primary'
        avatarIcon='tabler-target-arrow'
        accentColor='primary'
      >
        {insight.recommendedAction ? (
          <Stack spacing={3}>
            <NexaMentionText text={insight.recommendedAction} variant='body1' />
            <CopyLinkButton drillId={drillId} />
          </Stack>
        ) : (
          <Stack spacing={3}>
            <Typography variant='body2' color='text.secondary'>
              —
            </Typography>
            <CopyLinkButton drillId={drillId} />
          </Stack>
        )}
      </SectionCard>

      <MetadataAccordion
        enrichmentId={insight.enrichmentId}
        signalId={insight.signalId}
        signalType={insight.signalType}
        metricName={insight.metricName}
        processedAt={insight.processedAt}
        confidence={insight.confidence}
        qualityScore={insight.qualityScore}
        periodYear={insight.periodYear}
        periodMonth={insight.periodMonth}
      />
    </Stack>
  )
}

// ─── Copy link button (client-only interaction) ─────────────────────────────

const CopyLinkButton = ({ drillId }: { drillId: string }) => {
  const [feedback, setFeedback] = useState<'idle' | 'success' | 'error'>('idle')

  const handleCopy = async () => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const url = `${origin}/nexa/insights/${drillId}`

      await navigator.clipboard.writeText(url)
      setFeedback('success')
      setTimeout(() => setFeedback('idle'), 2500)
    } catch {
      setFeedback('error')
      setTimeout(() => setFeedback('idle'), 2500)
    }
  }

  return (
    <Stack direction='row' alignItems='center' spacing={2}>
      <Button
        variant='tonal'
        color='secondary'
        onClick={handleCopy}
        startIcon={<i className='tabler-link' aria-hidden='true' />}
      >
        {GH_NEXA.detail_action_copy_link}
      </Button>
      {feedback === 'success' && (
        <Typography
          variant='caption'
          color='success.main'
          role='status'
          aria-live='polite'
        >
          {GH_NEXA.detail_action_copy_link_success}
        </Typography>
      )}
      {feedback === 'error' && (
        <Typography
          variant='caption'
          color='error.main'
          role='status'
          aria-live='polite'
        >
          {GH_NEXA.detail_action_copy_link_failure}
        </Typography>
      )}
    </Stack>
  )
}

export default NexaInsightDetailView
