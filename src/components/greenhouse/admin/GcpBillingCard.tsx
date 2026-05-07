'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { ExecutiveCardShell } from '@/components/greenhouse'
import type {
  BillingExportAvailability,
  GcpBillingOverview
} from '@/types/billing-export'
import { formatNumber as formatGreenhouseNumber } from '@/lib/format'

interface Props {
  overview: GcpBillingOverview
}

const AVAILABILITY_LABEL: Record<BillingExportAvailability, string> = {
  configured: 'Activo',
  awaiting_data: 'Esperando datos',
  not_configured: 'Sin configurar',
  error: 'Error'
}

const AVAILABILITY_COLOR: Record<
  BillingExportAvailability,
  'success' | 'warning' | 'error' | 'info'
> = {
  configured: 'success',
  awaiting_data: 'info',
  not_configured: 'warning',
  error: 'error'
}

const formatCurrency = (value: number, currency: string): string => {
  if (!Number.isFinite(value)) return `${currency} —`

  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 100) / 100

  return `${currency} ${formatGreenhouseNumber(rounded, 'en-US')}`
}

const formatDate = (iso: string | null): string => {
  if (!iso) return 'sin dato'

  return iso.slice(0, 10)
}

const formatShare = (share: number): string => `${share.toFixed(1).replace(/\.0$/, '')}%`

const formatPercentDelta = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'sin baseline'

  return `${value > 0 ? '+' : ''}${Math.round(value)}%`
}

const toReadableList = (items: unknown[] | undefined): string[] =>
  (items ?? [])
    .map(item => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') return JSON.stringify(item)

      return ''
    })
    .filter(Boolean)
    .slice(0, 3)

const SpotlightRow = ({
  label,
  cost,
  share,
  currency
}: {
  label: string
  cost: number
  share: number
  currency: string
}) => (
  <Stack spacing={0.5}>
    <Stack direction='row' justifyContent='space-between' alignItems='baseline'>
      <Typography variant='body2'>{label}</Typography>
      <Typography variant='body2' sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {formatCurrency(cost, currency)}
      </Typography>
    </Stack>
    <LinearProgress
      variant='determinate'
      value={Math.min(100, Math.max(0, share))}
      color={share >= 50 ? 'warning' : 'primary'}
    />
    <Typography variant='caption' color='text.secondary'>
      {formatShare(share)} del total cloud
    </Typography>
  </Stack>
)

