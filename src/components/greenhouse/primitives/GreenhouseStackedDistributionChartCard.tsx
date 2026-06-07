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
        minWidth: 180,
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
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
                  <Typography variant='caption' color='text.primary' noWrap>
                    {segment?.label ?? item.dataKey}
                  </Typography>
                </Stack>
                <Typography variant='caption' sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
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
          fill: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#2F2B3D',
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
        maxWidth: 554,
        borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
        border: theme => `1px solid ${alpha(theme.palette.divider, 0.72)}`,
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
                  sx={{ lineHeight: 1.35, minHeight: { xs: 38, sm: 'auto' } }}
                >
                  {segment.label}
                </Typography>
                <Box sx={{ width: 1, maxWidth: 10, height: 10, borderInlineStart: theme => `1px solid ${theme.palette.divider}` }} />
              </Stack>
            ))}
          </Box>

          <Box sx={{ position: 'relative', mb: 6 }}>
            <AppRecharts>
              <Box role='img' aria-label={resolvedChartAriaLabel} aria-describedby={chartDescriptionId}>
                <ResponsiveContainer width='100%' height={46}>
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
                            ? [6, 0, 0, 6]
                            : index === coloredSegments.length - 1
                              ? [0, 6, 6, 0]
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
                    px: isCompact ? 1 : 4
                  }}
                >
                  <Typography
                    variant='caption'
                    noWrap
                    sx={{
                      color: segment.colors.text,
                      fontSize: isCompact ? 11 : undefined,
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums'
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
                    <i
                      className={segment.icon}
                      aria-hidden='true'
                      style={{ fontSize: 24, color: segment.colors.icon, flexShrink: 0 }}
                    />
                    <Typography variant='body1' color='text.primary' noWrap>
                      {segment.label}
                    </Typography>
                  </Stack>
                  {segment.detail ? (
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'text.primary' }}
                    >
                      {segment.detail}
                    </Typography>
                  ) : null}
                  <Typography
                    variant='body1'
                    color='text.secondary'
                    sx={{
                      gridColumn: { xs: segment.detail ? '2 / 3' : 'auto', sm: 'auto' },
                      fontVariantNumeric: 'tabular-nums',
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
