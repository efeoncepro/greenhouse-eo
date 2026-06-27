'use client'

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListSubheader from '@mui/material/ListSubheader'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import {
  CompositionShell,
  GreenhouseBreadcrumbs,
  MetricSummaryCard,
  MetricTrendCard,
  type MetricTrendTone
} from '@/components/greenhouse/primitives'
import type { OperationalStatusTone } from '@/components/greenhouse/primitives/OperationalStatusBadge'
// Importamos del módulo `model` directo (NO del barrel): el barrel re-exporta el render PDF `server-only`
// (@react-pdf/renderer) y meterlo en el bundle de cliente rompería el build (server-only transitivo).
import { REPORT_SEVERITY_TONE, type ReportArtifactModel } from '@/components/growth/ai-visibility/report-artifact/model'
import { GH_GROWTH_AI_VISIBILITY, GH_GROWTH_AI_VISIBILITY_CLIENT_REPORT } from '@/lib/copy/growth'
import { formatNumber } from '@/lib/format/number'
import type { GraderReportSeverity } from '@/lib/growth/ai-visibility/report/contracts'
import type { ScoreDimensionKey } from '@/lib/growth/ai-visibility/scoring/config'

/**
 * TASK-1248 — Portal cliente · AI Visibility (Split Workbench, concepto C).
 *
 * 4.º view-adapter del MISMO `ReportArtifactModel` (SSOT, TASK-1252): NO forkea scoring, NO embebe el
 * render vertical del artifact, NO introduce ECharts. Recompone el modelo como un workbench master-detail:
 * navigator (Dimensiones + Recomendaciones) ↔ detail canvas. La banda de resumen + señales + CTA viven a
 * nivel de página (siempre visibles); el `CompositionShell composition='masterDetail'` gobierna el split
 * navigator/detail en desktop y el drawer del detalle en compact. V1-honest: la tendencia es el delta
 * run-over-run que el snapshot YA trae (no una serie fabricada); el copy NUNCA promete monitoreo recurrente.
 */

const C = GH_GROWTH_AI_VISIBILITY_CLIENT_REPORT
const SEV = GH_GROWTH_AI_VISIBILITY.severity_label
const DIM_EXPLAINER = GH_GROWTH_AI_VISIBILITY.dimension_explainer

// Helper canónico es-CL (locale context) — NO raw Intl (lint greenhouse/no-raw-locale-formatting).
const fmt = (value: number): string => formatNumber(value)

// Severidad nombrada → token semántico (NUNCA color-only: siempre acompañada del label).
const severityThemeColor: Record<GraderReportSeverity, OperationalStatusTone> = {
  optimo: 'success',
  atencion: 'warning',
  critico: 'error',
  sin_dato: 'secondary'
}

// Tono del MetricTrendCard (no admite neutral → sin_dato va sin tono = gris por defecto).
const severityTrendTone = (severity: GraderReportSeverity): MetricTrendTone | null => {
  const tone = REPORT_SEVERITY_TONE[severity]

  return tone === 'neutral' ? null : tone
}

type Selection =
  | { type: 'dimension'; key: ScoreDimensionKey }
  | { type: 'recommendation'; gapKey: string }

// ── Severity dot (named, never color-only) ────────────────────────────────────
const SeverityDot = ({ severity }: { severity: GraderReportSeverity }) => (
  <Box
    aria-hidden='true'
    sx={theme => ({
      flexShrink: 0,
      width: 10,
      height: 10,
      borderRadius: '50%',
      bgcolor:
        severity === 'sin_dato' ? theme.palette.text.disabled : theme.palette[severityThemeColor[severity]].main
    })}
  />
)

