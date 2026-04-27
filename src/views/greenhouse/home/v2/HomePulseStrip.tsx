'use client'

import { useMemo } from 'react'

import dynamic from 'next/dynamic'

import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

import CustomAvatar from '@core/components/mui/Avatar'
import type { ThemeColor } from '@core/types'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import { motion, AnimatePresence } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'


import type { HomePulseStripData, PulseKpiCard } from '@/lib/home/contract'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })

interface HomePulseStripProps {
  data: HomePulseStripData
}

interface KpiAvatarTone {
  color: ThemeColor
  icon: string
}

const KPI_TONE_BY_KIND: Record<string, KpiAvatarTone> = {
  'finance.margin': { color: 'success', icon: 'tabler-trending-up' },
  'finance.closing': { color: 'primary', icon: 'tabler-calendar-check' },
  'finance.ar': { color: 'warning', icon: 'tabler-cash' },
  'finance.drift': { color: 'error', icon: 'tabler-alert-triangle' },
  'reliability.rollup': { color: 'success', icon: 'tabler-shield-check' },
  'sync.notion': { color: 'info', icon: 'tabler-refresh' },
  'delivery.otd': { color: 'success', icon: 'tabler-target' },
  'delivery.ftr': { color: 'success', icon: 'tabler-shield-check' },
  'capacity.available': { color: 'info', icon: 'tabler-users' },
  'capacity.mine': { color: 'info', icon: 'tabler-clock' },
  'inbox.pending': { color: 'warning', icon: 'tabler-inbox' },
  'tasks.mine': { color: 'primary', icon: 'tabler-checklist' },
  'tasks.pending': { color: 'warning', icon: 'tabler-checklist' },
  'payroll.closing': { color: 'primary', icon: 'tabler-receipt' },
  'payroll.mine': { color: 'primary', icon: 'tabler-receipt' },
  'leaves.pending': { color: 'warning', icon: 'tabler-calendar-event' },
  'leaves.mine': { color: 'info', icon: 'tabler-calendar-event' },
  'attendance.today': { color: 'info', icon: 'tabler-clock-check' },
  'headcount.active': { color: 'info', icon: 'tabler-users-group' },
  'cycles.active': { color: 'primary', icon: 'tabler-cycle' }
}

const FALLBACK_TONE: KpiAvatarTone = { color: 'primary', icon: 'tabler-chart-line' }

const trendColor = (status: PulseKpiCard['status']): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'optimal':
      return 'success'
    case 'attention':
      return 'warning'
    case 'critical':
      return 'error'
    default:
      return 'default'
  }
}

const formatDelta = (card: PulseKpiCard): string | null => {
  if (card.deltaPct == null) return null
  const sign = card.deltaPct > 0 ? '+' : card.deltaPct < 0 ? '' : ''

  return `${sign}${(Math.round(card.deltaPct * 10) / 10).toFixed(1)}%`
}

const renderValue = (card: PulseKpiCard) => {
  if (card.value == null) return <Typography variant='h5'>—</Typography>

  const format =
    card.unit === 'currency' ? 'currency'
      : card.unit === 'percentage' ? 'percentage'
      : 'integer'

  return (
    <Typography variant='h5' sx={{ fontVariantNumeric: 'tabular-nums' }}>
      <AnimatedCounter value={card.value} format={format} currency={(card.currency as 'CLP' | 'USD' | undefined) ?? undefined} />
      {card.unit === 'days' ? ' d' : null}
      {card.unit === 'minutes' ? ' min' : null}
    </Typography>
  )
}

const buildSparklineOptions = (color: string): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    toolbar: { show: false },
    sparkline: { enabled: true },
    animations: { enabled: true, easing: 'easeout', speed: 600 }
  },
  tooltip: { enabled: false },
  dataLabels: { enabled: false },
  stroke: { width: 2, curve: 'smooth' },
  grid: { show: false },
  fill: {
    type: 'gradient',
    gradient: {
      opacityTo: 0,
      opacityFrom: 1,
      shadeIntensity: 1,
      stops: [0, 100],
      colorStops: [
        [
          { offset: 0, opacity: 0.4, color },
          { offset: 100, opacity: 0.1, color: 'var(--mui-palette-background-paper)' }
        ]
      ]
    }
  },
  theme: {
    monochrome: {
      enabled: true,
      shadeTo: 'light',
      shadeIntensity: 1,
      color
    }
  },
  xaxis: { labels: { show: false }, axisTicks: { show: false }, axisBorder: { show: false } },
  yaxis: { show: false }
})

const HomePulseCard = ({ card, index }: { card: PulseKpiCard; index: number }) => {
  const theme = useTheme()
  const router = useRouter()
  const reduced = useReducedMotion()
  const tone = KPI_TONE_BY_KIND[card.kpiId] ?? FALLBACK_TONE

  const sparklineOptions = useMemo(
    () => buildSparklineOptions(theme.palette[tone.color].main),
    [theme.palette, tone.color]
  )

  const series = useMemo(() => {
    if (card.sparkline.length === 0) return [{ name: card.label, data: [0, 0, 0] }]

    return [{ name: card.label, data: card.sparkline }]
  }, [card.label, card.sparkline])

  const delta = formatDelta(card)

  const handleClick = () => {
    if (card.drillHref) router.push(card.drillHref)
  }

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={reduced ? undefined : { duration: 0.18, delay: 0.06 * index, ease: [0.2, 0, 0, 1] }}
      whileHover={reduced ? undefined : { y: -2 }}
      style={{ cursor: card.drillHref ? 'pointer' : 'default' }}
      role='article'
      aria-label={`${card.label}: ${card.value ?? 'sin datos'}${delta ? `, ${delta}` : ''}`}
      onClick={handleClick}
    >
      <Card sx={{ transition: 'box-shadow 120ms cubic-bezier(0.2, 0, 0, 1)', '&:hover': { boxShadow: 4 } }}>
        <CardContent sx={{ pb: 2 }}>
          <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 1.5 }}>
            <CustomAvatar variant='rounded' skin='light' color={tone.color} size={36}>
              <i className={tone.icon} style={{ fontSize: 20 }} />
            </CustomAvatar>
            {delta ? (
              <Chip
                size='small'
                variant='outlined'
                color={trendColor(card.status)}
                label={delta}
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              />
            ) : null}
          </Stack>
          <Stack spacing={0.5}>
            {renderValue(card)}
            <Typography variant='body2' color='text.secondary'>{card.label}</Typography>
          </Stack>
        </CardContent>
        <AppReactApexCharts type='area' height={64} width='100%' options={sparklineOptions} series={series} />
      </Card>
    </motion.div>
  )
}

export const HomePulseStrip = ({ data }: HomePulseStripProps) => {
  if (!data || data.cards.length === 0) return null

  const cardsToRender = data.cards.slice(0, 6)
  const cols = cardsToRender.length >= 6 ? 2 : cardsToRender.length >= 4 ? 3 : cardsToRender.length >= 3 ? 4 : 6

  return (
    <Grid container spacing={4} component='section' aria-label='Tu pulso de hoy'>
      <AnimatePresence>
        {cardsToRender.map((card, index) => (
          <Grid key={card.kpiId} size={{ xs: 12, sm: 6, md: cols }}>
            <HomePulseCard card={card} index={index} />
          </Grid>
        ))}
      </AnimatePresence>
    </Grid>
  )
}

export default HomePulseStrip
