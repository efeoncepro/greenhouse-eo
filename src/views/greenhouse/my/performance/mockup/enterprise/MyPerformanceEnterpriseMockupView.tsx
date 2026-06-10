'use client'

// TASK-1075 — Mi Desempeño enterprise redesign mockup (concept A+C).
// A+C mix: split-temporal skeleton (mes cerrado | mes en curso) + composite
// score-hero per lane + Nexa narrative band (2nd person) on top.
// Tokenized (AXIS / SoT / elevation roles) — image was intención, no literal.

import { useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import { alpha, useTheme, type Theme } from '@mui/material/styles'

import type { ApexOptions } from 'apexcharts'

import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'

import { enterpriseMock, type MockKpi, type MockLane, type MockTone } from './data'

type ThemeColorKey = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary'

const toneToColorKey = (tone: MockTone): ThemeColorKey => (tone === 'neutral' ? 'secondary' : tone)

const toneMain = (theme: Theme, tone: MockTone): string =>
  tone === 'neutral' ? theme.palette.text.disabled : theme.palette[toneToColorKey(tone)].main

const fmtValue = (kpi: Pick<MockKpi, 'value' | 'format' | 'suffix'>): string => {
  if (kpi.value === null) return '—'

  const base =
    kpi.format === 'percentage'
      ? `${Number.isInteger(kpi.value) ? kpi.value : kpi.value.toFixed(1)}%`
      : kpi.format === 'decimal'
        ? kpi.value.toFixed(kpi.value < 10 ? 2 : 1).replace(/\.00$/, '.0')
        : `${kpi.value}`

  return kpi.suffix ? `${base}${kpi.suffix}` : base
}

const fmtDelta = (delta: number, unit?: string): string => {
  const sign = delta > 0 ? '+' : ''
  const num = Number.isInteger(delta) ? `${delta}` : delta.toFixed(1)

  return `${sign}${num}${unit ? ` ${unit}` : ''}`
}

// ── Sparkline (tiny area, governed by chart wrapper typography) ──────────────
const Sparkline = ({ series, color }: { series: { value: number | null }[]; color: string }) => {
  const data = series.map(p => p.value)

  const options: ApexOptions = {
    chart: { sparkline: { enabled: true }, animations: { enabled: true, speed: 400 } },
    stroke: { width: 2, curve: 'smooth', lineCap: 'round' },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.32, opacityTo: 0, stops: [0, 100] } },
    colors: [color],
    tooltip: { enabled: false },
    markers: { size: 0 }
  }

  return <AppReactApexCharts type='area' height={40} width='100%' series={[{ data }]} options={options} />
}

// ── KPI story card (code + name + value + delta + target + sparkline + semaphore) ──
const KpiStoryCard = ({ kpi }: { kpi: MockKpi }) => {
  const theme = useTheme()
  const main = toneMain(theme, kpi.tone)
  const isEmpty = kpi.value === null
  const deltaGood = kpi.delta !== null && ((kpi.id === 'stuck' || kpi.id === 'cycle' || kpi.id === 'rpa') ? kpi.delta <= 0 : kpi.delta >= 0)
  const deltaColor = kpi.delta === null ? theme.palette.text.disabled : deltaGood ? theme.palette.success.main : theme.palette.error.main

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        borderTop: `3px solid ${main}`,
        transition: theme.transitions.create(['box-shadow', 'transform'], { duration: 150 }),
        '&:hover': { boxShadow: theme.greenhouseElevation.raised.boxShadow, transform: 'translateY(-2px)' }
      }}
    >
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        <Stack direction='row' alignItems='baseline' justifyContent='space-between' sx={{ mb: 0.5 }}>
          <Stack direction='row' alignItems='baseline' spacing={1}>
            <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
              {kpi.code}
            </Typography>
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {kpi.name}
            </Typography>
          </Stack>
          <i className={kpi.icon} style={{ fontSize: 18, color: main }} aria-hidden='true' />
        </Stack>

        <Stack direction='row' alignItems='flex-end' justifyContent='space-between' sx={{ minHeight: 44 }}>
          <Typography
            variant='kpiValue'
            sx={{ color: isEmpty ? 'text.disabled' : 'text.primary', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}
          >
            {fmtValue(kpi)}
          </Typography>
          {kpi.delta !== null && (
            <Chip
              size='small'
              label={fmtDelta(kpi.delta, kpi.deltaUnit)}
              icon={<i className={kpi.delta >= 0 ? 'tabler-arrow-up-right' : 'tabler-arrow-down-right'} style={{ fontSize: 14 }} />}
              sx={{
                height: 22,
                color: deltaColor,
                bgcolor: alpha(deltaColor, 0.12),
                fontVariantNumeric: 'tabular-nums',
                '& .MuiChip-icon': { color: deltaColor, ml: 0.5 }
              }}
            />
          )}
        </Stack>

        {kpi.emptyReason ? (
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.5, minHeight: 32 }}>
            {kpi.emptyReason}
          </Typography>
        ) : (
          <Box sx={{ mt: 0.5, mx: -0.5 }}>{kpi.series.length > 0 && <Sparkline series={kpi.series} color={main} />}</Box>
        )}

        <Divider sx={{ my: 1.5 }} />

        <Stack direction='row' alignItems='center' justifyContent='space-between'>
          <Stack direction='row' alignItems='center' spacing={0.5}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: main }} />
            <Typography variant='caption' sx={{ color: main, fontWeight: 600 }}>
              {kpi.statusLabel}
            </Typography>
          </Stack>
          <Typography variant='caption' sx={{ color: 'text.disabled' }}>
            {kpi.target}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ── Hero score (closed: radial gauge + verdict + movers · live: progress ring) ──