const GcpBillingCard = ({ overview }: Props) => {
  const availabilityColor = AVAILABILITY_COLOR[overview.availability]
  const isConfigured = overview.availability === 'configured'

  const topServices = overview.costByService.slice(0, 5)
  const topDrivers = overview.topDrivers?.slice(0, 3) ?? []
  const topResources = overview.costByResource?.slice(0, 5) ?? []

  return (
    <ExecutiveCardShell
      title='Costo cloud (Billing Export)'
      subtitle={`Lectura del dataset ${overview.source.dataset} con latencia natural ~24h.`}
      action={
        <Chip
          size='small'
          color={availabilityColor}
          label={AVAILABILITY_LABEL[overview.availability]}
        />
      }
    >
      {!isConfigured ? (
        <Card variant='outlined'>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant='body2'>
                {overview.error ?? overview.notes[0] ?? 'Billing Export no rinde datos todavía.'}
              </Typography>
              {overview.notes.length > 1 && (
                <Stack spacing={0.5}>
                  {overview.notes.slice(1).map(note => (
                    <Typography key={note} variant='caption' color='text.secondary'>
                      · {note}
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
                Total {overview.period.days} días
              </Typography>
              <Typography variant='h5' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(overview.totalCost, overview.currency)}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {overview.period.startDate} → {overview.period.endDate} · último día:{' '}
                {formatDate(overview.source.latestUsageDate)}
              </Typography>
            </Stack>
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              {overview.spotlights.cloudRun && (
                <Chip
                  size='small'
                  variant='outlined'
                  label={`Cloud Run · ${formatCurrency(
                    overview.spotlights.cloudRun.cost,
                    overview.currency
                  )}`}
                />
              )}
              {overview.spotlights.bigQuery && (
                <Chip
                  size='small'
                  variant='outlined'
                  label={`BigQuery · ${formatCurrency(
                    overview.spotlights.bigQuery.cost,
                    overview.currency
                  )}`}
                />
              )}
              {overview.spotlights.cloudSql && (
                <Chip
                  size='small'
                  variant='outlined'
                  label={`Cloud SQL · ${formatCurrency(
                    overview.spotlights.cloudSql.cost,
                    overview.currency
                  )}`}
                />
              )}
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
                      Proyección mensual
                    </Typography>
                    <Typography variant='h6' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(overview.forecast.monthEndCost, overview.currency)}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Promedio diario {formatCurrency(
                        overview.forecast.averageDailyCost,
                        overview.currency
                      )} · {overview.forecast.observedCompleteDays} días completos · confianza{' '}
                      {overview.forecast.confidence}
                    </Typography>
                  </Stack>
                  <Chip
                    size='small'
                    color={overview.forecast.confidence === 'high' ? 'success' : 'warning'}
                    label={
                      overview.forecast.method === 'current_month_daily_average'
                        ? 'Mes actual'
                        : 'Rolling period'
                    }
                    sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
                  />
                </Stack>
              </CardContent>
            </Card>
          )}

          {topDrivers.length > 0 && (
            <Stack spacing={1.5}>
              <Typography variant='overline' color='text.secondary'>
                Alertas tempranas
              </Typography>
              {topDrivers.map(driver => (
                <Alert
                  key={driver.driverId}
                  severity={driver.severity === 'error' ? 'error' : 'warning'}
                  variant='outlined'
                >
                  <Stack spacing={0.5}>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {driver.summary}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {driver.resourceName ? `${driver.resourceName} · ` : ''}
                      {driver.evidence.map(item => `${item.label}: ${item.value}`).join(' · ')}
                    </Typography>
                  </Stack>
                </Alert>
              ))}
            </Stack>
          )}

          {overview.aiCopilot && (
            <Card variant='outlined'>
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={1.25}>
                  <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
                    <Typography variant='overline' color='text.secondary'>
                      Copiloto FinOps AI
                    </Typography>
                    <Chip
                      size='small'
                      color={
                        overview.aiCopilot.severity === 'error'
                          ? 'error'
                          : overview.aiCopilot.severity === 'warning'
                            ? 'warning'
                            : 'success'
                      }
                      label={`Confianza ${overview.aiCopilot.confidence}`}
                    />
                  </Stack>
                  <Typography variant='body2'>{overview.aiCopilot.executiveSummary}</Typography>
                  {toReadableList(overview.aiCopilot.attackPriority).length > 0 && (
                    <Stack spacing={0.5}>
                      {toReadableList(overview.aiCopilot.attackPriority).map(item => (
                        <Typography key={item} variant='caption' color='text.secondary'>
                          - {item}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                  <Typography variant='caption' color='text.secondary'>
                    Observado: {formatDate(overview.aiCopilot.observedAt)} · modelo{' '}
                    {overview.aiCopilot.model}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          )}

          <Stack spacing={1.5}>
            <Typography variant='overline' color='text.secondary'>
              Top servicios
            </Typography>
            {topServices.length === 0 ? (
              <Typography variant='caption' color='text.secondary'>
                No hay servicios con costo en el período observado.
              </Typography>
            ) : (
              topServices.map(service => (
                <Stack key={service.serviceId || service.serviceDescription} spacing={0.5}>
                  <SpotlightRow
                    label={service.serviceDescription}
                    cost={service.cost}
                    share={
                      service.share ??
                      (overview.totalCost > 0 ? (service.cost / overview.totalCost) * 100 : 0)
                    }
                    currency={overview.currency}
                  />
                  {service.deltaPercent !== undefined && (
                    <Typography variant='caption' color='text.secondary'>
                      {service.serviceDescription}: reciente{' '}
                      {formatCurrency(service.recentDailyCost ?? 0, overview.currency)} diario vs
                      baseline {formatCurrency(service.baselineDailyCost ?? 0, overview.currency)} (
                      {formatPercentDelta(service.deltaPercent)})
                    </Typography>
                  )}
                </Stack>
              ))
            )}
          </Stack>

          {topResources.length > 0 && (
            <Box>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.25}>
                <Typography variant='overline' color='text.secondary'>
                  Recursos que explican el gasto
                </Typography>
                {topResources.map(resource => (
                  <Stack
                    key={`${resource.serviceDescription}-${resource.skuDescription}-${resource.resourceName}`}
                    spacing={0.25}
                  >
                    <Stack direction='row' justifyContent='space-between' gap={2}>
                      <Typography variant='body2' sx={{ fontWeight: 600 }}>
                        {resource.resourceName}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatCurrency(resource.cost, overview.currency)}
                      </Typography>
                    </Stack>
                    <Typography variant='caption' color='text.secondary'>
                      {resource.serviceDescription} · {resource.skuDescription} · {formatShare(resource.share)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}

          {overview.spotlights.notionBqSync && (
            <Box>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1}>
                <Stack direction='row' justifyContent='space-between' alignItems='baseline'>
                  <Typography variant='overline' color='text.secondary'>
                    Spotlight notion-bq-sync
                  </Typography>
                  <Chip
                    size='small'
                    variant='outlined'
                    label={
                      overview.spotlights.notionBqSync.detected
                        ? 'Atribución por label'
                        : 'Aproximación por servicio'
                    }
                  />
                </Stack>
                <Stack direction='row' justifyContent='space-between' alignItems='baseline'>
                  <Typography variant='body2'>
                    Costo {overview.period.days} días
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatCurrency(overview.spotlights.notionBqSync.cost, overview.currency)}
                  </Typography>
                </Stack>
                <Typography variant='caption' color='text.secondary'>
                  {overview.spotlights.notionBqSync.detected
                    ? `${formatShare(overview.spotlights.notionBqSync.share)} del total cloud, atribuido vía label cloud-run-resource-name=notion-bq-sync.`
                    : 'Atribución exacta requiere label cloud-run-resource-name. Mientras tanto, se aproxima vía Cloud Run + Logging + Monitoring.'}
                </Typography>
              </Stack>
            </Box>
          )}

          {overview.notes.length > 0 && (
            <Stack spacing={0.5}>
              {overview.notes.map(note => (
                <Typography key={note} variant='caption' color='text.secondary'>
                  · {note}
                </Typography>
              ))}
            </Stack>
          )}
        </Stack>
      )}
    </ExecutiveCardShell>
  )
}

export default GcpBillingCard
