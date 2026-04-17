'use client'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

interface QuoteHealthAlert {
  level: 'error' | 'warning' | 'info'
  code: string
  message: string
  requiredApproval?: 'finance' | null
}

export interface QuoteHealthCardProps {
  quotationId: string
  businessLineCode: string | null
  currency: string
  totalPrice: number | null
  totalDiscount: number | null
  effectiveMarginPct: number | null
  targetMarginPct: number | null
  floorMarginPct: number | null
  alerts: QuoteHealthAlert[]
  canRequestApproval: boolean
  onRequestApproval?: () => void
}

type HealthStatus = 'healthy' | 'watch' | 'critical' | 'unknown'

type SemanticColor = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary'

const formatCurrency = (amount: number | null, currency: string): string => {
  if (amount === null) return '—'

  try {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount)
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString('es-CL')}`
  }
}

const formatPercent = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) return '—'

  return `${value.toFixed(1)}%`
}

const resolveStatus = (
  effective: number | null,
  target: number | null,
  floor: number | null
): HealthStatus => {
  if (effective === null) return 'unknown'
  if (floor !== null && effective < floor) return 'critical'
  if (target !== null && effective < target) return 'watch'

  return 'healthy'
}

const STATUS_META: Record<HealthStatus, { label: string; color: SemanticColor; icon: string; headline: string }> = {
  healthy: {
    label: 'Óptimo',
    color: 'success',
    icon: 'tabler-shield-check',
    headline: 'Margen sobre el objetivo'
  },
  watch: {
    label: 'Atención',
    color: 'warning',
    icon: 'tabler-alert-triangle',
    headline: 'Margen bajo el objetivo pero sobre el piso'
  },
  critical: {
    label: 'Crítico',
    color: 'error',
    icon: 'tabler-flame',
    headline: 'Margen bajo el piso autorizado'
  },
  unknown: {
    label: 'Sin datos',
    color: 'secondary',
    icon: 'tabler-help',
    headline: 'Aún sin margen calculado'
  }
}

const buildSubheader = (target: number | null, floor: number | null): string => {
  const parts: string[] = []

  if (target !== null) parts.push(`Objetivo ${formatPercent(target)}`)
  if (floor !== null) parts.push(`Piso ${formatPercent(floor)}`)
  if (parts.length === 0) return 'Sin umbrales definidos para esta línea'

  return parts.join(' · ')
}

const QuoteHealthCard = ({
  businessLineCode,
  currency,
  totalPrice,
  totalDiscount,
  effectiveMarginPct,
  targetMarginPct,
  floorMarginPct,
  alerts,
  canRequestApproval,
  onRequestApproval
}: QuoteHealthCardProps) => {
  const status = resolveStatus(effectiveMarginPct, targetMarginPct, floorMarginPct)
  const meta = STATUS_META[status]
  const requiresFinanceApproval = alerts.some(alert => alert.requiredApproval === 'finance')
  const showRequestApproval = requiresFinanceApproval && canRequestApproval && onRequestApproval !== undefined

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardHeader
        title='Salud de margen'
        subheader={buildSubheader(targetMarginPct, floorMarginPct)}
        avatar={
          <Avatar variant='rounded' sx={{ bgcolor: `${meta.color}.lightOpacity` }}>
            <i className={meta.icon} style={{ fontSize: 22, color: `var(--mui-palette-${meta.color}-main)` }} />
          </Avatar>
        }
        action={
          <CustomChip
            round='true'
            size='small'
            variant='tonal'
            color={meta.color}
            label={meta.label}
          />
        }
      />
      <Divider />
      <CardContent>
        {status === 'unknown' ? (
          <Stack spacing={1} sx={{ py: 2 }}>
            <Typography variant='body2' color='text.secondary'>
              Aún sin margen calculado. Agrega ítems o ajusta costos para ver la salud de esta cotización.
            </Typography>
            {businessLineCode && (
              <Typography variant='caption' color='text.secondary'>
                Línea de negocio: {businessLineCode}
              </Typography>
            )}
          </Stack>
        ) : (
          <Stack spacing={3}>
            <Box>
              <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {meta.headline}
              </Typography>
              <Typography variant='h4' sx={{ mt: 0.5, color: `${meta.color}.main`, fontWeight: 500 }}>
                {formatPercent(effectiveMarginPct)}
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>Margen efectivo</Typography>
                <Typography variant='body1' sx={{ fontWeight: 500 }}>
                  {formatPercent(effectiveMarginPct)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>Objetivo</Typography>
                <Typography variant='body1' sx={{ fontWeight: 500 }}>
                  {formatPercent(targetMarginPct)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>Piso</Typography>
                <Typography variant='body1' sx={{ fontWeight: 500 }}>
                  {formatPercent(floorMarginPct)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>Descuento total</Typography>
                <Typography variant='body1' sx={{ fontWeight: 500 }}>
                  {totalDiscount && totalDiscount > 0 ? formatCurrency(totalDiscount, currency) : formatCurrency(0, currency)}
                </Typography>
              </Grid>
            </Grid>

            {totalPrice !== null && (
              <Typography variant='caption' color='text.secondary'>
                Precio total: {formatCurrency(totalPrice, currency)}
              </Typography>
            )}

            {alerts.length > 0 && (
              <Stack spacing={1.5}>
                {alerts.map(alert => (
                  <Alert key={alert.code} severity={alert.level} icon={false} role='status'>
                    <Typography variant='body2'>{alert.message}</Typography>
                    {alert.requiredApproval === 'finance' && (
                      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
                        Requiere aprobación de Finanzas antes de enviar.
                      </Typography>
                    )}
                  </Alert>
                ))}
              </Stack>
            )}

            {showRequestApproval && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant='contained'
                  color='warning'
                  startIcon={<i className='tabler-shield-check' />}
                  onClick={onRequestApproval}
                >
                  Solicitar aprobación
                </Button>
              </Box>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

export default QuoteHealthCard
