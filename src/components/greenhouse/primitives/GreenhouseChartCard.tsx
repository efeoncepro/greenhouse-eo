'use client'

import { useId, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { alpha, useTheme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import { getChartTypographyFromTheme } from '@/components/theme/chart-typography'
import AppRecharts from '@/libs/styles/AppRecharts'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from '@/libs/Recharts'

import { GREENHOUSE_CHART_CHROME_TOKENS } from './greenhouse-chart-controller'

export type GreenhouseChartTone = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

export type GreenhouseChartDatum = {
  label: string
  value: number
}

export type GreenhouseChartTab = {
  id: string
  label: string
  icon: string
  data?: GreenhouseChartDatum[]
  tone?: GreenhouseChartTone
  highlightedIndex?: number
  disabled?: boolean
  ariaLabel?: string
}

export type GreenhouseChartCardVariant = 'monthlyBar'

export type GreenhouseChartCardKind = 'earningReports' | 'operationalMetric' | 'financialMetric' | 'custom'

export type GreenhouseChartCardProps = {
  title: string
  subtitle?: string
  tabs: GreenhouseChartTab[]
  variant?: GreenhouseChartCardVariant
  kind?: GreenhouseChartCardKind
  activeTabId?: string
  defaultActiveTabId?: string
  onActiveTabChange?: (tabId: string) => void
  onAddMetric?: () => void
  actionLabel?: string
  maxValue?: number
  yAxisTicks?: number[]
  valueFormatter?: (value: number) => string
  chartAriaLabel?: string
  dataCapture?: string
}

type TooltipPayload = {
  value?: number
  payload?: GreenhouseChartDatum
}

const DEFAULT_TICKS = [0, 10000, 20000, 30000, 40000, 50000]

const defaultValueFormatter = (value: number): string =>
  Math.abs(value) >= 1000 ? `${Math.round(value / 1000)}k` : String(value)

const formatRenderableValue = (value: unknown, valueFormatter: (value: number) => string): string =>
  typeof value === 'number' ? valueFormatter(value) : value == null ? '' : String(value)

const resolveMaxValue = (data: GreenhouseChartDatum[], explicitMax?: number): number => {
  if (explicitMax && explicitMax > 0) return explicitMax

  const max = Math.max(...data.map(item => item.value), 0)

  if (max <= 0) return DEFAULT_TICKS[DEFAULT_TICKS.length - 1]

  return Math.ceil(max / 10000) * 10000
}

const GreenhouseChartTooltip = ({
  active,
  payload,
  label,
  valueFormatter,
  color
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
  valueFormatter: (value: number) => string
  color: string
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

const GreenhouseChartCard = ({
  title,
  subtitle,
  tabs,
  variant = 'monthlyBar',
  kind = 'custom',
  activeTabId,
  defaultActiveTabId,
  onActiveTabChange,
  onAddMetric,
  actionLabel = 'Mas opciones',
  maxValue,
  yAxisTicks = DEFAULT_TICKS,
  valueFormatter = defaultValueFormatter,
  chartAriaLabel,
  dataCapture
}: GreenhouseChartCardProps) => {
  const theme = useTheme()
  const isCompact = useMediaQuery(theme.breakpoints.down('sm'))
  const chartTypography = getChartTypographyFromTheme(theme)
  const chartDescriptionId = useId().replace(/:/g, '')
  const selectableTabs = useMemo(() => tabs.filter(tab => !tab.disabled && tab.data?.length), [tabs])
  const initialTabId = defaultActiveTabId ?? selectableTabs[0]?.id ?? tabs[0]?.id
  const [internalTabId, setInternalTabId] = useState(initialTabId)
  const resolvedActiveTabId = activeTabId ?? internalTabId
  const activeTab = tabs.find(tab => tab.id === resolvedActiveTabId && tab.data?.length) ?? selectableTabs[0] ?? tabs[0]
  const data = activeTab?.data ?? []
  const tone = activeTab?.tone ?? 'success'
  const mainColor = theme.palette[tone].main
  const activeColor = theme.palette[tone].dark || mainColor

  const softColor = alpha(
    mainColor,
    theme.palette.mode === 'dark'
      ? GREENHOUSE_CHART_CHROME_TOKENS.opacity.monthlyInactiveBar.dark
      : GREENHOUSE_CHART_CHROME_TOKENS.opacity.monthlyInactiveBar.light
  )

  const highlightedIndex = activeTab?.highlightedIndex ?? data.findIndex(item => item.value === Math.max(...data.map(d => d.value)))

  const resolvedMaxValue = resolveMaxValue(data, maxValue)

  const chartSummary = `${activeTab?.label ?? 'Metrica'}: ${data
    .map(item => `${item.label} ${valueFormatter(item.value)}`)
    .join(', ')}`

  const resolvedChartAriaLabel =
    chartAriaLabel ??
    `${title}${subtitle ? `, ${subtitle}` : ''}. ${activeTab?.label ?? 'Metrica'}`

  const handleTabSelect = (tab: GreenhouseChartTab) => {
    if (tab.disabled) return

    if (!tab.data?.length) {
      onAddMetric?.()

      return
    }

    if (activeTabId === undefined) setInternalTabId(tab.id)
    onActiveTabChange?.(tab.id)
  }

  return (
    <Card
      elevation={0}
      data-capture={dataCapture}
      data-chart-variant={variant}
      data-chart-kind={kind}
      sx={{
        width: '100%',
        maxWidth: GREENHOUSE_CHART_CHROME_TOKENS.card.wideMaxInlineSize,
        borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
        border: theme => `1px solid ${alpha(theme.palette.divider, GREENHOUSE_CHART_CHROME_TOKENS.opacity.border)}`,
        boxShadow: 'var(--mui-customShadows-md)',
        overflow: 'hidden'
      }}
    >
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Stack
          direction='row'
          alignItems='flex-start'
          justifyContent='space-between'
          spacing={3}
          sx={{ px: { xs: 4, md: 6 }, pt: { xs: 4, md: 6 } }}
        >
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

        <Box
          sx={{
            px: { xs: 4, md: 6 },
            pt: { xs: 5, md: 7 },
            overflowX: 'auto',
            scrollbarWidth: 'thin'
          }}
        >
          <Stack
            direction='row'
            spacing={4}
            component='div'
            role='tablist'
            aria-label={`${title} metricas`}
            sx={{ minWidth: 'max-content' }}
          >
            {tabs.map(tab => {
              const selected = tab.id === activeTab?.id
              const isAdd = !tab.data?.length

              return (
                <Box
                  key={tab.id}
                  component='button'
                  type='button'
                  role='tab'
                  aria-selected={selected}
                  aria-label={tab.ariaLabel ?? tab.label}
                  disabled={tab.disabled}
                  onClick={() => handleTabSelect(tab)}
                  sx={{
                    width: { xs: 96, sm: 110 },
                    minHeight: 100,
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    borderRadius: theme => `${theme.shape.customBorderRadius.xl}px`,
                    border: theme =>
                      selected
                        ? `1px solid ${theme.palette.primary.main}`
                        : `1px dashed ${alpha(theme.palette.text.primary, GREENHOUSE_CHART_CHROME_TOKENS.opacity.dashedBorder)}`,
                    bgcolor: 'transparent',
                    color: selected ? 'text.primary' : 'text.secondary',
                    cursor: tab.disabled ? 'not-allowed' : 'pointer',
                    font: 'inherit',
                    opacity: tab.disabled ? 0.56 : 1,
                    transition: theme.transitions.create(['border-color', 'background-color', 'transform'], {
                      duration: theme.transitions.duration.shortest
                    }),
                    '&:hover': {
                      borderColor: theme =>
                        selected
                          ? theme.palette.primary.main
                          : alpha(theme.palette.primary.main, GREENHOUSE_CHART_CHROME_TOKENS.opacity.hoverBorder),
                      bgcolor: theme => alpha(theme.palette.primary.main, GREENHOUSE_CHART_CHROME_TOKENS.opacity.hoverSurface)
                    },
                    '&:focus-visible': {
                      outline: theme => `2px solid ${theme.palette.primary.main}`,
                      outlineOffset: 2
                    },
                    '@media (prefers-reduced-motion: no-preference)': {
                      '&:hover': {
                        transform: tab.disabled ? 'none' : 'translateY(-1px)'
                      }
                    }
                  }}
                >
                  <Box
                    sx={{
                      width: GREENHOUSE_CHART_CHROME_TOKENS.icon.container,
                      height: GREENHOUSE_CHART_CHROME_TOKENS.icon.container,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                      bgcolor: selected
                        ? alpha(mainColor, GREENHOUSE_CHART_CHROME_TOKENS.opacity.monthlyInactiveBar.light)
                        : 'action.selected',
                      color: selected ? activeColor : 'text.secondary'
                    }}
                  >
                    <Box component='i' className={tab.icon} sx={{ fontSize: GREENHOUSE_CHART_CHROME_TOKENS.icon.tab }} aria-hidden='true' />
                  </Box>
                  {isAdd ? (
                    <Box component='span' sx={visuallyHidden}>
                      {tab.label}
                    </Box>
                  ) : (
                    <Typography component='span' variant='button'>
                      {tab.label}
                    </Typography>
                  )}
                </Box>
              )
            })}
          </Stack>
        </Box>

        <Box sx={{ px: { xs: 4, md: 6 }, pt: { xs: 6, md: 10 }, pb: { xs: 4, md: 6 } }}>
          <Box>
            {data.length > 0 ? (
              <>
                <AppRecharts>
                  <Box role='img' aria-label={resolvedChartAriaLabel} aria-describedby={chartDescriptionId}>
                    <ResponsiveContainer
                      width='100%'
                      height={
                        isCompact
                          ? GREENHOUSE_CHART_CHROME_TOKENS.chart.monthlyHeight.compact
                          : GREENHOUSE_CHART_CHROME_TOKENS.chart.monthlyHeight.comfortable
                      }
                    >
                      <BarChart data={data} margin={{ top: 24, right: 4, bottom: 4, left: 0 }} barCategoryGap='18%'>
                        <CartesianGrid vertical={false} strokeDasharray='0' stroke='transparent' />
                        <XAxis
                          dataKey='label'
                          axisLine={{ stroke: alpha(theme.palette.text.primary, GREENHOUSE_CHART_CHROME_TOKENS.opacity.axisLine) }}
                          tickLine={false}
                          tick={{ fill: 'var(--mui-palette-text-disabled)' }}
                          dy={12}
                          interval={0}
                        />
                        <YAxis
                          width={GREENHOUSE_CHART_CHROME_TOKENS.chart.axisWidth}
                          axisLine={false}
                          tickLine={false}
                          ticks={yAxisTicks}
                          domain={[0, Math.max(resolvedMaxValue, yAxisTicks[yAxisTicks.length - 1] ?? 0)]}
                          tickFormatter={valueFormatter}
                          tick={{ fill: 'var(--mui-palette-text-disabled)' }}
                        />
                        <RechartsTooltip
                          cursor={{ fill: alpha(theme.palette.text.primary, GREENHOUSE_CHART_CHROME_TOKENS.opacity.cursor) }}
                          wrapperStyle={{ outline: 'none', zIndex: 10 }}
                          content={
                            <GreenhouseChartTooltip
                              valueFormatter={valueFormatter}
                              color={activeColor}
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
                              ? GREENHOUSE_CHART_CHROME_TOKENS.chart.monthlyBarSize.compact
                              : GREENHOUSE_CHART_CHROME_TOKENS.chart.monthlyBarSize.comfortable
                          }
                          isAnimationActive
                        >
                          {data.map((entry, index) => (
                            <Cell
                              key={`${entry.label}-${entry.value}`}
                              fill={index === highlightedIndex ? mainColor : softColor}
                            />
                          ))}
                          <LabelList
                            dataKey='value'
                            position='top'
                            formatter={value => formatRenderableValue(value, valueFormatter)}
                            fill='var(--mui-palette-text-primary)'
                            style={{
                              fontFamily: chartTypography.dataLabel.fontFamily,
                              fontSize: chartTypography.dataLabel.fontSize,
                              fontWeight: chartTypography.title.fontWeight
                            }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </AppRecharts>
                <Box id={chartDescriptionId} sx={visuallyHidden}>
                  {chartSummary}
                </Box>
              </>
            ) : (
              <Box role='status' sx={{ py: 8 }}>
                <Typography variant='body2' color='text.secondary'>
                  Sin datos para esta metrica.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default GreenhouseChartCard
