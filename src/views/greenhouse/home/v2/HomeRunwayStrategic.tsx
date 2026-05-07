'use client'

import { useMemo } from 'react'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

import type { ApexOptions } from 'apexcharts'
import { useTheme } from '@mui/material/styles'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'
import type { ThemeColor } from '@core/types'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import { motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

import type { HomeRunwayData } from '@/lib/home/contract'
import { formatCurrency as formatGreenhouseCurrency, formatTime as formatGreenhouseTime } from '@/lib/format'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })

interface HomeRunwayStrategicProps {
  data: HomeRunwayData
}

const STATUS_TONE: Record<NonNullable<HomeRunwayData['status']>, { color: ThemeColor; label: string; icon: string }> = {
  optimal: { color: 'success', label: 'Óptimo', icon: 'tabler-circle-check' },
  attention: { color: 'warning', label: 'Atención', icon: 'tabler-alert-circle' },
  critical: { color: 'error', label: 'Crítico', icon: 'tabler-alert-triangle' },
  unknown: { color: 'secondary', label: '—', icon: 'tabler-circle-dotted' }
}

const formatCash = (amount: number | null, currency: HomeRunwayData['cashCurrency']): string => {
  if (amount == null) return '—'

  return formatGreenhouseCurrency(amount, currency, {
  maximumFractionDigits: 0,
  notation: amount >= 1_000_000 ? 'compact' : 'standard'
}, 'es-CL')
}

const formatBurn = (amount: number | null, currency: HomeRunwayData['cashCurrency']): string => {
  if (amount == null) return '—'

  return formatGreenhouseCurrency(amount, currency, {
  maximumFractionDigits: 0,
  notation: 'compact'
}, 'es-CL')
}

const isCritical = (status: HomeRunwayData['status']): boolean => status === 'critical'

/**
 * Smart Home v2 — Runway / Cash Position card (CEO + finance).
 *
 * Pattern: Vuexy `StatsWithAreaChart` extended with CEO-grade hierarchy:
 *   - h2 tabular-nums runway months (the primary number a CEO needs)
 *   - sparkline 6mo of running cash position
 *   - cash + burn caption row
 *   - status pill semaphore (optimal/attention/critical)
 *   - drill CTA to /finance with View Transitions API
 *
 * Capability gate: composer drops the block server-side when the user
 * lacks `home.runway`. Payload never reaches the wire.
 */
