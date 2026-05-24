'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { ExecutiveCardShell } from '@/components/greenhouse'
import { GH_GITHUB_BILLING_COPY } from '@/lib/copy/github-billing'
import { formatNumber as formatGreenhouseNumber } from '@/lib/format'
import type { GitHubBillingAvailability, GitHubBillingOverview } from '@/types/github-billing'

interface Props {
  overview: GitHubBillingOverview
}

const AVAILABILITY_COLOR: Record<
  GitHubBillingAvailability,
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

const formatQuantity = (value: number | null, unit: string): string => {
  if (value === null || !Number.isFinite(value)) return `sin ${unit}`

  return `${formatGreenhouseNumber(Math.round(value * 100) / 100, 'en-US')} ${unit}`
}

const formatDate = (iso: string | null): string => iso?.slice(0, 10) || 'sin dato'

const formatShare = (share: number): string => `${share.toFixed(1).replace(/\.0$/, '')}%`

const CostRow = ({
  label,
  detail,
  grossAmount,
  netAmount,
  share,
  currency
}: {
  label: string
  detail?: string | null
  grossAmount: number
  netAmount: number
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
      <Stack spacing={0.25} alignItems='flex-end'>
        <Typography variant='body2' sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(grossAmount, currency)}
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
          net {formatCurrency(netAmount, currency)}
        </Typography>
      </Stack>
    </Stack>
    <LinearProgress
      variant='determinate'
      value={Math.min(100, Math.max(0, share))}
      color={share >= 50 ? 'warning' : 'primary'}
    />
    <Typography variant='caption' color='text.secondary'>
      {formatShare(share)} del gross GitHub observado
    </Typography>
  </Stack>
)

const GitHubBillingCard = ({ overview }: Props) => {
  const isConfigured = overview.availability === 'configured'
  const topSkus = overview.bySku.slice(0, 5)
  const topRepos = overview.byRepository.slice(0, 5)
  const forecastStatus = overview.forecast?.thresholdStatus ?? 'unconfigured'

  return (
    <ExecutiveCardShell
      title={GH_GITHUB_BILLING_COPY.title}
      subtitle={GH_GITHUB_BILLING_COPY.subtitle}
      action={
        <Chip
          size='small'
          color={AVAILABILITY_COLOR[overview.availability]}
          label={GH_GITHUB_BILLING_COPY.status[overview.availability]}
        />
      }
    >
      {!isConfigured ? (
        <Card variant='outlined'>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant='body2'>
                {overview.error ?? overview.notes[0] ?? GH_GITHUB_BILLING_COPY.unavailableFallback}
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
                {GH_GITHUB_BILLING_COPY.totalLabel(overview.period.startDate, overview.period.endDate)}
              </Typography>
              <Typography variant='h5' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(overview.totalGrossAmount, overview.currency)}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Net facturable {formatCurrency(overview.totalNetAmount, overview.currency)} ·{' '}
                {GH_GITHUB_BILLING_COPY.latestLabel(formatDate(overview.source.latestUsageDate))}
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

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <Card variant='outlined' sx={{ flex: 1 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={0.75}>
                  <Typography variant='overline' color='text.secondary'>
                    {GH_GITHUB_BILLING_COPY.actionsTitle}
                  </Typography>
                  <Typography variant='h6' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(overview.actions.grossAmount, overview.currency)}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {formatQuantity(overview.actions.minutes, 'min')} ·{' '}
                    {formatQuantity(overview.actions.storageGigabyteHours, 'GB-h')} · top repo{' '}
                    {overview.actions.topRepository ?? 'sin dato'}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            {overview.forecast && (
              <Card variant='outlined' sx={{ flex: 1 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={0.75}>
                    <Typography variant='overline' color='text.secondary'>
                      {GH_GITHUB_BILLING_COPY.forecastTitle}
                    </Typography>
                    <Typography variant='h6' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      Gross {formatCurrency(overview.forecast.monthEndGrossAmount, overview.currency)}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Net {formatCurrency(overview.forecast.monthEndNetAmount, overview.currency)} ·{' '}
                      {overview.forecast.observedCompleteDays} dias completos · confianza{' '}
                      {overview.forecast.confidence}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>

          <Card variant='outlined'>
            <CardContent sx={{ p: 2.5 }}>
              <Stack spacing={1}>
                <Typography variant='overline' color='text.secondary'>
                  {GH_GITHUB_BILLING_COPY.guardrailsTitle}
                </Typography>
                <Typography variant='body2'>
                  {overview.guardrails.spikeSummary ??
                    (forecastStatus === 'unconfigured'
                      ? GH_GITHUB_BILLING_COPY.thresholdsUnconfigured
                      : GH_GITHUB_BILLING_COPY.spikeClear)}
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
                {GH_GITHUB_BILLING_COPY.topSkusTitle}
              </Typography>
              {topSkus.map(sku => (
                <CostRow
                  key={`${sku.product}-${sku.sku}`}
                  label={sku.sku}
                  detail={`${sku.product}${sku.unitType ? ` · ${sku.unitType}` : ''}`}
                  grossAmount={sku.grossAmount}
                  netAmount={sku.netAmount}
                  share={sku.share}
                  currency={overview.currency}
                />
              ))}
            </Stack>

            <Stack spacing={1.5} flex={1} minWidth={0}>
              <Typography variant='overline' color='text.secondary'>
                {GH_GITHUB_BILLING_COPY.topReposTitle}
              </Typography>
              {topRepos.map(repo => (
                <CostRow
                  key={repo.repositoryName}
                  label={repo.repositoryName}
                  grossAmount={repo.grossAmount}
                  netAmount={repo.netAmount}
                  share={repo.share}
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

export default GitHubBillingCard
