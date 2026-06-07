'use client'

import { useId, useMemo } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { alpha, useTheme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import AppRecharts from '@/libs/styles/AppRecharts'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from '@/libs/Recharts'

import GreenhouseChip, { type GreenhouseChipTone } from './GreenhouseChip'
import { GREENHOUSE_CHART_CHROME_TOKENS } from './greenhouse-chart-controller'

export type GreenhouseMetricBreakdownTone = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

export type GreenhouseMetricBreakdownDeltaTone = 'success' | 'warning' | 'error' | 'neutral'

export type GreenhouseMetricBreakdownPoint = {
  label: string
  value: number
}

export type GreenhouseMetricBreakdownMetric = {
  id: string
  label: string
  value: string
  icon: string
  tone?: GreenhouseMetricBreakdownTone
  progress: number
  ariaLabel?: string
}

export type GreenhouseMetricBreakdownChartCardVariant = 'weeklyBarSummary'

export type GreenhouseMetricBreakdownChartCardKind =
  | 'earningReports'
  | 'financialSnapshot'
  | 'operationalSnapshot'
  | 'custom'

export type GreenhouseMetricBreakdownChartCardProps = {
  title: string
  subtitle?: string
  heroValue: string
  deltaLabel?: string
  deltaTone?: GreenhouseMetricBreakdownDeltaTone
  description?: string | string[]
  series: GreenhouseMetricBreakdownPoint[]
  metrics: GreenhouseMetricBreakdownMetric[]
  variant?: GreenhouseMetricBreakdownChartCardVariant
  kind?: GreenhouseMetricBreakdownChartCardKind
  highlightedIndex?: number
  maxValue?: number
  actionLabel?: string
  chartAriaLabel?: string
  valueFormatter?: (value: number) => string
  dataCapture?: string
}

type TooltipPayload = {
  value?: number
  payload?: GreenhouseMetricBreakdownPoint
}

const defaultValueFormatter = (value: number): string => String(value)

const clampProgress = (value: number): number => Math.min(Math.max(value, 0), 100)

const toDeltaChipTone = (tone: GreenhouseMetricBreakdownDeltaTone): GreenhouseChipTone =>
  tone === 'neutral' ? 'default' : tone

const resolveMaxValue = (series: GreenhouseMetricBreakdownPoint[], explicitMax?: number): number => {
  if (explicitMax && explicitMax > 0) return explicitMax

  const max = Math.max(...series.map(item => item.value), 0)

  return max > 0 ? Math.ceil(max / 25) * 25 : 100
}

const GreenhouseMetricBreakdownTooltip = ({
  active,
  payload,
  label,
  color,
  valueFormatter
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
  color: string
  valueFormatter: (value: number) => string
}) => {
  const value = payload?.[0]?.value

  if (!active || value == null) return null

  return (
    <Box
      role='status'
      sx={{
        px: 3,
        py: 2,
        minWidth: GREENHOUSE_CHART_CHROME_TOKENS.tooltip.minInlineSize.compact,
        bgcolor: 'background.paper',
        border: theme => `1px solid ${theme.palette.divider}`,
        borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
        boxShadow: 'var(--mui-customShadows-sm)'
      }}
    >
      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Stack direction='row' alignItems='center' spacing={1.5}>
        <Box
          sx={{
            width: GREENHOUSE_CHART_CHROME_TOKENS.tooltip.markerSize,
            height: GREENHOUSE_CHART_CHROME_TOKENS.tooltip.markerSize,
            borderRadius: '50%',
            bgcolor: color,
            flexShrink: 0
          }}
        />
        <Typography variant='monoId'>
          {valueFormatter(value)}
        </Typography>
      </Stack>
    </Box>
  )
}

const GreenhouseMetricBreakdownChartCard = ({
  title,
  subtitle,
  heroValue,
  deltaLabel,
  deltaTone = 'success',
  description,
  series,
  metrics,
  variant = 'weeklyBarSummary',
  kind = 'custom',
  highlightedIndex,
  maxValue,
  actionLabel = 'Mas opciones',
  chartAriaLabel,
  valueFormatter = defaultValueFormatter,
  dataCapture
}: GreenhouseMetricBreakdownChartCardProps) => {
  const theme = useTheme()
  const isCompact = useMediaQuery(theme.breakpoints.down('sm'))
  const chartDescriptionId = useId().replace(/:/g, '')
  const resolvedMaxValue = resolveMaxValue(series, maxValue)

  const resolvedHighlightedIndex =
    highlightedIndex ?? series.findIndex(item => item.value === Math.max(...series.map(point => point.value)))

  const descriptionLines = Array.isArray(description) ? description : description ? [description] : []

  const toneColor = (tone: GreenhouseMetricBreakdownTone = 'success') => theme.palette[tone].main

  const chartColor = theme.palette.success.main

  const chartSoftColor = alpha(
    chartColor,
    theme.palette.mode === 'dark'
      ? GREENHOUSE_CHART_CHROME_TOKENS.opacity.weeklyInactiveBar.dark
      : GREENHOUSE_CHART_CHROME_TOKENS.opacity.weeklyInactiveBar.light
  )

  const chartSummary = `${title}${subtitle ? `, ${subtitle}` : ''}: ${series
    .map(item => `${item.label} ${valueFormatter(item.value)}`)
    .join(', ')}`

  const metricsSummary = metrics.map(metric => `${metric.label} ${metric.value}, ${clampProgress(metric.progress)}%`).join('; ')

  const resolvedChartAriaLabel = chartAriaLabel ?? `${title}${subtitle ? `, ${subtitle}` : ''}. Weekly breakdown`

  const chartData = useMemo(() => series.map(point => ({ ...point })), [series])

  return (
    <Card
      elevation={0}
      data-capture={dataCapture}
      data-chart-variant={variant}
      data-chart-kind={kind}
      sx={{
        width: '100%',
        maxWidth: GREENHOUSE_CHART_CHROME_TOKENS.card.compactMaxInlineSize,
        borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
        border: theme => `1px solid ${alpha(theme.palette.divider, GREENHOUSE_CHART_CHROME_TOKENS.opacity.border)}`,
        boxShadow: 'var(--mui-customShadows-md)',
        overflow: 'hidden'
      }}
    >
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={3} sx={{ p: 6, pb: 4 }}>
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant='h5' sx={{ color: 'text.primary' }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant='body2' color='text.secondary'>
                {subtitle}
              </Typography>
            ) : null}
          </Stack>
          <IconButton aria-label={actionLabel} size='small' sx={{ color: 'text.disabled', mt: -1, mr: -1 }}>
            <i className='tabler-dots-vertical' aria-hidden='true' />
          </IconButton>
        </Stack>

        <Box sx={{ px: { xs: 4, sm: 6 }, pb: { xs: 4, sm: 6 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 0.88fr) minmax(190px, 1fr)' },
              gap: { xs: 5, sm: 6 },
              alignItems: 'end',
              mb: 5
            }}
          >
            <Stack spacing={2.5} sx={{ minWidth: 0 }}>
              <Stack direction='row' alignItems='center' spacing={2} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                <Typography
                  component='p'
                  variant='kpiValue'
                  sx={{
                    color: 'text.primary'
                  }}
                >
                  {heroValue}
                </Typography>
                {deltaLabel ? (
                  <GreenhouseChip size='small' variant='label' tone={toDeltaChipTone(deltaTone)} kind='metric' label={deltaLabel} />
                ) : null}
              </Stack>
              {descriptionLines.length ? (
                <Stack spacing={0.25}>
                  {descriptionLines.map(line => (
                    <Typography key={line} variant='body2' color='text.secondary'>
                      {line}
                    </Typography>
                  ))}
                </Stack>
              ) : null}
            </Stack>

            {chartData.length ? (
              <>
                <AppRecharts>
                  <Box role='img' aria-label={resolvedChartAriaLabel} aria-describedby={chartDescriptionId}>
                    <ResponsiveContainer
                      width='100%'
                      height={
                        isCompact
                          ? GREENHOUSE_CHART_CHROME_TOKENS.chart.weeklyHeight.compact
                          : GREENHOUSE_CHART_CHROME_TOKENS.chart.weeklyHeight.comfortable
                      }
                    >
                      <BarChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap='30%'>
                        <XAxis
                          dataKey='label'
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          tick={{ fill: 'var(--mui-palette-text-disabled)' }}
                          dy={10}
                        />
                        <YAxis hide domain={[0, resolvedMaxValue]} />
                        <RechartsTooltip
                          cursor={{ fill: alpha(theme.palette.text.primary, GREENHOUSE_CHART_CHROME_TOKENS.opacity.cursor) }}
                          wrapperStyle={{ outline: 'none', zIndex: 10 }}
                          content={
                            <GreenhouseMetricBreakdownTooltip
                              color={chartColor}
                              valueFormatter={valueFormatter}
                            />
                          }
                        />
                        <Bar
                          dataKey='value'
                          radius={[
                            GREENHOUSE_CHART_CHROME_TOKENS.chart.barRadius,
                            GREENHOUSE_CHART_CHROME_TOKENS.chart.barRadius,
                            0,
                            0
                          ]}
                          barSize={
                            isCompact
                              ? GREENHOUSE_CHART_CHROME_TOKENS.chart.weeklyBarSize.compact
                              : GREENHOUSE_CHART_CHROME_TOKENS.chart.weeklyBarSize.comfortable
                          }
                          isAnimationActive
                        >
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`${entry.label}-${entry.value}`}
                              fill={index === resolvedHighlightedIndex ? chartColor : chartSoftColor}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </AppRecharts>
                <Box id={chartDescriptionId} sx={visuallyHidden}>
                  {chartSummary}. {metricsSummary}
                </Box>
              </>
            ) : (
              <Box role='status' sx={{ py: 6 }}>
                <Typography variant='body2' color='text.secondary'>
                  Sin datos para esta serie.
                </Typography>
              </Box>
            )}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: `repeat(${Math.max(metrics.length, 1)}, minmax(0, 1fr))` },
              gap: { xs: 3, sm: 4 },
              p: { xs: 4, sm: 5 },
              border: theme => `1px solid ${alpha(theme.palette.divider, GREENHOUSE_CHART_CHROME_TOKENS.opacity.border)}`,
              borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
              bgcolor: theme =>
                alpha(
                  theme.palette.background.default,
                  theme.palette.mode === 'dark'
                    ? GREENHOUSE_CHART_CHROME_TOKENS.opacity.neutralSurface.dark
                    : GREENHOUSE_CHART_CHROME_TOKENS.opacity.neutralSurface.light
                )
            }}
          >
            {metrics.map(metric => {
              const progress = clampProgress(metric.progress)
              const metricColor = toneColor(metric.tone)

              return (
                <Stack key={metric.id} spacing={3} sx={{ minWidth: 0 }}>
                  <Stack direction='row' spacing={2.25} alignItems='center' sx={{ minWidth: 0 }}>
                    <Box
                      sx={{
                        width: GREENHOUSE_CHART_CHROME_TOKENS.icon.container,
                        height: GREENHOUSE_CHART_CHROME_TOKENS.icon.container,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                        bgcolor: alpha(
                          metricColor,
                          theme.palette.mode === 'dark'
                            ? GREENHOUSE_CHART_CHROME_TOKENS.opacity.semanticSurface.dark
                            : GREENHOUSE_CHART_CHROME_TOKENS.opacity.semanticSurface.light
                        ),
                        color: metricColor
                      }}
                    >
                      <Box
                        component='i'
                        className={metric.icon}
                        sx={{ fontSize: GREENHOUSE_CHART_CHROME_TOKENS.icon.metric }}
                        aria-hidden='true'
                      />
                    </Box>
                    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                      <Typography variant='body2' color='text.secondary' noWrap>
                        {metric.label}
                      </Typography>
                      <Typography
                        variant='monoAmount'
                        color='text.primary'
                      >
                        {metric.value}
                      </Typography>
                    </Stack>
                  </Stack>
                  <Box
                    role='meter'
                    aria-label={metric.ariaLabel ?? `${metric.label} progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    sx={{
                      width: 1,
                      height: GREENHOUSE_CHART_CHROME_TOKENS.tooltip.markerSize,
                      borderRadius: 999,
                      bgcolor: alpha(
                        metricColor,
                        theme.palette.mode === 'dark'
                          ? GREENHOUSE_CHART_CHROME_TOKENS.opacity.meterTrack.dark
                          : GREENHOUSE_CHART_CHROME_TOKENS.opacity.meterTrack.light
                      ),
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      aria-hidden='true'
                      sx={{
                        width: `${progress}%`,
                        height: 1,
                        borderRadius: 999,
                        bgcolor: metricColor
                      }}
                    />
                  </Box>
                </Stack>
              )
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default GreenhouseMetricBreakdownChartCard
