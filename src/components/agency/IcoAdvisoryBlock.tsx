'use client'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { AgencyAiLlmSummary, AgencyAiLlmSummaryItem, IcoLlmRunStatus } from '@/lib/ico-engine/ai/llm-types'

type Props = {
  aiLlm: AgencyAiLlmSummary
}

const SIGNAL_TYPE_LABEL: Record<string, string> = {
  anomaly: 'Anomalía',
  prediction: 'Predicción',
  root_cause: 'Causa raíz',
  recommendation: 'Recomendación'
}

const SEVERITY_COLOR: Record<string, 'error' | 'warning' | 'info' | 'secondary'> = {
  critical: 'error',
  warning: 'warning',
  info: 'info'
}

const RUN_STATUS_COLOR: Record<IcoLlmRunStatus, 'success' | 'warning' | 'error'> = {
  succeeded: 'success',
  partial: 'warning',
  failed: 'error'
}

const formatTimestamp = (iso: string | null) => {
  if (!iso) return '—'

  try {
    const date = new Date(iso)

    if (isNaN(date.getTime())) return '—'

    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '—'
  }
}

const formatQuality = (score: number | null) => {
  if (score === null) return '—'

  return `${Math.round(score)}`
}

const EnrichmentRow = ({ item }: { item: AgencyAiLlmSummaryItem }) => (
  <Box
    sx={{
      p: 2,
      borderRadius: 2,
      border: `1px solid ${GH_COLORS.neutral.border}`,
      bgcolor: 'background.paper',
      '&:hover': { bgcolor: 'action.hover' }
    }}
  >
    <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={2} flexWrap='wrap' useFlexGap>
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.5 }}>
          <CustomChip
            round='true'
            size='small'
            variant='tonal'
            color={SEVERITY_COLOR[item.severity ?? ''] ?? 'secondary'}
            label={SIGNAL_TYPE_LABEL[item.signalType] ?? item.signalType}
            sx={{ height: 20, fontSize: '0.64rem', fontWeight: 600 }}
          />
          <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
            {item.metricName}
          </Typography>
        </Stack>
        {item.explanationSummary && (
          <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textPrimary, mb: 0.5 }}>
            {item.explanationSummary}
          </Typography>
        )}
        {item.recommendedAction && (
          <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
            {item.recommendedAction}
          </Typography>
        )}
      </Box>
      <Stack direction='row' spacing={1.5} alignItems='center' sx={{ flexShrink: 0 }}>
        {item.qualityScore !== null && (
          <Tooltip title={GH_AGENCY.advisory_tooltip_quality}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary, display: 'block', lineHeight: 1 }}>
                Calidad
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                {formatQuality(item.qualityScore)}
              </Typography>
            </Box>
          </Tooltip>
        )}
        <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
          {formatTimestamp(item.processedAt)}
        </Typography>
      </Stack>
    </Stack>
  </Box>
)

