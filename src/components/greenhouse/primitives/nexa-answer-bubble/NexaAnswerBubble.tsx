'use client'

import { useEffect, useId, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { visuallyHidden } from '@mui/utils'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from '@/libs/Recharts'
import AppRecharts from '@/libs/styles/AppRecharts'
import useReducedMotion from '@/hooks/useReducedMotion'
import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import { motionCss } from '@/components/greenhouse/motion'
import GreenhouseButton from '../GreenhouseButton'
import GreenhouseStatusDot from '../GreenhouseStatusDot'
import NexaExpressiveText, { getNexaExpressiveTextPlainText } from '../nexa-expressive-text/NexaExpressiveText'
import NexaProvenanceTrace from '../nexa-provenance-trace/NexaProvenanceTrace'

import type {
  NexaAnswerAction,
  NexaAnswerActionPlanRisk,
  NexaAnswerActionPlanRiskSeverity,
  NexaAnswerActionPlanSpec,
  NexaAnswerActionPlanTradeOff,
  NexaAnswerActionPlanTradeOffTone,
  NexaAnswerBubbleProps,
  NexaAnswerChartCompositionPoint,
  NexaAnswerChartMode,
  NexaAnswerChartSeries,
  NexaAnswerChartSeriesPoint,
  NexaAnswerChartTone,
  NexaAnswerMetricDeltaTone,
  NexaAnswerMetricSummaryItem,
  NexaAnswerMetricSummarySpec,
  NexaCompactAnswerBubbleProps
} from './nexa-answer-bubble-types'
import { resolveNexaAnswerBubbleVariant } from './nexa-answer-bubble-controller'

const CHART_MODE_SELECTOR_ARIA_LABEL = 'Tipo de gráfica de respuesta enriquecida'

// Fallback cuando el canvas no thread-ea el id real del panel de proof. El owner del
// panel de evidencia es el canvas (CanvasProof); aria-controls debe apuntar a ESE id.
const PROOF_DISCLOSURE_FALLBACK_ID = 'nexa-answers-proof-disclosure'

const ChartBodyPlaceholder = ({ height }: { height: number }) => {
  const theme = useTheme()

  return (
    <Box
      aria-hidden
      sx={{
        blockSize: height,
        inlineSize: '100%',
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: alpha(theme.palette.primary.main, 0.025)
      }}
    />
  )
}

const formatChartValue = (value: number, suffix = 'pts') => `${Math.round(value)} ${suffix}`

const getNumericValue = (row: NexaAnswerChartSeriesPoint | undefined, key: string) => {
  const value = row?.[key]

  return typeof value === 'number' ? value : 0
}

const ChartTooltip = ({
  active,
  payload,
  label,
  valueSuffix
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: { label?: string } }>
  label?: string
  valueSuffix?: string
}) => {
  const theme = useTheme()

  if (!active || !payload?.length) return null

  return (
    <Box
      role='status'
      sx={{
        px: 3,
        py: 2,
        bgcolor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.sm}px`,
        boxShadow: theme.greenhouseElevation.floating.boxShadow
      }}
    >
      {label ? (
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
          {label}
        </Typography>
      ) : null}
      <Stack spacing={0.75}>
        {payload.map(item => (
          <Stack key={`${item.name}-${item.value}`} direction='row' spacing={1.5} alignItems='center'>
            <Box sx={{ inlineSize: 8, blockSize: 8, borderRadius: '50%', bgcolor: item.color ?? 'primary.main' }} />
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {item.payload?.label ?? item.name}: {typeof item.value === 'number' ? formatChartValue(item.value, valueSuffix) : item.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}

const ScreenReaderChartTable = ({ data, series }: { data: NexaAnswerChartSeriesPoint[]; series: NexaAnswerChartSeries[] }) => (
  <Box component='table' sx={visuallyHidden}>
    <caption>Datos usados en la respuesta enriquecida</caption>
    <thead>
      <tr>
        <th>Periodo</th>
        {series.map(item => (
          <th key={item.key}>{item.label}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {data.map(row => (
        <tr key={row.label}>
          <td>{row.label}</td>
          {series.map(item => (
            <td key={item.key}>{getNumericValue(row, item.key)}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </Box>
)

const useChartColors = () => {
  const theme = useTheme()

  return {
    grid: alpha(theme.palette.text.primary, 0.08),
    axis: theme.palette.text.secondary,
    tone: {
      primary: GH_COLORS.chart.categorical[0],
      secondary: GH_COLORS.chart.categorical[1],
      success: GH_COLORS.chart.categorical[2]
    } satisfies Record<NexaAnswerChartTone, string>
  }
}

const useMetricSummaryColors = () => {
  const theme = useTheme()

  return {
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
    neutral: theme.palette.text.secondary
  } satisfies Record<NexaAnswerMetricDeltaTone, string>
}

const TrendChart = ({
  data,
  series,
  valueSuffix
}: {
  data: NexaAnswerChartSeriesPoint[]
  series: NexaAnswerChartSeries[]
  valueSuffix?: string
}) => {
  const colors = useChartColors()
  const prefersReducedMotion = useReducedMotion()
  const gradientId = useId().replace(/[:]/g, '')
  const primarySeries = series[0]

  return (
    <AppRecharts>
      <ResponsiveContainer width='100%' height={220}>
        <AreaChart data={data} margin={{ top: 16, right: 24, bottom: 12, left: 8 }}>
          {primarySeries ? (
            <defs>
              <linearGradient id={`nexa-answer-${primarySeries.key}-${gradientId}`} x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor={colors.tone[primarySeries.tone]} stopOpacity={0.2} />
                <stop offset='95%' stopColor={colors.tone[primarySeries.tone]} stopOpacity={0.02} />
              </linearGradient>
            </defs>
          ) : null}
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis dataKey='label' tickLine={false} axisLine={false} tick={{ fill: colors.axis }} tickMargin={10} />
          <YAxis width={64} tickLine={false} axisLine={false} tick={{ fill: colors.axis }} tickMargin={8} tickFormatter={value => formatChartValue(Number(value), valueSuffix)} />
          <RechartsTooltip content={<ChartTooltip valueSuffix={valueSuffix} />} cursor={{ stroke: colors.grid }} />
          {series.map((item, index) => (
            <Area
              key={item.key}
              type='monotone'
              dataKey={item.key}
              name={item.label}
              stroke={colors.tone[item.tone]}
              fill={index === 0 ? `url(#nexa-answer-${item.key}-${gradientId})` : 'transparent'}
              fillOpacity={index === 0 ? 1 : 0}
              strokeWidth={index === 0 ? 3 : 2}
              dot={{ r: index === 0 ? 3 : 2.5, strokeWidth: 2 }}
              activeDot={{ r: index === 0 ? 5 : 4.5 }}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={600}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </AppRecharts>
  )
}

const ComparisonChart = ({
  data,
  series,
  valueSuffix
}: {
  data: NexaAnswerChartSeriesPoint[]
  series: NexaAnswerChartSeries[]
  valueSuffix?: string
}) => {
  const theme = useTheme()
  const colors = useChartColors()
  const prefersReducedMotion = useReducedMotion()
  const compact = useMediaQuery(theme.breakpoints.down('sm'))
  const latest = data[data.length - 1]

  const chartData = series.map(item => ({
    label: item.label,
    compactLabel: item.compactLabel ?? item.label,
    value: getNumericValue(latest, item.key),
    fill: colors.tone[item.tone]
  }))

  if (compact) {
    return (
      <AppRecharts>
        <ResponsiveContainer width='100%' height={220}>
          <BarChart data={chartData} margin={{ top: 16, right: 8, bottom: 12, left: 0 }} barCategoryGap='28%'>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis dataKey='compactLabel' tickLine={false} axisLine={false} tick={{ fill: colors.axis }} tickMargin={10} interval={0} />
            <YAxis width={48} domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: colors.axis }} tickMargin={8} tickFormatter={value => formatChartValue(Number(value), valueSuffix)} />
            <RechartsTooltip content={<ChartTooltip valueSuffix={valueSuffix} />} cursor={{ fill: colors.grid }} />
            <Bar dataKey='value' name='Señal' radius={[8, 8, 0, 0]} isAnimationActive={!prefersReducedMotion} animationDuration={600}>
              {chartData.map(item => (
                <Cell key={item.label} fill={item.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </AppRecharts>
    )
  }

  return (
    <AppRecharts>
      <ResponsiveContainer width='100%' height={220}>
        <BarChart data={chartData} layout='vertical' margin={{ top: 16, right: 24, bottom: 8, left: 18 }} barCategoryGap='28%'>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis type='number' domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: colors.axis }} tickMargin={10} tickFormatter={value => formatChartValue(Number(value), valueSuffix)} />
          <YAxis type='category' dataKey='label' width={112} tickLine={false} axisLine={false} tick={{ fill: colors.axis }} tickMargin={8} />
          <RechartsTooltip content={<ChartTooltip valueSuffix={valueSuffix} />} cursor={{ fill: colors.grid }} />
          <Bar dataKey='value' name='Señal' radius={[0, 8, 8, 0]} isAnimationActive={!prefersReducedMotion} animationDuration={600}>
            {chartData.map(item => (
              <Cell key={item.label} fill={item.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </AppRecharts>
  )
}

const CompositionChart = ({ data }: { data: NexaAnswerChartCompositionPoint[] }) => {
  const theme = useTheme()
  const colors = useChartColors()
  const prefersReducedMotion = useReducedMotion()
  const compact = useMediaQuery(theme.breakpoints.down('sm'))
  const chartData = useMemo(() => data.map(item => ({ ...item, fill: colors.tone[item.tone] })), [colors.tone, data])

  return (
    <AppRecharts>
      <Box sx={{ px: { xs: 1, sm: 2 }, '& .recharts-surface': { overflow: 'visible' } }}>
        <ResponsiveContainer width='100%' height={compact ? 236 : 232}>
          <PieChart margin={{ top: 20, right: 32, bottom: 20, left: 32 }}>
            <Pie
              data={chartData}
              dataKey='value'
              nameKey='label'
              cx='50%'
              cy='50%'
              startAngle={90}
              endAngle={-270}
              innerRadius={compact ? 48 : 54}
              outerRadius={compact ? 76 : 84}
              paddingAngle={0}
              stroke='none'
              strokeWidth={0}
              isAnimationActive={!prefersReducedMotion}
              animationBegin={0}
              animationDuration={600}
            >
              {chartData.map(item => (
                <Cell key={item.label} fill={item.fill} />
              ))}
            </Pie>
            <RechartsTooltip content={<ChartTooltip valueSuffix='%' />} />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </AppRecharts>
  )
}

const ChartLegend = ({
  composition,
  mode,
  series,
  latestPoint,
  valueSuffix
}: {
  composition: NexaAnswerChartCompositionPoint[]
  mode: NexaAnswerChartMode
  series: NexaAnswerChartSeries[]
  latestPoint?: NexaAnswerChartSeriesPoint
  valueSuffix?: string
}) => {
  const colors = useChartColors()

  const items =
    mode === 'composition'
      ? composition.map(item => ({ label: item.label, color: colors.tone[item.tone], value: `${item.value}%` }))
      : series.map(item => ({
          label: item.label,
          color: colors.tone[item.tone],
          value: formatChartValue(getNumericValue(latestPoint, item.key), valueSuffix)
        }))

  return (
    <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
      {items.map(item => (
        <Stack key={item.label} direction='row' spacing={1.5} alignItems='center'>
          <Box sx={{ inlineSize: 9, blockSize: 9, borderRadius: '50%', bgcolor: item.color }} />
          <Typography variant='disclosureText' color='text.secondary'>
            {item.label} · {item.value}
          </Typography>
        </Stack>
      ))}
    </Stack>
  )
}

const AnswerChartBlock = ({ chart }: { chart: NonNullable<NexaAnswerBubbleProps['chart']> }) => {
  const theme = useTheme()
  const [mode, setMode] = useState<NexaAnswerChartMode>('trend')
  // Recharts mide su contenedor en cliente; renderizarlo en SSR produce un mismatch de
  // hidratación. Diferimos el SVG hasta mount con un placeholder del mismo alto (sin CLS).
  const [mounted, setMounted] = useState(false)
  const latestPoint = chart.trend[chart.trend.length - 1]
  const chartTitleLabel = getNexaExpressiveTextPlainText(chart.title)
  const chartHelperLabel = getNexaExpressiveTextPlainText(chart.helper)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Una respuesta nueva (otro turno/answer) vuelve al default Tendencia: el modo de chart
  // es disclosure del turno, no estado global de la surface.
  useEffect(() => {
    setMode('trend')
  }, [chartTitleLabel])

  const chartBody = !mounted ? (
    <ChartBodyPlaceholder height={220} />
  ) : (
    {
      trend: <TrendChart data={chart.trend} series={chart.series} valueSuffix={chart.valueSuffix} />,
      comparison: <ComparisonChart data={chart.trend} series={chart.series} valueSuffix={chart.valueSuffix} />,
      composition: <CompositionChart data={chart.composition} />
    }[mode]
  )

  const selectedMode = chart.modes.find(option => option.mode === mode)

  return (
    <Box
      data-capture='nexa-answers-chart-variant'
      sx={{
        minInlineSize: 0
      }}
    >
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'flex-start' }}>
          <Stack spacing={0.75} sx={{ minInlineSize: 0 }}>
            <NexaExpressiveText value={chart.title} variant='h6' />
            <NexaExpressiveText value={chart.helper} variant='caption' color='text.secondary' />
          </Stack>
          <ToggleButtonGroup
            exclusive
            size='small'
            value={mode}
            onChange={(_, nextMode: NexaAnswerChartMode | null) => {
              if (nextMode) setMode(nextMode)
            }}
            aria-label={CHART_MODE_SELECTOR_ARIA_LABEL}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', md: 'repeat(3, auto)' },
              '& .MuiToggleButton-root': {
                borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                px: { xs: 1.5, md: 2.5 },
                minInlineSize: { xs: 0, md: 96 }
              }
            }}
          >
            {chart.modes.map(option => (
              <ToggleButton key={option.mode} value={option.mode} aria-label={option.ariaLabel}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        <Box
          role='img'
          aria-label={`${chartTitleLabel}: ${selectedMode?.label ?? 'Vista'}; ${chartHelperLabel}`}
          sx={{ minInlineSize: 0 }}
        >
          {chartBody}
          <ScreenReaderChartTable data={chart.trend} series={chart.series} />
        </Box>

        <ChartLegend composition={chart.composition} mode={mode} series={chart.series} latestPoint={latestPoint} valueSuffix={chart.valueSuffix} />
      </Stack>
    </Box>
  )
}

const MetricSparkline = ({ metric, color }: { metric: NexaAnswerMetricSummaryItem; color: string }) => {
  const prefersReducedMotion = useReducedMotion()
  // Recharts mide su contenedor en cliente; renderizarlo en SSR produce un mismatch de hidratación.
  // Diferimos el SVG hasta mount; el Box wrapper ya reserva el alto (blockSize 42) → sin CLS. Mismo
  // patrón canónico que AnswerChartBlock (mounted guard).
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Box aria-hidden sx={{ inlineSize: '100%', blockSize: 42, minInlineSize: 0 }}>
      {mounted ? (
        <ResponsiveContainer width='100%' height='100%'>
          <AreaChart data={metric.trend} margin={{ top: 8, right: 0, bottom: 2, left: 0 }}>
            <Area
              type='monotone'
              dataKey='value'
              stroke={color}
              fill={color}
              fillOpacity={0.08}
              strokeWidth={2}
              dot={false}
              activeDot={false}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={520}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : null}
    </Box>
  )
}

const MetricDeltaPill = ({ label, tone }: { label: NexaAnswerMetricSummaryItem['deltaLabel']; tone: NexaAnswerMetricDeltaTone }) => {
  const colors = useMetricSummaryColors()
  const color = colors[tone]

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.75,
        borderRadius: '9999px',
        color,
        backgroundColor: alpha(color, 0.08),
        border: `1px solid ${alpha(color, 0.16)}`
      }}
    >
      <Box sx={{ inlineSize: 6, blockSize: 6, borderRadius: '50%', backgroundColor: color }} />
      <NexaExpressiveText value={label} variant='caption' sx={{ color: 'inherit', fontWeight: 700, lineHeight: 1 }} />
    </Box>
  )
}

/**
 * El número de una metric de la respuesta se ARMA con el contenido (Nexa moment): cuenta 0 → valor al aparecer,
 * reusando `AnimatedCounter animateFrom` (conteo confiable + never-hidden + reduced-motion horneados). El valor
 * viene como texto (`'68%'`, `'0.4'`, `'$1.2M'`); si se puede aislar un número limpio, cuenta preservando
 * prefijo/sufijo; si no (texto rico, rango, no-numérico), cae a render estático — degradación honesta.
 */
const parseCountableMetricValue = (text: string): { value: number; format: (n: number) => string } | null => {
  const match = text.trim().match(/^([^\d-]*)(-?\d+(?:[.,]\d+)?)(.*)$/)

  if (!match) return null

  const [, prefix, rawNumber, suffix] = match

  // Si el sufijo trae otro dígito (rango '3-5', '2 de 4'…) NO es un número limpio → estático (no contar raro).
  if (/\d/.test(suffix)) return null

  const normalized = rawNumber.replace(',', '.')
  const value = Number(normalized)

  if (!Number.isFinite(value)) return null

  const decimals = normalized.includes('.') ? (normalized.split('.')[1]?.length ?? 0) : 0

  return { value, format: (n: number) => `${prefix}${n.toFixed(decimals)}${suffix}` }
}

const MetricValue = ({ value }: { value: NexaAnswerMetricSummaryItem['value'] }) => {
  const countable = parseCountableMetricValue(getNexaExpressiveTextPlainText(value))

  // Texto rico / rango / no-numérico → estático (honesto, never-hidden).
  if (!countable) {
    return <NexaExpressiveText value={value} variant='h5' sx={{ fontFeatureSettings: '"tnum" 1' }} />
  }

  return (
    <Typography variant='h5' sx={{ fontFeatureSettings: '"tnum" 1' }}>
      <AnimatedCounter value={countable.value} animateFrom={0} duration={0.9} formatter={countable.format} />
    </Typography>
  )
}

const MetricSummaryCard = ({ metric, chartColor }: { metric: NexaAnswerMetricSummaryItem; chartColor: string }) => {
  const theme = useTheme()

  return (
    <Box
      component='li'
      sx={{
        minInlineSize: 0,
        display: 'grid',
        gridTemplateRows: 'auto auto 1fr',
        gap: 2,
        p: 3,
        border: `1px solid ${metric.emphasis ? alpha(theme.palette.primary.main, 0.2) : theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        backgroundColor: metric.emphasis ? alpha(theme.palette.primary.main, 0.045) : alpha(theme.palette.background.paper, 0.72)
      }}
    >
      <Stack direction='row' spacing={2} justifyContent='space-between' alignItems='flex-start' sx={{ minInlineSize: 0 }}>
        <Stack spacing={0.5} sx={{ minInlineSize: 0 }}>
          <NexaExpressiveText value={metric.label} variant='caption' color='text.secondary' />
          <MetricValue value={metric.value} />
        </Stack>
        <MetricDeltaPill label={metric.deltaLabel} tone={metric.deltaTone} />
      </Stack>

      {metric.helper ? (
        <NexaExpressiveText value={metric.helper} variant='disclosureText' color='text.secondary' />
      ) : null}

      <MetricSparkline metric={metric} color={chartColor} />
    </Box>
  )
}

const MetricSummaryBlock = ({ metricSummary }: { metricSummary: NexaAnswerMetricSummarySpec }) => {
  const theme = useTheme()
  const visibleMetrics = metricSummary.metrics.slice(0, 4)

  return (
    <Stack spacing={3} data-capture='nexa-answers-metric-summary-variant'>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ md: 'flex-end' }}>
        <Stack spacing={0.75} sx={{ minInlineSize: 0 }}>
          <NexaExpressiveText value={metricSummary.title} variant='h6' />
          <NexaExpressiveText value={metricSummary.helper} variant='caption' color='text.secondary' />
        </Stack>
      </Stack>

      <Box
        component='ol'
        sx={{
          m: 0,
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            xl: `repeat(${Math.min(Math.max(visibleMetrics.length, 2), 4)}, minmax(0, 1fr))`
          },
          gap: 2,
          minInlineSize: 0
        }}
      >
        {visibleMetrics.map((metric, index) => (
          <MetricSummaryCard key={metric.id} metric={metric} chartColor={GH_COLORS.chart.categorical[index % GH_COLORS.chart.categorical.length]} />
        ))}
      </Box>

      <Box
        sx={{
          border: `1px solid ${alpha(theme.palette.info.main, 0.16)}`,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          backgroundColor: alpha(theme.palette.info.main, 0.035),
          px: 3,
          py: 2
        }}
      >
        <NexaExpressiveText value={metricSummary.interpretation} variant='body2' color='text.secondary' />
      </Box>
    </Stack>
  )
}

const getTradeOffToneColor = (theme: Theme, tone: NexaAnswerActionPlanTradeOffTone) => {
  if (tone === 'positive') return theme.palette.success.main
  if (tone === 'caution') return theme.palette.warning.main

  return theme.palette.info.main
}

const getRiskSeverityColor = (theme: Theme, severity: NexaAnswerActionPlanRiskSeverity) => {
  if (severity === 'high') return theme.palette.error.main
  if (severity === 'medium') return theme.palette.warning.main

  return theme.palette.success.main
}

const ActionPlanDecisionPanel = ({ plan }: { plan: NexaAnswerActionPlanSpec }) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.045)} 0%, ${alpha(theme.palette.background.paper, 0.82)} 100%)`,
        px: { xs: 2.75, md: 3.5 },
        py: { xs: 2.5, md: 3 }
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', sm: 'flex-start' }}>
        <Box
          sx={{
            inlineSize: 32,
            blockSize: 32,
            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
            display: 'grid',
            placeItems: 'center',
            color: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            flex: '0 0 auto'
          }}
        >
          <i className='tabler-route-square' aria-hidden='true' />
        </Box>
        <Stack spacing={0.75} sx={{ minInlineSize: 0, maxInlineSize: 760 }}>
          <NexaExpressiveText value={plan.decisionLabel} variant='caption' color='text.secondary' sx={{ fontWeight: 600 }} />
          <NexaExpressiveText value={plan.decisionTitle} variant='h6' />
          <NexaExpressiveText value={plan.decisionBody} variant='body2' color='text.secondary' sx={{ maxInlineSize: '72ch' }} />
        </Stack>
      </Stack>
    </Box>
  )
}

const ActionPlanStep = ({
  step,
  index
}: {
  step: NexaAnswerActionPlanSpec['steps'][number]
  index: number
}) => {
  const theme = useTheme()

  return (
    <Stack direction='row' spacing={2.5} component='li' sx={{ minInlineSize: 0, position: 'relative' }}>
      <Box
        sx={{
          position: 'relative',
          inlineSize: 26,
          blockSize: 26,
          borderRadius: `${theme.shape.customBorderRadius.sm}px`,
          display: 'grid',
          placeItems: 'center',
          color: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          flex: '0 0 auto'
        }}
      >
        <Typography variant='caption' sx={{ color: 'inherit', fontWeight: 700, lineHeight: 1 }}>
          {index + 1}
        </Typography>
      </Box>
      <Stack spacing={0.5} sx={{ minInlineSize: 0 }}>
        <NexaExpressiveText value={step.title} variant='body2' sx={{ fontWeight: 600 }} />
        <NexaExpressiveText value={step.body} variant='body2' color='text.secondary' />
      </Stack>
    </Stack>
  )
}

const ActionPlanTradeOffCard = ({ item }: { item: NexaAnswerActionPlanTradeOff }) => {
  const theme = useTheme()
  const color = getTradeOffToneColor(theme, item.tone)

  return (
    <Box
      component='li'
      sx={{
        px: 0,
        py: 0
      }}
    >
      <Stack spacing={0.75}>
        <Stack direction='row' spacing={1.25} alignItems='center'>
          <Box sx={{ inlineSize: 7, blockSize: 7, borderRadius: '50%', backgroundColor: color, flex: '0 0 auto' }} />
          <NexaExpressiveText value={item.label} variant='body2' sx={{ fontWeight: 600 }} />
        </Stack>
        <NexaExpressiveText value={item.body} variant='body2' color='text.secondary' />
      </Stack>
    </Box>
  )
}

const ActionPlanRiskCard = ({ item }: { item: NexaAnswerActionPlanRisk }) => {
  const theme = useTheme()
  const color = getRiskSeverityColor(theme, item.severity)

  return (
    <Box
      component='li'
      sx={{
        px: 0,
        py: 0
      }}
    >
      <Stack spacing={0.75}>
        <Stack direction='row' spacing={1.25} alignItems='center'>
          <Box
            sx={{
              inlineSize: 24,
              blockSize: 24,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color,
              backgroundColor: alpha(color, 0.08),
              flex: '0 0 auto'
            }}
          >
            <Box component='i' className='tabler-alert-triangle' aria-hidden='true' />
          </Box>
          <NexaExpressiveText value={item.label} variant='body2' sx={{ fontWeight: 600 }} />
        </Stack>
        <NexaExpressiveText value={item.body} variant='body2' color='text.secondary' />
      </Stack>
    </Box>
  )
}

const ActionPlanBlock = ({ actionPlan }: { actionPlan: NexaAnswerActionPlanSpec }) => {
  const theme = useTheme()
  const visibleSteps = actionPlan.steps.slice(0, 4)
  const visibleTradeOffs = actionPlan.tradeOffs.slice(0, 3)
  const visibleRisks = actionPlan.risks.slice(0, 3)

  return (
    <Stack spacing={3} data-capture='nexa-answers-action-plan-variant'>
      <ActionPlanDecisionPanel plan={actionPlan} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.05fr) minmax(0, 0.95fr)' },
          gap: 3,
          alignItems: 'start',
          minInlineSize: 0
        }}
      >
        <Stack
          sx={{
            minInlineSize: 0,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            backgroundColor: alpha(theme.palette.background.paper, 0.58),
            overflow: 'hidden'
          }}
        >
          <Stack spacing={0.5} sx={{ px: 2.5, py: 2.25, borderBlockEnd: `1px solid ${alpha(theme.palette.divider, 0.72)}` }}>
            <Typography variant='h6'>Próximo movimiento</Typography>
            <Typography variant='caption' color='text.secondary'>
              Secuencia corta para convertir la recomendación en ejecución.
            </Typography>
          </Stack>
          <Stack
            component='ol'
            divider={<Divider flexItem sx={{ borderColor: alpha(theme.palette.divider, 0.72) }} />}
            sx={{ m: 0, p: 0, listStyle: 'none' }}
          >
            {visibleSteps.map((step, index) => (
              <Box key={step.id} sx={{ px: 2.5, py: 2 }}>
                <ActionPlanStep step={step} index={index} />
              </Box>
            ))}
          </Stack>
        </Stack>

        <Stack spacing={2.5} sx={{ minInlineSize: 0 }}>
          <Stack
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              backgroundColor: alpha(theme.palette.background.paper, 0.58),
              overflow: 'hidden'
            }}
          >
            <Stack spacing={0.5} sx={{ px: 2.5, py: 2.25, borderBlockEnd: `1px solid ${alpha(theme.palette.divider, 0.72)}` }}>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                Costo de la decisión
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Lo que Nexa asume al recomendar este camino.
              </Typography>
            </Stack>
            <Stack
              component='ol'
              divider={<Divider flexItem sx={{ borderColor: alpha(theme.palette.divider, 0.72) }} />}
              sx={{ m: 0, px: 2.5, py: 2, listStyle: 'none' }}
            >
              {visibleTradeOffs.map(item => (
                <ActionPlanTradeOffCard key={item.id} item={item} />
              ))}
            </Stack>
          </Stack>

          <Stack
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              backgroundColor: alpha(theme.palette.background.paper, 0.58),
              overflow: 'hidden'
            }}
          >
            <Stack spacing={0.5} sx={{ px: 2.5, py: 2.25, borderBlockEnd: `1px solid ${alpha(theme.palette.divider, 0.72)}` }}>
                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                  Riesgos antes de ejecutar
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Condiciones que pueden cambiar la recomendación.
                </Typography>
              </Stack>
            <Stack
              component='ol'
              divider={<Divider flexItem sx={{ borderColor: alpha(theme.palette.divider, 0.72) }} />}
              sx={{ m: 0, px: 2.5, py: 2, listStyle: 'none' }}
            >
              {visibleRisks.map(item => (
                <ActionPlanRiskCard key={item.id} item={item} />
              ))}
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  )
}

