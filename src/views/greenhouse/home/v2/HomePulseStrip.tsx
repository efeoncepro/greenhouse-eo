'use client'

import { useMemo } from 'react'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import type { ApexOptions } from 'apexcharts'

import Tooltip from '@mui/material/Tooltip'

import StatsWithAreaChart from '@/components/card-statistics/StatsWithAreaChart'
import type { StatsWithAreaChartProps } from '@/components/card-statistics/StatsWithAreaChart'
import type { ThemeColor } from '@core/types'

import { motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

import type { HomePulseStripData, PulseKpiCard } from '@/lib/home/contract'

const TASK407_ARIA_TU_PULSO_DE_HOY = "Tu pulso de hoy"


interface HomePulseStripProps {
  data: HomePulseStripData
}

const TONE_BY_KPI: Record<string, { color: ThemeColor; icon: string }> = {
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

const FALLBACK = { color: 'primary' as ThemeColor, icon: 'tabler-chart-line' }

const formatStats = (card: PulseKpiCard): string => {
  if (card.value == null) return '—'

  switch (card.unit) {
    case 'currency':
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: card.currency ?? 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(Math.round(card.value))
    case 'percentage':
      return `${(Math.round(card.value * 10) / 10).toFixed(1)}%`
    case 'days':
      return `${Math.round(card.value)} d`
    case 'minutes':
      return `${Math.round(card.value)} min`
    case 'count':
    case 'integer':
    default:
      return new Intl.NumberFormat('es-CL').format(Math.round(card.value))
  }
}

const trendForCard = (card: PulseKpiCard): StatsWithAreaChartProps['trend'] => {
  if (card.deltaPct == null) return undefined
  // Don't render a trend chip for sub-noise deltas — "+0.0%" is visual debt.
  if (Math.abs(card.deltaPct) < 0.5) return undefined
  if (card.trend === 'up') return 'positive'
  if (card.trend === 'down') return 'negative'

  return 'neutral'
}

const trendNumberForCard = (card: PulseKpiCard): string | undefined => {
  if (card.deltaPct == null) return undefined
  if (Math.abs(card.deltaPct) < 0.5) return undefined

  return `${(Math.round(Math.abs(card.deltaPct) * 10) / 10).toFixed(1)}%`
}

interface PulseCardSlotProps {
  card: PulseKpiCard
  index: number
}

const PulseCardSlot = ({ card, index }: PulseCardSlotProps) => {
  const router = useRouter()
  const reduced = useReducedMotion()
  const tone = TONE_BY_KPI[card.kpiId] ?? FALLBACK

  const series = useMemo<ApexOptions['series']>(() => {
    const data = card.sparkline.length >= 2 ? card.sparkline : [card.value ?? 0, card.value ?? 0]

    return [{ name: card.label, data }]
  }, [card.label, card.sparkline, card.value])

  const handleClick = () => {
    if (!card.drillHref) return

    // View Transitions API — Chrome 111+, Safari 18+. Falls back to
    // immediate router.push when unsupported (Firefox today).
    type DocWithVT = Document & { startViewTransition?: (cb: () => void) => unknown }
    const docVT = document as DocWithVT

    if (typeof docVT.startViewTransition === 'function') {
      docVT.startViewTransition(() => router.push(card.drillHref!))
    } else {
      router.push(card.drillHref)
    }
  }

  const computedAtLabel = (() => {
    const ts = new Date(card.computedAt).getTime()

    if (Number.isNaN(ts)) return null
    const minutes = Math.max(0, Math.floor((Date.now() - ts) / 60000))

    if (minutes < 1) return 'recién actualizado'
    if (minutes < 60) return `actualizado hace ${minutes} min`

    return `actualizado hace ${Math.floor(minutes / 60)} h`
  })()

  const tooltipTitle = card.deltaPct != null && Math.abs(card.deltaPct) >= 0.5
    ? `${card.deltaPct > 0 ? '+' : ''}${card.deltaPct.toFixed(1)}% vs período anterior${computedAtLabel ? ` · ${computedAtLabel}` : ''}`
    : computedAtLabel ?? card.label

  return (
    <Tooltip title={tooltipTitle} placement='top' arrow disableInteractive enterDelay={300}>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={reduced ? undefined : { opacity: 1, y: 0 }}
        transition={reduced ? undefined : { duration: 0.18, delay: 0.05 * index, ease: [0.2, 0, 0, 1] }}
        whileHover={reduced ? undefined : { y: -2 }}
        style={{ cursor: card.drillHref ? 'pointer' : 'default', height: '100%' }}
        role='article'
        aria-label={`${card.label}: ${formatStats(card)}${card.deltaPct != null ? `, delta ${card.deltaPct.toFixed(1)}%` : ''}`}
        onClick={handleClick}
      >
        <Box
          sx={{
            height: '100%',
            transition: 'box-shadow 120ms cubic-bezier(0.2, 0, 0, 1)',
            '& > .MuiCard-root': { height: '100%' },
            '&:hover > .MuiCard-root': { boxShadow: 4 }
          }}
        >
          <StatsWithAreaChart
            stats={formatStats(card)}
            title={card.label}
            subtitle={card.description ?? undefined}
            chartColor={tone.color}
            chartSeries={series}
            avatarIcon={tone.icon}
            avatarColor={tone.color}
            avatarSkin='light'
            avatarSize={36}
            trend={trendForCard(card)}
            trendNumber={trendNumberForCard(card)}
          />
        </Box>
      </motion.div>
    </Tooltip>
  )
}

export const HomePulseStrip = ({ data }: HomePulseStripProps) => {
  if (!data || data.cards.length === 0) return null

  const cardsToRender = data.cards.slice(0, 4)
  const md = cardsToRender.length === 4 ? 3 : cardsToRender.length === 3 ? 4 : cardsToRender.length === 2 ? 6 : 12

  return (
    <Grid container spacing={4} component='section' aria-label={TASK407_ARIA_TU_PULSO_DE_HOY} alignItems='stretch'>
      {cardsToRender.map((card, index) => (
        <Grid key={card.kpiId} size={{ xs: 12, sm: 6, md }}>
          <PulseCardSlot card={card} index={index} />
        </Grid>
      ))}
    </Grid>
  )
}

export default HomePulseStrip
