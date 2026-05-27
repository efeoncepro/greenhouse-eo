'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { ExecutiveCardShell } from '@/components/greenhouse'
import { GH_VERCEL_BILLING_COPY } from '@/lib/copy/vercel-billing'
import { formatNumber as formatGreenhouseNumber } from '@/lib/format'
import type { VercelBillingAvailability, VercelBillingOverview } from '@/types/vercel-billing'

interface Props {
  overview: VercelBillingOverview
}

const AVAILABILITY_COLOR: Record<
  VercelBillingAvailability,
  'success' | 'warning' | 'error' | 'info'
> = {
  configured: 'success',
  awaiting_data: 'info',
  not_configured: 'warning',
  error: 'error'
}

const THRESHOLD_COLOR: Record<'ok' | 'warning' | 'critical' | 'unconfigured', 'success' | 'warning' | 'error' | 'info'> = {
  ok: 'success',
  warning: 'warning',
  critical: 'error',
  unconfigured: 'info'
}

const formatCurrency = (value: number, currency: string): string => {
  if (!Number.isFinite(value)) return `${currency} -`

  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 100) / 100

  return `${currency} ${formatGreenhouseNumber(rounded, 'en-US')}`
}

const formatDate = (iso: string | null): string => iso?.slice(0, 10) || 'sin dato'

const formatShare = (share: number): string => `${share.toFixed(1).replace(/\.0$/, '')}%`

const CostRow = ({
  label,
  detail,
  value,
  share,
  currency
}: {
  label: string
  detail?: string | null
  value: number
  share: number
  currency: string
}) => (
  <Stack spacing={0.5}>
    <Stack direction='row' justifyContent='space-between' alignItems='baseline' gap={2}>
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        <Typography variant='body2' noWrap>
          {label}
        </Typography>
        {detail && (
          <Typography variant='caption' color='text.secondary' noWrap>
            {detail}
          </Typography>
        )}
      </Stack>
      <Typography variant='body2' sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {formatCurrency(value, currency)}
      </Typography>
    </Stack>
    <LinearProgress
      variant='determinate'
      value={Math.min(100, Math.max(0, share))}
      color={share >= 50 ? 'warning' : 'primary'}
    />
    <Typography variant='caption' color='text.secondary'>
      {formatShare(share)} del total Vercel
    </Typography>
  </Stack>
)