const TrustCue = ({
  cue,
  expanded,
  onToggle,
  proofPanelId
}: {
  cue: NexaAnswerBubbleProps['trustCue']
  expanded: boolean
  onToggle: () => void
  proofPanelId: string
}) => {
  const theme = useTheme()

  return (
    <Box
      data-capture='nexa-answers-trust-cue'
      sx={{
        borderBlockStart: `1px solid ${theme.palette.divider}`,
        backgroundColor: alpha(theme.palette.success.main, 0.035),
        px: { xs: 4, md: 5 },
        py: 3
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent='space-between'>
        <NexaProvenanceTrace variant='inline' trustCue={cue} />
        <GreenhouseButton
          variant='text'
          tone='secondary'
          size='small'
          trailingIconClassName={expanded ? 'tabler-chevron-up' : 'tabler-chevron-down'}
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={proofPanelId}
        >
          {expanded ? 'Ocultar base' : 'Ver base'}
        </GreenhouseButton>
      </Stack>
    </Box>
  )
}

const AnswerPoint = ({ point, index }: { point: NexaAnswerBubbleProps['points'][number]; index: number }) => {
  const theme = useTheme()

  return (
    <Stack
      direction='row'
      spacing={3}
      alignItems='flex-start'
      component='li'
      sx={{
        minInlineSize: 0,
        position: 'relative',
        '&:not(:last-of-type)::after': {
          content: '""',
          position: 'absolute',
          insetInlineStart: 15,
          insetBlockStart: 36,
          blockSize: { xs: 22, md: 18 },
          borderInlineStart: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`
        }
      }}
    >
      <Box
        sx={{
          inlineSize: 30,
          blockSize: 30,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          flex: '0 0 auto',
          color: theme.palette.primary.contrastText,
          backgroundColor: theme.palette.primary.main,
          boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.08)}`
        }}
      >
        <Typography variant='caption' sx={{ color: 'inherit', fontWeight: 700, lineHeight: 1 }}>
          {index + 1}
        </Typography>
      </Box>
      <Stack spacing={0.5} sx={{ minInlineSize: 0, pt: 0.25 }}>
        <NexaExpressiveText value={point.title} variant='body2' sx={{ fontWeight: 600 }} />
        <NexaExpressiveText value={point.body} variant='body2' color='text.secondary' />
      </Stack>
    </Stack>
  )
}

const AnswerActionBar = ({ actions }: { actions: NexaAnswerAction[] }) => (
  <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap data-capture='nexa-answers-rich-answer-actions'>
    {actions.map(action => (
      <GreenhouseButton
        key={action.label}
        kind={action.kind}
        variant={action.variant}
        tone={action.tone}
        size='small'
        leadingIconClassName={action.iconClassName}
        disabled={action.disabled}
        onClick={action.onClick}
      >
        {action.label}
      </GreenhouseButton>
    ))}
  </Stack>
)

const bubbleTailFill = (theme: Theme) => alpha(theme.palette.primary.main, 0.026)

const bubbleSurfaceFill = (theme: Theme) =>
  `linear-gradient(135deg, ${bubbleTailFill(theme)}, ${alpha(theme.palette.success.main, 0.018)} 56%, ${alpha(theme.palette.background.paper, 0)} 100%)`

const answerBubbleEntranceSx = {
  transformOrigin: '0 0',
  willChange: 'opacity, transform',
  '@keyframes nexa-answer-bubble-enter': {
    '0%': {
      opacity: 0,
      transform: 'translate3d(-3px, 9px, 0) scale(0.996)'
    },
    '72%': {
      opacity: 1
    },
    '100%': {
      opacity: 1,
      transform: 'translate3d(0, 0, 0) scale(1)'
    }
  },
  animation: `nexa-answer-bubble-enter ${motionCss.duration.long} ${motionCss.ease.emphasized} both`,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    transform: 'none',
    willChange: 'auto'
  }
}

const compactAnswerEntranceSx = {
  transformOrigin: '0 0',
  willChange: 'opacity, transform',
  '@keyframes nexa-compact-answer-enter': {
    '0%': {
      opacity: 0,
      transform: 'translate3d(0, 6px, 0) scale(0.998)'
    },
    '100%': {
      opacity: 1,
      transform: 'translate3d(0, 0, 0) scale(1)'
    }
  },
  animation: `nexa-compact-answer-enter ${motionCss.duration.medium} ${motionCss.ease.emphasized} both`,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    transform: 'none',
    willChange: 'auto'
  }
}

const AnswerBadge = ({ metaLabel, compact = false }: { metaLabel: NexaAnswerBubbleProps['metaLabel']; compact?: boolean }) => {
  const theme = useTheme()

  return (
    <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          px: compact ? 1.5 : 2,
          py: compact ? 0.75 : 1,
          borderRadius: `${theme.shape.customBorderRadius.sm}px`,
          color: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.12)
        }}
      >
        <i className='tabler-sparkles' aria-hidden='true' />
        <Typography variant='body2' sx={{ fontWeight: 600, color: 'inherit' }}>
          Respuesta enriquecida
        </Typography>
      </Box>
      <NexaExpressiveText value={metaLabel} variant='disclosureText' color='text.secondary' />
    </Stack>
  )
}