// ── Navigator rail (aside region) ─────────────────────────────────────────────
const NavigatorRail = ({
  model,
  selection,
  onSelect
}: {
  model: ReportArtifactModel
  selection: Selection
  onSelect: (next: Selection) => void
}) => (
  <Stack spacing={4} sx={{ minWidth: 0 }}>
    <List
      disablePadding
      aria-label={C.navigator.dimensionsHeader}
      subheader={
        <ListSubheader disableSticky disableGutters sx={{ bgcolor: 'transparent', lineHeight: 2 }}>
          <Typography variant='overline' color='text.secondary'>
            {C.navigator.dimensionsHeader}
          </Typography>
        </ListSubheader>
      }
    >
      {model.dimensions.map(dim => {
        const selected = selection.type === 'dimension' && selection.key === dim.key

        return (
          <ListItemButton
            key={dim.key}
            selected={selected}
            aria-current={selected ? 'true' : undefined}
            onClick={() => onSelect({ type: 'dimension', key: dim.key })}
            sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.sm}px`, gap: 3, py: 2 })}
          >
            <SeverityDot severity={dim.severity} />
            <Stack sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant='body2' sx={{ fontWeight: 500 }} noWrap>
                {dim.label}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {SEV[dim.severity]}
              </Typography>
            </Stack>
            <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              {dim.score === null ? '—' : fmt(dim.score)}
            </Typography>
          </ListItemButton>
        )
      })}
    </List>

    <Divider />

    <List
      disablePadding
      aria-label={C.navigator.recommendationsHeader}
      subheader={
        <ListSubheader disableSticky disableGutters sx={{ bgcolor: 'transparent', lineHeight: 2 }}>
          <Typography variant='overline' color='text.secondary'>
            {C.navigator.recommendationsHeader}
          </Typography>
        </ListSubheader>
      }
    >
      {model.recommendations.length === 0 ? (
        <Typography variant='body2' color='text.secondary' sx={{ px: 2, py: 1 }}>
          {C.navigator.recommendationsEmpty}
        </Typography>
      ) : (
        model.recommendations.map(rec => {
          const selected = selection.type === 'recommendation' && selection.gapKey === rec.gapKey

          return (
            <ListItemButton
              key={rec.gapKey}
              selected={selected}
              aria-current={selected ? 'true' : undefined}
              onClick={() => onSelect({ type: 'recommendation', gapKey: rec.gapKey })}
              sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.sm}px`, gap: 3, py: 2, alignItems: 'flex-start' })}
            >
              <SeverityDot severity={rec.severity} />
              <Stack sx={{ minWidth: 0, flex: 1 }} spacing={1}>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  {rec.title}
                </Typography>
                <Chip
                  size='small'
                  variant='tonal'
                  color={severityThemeColor[rec.severity]}
                  label={SEV[rec.severity]}
                  sx={{ alignSelf: 'flex-start' }}
                />
              </Stack>
            </ListItemButton>
          )
        })
      )}
    </List>
  </Stack>
)