const VercelBillingCard = ({ overview }: Props) => {
  const isConfigured = overview.availability === 'configured'
  const topServices = overview.costByService.slice(0, 5)
  const topProjects = overview.costByProject.slice(0, 5)
  const forecastStatus = overview.forecast?.thresholdStatus ?? 'unconfigured'

  return (
    <ExecutiveCardShell
      title={GH_VERCEL_BILLING_COPY.title}
      subtitle={GH_VERCEL_BILLING_COPY.subtitle}
      action={
        <Chip
          size='small'
          color={AVAILABILITY_COLOR[overview.availability]}
          label={GH_VERCEL_BILLING_COPY.status[overview.availability]}
        />
      }
    >
      {!isConfigured ? (
        <Card variant='outlined'>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant='body2'>
                {overview.error ?? overview.notes[0] ?? GH_VERCEL_BILLING_COPY.unavailableFallback}
              </Typography>
              {overview.notes.length > 1 && (
                <Stack spacing={0.5}>
                  {overview.notes.slice(1).map(note => (
                    <Typography key={note} variant='caption' color='text.secondary'>
                      - {note}
                    </Typography>
                  ))}
                </Stack>
              )}
              <Typography variant='caption' color='text.secondary'>
                Generado: {overview.generatedAt}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent='space-between'
          >
            <Stack spacing={0.5}>
              <Typography variant='overline' color='text.secondary'>
                {GH_VERCEL_BILLING_COPY.totalLabel(overview.period.days)}
              </Typography>
              <Typography variant='h5' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(overview.totalBilledCost, overview.currency)}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {GH_VERCEL_BILLING_COPY.periodLabel(
                  overview.period.startDate,
                  overview.period.endDate,
                  formatDate(overview.source.latestChargeDate)
                )}
              </Typography>
            </Stack>
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              <Chip
                size='small'
                variant='outlined'
                color={THRESHOLD_COLOR[forecastStatus]}
                label={`Forecast ${forecastStatus}`}
              />
              <Chip
                size='small'
                variant='outlined'
                color={THRESHOLD_COLOR[overview.guardrails.spikeSeverity]}
                label={`Spike ${overview.guardrails.spikeSeverity}`}
              />
            </Stack>
          </Stack>

          <Divider />

          {overview.forecast && (
            <Card variant='outlined'>
              <CardContent sx={{ p: 2.5 }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  justifyContent='space-between'
                >
                  <Stack spacing={0.5}>
                    <Typography variant='overline' color='text.secondary'>
                      {GH_VERCEL_BILLING_COPY.forecastTitle}
                    </Typography>
                    <Typography variant='h6' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(overview.forecast.monthEndBilledCost, overview.currency)}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Promedio diario{' '}
                      {formatCurrency(overview.forecast.averageDailyBilledCost, overview.currency)} ·{' '}
                      {overview.forecast.observedCompleteDays} dias completos · confianza{' '}
                      {overview.forecast.confidence}
                    </Typography>
                  </Stack>
                  <Chip
                    size='small'
                    color={THRESHOLD_COLOR[forecastStatus]}
                    label={
                      forecastStatus === 'unconfigured'
                        ? 'Sin umbral'
                        : forecastStatus === 'critical'
                          ? 'Critico'
                          : forecastStatus === 'warning'
                            ? 'Atencion'
                            : 'Dentro de umbral'
                    }
                    sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
                  />
                </Stack>
              </CardContent>
            </Card>
          )}

          <Card variant='outlined'>
            <CardContent sx={{ p: 2.5 }}>
              <Stack spacing={1}>
                <Typography variant='overline' color='text.secondary'>
                  {GH_VERCEL_BILLING_COPY.guardrailsTitle}
                </Typography>
                <Typography variant='body2'>
                  {overview.guardrails.spikeSummary ??
                    (forecastStatus === 'unconfigured'
                      ? GH_VERCEL_BILLING_COPY.thresholdsUnconfigured
                      : GH_VERCEL_BILLING_COPY.spikeClear)}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Warning mensual:{' '}
                  {overview.guardrails.monthlyWarnUsd
                    ? formatCurrency(overview.guardrails.monthlyWarnUsd, overview.currency)
                    : 'sin configurar'}{' '}
                  · Critical mensual:{' '}
                  {overview.guardrails.monthlyCriticalUsd
                    ? formatCurrency(overview.guardrails.monthlyCriticalUsd, overview.currency)
                    : 'sin configurar'}{' '}
                  · Spike diario:{' '}
                  {overview.guardrails.dailySpikePct ? `${overview.guardrails.dailySpikePct}%` : 'sin configurar'}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
            <Stack spacing={1.5} flex={1} minWidth={0}>
              <Typography variant='overline' color='text.secondary'>
                {GH_VERCEL_BILLING_COPY.topServicesTitle}
              </Typography>
              {topServices.map(service => (
                <CostRow
                  key={`${service.serviceName}-${service.serviceCategory ?? 'none'}`}
                  label={service.serviceName}
                  detail={service.serviceCategory}
                  value={service.billedCost}
                  share={service.share}
                  currency={overview.currency}
                />
              ))}
            </Stack>

            <Stack spacing={1.5} flex={1} minWidth={0}>
              <Typography variant='overline' color='text.secondary'>
                {GH_VERCEL_BILLING_COPY.topProjectsTitle}
              </Typography>
              {topProjects.map(project => (
                <CostRow
                  key={project.projectId ?? project.projectName}
                  label={project.projectName}
                  detail={project.projectId}
                  value={project.billedCost}
                  share={project.share}
                  currency={overview.currency}
                />
              ))}
            </Stack>
          </Stack>
        </Stack>
      )}
    </ExecutiveCardShell>
  )
}

export default VercelBillingCard