const IcoAdvisoryBlock = ({ aiLlm }: Props) => {
  const { totals, latestRun, recentEnrichments, lastProcessedAt } = aiLlm
  const hasEnrichments = totals.total > 0

  if (!hasEnrichments) {
    return (
      <Card elevation={0} sx={{ border: `1px solid ${GH_COLORS.neutral.border}` }}>
        <Accordion disableGutters elevation={0}>
          <AccordionSummary expandIcon={<i className='tabler-chevron-down' aria-hidden='true' />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <i className='tabler-sparkles' style={{ fontSize: 20 }} aria-hidden='true' />
              <Typography variant='h6'>{GH_AGENCY.advisory_title}</Typography>
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color='secondary'
                label='Sin datos'
                sx={{ height: 20, fontSize: '0.64rem', fontWeight: 600 }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <EmptyState
              icon='tabler-sparkles'
              title={GH_AGENCY.advisory_empty_title}
              description={GH_AGENCY.advisory_empty_description}
              minHeight={160}
            />
          </AccordionDetails>
        </Accordion>
      </Card>
    )
  }

  const runStatusLabel = latestRun
    ? GH_AGENCY[`advisory_run_status_${latestRun.status}` as keyof typeof GH_AGENCY] as string
    : '—'

  const runStatusColor = latestRun ? RUN_STATUS_COLOR[latestRun.status] : 'secondary' as const

  return (
    <Card elevation={0} sx={{ border: `1px solid ${GH_COLORS.neutral.border}` }}>
      <Accordion disableGutters elevation={0}>
        <AccordionSummary expandIcon={<i className='tabler-chevron-down' aria-hidden='true' />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <i className='tabler-sparkles' style={{ fontSize: 20 }} aria-hidden='true' />
            <Typography variant='h6'>{GH_AGENCY.advisory_title}</Typography>
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={runStatusColor}
              label={runStatusLabel}
              sx={{ height: 20, fontSize: '0.64rem', fontWeight: 600 }}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={4}>
            {/* KPI row */}
            <Grid container spacing={6}>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <HorizontalWithSubtitle
                  title={GH_AGENCY.advisory_kpi_enrichments}
                  stats={String(totals.total)}
                  avatarIcon='tabler-sparkles'
                  avatarColor='info'
                  subtitle={GH_AGENCY.advisory_tooltip_enrichments}
                  titleTooltip={GH_AGENCY.advisory_tooltip_enrichments}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <HorizontalWithSubtitle
                  title={GH_AGENCY.advisory_kpi_quality}
                  stats={formatQuality(totals.avgQualityScore)}
                  avatarIcon='tabler-chart-dots-3'
                  avatarColor={totals.avgQualityScore !== null && totals.avgQualityScore >= 70 ? 'success' : totals.avgQualityScore !== null && totals.avgQualityScore >= 40 ? 'warning' : 'secondary'}
                  subtitle='Puntaje 0–100'
                  titleTooltip={GH_AGENCY.advisory_tooltip_quality}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <HorizontalWithSubtitle
                  title={GH_AGENCY.advisory_kpi_succeeded}
                  stats={String(totals.succeeded)}
                  avatarIcon='tabler-check'
                  avatarColor='success'
                  subtitle={`de ${totals.total} totales`}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <HorizontalWithSubtitle
                  title={GH_AGENCY.advisory_kpi_failed}
                  stats={String(totals.failed)}
                  avatarIcon='tabler-alert-triangle'
                  avatarColor={totals.failed > 0 ? 'warning' : 'secondary'}
                  subtitle={totals.failed > 0 ? 'Requieren revisión' : 'Sin errores'}
                />
              </Grid>
            </Grid>

            {/* Latest run info */}
            {latestRun && (
              <Card
                elevation={0}
                sx={{ p: 2.5, border: `1px solid ${GH_COLORS.neutral.border}`, borderRadius: 2, bgcolor: 'background.paper' }}
              >
                <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', bgcolor: GH_COLORS.neutral.bgSurface }}>
                    <i className='tabler-player-play' style={{ fontSize: 18 }} aria-hidden='true' />
                  </Box>
                  <div>
                    <Typography variant='overline' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                      {GH_AGENCY.advisory_last_run}
                    </Typography>
                    <Stack direction='row' spacing={1} alignItems='center'>
                      <CustomChip
                        round='true'
                        size='small'
                        variant='tonal'
                        color={runStatusColor}
                        label={runStatusLabel}
                        sx={{ height: 20, fontSize: '0.64rem', fontWeight: 600 }}
                      />
                      <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                        {formatTimestamp(latestRun.startedAt)}
                      </Typography>
                      <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                        · {GH_AGENCY.advisory_signals_seen(latestRun.signalsSeen)} · {GH_AGENCY.advisory_signals_enriched(latestRun.signalsEnriched)}
                      </Typography>
                    </Stack>
                  </div>
                </Stack>
              </Card>
            )}

            {/* Last processed timestamp */}
            {lastProcessedAt && (
              <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                {GH_AGENCY.advisory_last_processed(formatTimestamp(lastProcessedAt))}
              </Typography>
            )}

            {/* Recent enrichments */}
            {recentEnrichments.length > 0 && (
              <div>
                <Typography variant='overline' sx={{ color: GH_COLORS.neutral.textSecondary, mb: 1.5, display: 'block' }}>
                  {GH_AGENCY.advisory_recent_title}
                </Typography>
                <Stack spacing={1.5}>
                  {recentEnrichments.map(item => (
                    <EnrichmentRow key={item.enrichmentId} item={item} />
                  ))}
                </Stack>
              </div>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Card>
  )
}

export default IcoAdvisoryBlock
