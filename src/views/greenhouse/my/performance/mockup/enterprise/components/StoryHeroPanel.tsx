'use client'

// TASK-1075 — the dominant story module: the verdict (page h1) + score, then the
// hero metric chart that IS the story. Chart annotations stay in HTML (legend + caption),
// never in-SVG (AppRecharts forces 13px on all SVG text). Hero = Recharts area.
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import AppRecharts from '@/libs/styles/AppRecharts'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from '@/libs/Recharts'

import PerfPanel from './PerfPanel'
import PerfLegendSwatch from './PerfLegendSwatch'
import { toneColor } from './tone'
import type { editorialBrief } from '../data'

type StoryHeroPanelProps = Pick<typeof editorialBrief, 'headline' | 'subline' | 'score' | 'hero'>

const StoryHeroPanel = ({ headline, subline, score, hero }: StoryHeroPanelProps) => {
  const theme = useTheme()
  const scoreAccent = toneColor(theme, score.tone)
  const stroke = theme.palette.error.main
  const annPoint = hero.series[hero.annotation.atIndex]
  const data = hero.series.map(p => ({ label: p.label, value: p.value }))

  return (
    <PerfPanel>
      {/* Verdict (page h1) + score */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'flex-start' }} spacing={3}>
        <Box sx={{ maxWidth: 560 }}>
          <Typography variant='h1' component='h1' sx={{ lineHeight: 1.16, textWrap: 'balance' }}>
            {headline}
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary', mt: 2 }}>
            {subline}
          </Typography>
        </Box>
        <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} sx={{ flexShrink: 0 }}>
          <Stack direction='row' alignItems='baseline' spacing={0.5}>
            <Typography variant='kpiValue' sx={{ color: scoreAccent, fontVariantNumeric: 'tabular-nums' }}>
              {score.value}
            </Typography>
            <Typography variant='h5' sx={{ color: 'text.disabled' }}>
              /{score.max}
            </Typography>
          </Stack>
          <Chip
            size='small'
            icon={<i className='tabler-circle-check' style={{ fontSize: 14 }} />}
            label={score.verdict}
            sx={{ mt: 1, color: scoreAccent, bgcolor: alpha(scoreAccent, 0.12), fontWeight: 600, '& .MuiChip-icon': { color: scoreAccent } }}
          />
        </Stack>
      </Stack>

      <Divider sx={{ my: 4 }} />

      {/* Hero chart */}
      <Box data-capture='hero-chart'>
        <Stack direction='row' alignItems='baseline' spacing={1.5}>
          <Typography variant='h5'>{hero.code}</Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {hero.name}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Typography variant='caption' sx={{ color: 'text.disabled' }}>
            {hero.cadence}
          </Typography>
        </Stack>
        <Stack direction='row' spacing={3} sx={{ mt: 1.5, mb: 1 }}>
          <PerfLegendSwatch color={stroke} label='FTR% mensual' />
          <PerfLegendSwatch color={theme.palette.success.main} dashed label={`Meta ≥ ${hero.target}%`} />
        </Stack>
        <Box
          sx={{ width: '100%' }}
          role='img'
          aria-label={`Calidad de primera entrega ${hero.code} de enero a mayo 2026: cae de 95.2% en abril a ${hero.value} en mayo, por debajo de la meta de ${hero.target}%.`}
        >
          <AppRecharts>
            <ResponsiveContainer width='100%' height={280}>
              <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id='ftr-hero-fill' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor={stroke} stopOpacity={0.26} />
                    <stop offset='92%' stopColor={stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={theme.palette.divider} strokeDasharray='4 4' />
                <XAxis dataKey='label' tickLine={false} axisLine={false} dy={8} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  width={42}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: theme.palette.text.disabled, fontSize: 11 }}
                  tickFormatter={v => `${v}%`}
                />
                <RechartsTooltip
                  cursor={{ stroke: theme.palette.divider }}
                  formatter={value => [`${value}%`, hero.code] as [string, string]}
                  contentStyle={{
                    borderRadius: theme.shape.customBorderRadius.md,
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: theme.greenhouseElevation.floating.boxShadow,
                    fontSize: 12
                  }}
                />
                <ReferenceLine y={hero.target} stroke={theme.palette.success.main} strokeDasharray='5 5' strokeWidth={1.5} />
                <Area
                  type='monotone'
                  dataKey='value'
                  stroke={stroke}
                  strokeWidth={3}
                  fill='url(#ftr-hero-fill)'
                  dot={{ r: 4, fill: theme.palette.background.paper, stroke, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive
                  animationDuration={700}
                />
                <ReferenceDot x={annPoint.label} y={annPoint.value} r={6} fill={stroke} stroke={theme.palette.background.paper} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </AppRecharts>
        </Box>
        <Stack direction='row' spacing={1.25} alignItems='flex-start' sx={{ mt: 1.5 }}>
          <Box sx={{ mt: 0.75, flexShrink: 0, width: 6, height: 6, borderRadius: '50%', bgcolor: stroke }} />
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            <Box component='span' sx={{ fontWeight: 700, color: 'text.primary' }}>
              {hero.caption.lead}
            </Box>{' '}
            {hero.caption.rest}
          </Typography>
        </Stack>
      </Box>
    </PerfPanel>
  )
}

export default StoryHeroPanel
