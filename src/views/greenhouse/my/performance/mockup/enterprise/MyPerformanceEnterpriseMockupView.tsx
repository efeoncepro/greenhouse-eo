'use client'

// TASK-1075 — Mi Desempeño · editorial brief (concept A v2).
// Collaborator lens: calidad → tu ritmo → tu foco (NOT revenue/client lens).
// One flat surface, hairline dividers, strong type hierarchy, causal-chain band,
// hero chart with annotation, real Nexa mark, flat metrics ribbon. NO card-on-card.
// Tokenized (AXIS / SoT / elevation). Reference north: .captures/concepts/v2-a-editorial-brief.png

import { useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { alpha, useTheme, type Theme } from '@mui/material/styles'

import type { ApexOptions } from 'apexcharts'

import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
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
import GreenhouseNexaAnimatedMark from '@/components/greenhouse/primitives/GreenhouseNexaAnimatedMark'

import { editorialBrief, type BriefTone, type CausalNode, type RibbonMetric } from './data'

const toneColor = (theme: Theme, tone: BriefTone): string =>
  tone === 'neutral' ? theme.palette.text.disabled : theme.palette[tone].main

// ── Hairline section label (overline) ───────────────────────────────────────
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography variant='overline' sx={{ color: 'text.secondary', letterSpacing: '0.08em' }}>
    {children}
  </Typography>
)

// ── Sparkline (tiny, flat) ──────────────────────────────────────────────────
const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const options: ApexOptions = {
    chart: { sparkline: { enabled: true }, animations: { enabled: true, speed: 500 } },
    stroke: { width: 2, curve: 'smooth', lineCap: 'round' },
    colors: [color],
    tooltip: { enabled: false },
    markers: { size: 0 }
  }

  return <AppReactApexCharts type='line' height={28} width={84} series={[{ data }]} options={options} />
}

// ── Causal node (flat, no card) ─────────────────────────────────────────────
const CausalNodeBlock = ({ node }: { node: CausalNode }) => {
  const theme = useTheme()
  const accent = toneColor(theme, node.tone)

  return (
    <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
      <Stack direction='row' alignItems='center' spacing={1}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: accent }} />
        <SectionLabel>{node.stage}</SectionLabel>
      </Stack>
      <Typography variant='subtitle1' sx={{ fontWeight: 700, color: node.isFocus ? 'primary.main' : 'text.primary' }}>
        {node.headline}
      </Typography>
      {node.figure && (
        <Stack direction='row' alignItems='baseline' spacing={1}>
          <Typography variant='h5' sx={{ color: accent, fontVariantNumeric: 'tabular-nums' }}>
            {node.figure}
          </Typography>
          {node.figureDelta && (
            <Typography variant='caption' sx={{ color: accent }}>
              {node.figureDelta}
            </Typography>
          )}
        </Stack>
      )}
      <Typography variant='body2' sx={{ color: 'text.secondary' }}>
        {node.detail}
      </Typography>
    </Stack>
  )
}

// ── Hero chart — the metric that is the story ────────────────────────────────
const HeroChart = () => {
  const theme = useTheme()
  const hero = editorialBrief.hero
  const stroke = theme.palette.error.main
  const annPoint = hero.series[hero.annotation.atIndex]
  const data = hero.series.map(p => ({ label: p.label, value: p.value }))

  return (
    <Box>
      <Stack direction='row' alignItems='baseline' spacing={1.5} sx={{ mb: 2 }}>
        <Typography variant='h5'>{hero.code}</Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          {hero.name}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography variant='caption' sx={{ color: 'text.disabled' }}>
          {hero.cadence}
        </Typography>
      </Stack>
      <Box sx={{ width: '100%' }} data-capture='hero-chart'>
        <AppRecharts>
          <ResponsiveContainer width='100%' height={300}>
            <AreaChart data={data} margin={{ top: 28, right: 16, bottom: 0, left: -8 }}>
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
    </Box>
  )
}

// ── Nexa insight row (real Nexa mark + 2nd-person narrative + action) ────────
const NexaInsightRow = () => {
  const theme = useTheme()
  const n = editorialBrief.nexa

  return (
    <Stack direction='row' spacing={2.5} alignItems='flex-start'>
      <GreenhouseNexaAnimatedMark kind='badgeIcon' tone='fullColor' size='medium' decorative dataCapture='brief-nexa-mark' />
      <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction='row' spacing={1} alignItems='center'>
          <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
            Nexa
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.disabled' }}>
            · análisis {n.lastAnalysis}
          </Typography>
        </Stack>
        <Typography variant='body1' sx={{ color: 'text.primary', maxWidth: '68ch' }}>
          {n.narrative}
        </Typography>
        <Box
          sx={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
          }}
        >
          <i className='tabler-arrow-guide' style={{ fontSize: 16, color: theme.palette.primary.main }} aria-hidden='true' />
          <Typography variant='body2' sx={{ color: 'primary.main', fontWeight: 600 }}>
            {n.action}
          </Typography>
        </Box>
      </Stack>
    </Stack>
  )
}

