'use client'

import { useId, useMemo } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { alpha, useTheme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import AppRecharts from '@/libs/styles/AppRecharts'
import { Bar, BarChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from '@/libs/Recharts'

import { GREENHOUSE_CHART_CHROME_TOKENS } from './greenhouse-chart-controller'

export type GreenhouseStackedDistributionTone = 'neutral' | 'success' | 'info' | 'ink' | 'primary' | 'secondary'

export type GreenhouseStackedDistributionSegment = {
  id: string
  label: string
  value: number
  detail?: string
  icon: string
  tone?: GreenhouseStackedDistributionTone
  ariaLabel?: string
}

export type GreenhouseStackedDistributionVariant = 'stackedStatus'

export type GreenhouseStackedDistributionKind = 'vehiclesOverview' | 'workflowDistribution' | 'capacityDistribution' | 'custom'

export type GreenhouseStackedDistributionChartCardProps = {
  title: string
  segments: GreenhouseStackedDistributionSegment[]
  variant?: GreenhouseStackedDistributionVariant
  kind?: GreenhouseStackedDistributionKind
  actionLabel?: string
  valueFormatter?: (value: number) => string
  total?: number
  chartAriaLabel?: string
  dataCapture?: string
}

type DistributionTooltipPayload = {
  dataKey?: string
  value?: number
  color?: string
  payload?: Record<string, number | string>
}

const defaultValueFormatter = (value: number): string => `${value.toFixed(1)}%`

const formatRenderableValue = (value: unknown, valueFormatter: (value: number) => string): string =>
  typeof value === 'number' ? valueFormatter(value) : value == null ? '' : String(value)

const resolveTotal = (segments: GreenhouseStackedDistributionSegment[], explicitTotal?: number): number => {
  if (explicitTotal && explicitTotal > 0) return explicitTotal

  const sum = segments.reduce((total, segment) => total + segment.value, 0)

  return sum > 0 ? sum : 100
}

const DistributionTooltip = ({
  active,
  payload,
  segments,
  valueFormatter
}: {
  active?: boolean
  payload?: DistributionTooltipPayload[]
  segments: GreenhouseStackedDistributionSegment[]
  valueFormatter: (value: number) => string
}) => {
  if (!active || !payload?.length) return null

  return (
    <Box
      role='status'
      sx={{
        px: 3,
        py: 2,
        minWidth: GREENHOUSE_CHART_CHROME_TOKENS.tooltip.minInlineSize.distribution,
        bgcolor: 'background.paper',
        border: theme => `1px solid ${theme.palette.divider}`,
        borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
        boxShadow: 'var(--mui-customShadows-sm)'
      }}
    >
      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
        Distribucion
      </Typography>
      <Stack spacing={0.75}>
        {payload
          .filter(item => typeof item.value === 'number')
          .map(item => {
            const segment = segments.find(s => s.id === item.dataKey)

            return (
              <Stack key={String(item.dataKey)} direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
                <Stack direction='row' alignItems='center' spacing={1.25} sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      width: GREENHOUSE_CHART_CHROME_TOKENS.tooltip.markerSize,
                      height: GREENHOUSE_CHART_CHROME_TOKENS.tooltip.markerSize,
                      borderRadius: '50%',
                      bgcolor: item.color,
                      flexShrink: 0
                    }}
                  />
                  <Typography variant='caption' color='text.primary' noWrap>
                    {segment?.label ?? item.dataKey}
                  </Typography>
                </Stack>
                <Typography variant='monoAmount'>
                  {formatRenderableValue(item.value, valueFormatter)}
                </Typography>
              </Stack>
            )
          })}
      </Stack>
    </Box>
  )
}