// ── Detail canvas (primary region) ────────────────────────────────────────────
const DimensionDetail = ({ model, dimKey }: { model: ReportArtifactModel; dimKey: ScoreDimensionKey }) => {
  const dim = model.dimensions.find(d => d.key === dimKey)

  if (!dim) return null

  const dimTrend = model.trend.status === 'con_tendencia' ? model.trend.dimensions.find(d => d.key === dimKey) : undefined

  const trendSeries =
    dimTrend && dimTrend.previous !== null && dimTrend.current !== null
      ? [
          { label: C.detail.comparePrevious, value: dimTrend.previous },
          { label: C.detail.trendTitle, value: dimTrend.current }
        ]
      : null

  return (
    <Stack spacing={5}>
      <Stack spacing={2}>
        <Stack direction='row' spacing={3} alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap>
          <Typography variant='h5'>{dim.label}</Typography>
          <Chip variant='tonal' color={severityThemeColor[dim.severity]} label={SEV[dim.severity]} />
        </Stack>
        <Stack direction='row' spacing={2} alignItems='baseline'>
          <Typography variant='kpiValue' sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {dim.score === null ? '—' : fmt(dim.score)}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {C.detail.scoreOutOf}
          </Typography>
        </Stack>
        <LinearProgress
          variant='determinate'
          value={dim.score ?? 0}
          color={severityThemeColor[dim.severity] === 'secondary' ? 'inherit' : severityThemeColor[dim.severity]}
          aria-label={`${dim.label}: ${dim.score === null ? C.detail.scoreNoData : fmt(dim.score)} ${C.detail.scoreOutOf}`}
          sx={{ height: 8, borderRadius: 999 }}
        />
        <Typography variant='caption' color='text.secondary'>
          {C.detail.dimensionScoreContext}
        </Typography>
      </Stack>

      <Box>
        <Typography variant='overline' color='text.secondary'>
          {C.detail.whyItMatters}
        </Typography>
        <Typography variant='body1' sx={{ mt: 1 }}>
          {DIM_EXPLAINER[dim.key]}
        </Typography>
      </Box>

      {trendSeries ? (
        <MetricTrendCard
          title={dim.label}
          metricName={C.detail.trendTitle}
          periodLabel={C.detail.comparePrevious}
          value={dimTrend?.current ?? null}
          series={trendSeries}
          tone={severityTrendTone(dim.severity)}
          format='integer'
          dataCapture='client-ai-visibility-dimension-trend'
        />
      ) : null}
    </Stack>
  )
}

const RecommendationDetail = ({ model, gapKey }: { model: ReportArtifactModel; gapKey: string }) => {
  const rec = model.recommendations.find(r => r.gapKey === gapKey)

  if (!rec) return null

  return (
    <Stack spacing={5}>
      <Stack spacing={2}>
        <Stack direction='row' spacing={3} alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap>
          <Typography variant='h5'>{rec.title}</Typography>
          <Chip variant='tonal' color={severityThemeColor[rec.severity]} label={SEV[rec.severity]} />
        </Stack>
      </Stack>

      <Box>
        <Typography variant='overline' color='text.secondary'>
          {C.detail.whatToDo}
        </Typography>
        <Typography variant='body1' sx={{ mt: 1 }}>
          {rec.action}
        </Typography>
      </Box>
    </Stack>
  )
}

const DetailCanvas = ({ model, selection }: { model: ReportArtifactModel; selection: Selection }) => (
  <Card variant='outlined' sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.lg}px`, height: '100%' })}>
    <CardContent sx={{ p: { xs: 4, md: 6 } }}>
      {selection.type === 'dimension' ? (
        <DimensionDetail model={model} dimKey={selection.key} />
      ) : (
        <RecommendationDetail model={model} gapKey={selection.gapKey} />
      )}
    </CardContent>
  </Card>
)

// ── Overview band (page-level, always visible) ────────────────────────────────
const OverviewBand = ({ model }: { model: ReportArtifactModel }) => {
  const overall = model.trend.status === 'con_tendencia' ? model.trend.overall : null

  const compareLabel =
    overall && overall.delta !== null
      ? `${overall.delta > 0 ? '↑' : overall.delta < 0 ? '↓' : ''} ${fmt(Math.abs(overall.delta))} ${C.detail.comparePrevious}`.trim()
      : C.detail.noPrevious

  return (
    <Card variant='outlined' sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.lg}px` })}>
      <CardContent>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={6}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          divider={<Divider orientation='vertical' flexItem sx={{ display: { xs: 'none', md: 'block' } }} />}
        >
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Typography variant='overline' color='text.secondary'>
              {C.detail.scoreLabel}
            </Typography>
            <Stack direction='row' spacing={3} alignItems='baseline' flexWrap='wrap' useFlexGap>
              <Typography variant='kpiValue' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {model.overallScore === null ? '—' : fmt(model.overallScore)}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {C.detail.scoreOutOf}
              </Typography>
              <Chip
                variant='tonal'
                color={severityThemeColor[model.overallSeverity]}
                label={SEV[model.overallSeverity]}
              />
            </Stack>
            <Typography variant='caption' color='text.secondary'>
              {compareLabel}
            </Typography>
          </Stack>

          <Stack direction='row' spacing={6} flexWrap='wrap' useFlexGap>
            <Stack spacing={1}>
              <Typography variant='overline' color='text.secondary'>
                {C.detail.perceptionAxisLabel}
              </Typography>
              <Typography variant='h5' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {model.perceptionAxisScore === null ? '—' : fmt(model.perceptionAxisScore)}
              </Typography>
            </Stack>
            <Stack spacing={1}>
              <Typography variant='overline' color='text.secondary'>
                {C.detail.agenticAxisLabel}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ pt: 2 }}>
                {C.detail.agenticCoverage}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ── Signals row (page-level, always visible) ──────────────────────────────────