// ── Metrics ribbon (flat, hairline-separated, secondary) ─────────────────────
const RibbonItem = ({ m }: { m: RibbonMetric }) => {
  const theme = useTheme()
  const main = toneColor(theme, m.tone)
  const deltaColor = m.deltaGood === null ? theme.palette.text.disabled : m.deltaGood ? theme.palette.success.main : theme.palette.error.main

  return (
    <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0, px: 2 }}>
      <Stack direction='row' alignItems='baseline' spacing={1}>
        <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
          {m.code}
        </Typography>
        <Typography variant='caption' sx={{ color: 'text.disabled' }}>
          {m.name}
        </Typography>
      </Stack>
      <Stack direction='row' alignItems='flex-end' justifyContent='space-between'>
        <Stack spacing={0}>
          <Typography variant='h5' sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {m.value}
          </Typography>
          {m.delta && (
            <Typography variant='caption' sx={{ color: deltaColor, fontVariantNumeric: 'tabular-nums' }}>
              {m.delta}
            </Typography>
          )}
        </Stack>
        <Sparkline data={m.series} color={main} />
      </Stack>
    </Stack>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
const MyPerformanceEnterpriseMockupView = () => {
  const theme = useTheme()
  const b = editorialBrief
  const [period, setPeriod] = useState<'closed' | 'live'>('closed')
  const scoreAccent = toneColor(theme, b.score.tone)

  return (
    <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
      <Card
        elevation={0}
        sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: `${theme.shape.customBorderRadius.lg}px`, overflow: 'visible' }}
      >
        <CardContent sx={{ p: { xs: 4, md: 6 } }}>
          {/* Header */}
          <Stack direction='row' alignItems='flex-start' justifyContent='space-between' flexWrap='wrap' useFlexGap sx={{ mb: 5 }}>
            <Box>
              <SectionLabel>{b.eyebrow}</SectionLabel>
              <Typography variant='subtitle1' sx={{ fontWeight: 600, color: 'text.secondary' }}>
                {b.member} · {b.space}
              </Typography>
            </Box>
            <Stack direction='row' spacing={3} alignItems='center'>
              <ToggleButtonGroup
                exclusive
                size='small'
                value={period}
                onChange={(_, v) => v && setPeriod(v)}
                sx={{ '& .MuiToggleButton-root': { textTransform: 'none', px: 2 } }}
              >
                {b.periods.map(p => (
                  <ToggleButton key={p.key} value={p.key}>
                    <Stack alignItems='flex-start'>
                      <Typography variant='body2' sx={{ fontWeight: 600 }}>
                        {p.label}
                      </Typography>
                      <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                        {p.status}
                      </Typography>
                    </Stack>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
          </Stack>

          {/* Hero verdict + score */}
          <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={4} sx={{ mb: 2 }}>
            <Box sx={{ maxWidth: 600 }}>
              <Typography variant='h2' sx={{ lineHeight: 1.18, textWrap: 'balance' }}>
                {b.headline}
              </Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary', mt: 2 }}>
                {b.subline}
              </Typography>
            </Box>
            <Stack alignItems='flex-end' sx={{ flexShrink: 0 }}>
              <Stack direction='row' alignItems='baseline' spacing={0.5}>
                <Typography variant='kpiValue' sx={{ color: scoreAccent, fontVariantNumeric: 'tabular-nums' }}>
                  {b.score.value}
                </Typography>
                <Typography variant='h5' sx={{ color: 'text.disabled' }}>
                  /{b.score.max}
                </Typography>
              </Stack>
              <Chip
                size='small'
                icon={<i className='tabler-circle-check' style={{ fontSize: 14 }} />}
                label={b.score.verdict}
                sx={{ mt: 1, color: scoreAccent, bgcolor: alpha(scoreAccent, 0.12), fontWeight: 600, '& .MuiChip-icon': { color: scoreAccent } }}
              />
            </Stack>
          </Stack>

          <Divider sx={{ my: 5 }} />

          {/* Causal chain band */}
          <SectionLabel>Cadena de impacto · causa → efecto → foco</SectionLabel>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'stretch' }} sx={{ mt: 3 }}>
            {b.causal.map((node, i) => (
              <Stack key={node.stage} direction='row' spacing={3} sx={{ flex: 1, minWidth: 0 }}>
                <CausalNodeBlock node={node} />
                {i < b.causal.length - 1 && (
                  <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', color: 'text.disabled' }}>
                    <i className='tabler-arrow-right' style={{ fontSize: 22 }} aria-hidden='true' />
                  </Box>
                )}
              </Stack>
            ))}
          </Stack>

          <Divider sx={{ my: 5 }} />

          {/* Hero chart + Nexa insight */}
          <HeroChart />
          <Box sx={{ mt: 4 }}>
            <NexaInsightRow />
          </Box>

          <Divider sx={{ my: 5 }} />

          {/* Metrics ribbon */}
          <SectionLabel>Tus otras métricas del mes</SectionLabel>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            divider={<Divider orientation='vertical' flexItem sx={{ display: { xs: 'none', md: 'block' } }} />}
            spacing={{ xs: 3, md: 0 }}
            sx={{ mt: 3 }}
          >
            {b.ribbon.map(m => (
              <RibbonItem key={m.id} m={m} />
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Typography variant='caption' sx={{ color: 'text.disabled', display: 'block', textAlign: 'center', mt: 4 }}>
        Nexa Insights es una lectura operativa personal. No reemplaza procesos de HR ni otras acciones formales.
      </Typography>
    </Box>
  )
}

export default MyPerformanceEnterpriseMockupView
