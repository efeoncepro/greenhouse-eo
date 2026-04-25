'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { ExecutiveCardShell } from '@/components/greenhouse'
import type {
  BillingExportAvailability,
  GcpBillingOverview
} from '@/types/billing-export'

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

  return `${currency} ${rounded.toLocaleString('en-US')}`
}

const formatDate = (iso: string | null): string => {
  if (!iso) return 'sin dato'

  return iso.slice(0, 10)
}

const formatShare = (share: number): string => `${share.toFixed(1).replace(/\.0$/, '')}%`

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
                <SpotlightRow
                  key={service.serviceId || service.serviceDescription}
                  label={service.serviceDescription}
                  cost={service.cost}
                  share={overview.totalCost > 0 ? (service.cost / overview.totalCost) * 100 : 0}
                  currency={overview.currency}
                />
              ))
            )}
          </Stack>

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