const GreenhouseStackedDistributionChartCard = ({
  title,
  segments,
  variant = 'stackedStatus',
  kind = 'custom',
  actionLabel = 'Mas opciones',
  valueFormatter = defaultValueFormatter,
  total,
  chartAriaLabel,
  dataCapture
}: GreenhouseStackedDistributionChartCardProps) => {
  const theme = useTheme()
  const isCompact = useMediaQuery(theme.breakpoints.down('sm'))
  const chartDescriptionId = useId().replace(/:/g, '')
  const resolvedTotal = resolveTotal(segments, total)

  const chartData = useMemo(
    () => [
      segments.reduce<Record<string, number | string>>(
        (acc, segment) => ({
          ...acc,
          [segment.id]: segment.value
        }),
        { name: title }
      )
    ],
    [segments, title]
  )

  const resolveSegmentColors = (tone: GreenhouseStackedDistributionTone = 'neutral') => {
    switch (tone) {
      case 'success':
        return { fill: theme.palette.success.main, text: theme.palette.common.white, icon: theme.palette.success.dark }
      case 'info':
        return { fill: theme.palette.info.main, text: theme.palette.common.white, icon: theme.palette.info.dark }
      case 'ink':
        return {
          fill: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.text.primary,
          text: theme.palette.common.white,
          icon: theme.palette.text.secondary
        }
      case 'primary':
        return { fill: theme.palette.primary.main, text: theme.palette.common.white, icon: theme.palette.primary.main }
      case 'secondary':
        return { fill: theme.palette.secondary.main, text: theme.palette.common.white, icon: theme.palette.secondary.main }
      case 'neutral':
      default:
        return {
          fill: theme.palette.action.hover,
          text: theme.palette.text.primary,
          icon: theme.palette.text.secondary
        }
    }
  }

  const coloredSegments = segments.map(segment => ({
    ...segment,
    colors: resolveSegmentColors(segment.tone)
  }))

  const summary = coloredSegments
    .map(segment => `${segment.label} ${segment.detail ? `${segment.detail}, ` : ''}${valueFormatter(segment.value)}`)
    .join('; ')

  const resolvedChartAriaLabel = chartAriaLabel ?? `${title}. Distribucion por estado`

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
          <Typography variant='h5' sx={{ color: 'text.primary' }}>
            {title}
          </Typography>
          <IconButton aria-label={actionLabel} size='small' sx={{ color: 'text.disabled', mt: -1, mr: -1 }}>
            <i className='tabler-dots-vertical' aria-hidden='true' />
          </IconButton>
        </Stack>

        <Box sx={{ px: { xs: 4, sm: 5 }, pb: 6 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${coloredSegments.length}, minmax(0, 1fr))`,
              gap: 0,
              mb: 4
            }}
          >
            {coloredSegments.map(segment => (
              <Stack key={segment.id} spacing={1} sx={{ minWidth: 0 }}>
                <Typography
                  variant={isCompact ? 'body2' : 'body1'}
                  color='text.secondary'
                  sx={{ minHeight: { xs: GREENHOUSE_CHART_CHROME_TOKENS.icon.container, sm: 'auto' } }}
                >
                  {segment.label}
                </Typography>
                <Box
                  sx={{
                    width: 1,
                    maxWidth: GREENHOUSE_CHART_CHROME_TOKENS.chart.segmentTickSize,
                    height: GREENHOUSE_CHART_CHROME_TOKENS.chart.segmentTickSize,
                    borderInlineStart: theme => `1px solid ${theme.palette.divider}`
                  }}
                />
              </Stack>
            ))}
          </Box>

          <Box sx={{ position: 'relative', mb: 6 }}>
            <AppRecharts>
              <Box role='img' aria-label={resolvedChartAriaLabel} aria-describedby={chartDescriptionId}>
                <ResponsiveContainer width='100%' height={GREENHOUSE_CHART_CHROME_TOKENS.chart.stackedHeight}>
                  <BarChart
                    data={chartData}
                    layout='vertical'
                    margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                    barCategoryGap={0}
                  >
                    <XAxis type='number' domain={[0, resolvedTotal]} hide />
                    <YAxis type='category' dataKey='name' hide />
                    <RechartsTooltip
                      cursor={false}
                      wrapperStyle={{ outline: 'none', zIndex: 10 }}
                      content={
                        <DistributionTooltip
                          segments={segments}
                          valueFormatter={valueFormatter}
                        />
                      }
                    />
                    {coloredSegments.map((segment, index) => (
                      <Bar
                        key={segment.id}
                        dataKey={segment.id}
                        stackId='distribution'
                        fill={segment.colors.fill}
                        radius={
                          index === 0
                            ? [
                                GREENHOUSE_CHART_CHROME_TOKENS.chart.barRadius,
                                0,
                                0,
                                GREENHOUSE_CHART_CHROME_TOKENS.chart.barRadius
                              ]
                            : index === coloredSegments.length - 1
                              ? [
                                  0,
                                  GREENHOUSE_CHART_CHROME_TOKENS.chart.barRadius,
                                  GREENHOUSE_CHART_CHROME_TOKENS.chart.barRadius,
                                  0
                                ]
                              : [0, 0, 0, 0]
                        }
                        isAnimationActive
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </AppRecharts>

            <Box
              aria-hidden='true'
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                pointerEvents: 'none',
                overflow: 'hidden',
                borderRadius: theme => `${theme.shape.customBorderRadius.md}px`
              }}
            >
              {coloredSegments.map(segment => (
                <Box
                  key={segment.id}
                  sx={{
                    flexBasis: `${(segment.value / resolvedTotal) * 100}%`,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCompact ? 'center' : 'flex-start',
                    px: isCompact
                      ? GREENHOUSE_CHART_CHROME_TOKENS.spacing.segmentValuePadding.compact
                      : GREENHOUSE_CHART_CHROME_TOKENS.spacing.segmentValuePadding.comfortable
                  }}
                >
                  <Typography
                    variant='monoAmount'
                    sx={{
                      color: segment.colors.text,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {valueFormatter(segment.value)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box id={chartDescriptionId} sx={visuallyHidden}>
            {summary}
          </Box>

          <Stack spacing={0}>
            {coloredSegments.map((segment, index) => (
              <Box key={segment.id}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', sm: 'minmax(0, 1fr) auto auto' },
                    gap: { xs: 2, sm: 6 },
                    alignItems: 'center',
                    py: 3
                  }}
                >
                  <Stack direction='row' alignItems='center' spacing={2} sx={{ minWidth: 0 }}>
                    <Box
                      component='i'
                      className={segment.icon}
                      aria-hidden='true'
                      sx={{ fontSize: GREENHOUSE_CHART_CHROME_TOKENS.icon.segment, color: segment.colors.icon, flexShrink: 0 }}
                    />
                    <Typography variant='body1' color='text.primary' noWrap>
                      {segment.label}
                    </Typography>
                  </Stack>
                  {segment.detail ? (
                    <Typography
                      variant='monoId'
                      sx={{ color: 'text.primary' }}
                    >
                      {segment.detail}
                    </Typography>
                  ) : null}
                  <Typography
                    variant='monoAmount'
                    color='text.secondary'
                    sx={{
                      gridColumn: { xs: segment.detail ? '2 / 3' : 'auto', sm: 'auto' },
                      textAlign: 'end'
                    }}
                  >
                    {valueFormatter(segment.value)}
                  </Typography>
                </Box>
                {index < coloredSegments.length - 1 ? <Divider /> : null}
              </Box>
            ))}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  )
}

export default GreenhouseStackedDistributionChartCard