const ChartTrustRow = ({
  cue,
  expanded,
  onToggle,
  action,
  proofPanelId
}: {
  cue: NexaAnswerBubbleProps['trustCue']
  expanded: boolean
  onToggle: () => void
  action?: NexaAnswerAction
  proofPanelId: string
}) => {
  const theme = useTheme()

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent='space-between'
      data-capture='nexa-answers-trust-cue'
      sx={{
        borderBlockStart: `1px solid ${theme.palette.divider}`,
        pt: 3,
        minInlineSize: 0
      }}
    >
      <Stack direction='row' spacing={2} alignItems='center' sx={{ minInlineSize: 0 }}>
        <GreenhouseStatusDot tone={cue.tone} ariaLabel={getNexaExpressiveTextPlainText(cue.label)} />
        <NexaExpressiveText
          value={[{ text: getNexaExpressiveTextPlainText(cue.label) }, { text: ' · ', style: 'soft' }, { text: getNexaExpressiveTextPlainText(cue.detail), style: 'soft' }]}
          variant='caption'
          color='text.secondary'
          sx={{ minInlineSize: 0 }}
        />
      </Stack>
      <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap>
        {action ? (
          <GreenhouseButton
            kind={action.kind ?? 'inlineAction'}
            variant='text'
            tone={action.tone}
            size='small'
            leadingIconClassName={action.iconClassName}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </GreenhouseButton>
        ) : null}
        <GreenhouseButton
          kind='inlineAction'
          variant='text'
          tone='secondary'
          size='small'
          trailingIconClassName={expanded ? 'tabler-chevron-up' : 'tabler-chevron-down'}
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={proofPanelId}
        >
          {expanded ? 'Ocultar base' : 'Ver base'}
        </GreenhouseButton>
      </Stack>
    </Stack>
  )
}

