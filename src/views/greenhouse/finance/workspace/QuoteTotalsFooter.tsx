'use client'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import type { PricingEngineOutputV2, PricingOutputCurrency } from '@/lib/finance/pricing/contracts'
import { formatCurrency as formatGreenhouseCurrency, formatNumber as formatGreenhouseNumber, formatPercent as formatGreenhousePercent } from '@/lib/format'

const TASK407_ARIA_CALCULANDO_PRECIOS = "Calculando precios"


const CURRENCY_LOCALE: Record<PricingOutputCurrency, string> = {
  CLP: 'es-CL',
  USD: 'en-US',
  CLF: 'es-CL',
  COP: 'es-CO',
  MXN: 'es-MX',
  PEN: 'es-PE'
}

const formatMoney = (amount: number, currency: PricingOutputCurrency): string => {
  const locale = CURRENCY_LOCALE[currency] ?? 'es-CL'

  try {
    return formatGreenhouseCurrency(amount, currency, {
  maximumFractionDigits: 0
}, locale)
  } catch {
    return `${formatGreenhouseNumber(amount, {
  maximumFractionDigits: 2
}, locale)} ${currency}`
  }
}

const formatPct = (value: number): string =>
  formatGreenhousePercent(value, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
}, 'es-CL')

const classificationMeta: Record<
  PricingEngineOutputV2['aggregateMargin']['classification'],
  { label: string; icon: string; color: 'success' | 'warning' | 'error' }
> = {
  healthy: { label: 'Saludable', icon: 'tabler-circle-check', color: 'success' },
  warning: { label: 'Atención', icon: 'tabler-alert-circle', color: 'warning' },
  critical: { label: 'Crítico', icon: 'tabler-alert-triangle', color: 'error' }
}

export interface QuoteTotalsFooterProps {
  output: PricingEngineOutputV2 | null
  outputCurrency: PricingOutputCurrency
  loading?: boolean
  error?: string | null
}

/**
 * Footer sticky con totales del engine v2 (subtotal / overhead / total) en USD
 * y en la moneda output, multipliers aplicados, y chip de salud del margen
 * agregado (healthy / warning / critical).
 */
const QuoteTotalsFooter = ({ output, outputCurrency, loading = false, error = null }: QuoteTotalsFooterProps) => {
  const theme = useTheme()

  if (error) {
    return (
      <Box
        role='alert'
        sx={t => ({
          position: 'sticky',
          bottom: 0,
          bgcolor: t.palette.background.paper,
          borderTop: `1px solid ${t.palette.error.main}`,
          p: 3
        })}
      >
        <Typography variant='body2' color='error'>
          {error}
        </Typography>
      </Box>
    )
  }

  if (!output && !loading) {
    return (
      <Box
        sx={t => ({
          position: 'sticky',
          bottom: 0,
          bgcolor: t.palette.background.paper,
          borderTop: `1px solid ${t.palette.divider}`,
          p: 3
        })}
      >
        <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center' }}>
          Agrega ítems para calcular el total.
        </Typography>
      </Box>
    )
  }

  const totals = output?.totals
  const aggregate = output?.aggregateMargin
  const meta = aggregate ? classificationMeta[aggregate.classification] : null
  const palette = meta ? theme.palette[meta.color] : null

  return (
    <Box
      component='footer'
      role='contentinfo'
      sx={t => ({
        position: 'sticky',
        bottom: 0,
        bgcolor: t.palette.background.paper,
        borderTop: `1px solid ${t.palette.divider}`,
        px: 3,
        py: 2
      })}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ md: 'center' }}
        justifyContent='space-between'
      >
        <Stack direction='row' spacing={3} flexWrap='wrap'>
          <TotalsBlock
            label='Subtotal'
            primary={loading ? null : formatMoney(totals?.totalOutputCurrency ?? 0, outputCurrency)}
            secondary={loading ? null : formatMoney(totals?.subtotalUsd ?? 0, 'USD')}
          />
          <TotalsBlock
            label='Overhead'
            primary={loading ? null : formatMoney(totals?.overheadUsd ?? 0, 'USD')}
            secondary={
              totals
                ? `Mult × ${totals.commercialMultiplierApplied.toFixed(2)} · País × ${totals.countryFactorApplied.toFixed(2)}`
                : null
            }
          />
          <TotalsBlock
            label='Total'
            primary={loading ? null : formatMoney(totals?.totalOutputCurrency ?? 0, outputCurrency)}
            secondary={loading ? null : formatMoney(totals?.totalUsd ?? 0, 'USD')}
            emphasized
          />
        </Stack>

        {meta && aggregate ? (
          <Stack direction='row' spacing={2} alignItems='center'>
            {output?.warnings?.length ? (
              <Typography
                variant='caption'
                color='warning.main'
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <i className='tabler-alert-circle' aria-hidden='true' />
                {output.warnings.length} {output.warnings.length === 1 ? 'advertencia' : 'advertencias'}
              </Typography>
            ) : null}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.75,
                borderRadius: 1,
                bgcolor: palette ? alpha(palette.main, 0.12) : undefined,
                color: palette ? palette.main : undefined,
                border: palette ? `1px solid ${alpha(palette.main, 0.24)}` : undefined
              }}
              aria-label={`Margen ${formatPct(aggregate.marginPct)} — ${meta.label}`}
            >
              <i className={meta.icon} aria-hidden='true' style={{ fontSize: 16 }} />
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                {formatPct(aggregate.marginPct)} · {meta.label}
              </Typography>
            </Box>
          </Stack>
        ) : loading ? (
          <CircularProgress size={20} aria-label={TASK407_ARIA_CALCULANDO_PRECIOS} />
        ) : null}
      </Stack>
    </Box>
  )
}

const TotalsBlock = ({
  label,
  primary,
  secondary,
  emphasized = false
}: {
  label: string
  primary: string | null
  secondary: string | null
  emphasized?: boolean
}) => (
  <Box>
    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}
    </Typography>
    {primary === null ? (
      <Skeleton variant='text' width={120} height={28} />
    ) : (
      <Typography
        variant={emphasized ? 'h6' : 'body1'}
        sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: emphasized ? 600 : 500, lineHeight: 1.2 }}
      >
        {primary}
      </Typography>
    )}
    {secondary ? (
      <Typography variant='caption' color='text.secondary'>
        {secondary}
      </Typography>
    ) : null}
  </Box>
)

export { formatMoney as formatOutputMoney }
export default QuoteTotalsFooter