const SignalsRow = ({ model }: { model: ReportArtifactModel }) => {
  const citationValue =
    model.citationInsight.ownDomainShare === null
      ? C.signals.citationNoData
      : `${fmt(Math.round(model.citationInsight.ownDomainShare))}%`

  const positionValue = model.positionSummary.best === null ? C.signals.positionNoData : `#${fmt(model.positionSummary.best)}`

  const sentimentValue =
    model.sentimentSummary.net === 'sin_dato'
      ? '—'
      : model.sentimentSummary.net.charAt(0).toUpperCase() + model.sentimentSummary.net.slice(1)

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 5,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }
      }}
    >
      <MetricSummaryCard
        icon='tabler-link'
        iconColor='info'
        title={C.signals.citationTitle}
        value={citationValue}
        subtitle={C.signals.citationHelp}
        tooltip={C.signals.citationHelp}
      />
      <MetricSummaryCard
        icon='tabler-mood-smile'
        iconColor='primary'
        title={C.signals.sentimentTitle}
        value={sentimentValue}
        subtitle={C.signals.sentimentHelp}
        tooltip={C.signals.sentimentHelp}
      />
      <MetricSummaryCard
        icon='tabler-trophy'
        iconColor='warning'
        title={C.signals.positionTitle}
        value={positionValue}
        subtitle={C.signals.positionHelp}
        tooltip={C.signals.positionHelp}
      />
    </Box>
  )
}