const NexaAnswerBubble = ({
  variant,
  kind,
  title,
  body,
  metaLabel,
  points,
  actions,
  trustCue,
  proofOpen,
  onProofToggle,
  proofPanelId = PROOF_DISCLOSURE_FALLBACK_ID,
  thinking = false,
  chart,
  metricSummary,
  actionPlan
}: NexaAnswerBubbleProps) => {
  const theme = useTheme()
  const resolvedVariant = resolveNexaAnswerBubbleVariant({ kind, variant })
  const shouldRenderChart = resolvedVariant === 'chart' && chart
  const shouldRenderMetricSummary = resolvedVariant === 'metricSummary' && metricSummary
  const shouldRenderActionPlan = resolvedVariant === 'actionPlan' && actionPlan
  const primaryChartAction = actions[0]
  const chartLeadingSeries = chart?.series[0]
  const chartLatestPoint = chart?.trend[chart.trend.length - 1]
  const chartLeadingValue = chartLeadingSeries ? getNumericValue(chartLatestPoint, chartLeadingSeries.key) : null

  return (
    <Box
      data-capture='nexa-answers-rich-answer-card'
      data-variant={resolvedVariant}
      data-kind={kind}
      aria-busy={thinking ? true : undefined}
      sx={{
        ml: { xs: 1.5, md: 2 },
        border: `1px solid ${thinking ? alpha(theme.palette.primary.main, 0.34) : theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px ${theme.shape.customBorderRadius.lg}px ${theme.shape.customBorderRadius.lg}px ${theme.shape.customBorderRadius.xs}px`,
        backgroundColor: theme.palette.background.paper,
        boxShadow: thinking ? theme.greenhouseElevation.floating.boxShadow : theme.greenhouseElevation.raised.boxShadow,
        position: 'relative',
        isolation: 'isolate',
        overflow: 'visible',
        transition: theme.transitions.create(['border-color', 'box-shadow'], {
          duration: theme.transitions.duration.short
        }),
        '&::before': {
          content: '""',
          position: 'absolute',
          insetInlineStart: -13,
          insetBlockStart: 38,
          inlineSize: 16,
          blockSize: 20,
          background: bubbleSurfaceFill(theme),
          clipPath: 'polygon(100% 0, 0 50%, 100% 100%)',
          filter: `drop-shadow(-1px 0 0 ${thinking ? alpha(theme.palette.primary.main, 0.34) : theme.palette.divider})`,
          pointerEvents: 'none',
          zIndex: 2
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          insetInlineStart: 0,
          insetBlockStart: 38,
          inlineSize: 2,
          blockSize: 20,
          background: bubbleSurfaceFill(theme),
          pointerEvents: 'none',
          zIndex: 3
        },
        ...answerBubbleEntranceSx
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1, overflow: 'hidden', borderRadius: 'inherit', backgroundColor: theme.palette.background.paper }}>
        {shouldRenderChart ? (
          <Stack
            spacing={3}
            sx={{
              px: { xs: 3, sm: 4, md: 5 },
              py: { xs: 3, md: 4 },
              background: bubbleSurfaceFill(theme)
            }}
          >
            <AnswerBadge metaLabel={metaLabel} compact />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'flex-end' }} justifyContent='space-between'>
              <Stack spacing={1} sx={{ maxInlineSize: 720, minInlineSize: 0 }}>
                <NexaExpressiveText value={title} variant='h5' />
                <NexaExpressiveText
                  value={body}
                  variant='body2'
                  color='text.secondary'
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                />
              </Stack>
              <Box
                sx={{
                  display: { xs: 'none', md: 'block' },
                  textAlign: 'end',
                  flex: '0 0 auto'
                }}
              >
                <Typography variant='caption' color='text.secondary'>
                  {chartLeadingSeries?.label ?? 'Señal líder'}
                </Typography>
                <Typography variant='h5'>
                  {typeof chartLeadingValue === 'number' ? formatChartValue(chartLeadingValue, chart?.valueSuffix) : null}
                </Typography>
              </Box>
            </Stack>
            <AnswerChartBlock chart={chart} />
            <ChartTrustRow cue={trustCue} expanded={proofOpen} onToggle={onProofToggle} action={primaryChartAction} proofPanelId={proofPanelId} />
          </Stack>
        ) : shouldRenderMetricSummary ? (
          <Stack
            spacing={3}
            sx={{
              px: { xs: 3, md: 4 },
              py: { xs: 3, md: 4 },
              background: bubbleSurfaceFill(theme)
            }}
          >
            <AnswerBadge metaLabel={metaLabel} compact />
            <Stack spacing={1} sx={{ maxInlineSize: 820, minInlineSize: 0 }}>
              <NexaExpressiveText value={title} variant='h5' />
              <NexaExpressiveText value={body} variant='body2' color='text.secondary' sx={{ maxInlineSize: '68ch' }} />
            </Stack>
            <MetricSummaryBlock metricSummary={metricSummary} />
            <ChartTrustRow cue={trustCue} expanded={proofOpen} onToggle={onProofToggle} action={primaryChartAction} proofPanelId={proofPanelId} />
          </Stack>
        ) : shouldRenderActionPlan ? (
          <Stack
            spacing={3}
            sx={{
              px: { xs: 3, md: 4 },
              py: { xs: 3, md: 4 },
              background: bubbleSurfaceFill(theme)
            }}
          >
            <AnswerBadge metaLabel={metaLabel} compact />
            <Stack spacing={1} sx={{ maxInlineSize: 780, minInlineSize: 0 }}>
              <NexaExpressiveText value={title} variant='h5' />
              <NexaExpressiveText value={body} variant='body2' color='text.secondary' />
            </Stack>
            <ActionPlanBlock actionPlan={actionPlan} />
            <AnswerActionBar actions={actions} />
            <ChartTrustRow cue={trustCue} expanded={proofOpen} onToggle={onProofToggle} proofPanelId={proofPanelId} />
          </Stack>
        ) : (
          <>
            <Box
              sx={{
                px: { xs: 4, md: 5 },
                py: { xs: 4, md: 5 },
                background: bubbleSurfaceFill(theme)
              }}
            >
              <Stack spacing={3} sx={{ minInlineSize: 0 }}>
                <AnswerBadge metaLabel={metaLabel} />
                <Stack spacing={2} sx={{ maxInlineSize: 920 }}>
                  <NexaExpressiveText value={title} variant='h5' />
                  <NexaExpressiveText value={body} variant='body2' color='text.secondary' />
                </Stack>
              </Stack>
            </Box>

            <Divider />

            <Stack spacing={4} sx={{ px: { xs: 4, md: 5 }, py: { xs: 4, md: 4.5 } }}>
              <Stack component='ol' spacing={3} sx={{ m: 0, p: 0, listStyle: 'none', maxInlineSize: 980 }}>
                {points.map((point, index) => (
                  <AnswerPoint key={`${index}-${getNexaExpressiveTextPlainText(point.title)}`} point={point} index={index} />
                ))}
              </Stack>

              <AnswerActionBar actions={actions} />
            </Stack>

            <TrustCue cue={trustCue} expanded={proofOpen} onToggle={onProofToggle} proofPanelId={proofPanelId} />
          </>
        )}
      </Box>
    </Box>
  )
}

export const NexaCompactAnswerBubble = ({ title, body, endSlot }: NexaCompactAnswerBubbleProps) => {
  const theme = useTheme()

  return (
    <Box
      data-capture='nexa-answers-compact-answer-card'
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.greenhouseElevation.raised.boxShadow,
        overflow: 'hidden',
        ...compactAnswerEntranceSx
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={3}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent='space-between'
        sx={{ px: { xs: 4, md: 5 }, py: 3.5 }}
      >
        <Stack spacing={1} sx={{ minInlineSize: 0 }}>
          <NexaExpressiveText value={title} variant='h6' />
          <NexaExpressiveText value={body} variant='body2' color='text.secondary' />
        </Stack>
        {endSlot}
      </Stack>
    </Box>
  )
}

export default NexaAnswerBubble