const HeroScore = ({ lane }: { lane: MockLane }) => {
  const theme = useTheme()
  const tone = lane.scoreTone
  const main = toneMain(theme, tone)
  const isLive = lane.key === 'live'
  const gaugeValue = isLive ? Math.round((lane.elapsedPct ?? 0) * 100) : (lane.score ?? 0)

  const gaugeOptions: ApexOptions = {
    chart: { sparkline: { enabled: true } },
    colors: [main],
    plotOptions: {
      radialBar: {
        hollow: { size: '60%' },
        track: { background: alpha(main, 0.14), strokeWidth: '100%' },
        dataLabels: {
          name: { show: false },
          value: {
            show: true,
            offsetY: 6,
            fontSize: '26px',
            fontWeight: 800,
            color: theme.palette.text.primary,
            formatter: () => (isLive ? `${gaugeValue}%` : `${lane.score}`)
          }
        }
      }
    },
    stroke: { lineCap: 'round' }
  }

  return (
    <Stack direction='row' spacing={3} alignItems='center'>
      <Box sx={{ width: 120, flexShrink: 0 }}>
        <AppReactApexCharts type='radialBar' height={140} series={[gaugeValue]} options={gaugeOptions} />
      </Box>
      <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction='row' spacing={1} alignItems='center'>
          <Chip
            size='small'
            icon={<i className={isLive ? 'tabler-loader-2' : 'tabler-circle-check'} style={{ fontSize: 14 }} />}
            label={lane.scoreVerdict}
            sx={{ height: 24, color: main, bgcolor: alpha(main, 0.12), fontWeight: 600, '& .MuiChip-icon': { color: main } }}
          />
          {!isLive && (
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              ICO score
            </Typography>
          )}
        </Stack>

        {isLive ? (
          <Box>
            <Typography variant='body2' sx={{ color: 'text.primary', fontWeight: 600 }}>
              {lane.elapsedLabel}
            </Typography>
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              El score se calcula al cerrar el mes.
            </Typography>
          </Box>
        ) : (
          <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
            {lane.movers.map(m => {
              const mc = m.good ? theme.palette.success.main : theme.palette.error.main

              return (
                <Stack key={m.label} spacing={0} sx={{ minWidth: 64 }}>
                  <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                    {m.label}
                  </Typography>
                  <Stack direction='row' alignItems='center' spacing={0.25}>
                    <i
                      className={m.direction === 'up' ? 'tabler-arrow-up-right' : 'tabler-arrow-down-right'}
                      style={{ fontSize: 14, color: mc }}
                      aria-hidden='true'
                    />
                    <Typography variant='caption' sx={{ color: mc, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {m.delta} {m.unit}
                    </Typography>
                  </Stack>
                </Stack>
              )
            })}
          </Stack>
        )}
      </Stack>
    </Stack>
  )
}

// ── Performance lane (one per month: closed | live) ──────────────────────────
const PerformanceLane = ({ lane }: { lane: MockLane }) => {
  const theme = useTheme()
  const statusMain = toneMain(theme, lane.statusTone)

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        bgcolor: lane.key === 'live' ? alpha(theme.palette.info.main, 0.03) : 'background.paper'
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 3 }}>
          <Typography variant='h5'>{lane.periodLabel}</Typography>
          <Chip
            size='small'
            icon={<i className={lane.key === 'live' ? 'tabler-progress' : 'tabler-lock-check'} style={{ fontSize: 14 }} />}
            label={lane.statusLabel}
            sx={{ height: 24, color: statusMain, bgcolor: alpha(statusMain, 0.12), fontWeight: 600, '& .MuiChip-icon': { color: statusMain } }}
          />
        </Stack>

        {lane.key === 'live' && (
          <LinearProgress
            variant='determinate'
            value={(lane.elapsedPct ?? 0) * 100}
            sx={{ mb: 3, height: 6, borderRadius: `${theme.shape.customBorderRadius.xs}px`, bgcolor: alpha(theme.palette.info.main, 0.16) }}
          />
        )}

        <Box sx={{ mb: 3 }}>
          <HeroScore lane={lane} />
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          {lane.kpis.map(kpi => (
            <Grid key={kpi.id} size={{ xs: 6 }}>
              <KpiStoryCard kpi={kpi} />
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}

// ── CSC distribution (donut + insight annotation) ────────────────────────────
const CscPanel = () => {
  const theme = useTheme()

  const toneMap: Record<string, string> = {
    briefing: theme.palette.primary.main,
    production: theme.palette.success.main,
    review: theme.palette.warning.main
  }

  const colors = enterpriseMock.csc.map(c => toneMap[c.toneKey])

  const options: ApexOptions = {
    chart: { type: 'donut' },
    labels: enterpriseMock.csc.map(c => c.label),
    colors,
    legend: { position: 'bottom', markers: { strokeWidth: 0 } },
    stroke: { width: 2, colors: [theme.palette.background.paper] },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            value: { fontSize: '26px', fontWeight: 800, color: theme.palette.text.primary, offsetY: 4 },
            total: { show: true, label: 'cierres', color: theme.palette.text.secondary, formatter: () => `${enterpriseMock.cscTotal}` }
          }
        }
      }
    }
  }

  return (
    <Card elevation={0} sx={{ height: '100%', border: `1px solid ${theme.palette.divider}`, borderRadius: `${theme.shape.customBorderRadius.lg}px` }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant='h5' sx={{ mb: 0.5 }}>
          Distribución CSC
        </Typography>
        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
          Cierres por centro operativo del mes cerrado.
        </Typography>
        <Box sx={{ mt: 2 }}>
          <AppReactApexCharts type='donut' height={260} series={enterpriseMock.csc.map(c => c.count)} options={options} />
        </Box>
        <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            bgcolor: alpha(theme.palette.warning.main, 0.08),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.24)}`
          }}
        >
          <Stack direction='row' spacing={1} alignItems='flex-start'>
            <i className='tabler-bulb' style={{ fontSize: 18, color: theme.palette.warning.dark }} aria-hidden='true' />
            <Typography variant='body2' sx={{ color: 'text.primary' }}>
              {enterpriseMock.cscInsight}
            </Typography>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  )
}

// ── Nexa narrative band (story-first, 2nd person — TASK-1073) ────────────────
const NexaBand = () => {
  const theme = useTheme()
  const n = enterpriseMock.nexa

  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.primary.main, 0.02)})`
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Grid container spacing={4} alignItems='center'>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.16)
                }}
              >
                <i className='tabler-sparkles' style={{ fontSize: 20, color: theme.palette.primary.main }} aria-hidden='true' />
              </Box>
              <Stack direction='row' spacing={1} alignItems='center'>
                <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                  Nexa Insights
                </Typography>
                <Chip
                  size='small'
                  label={n.severityLabel}
                  sx={{ height: 22, color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.12), fontWeight: 600 }}
                />
                <Chip size='small' label={n.metric} variant='outlined' sx={{ height: 22 }} />
              </Stack>
            </Stack>
            <Typography variant='body1' sx={{ color: 'text.primary', mb: 1.5 }}>
              {n.narrative}
            </Typography>
            <Stack direction='row' spacing={1} alignItems='flex-start'>
              <i className='tabler-arrow-guide' style={{ fontSize: 18, color: theme.palette.text.secondary, marginTop: 2 }} aria-hidden='true' />
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                {n.action}
              </Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={1.5} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
              <Button variant='contained' endIcon={<i className='tabler-arrow-right' />}>
                Ver causa raíz
              </Button>
              <Typography variant='caption' sx={{ color: 'text.disabled' }}>
                Último análisis: {n.lastAnalysis}
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
const MyPerformanceEnterpriseMockupView = () => {
  const theme = useTheme()
  const [lanes] = useState(enterpriseMock.lanes)

  return (
    <Box sx={{ maxWidth: 1320, mx: 'auto' }}>
      {/* Header */}
      <Stack direction='row' alignItems='flex-start' justifyContent='space-between' sx={{ mb: 4 }} flexWrap='wrap' useFlexGap>
        <Box>
          <Typography variant='h4'>Mi desempeño</Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
            Cómo cerraste tu último mes, cómo vas en el que está en curso, y qué hacer al respecto.
          </Typography>
        </Box>
        <Chip
          icon={<i className='tabler-user' style={{ fontSize: 16 }} />}
          label={`${enterpriseMock.memberName} · ${enterpriseMock.spaceName} · ${enterpriseMock.roleTitle}`}
          sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'text.primary', fontWeight: 600 }}
        />
      </Stack>

      {/* Nexa narrative band (acción) */}
      <Box sx={{ mb: 5 }}>
        <NexaBand />
      </Box>

      {/* Split temporal — mes cerrado | mes en curso */}
      <Grid container spacing={5} sx={{ mb: 5 }}>
        {lanes.map(lane => (
          <Grid key={lane.key} size={{ xs: 12, md: 6 }}>
            <PerformanceLane lane={lane} />
          </Grid>
        ))}
      </Grid>

      {/* Detalle — distribución CSC */}
      <Grid container spacing={5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <CscPanel />
        </Grid>
      </Grid>

      <Typography variant='caption' sx={{ color: 'text.disabled', display: 'block', textAlign: 'center', mt: 5 }}>
        Nexa Insights es una lectura operativa personal. No reemplaza procesos de HR ni otras acciones formales.
      </Typography>
    </Box>
  )
}

export default MyPerformanceEnterpriseMockupView