// ── Provider presence (page-level bars; honest counts, accessible) ────────────
const ProviderPresence = ({ model }: { model: ReportArtifactModel }) => {
  const engines = model.engineSnapshot ?? []

  if (engines.length === 0) return null

  return (
    <Card variant='outlined' sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.lg}px` })}>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant='h5'>{C.detail.providerPresenceTitle}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {C.detail.providerPresenceHelp}
          </Typography>
        </Stack>
        <Stack spacing={4} sx={{ mt: 4 }} aria-label={C.detail.providerPresenceAria}>
          {engines.map(engine => {
            const pct = engine.resolved > 0 ? Math.round((engine.present / engine.resolved) * 100) : 0
            const label = engine.provider.charAt(0).toUpperCase() + engine.provider.slice(1)
            const countLabel = `${fmt(engine.present)} ${C.detail.providerOf} ${fmt(engine.resolved)}`

            return (
              <Stack key={engine.provider} spacing={1}>
                <Stack direction='row' justifyContent='space-between' spacing={2}>
                  <Typography variant='body2' sx={{ fontWeight: 500 }}>
                    {label}
                  </Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {countLabel}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant='determinate'
                  value={pct}
                  aria-label={`${label}: ${countLabel}`}
                  sx={{ height: 8, borderRadius: 999 }}
                />
              </Stack>
            )
          })}
        </Stack>
      </CardContent>
    </Card>
  )
}

export interface AiVisibilityClientReportViewProps {
  model: ReportArtifactModel
  organizationName: string
  asOfLabel: string | null
}

const AiVisibilityClientReportView = ({ model, organizationName, asOfLabel }: AiVisibilityClientReportViewProps) => {
  // Default: la brecha principal (primaryGap) si existe; sino la primera dimensión. Predecible + accionable.
  const defaultSelection = useMemo<Selection>(() => {
    if (model.primaryGap) {
      const rec = model.recommendations.find(r => r.gapKey === model.primaryGap?.gapKey)

      if (rec) return { type: 'recommendation', gapKey: rec.gapKey }
    }

    if (model.dimensions.length > 0) return { type: 'dimension', key: model.dimensions[0].key }

    return { type: 'recommendation', gapKey: model.recommendations[0]?.gapKey ?? '' }
  }, [model])

  const [selection, setSelection] = useState<Selection>(defaultSelection)

  const overallTrend = model.trend.status === 'con_tendencia' ? model.trend.overall : null

  const overallTrendSeries =
    overallTrend && overallTrend.previous !== null && overallTrend.current !== null
      ? [
          { label: C.detail.comparePrevious, value: overallTrend.previous },
          { label: C.detail.trendTitle, value: overallTrend.current }
        ]
      : null

  return (
    <Stack spacing={6} sx={{ p: { xs: 4, md: 6 }, minWidth: 0 }} data-capture='client-ai-visibility-report'>
      {/* Top strip: breadcrumb + título + org + as-of */}
      <Stack spacing={2}>
        <GreenhouseBreadcrumbs
          items={[
            { label: C.page.breadcrumbRoot, href: '/home' },
            { label: C.page.breadcrumbGrowth },
            { label: C.page.title }
          ]}
        />
        <Stack direction='row' spacing={3} alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap>
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Typography variant='h4'>{C.page.title}</Typography>
            <Typography variant='body1' color='text.secondary'>
              {C.page.subtitle}
            </Typography>
          </Stack>
          <Chip variant='tonal' color='primary' label={organizationName} aria-label={C.page.orgChipAria} />
        </Stack>
        {asOfLabel ? (
          <Typography variant='caption' color='text.secondary'>
            {C.page.asOfLabel} {asOfLabel} · {C.page.samplingNote}
          </Typography>
        ) : (
          <Typography variant='caption' color='text.secondary'>
            {C.page.samplingNote}
          </Typography>
        )}
      </Stack>

      <OverviewBand model={model} />

      {overallTrendSeries ? (
        <MetricTrendCard
          title={C.detail.trendMetricName}
          metricName={C.detail.trendTitle}
          periodLabel={C.detail.comparePrevious}
          value={overallTrend?.current ?? null}
          series={overallTrendSeries}
          tone={severityTrendTone(model.overallSeverity)}
          format='integer'
          dataCapture='client-ai-visibility-trend'
        />
      ) : null}

      <SignalsRow model={model} />

      {/* Workbench master-detail: navigator (aside) ↔ detalle (primary) */}
      <CompositionShell
        composition='masterDetail'
        instanceId='client-ai-visibility'
        asideLabel={C.navigator.ariaLabel}
        detailLabel={C.detail.overviewTitle}
        regions={{
          aside: <NavigatorRail model={model} selection={selection} onSelect={setSelection} />,
          primary: <DetailCanvas model={model} selection={selection} />
        }}
      />

      <ProviderPresence model={model} />

      {/* CTA gobernado read-only V1: contacto al equipo Efeonce (sin mutación comercial silenciosa). */}
      <Card variant='outlined' sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.lg}px` })} data-capture='client-ai-visibility-actions'>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={4}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent='space-between'
          >
            <Stack spacing={1} sx={{ minWidth: 0 }}>
              <Typography variant='h5'>{C.cta.scheduleConversation}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {C.cta.scheduleHelp}
              </Typography>
            </Stack>
            <Button
              variant='contained'
              startIcon={<i className='tabler-calendar-event' />}
              href='mailto:hola@efeonce.com'
              aria-label={C.cta.ariaLabel}
            >
              {C.cta.scheduleConversation}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default AiVisibilityClientReportView