export const HomeRunwayStrategic = ({ data }: HomeRunwayStrategicProps) => {
  const theme = useTheme()
  const router = useRouter()
  const reduced = useReducedMotion()
  const tone = STATUS_TONE[data.status]
  const critical = isCritical(data.status)

  const series = useMemo<ApexOptions['series']>(() => {
    if (data.monthlyHistory.length === 0) return [{ name: 'Cash', data: [0, 0] }]

    return [
      {
        name: 'Cash',
        data: data.monthlyHistory.map(h => h.cash)
      }
    ]
  }, [data.monthlyHistory])

  const sparklineOptions = useMemo<ApexOptions>(() => ({
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false },
      sparkline: { enabled: true },
      animations: { enabled: !reduced, easing: 'easeout', speed: 600 }
    },
    tooltip: { enabled: false },
    dataLabels: { enabled: false },
    stroke: { width: 2.5, curve: 'smooth' },
    grid: { show: false, padding: { bottom: 12 } },
    fill: {
      type: 'gradient',
      gradient: {
        opacityTo: 0,
        opacityFrom: 1,
        shadeIntensity: 1,
        stops: [0, 100],
        colorStops: [
          [
            { offset: 0, opacity: 0.45, color: theme.palette[tone.color].main },
            { offset: 100, opacity: 0.08, color: 'var(--mui-palette-background-paper)' }
          ]
        ]
      }
    },
    theme: {
      monochrome: {
        enabled: true,
        shadeTo: 'light',
        shadeIntensity: 1,
        color: theme.palette[tone.color].main
      }
    },
    xaxis: { labels: { show: false }, axisTicks: { show: false }, axisBorder: { show: false } },
    yaxis: { show: false }
  }), [theme.palette, tone.color, reduced])

  const handleDrill = () => {
    if (!data.drillHref) return
    type DocVT = Document & { startViewTransition?: (cb: () => void) => unknown }
    const docVT = document as DocVT

    if (typeof docVT.startViewTransition === 'function') {
      docVT.startViewTransition(() => router.push(data.drillHref!))
    } else {
      router.push(data.drillHref)
    }
  }

  const tooltipTitle = data.deltaPct != null
    ? `${data.deltaPct > 0 ? '+' : ''}${data.deltaPct.toFixed(1)}% vs hace 3 meses · actualizado ${formatGreenhouseTime(new Date(data.asOf), {
  hour: '2-digit',
  minute: '2-digit'
}, 'es-CL')}`
    : 'Calculado de income − expenses (rolling 6 meses)'

  const isEmpty = data.runwayMonths == null && data.cashCurrent == null && data.monthlyHistory.length === 0

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={reduced ? undefined : { duration: 0.22, ease: [0.2, 0, 0, 1] }}
    >
      <Card component='article' aria-label={`Runway: ${data.runwayMonths ?? '—'} meses, estado ${tone.label}`}>
        <CardHeader
          avatar={<CustomAvatar variant='rounded' skin='light' color={tone.color} size={36}><i className='tabler-trending-up text-[20px]' /></CustomAvatar>}
          title='Runway · Cash Position'
          subheader='Cash disponible / burn promedio últimos 3 meses'
          titleTypographyProps={{ variant: 'h5' }}
          action={<OptionMenu options={['Ver Finanzas', 'Exportar reporte', 'Configurar alertas']} />}
          sx={{ '& .MuiCardHeader-avatar': { mr: 3 } }}
        />
        <CardContent className='flex flex-col gap-4 pbe-4'>
          {isEmpty ? (
            <Stack spacing={2} sx={{ py: 2 }}>
              <Stack direction='row' spacing={1.5} alignItems='center'>
                <CustomAvatar variant='rounded' skin='light' color='secondary' size={32}>
                  <i className='tabler-clock-hour-3 text-[18px]' />
                </CustomAvatar>
                <Typography variant='body2' color='text.primary' sx={{ fontWeight: 500 }}>
                  Esperando datos del cierre operativo
                </Typography>
              </Stack>
              <Typography variant='caption' color='text.secondary'>
                El runway se calcula del P&amp;L canónico. Cuando el cierre del mes esté materializado o Nubox sincronice las facturas pagadas, este bloque se actualiza automáticamente.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={4}>
              <Stack direction='row' alignItems='baseline' spacing={1.5} flexWrap='wrap' useFlexGap>
                <Tooltip title={tooltipTitle} placement='top' arrow disableInteractive enterDelay={300}>
                  <Typography
                    variant='h3'
                    component='p'
                    sx={{ fontWeight: 500, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', cursor: 'help' }}
                  >
                    {data.runwayMonths != null ? <AnimatedCounter value={data.runwayMonths} format='integer' /> : '—'}
                    <Typography component='span' variant='h5' color='text.secondary' sx={{ ml: 1 }}>
                      {data.runwayMonths != null ? (data.runwayMonths === 1 ? 'mes' : 'meses') : ''}
                    </Typography>
                  </Typography>
                </Tooltip>
                {data.deltaPct != null && Math.abs(data.deltaPct) >= 0.5 ? (
                  <Chip
                    size='small'
                    variant='outlined'
                    color={data.deltaPct > 0 ? 'success' : 'error'}
                    icon={<i className={data.deltaPct > 0 ? 'tabler-arrow-up-right' : 'tabler-arrow-down-right'} />}
                    label={`${data.deltaPct > 0 ? '+' : ''}${data.deltaPct.toFixed(1)}%`}
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  />
                ) : null}
                <Box
                  sx={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 9999,
                    bgcolor: theme => `color-mix(in oklch, ${theme.palette[tone.color].main} 14%, transparent)`,
                    color: theme => theme.palette[tone.color].main,
                    fontSize: 12,
                    fontWeight: 500,
                    '&::after': critical
                      ? {
                          content: '""',
                          position: 'absolute',
                          inset: -3,
                          borderRadius: 9999,
                          bgcolor: theme => theme.palette[tone.color].main,
                          opacity: 0.25,
                          animation: 'gh-runway-pulse 2.4s cubic-bezier(0.2, 0, 0, 1) infinite',
                          pointerEvents: 'none'
                        }
                      : undefined,
                    '@media (prefers-reduced-motion: reduce)': { '&::after': { animation: 'none' } },
                    '@keyframes gh-runway-pulse': {
                      '0%': { transform: 'scale(1)', opacity: 0.25 },
                      '60%': { transform: 'scale(1.4)', opacity: 0 },
                      '100%': { transform: 'scale(1.4)', opacity: 0 }
                    }
                  }}
                >
                  <i className={classnames(tone.icon, 'text-[14px]')} aria-hidden />
                  {tone.label}
                </Box>
              </Stack>
              <Typography variant='body2' color='text.secondary'>
                Cash {formatCash(data.cashCurrent, data.cashCurrency)} · Burn {formatBurn(data.burnMonthly, data.cashCurrency)} / mes
              </Typography>
              <Box sx={{ mx: -1 }}>
                <AppReactApexCharts type='area' height={120} width='100%' options={sparklineOptions} series={series} />
              </Box>
              {data.monthlyHistory.length > 0 ? (
                <Stack direction='row' justifyContent='space-between' sx={{ px: 0.5 }}>
                  {data.monthlyHistory.map(h => (
                    <Typography key={h.periodLabel} variant='caption' color='text.disabled'>
                      {h.periodLabel.split(' ')[0]}
                    </Typography>
                  ))}
                </Stack>
              ) : null}
            </Stack>
          )}
          {data.drillHref ? (
            <Stack direction='row' justifyContent='flex-end' sx={{ mt: 1 }}>
              <Button
                size='small'
                variant='text'
                color='primary'
                endIcon={<i className='tabler-arrow-right text-base' />}
                onClick={handleDrill}
              >
                Ver Finanzas
              </Button>
            </Stack>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default HomeRunwayStrategic
