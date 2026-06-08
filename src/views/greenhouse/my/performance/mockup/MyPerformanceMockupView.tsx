'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'


import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import {
  MetricSummaryCard,
  MetricTrendCard,
  OperationalPanel,
  type OperationalStatusTone
} from '@/components/greenhouse/primitives'
import useReducedMotion from '@/hooks/useReducedMotion'
import { AnimatePresence, motion } from '@/libs/FramerMotion'
import AppRecharts from '@/libs/styles/AppRecharts'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from '@/libs/Recharts'
import { GH_MY_PERFORMANCE } from '@/lib/copy/my-performance'

import {
  activityChips,
  cscEntries,
  focusSignals,
  ftrTrend,
  kpiMetrics,
  nexaHistory,
  nexaInsights,
  otdTrend,
  radarMetrics,
  trendTone,
  type MyPerformanceTone
} from './data'


type NexaMode = 'summary' | 'history'

const enterTransition = { duration: 0.28, ease: 'easeOut' as const }

const itemMotion = {
  hidden: { opacity: 0, y: 10 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...enterTransition, delay: index * 0.045 }
  })
}

const toneToStatusTone = (tone: MyPerformanceTone): OperationalStatusTone => {
  if (tone === 'primary' || tone === 'info' || tone === 'success' || tone === 'warning' || tone === 'error') return tone

  return 'secondary'
}

const toneToAvatarColor = (tone: MyPerformanceTone) => toneToStatusTone(tone)

const radarTone = (value: number): OperationalStatusTone => {
  if (value >= 84) return 'success'
  if (value >= 78) return 'primary'
  if (value >= 72) return 'warning'

  return 'error'
}

const StatusPill = ({
  label,
  tone = 'secondary',
  icon
}: {
  label: string
  tone?: OperationalStatusTone
  icon?: string
}) => (
  <CustomChip
    round='true'
    size='small'
    variant='tonal'
    color={tone}
    icon={icon ? <i className={icon} aria-hidden='true' /> : undefined}
    label={label}
    sx={{
      '& .MuiChip-label': {
        px: 2,
        fontWeight: 700
      }
    }}
  />
)

const MotionPanel = ({
  children,
  index = 0,
  lift = true
}: {
  children: ReactNode
  index?: number
  lift?: boolean
}) => {
  const prefersReduced = useReducedMotion()

  return (
    <motion.div
      custom={index}
      initial={prefersReduced ? false : 'hidden'}
      animate='visible'
      variants={itemMotion}
      whileHover={lift && !prefersReduced ? { y: -3 } : undefined}
      transition={enterTransition}
      style={{ height: '100%' }}
    >
      {children}
    </motion.div>
  )
}

const formatAnimatedValue = (
  value: number,
  format: 'percentage' | 'integer' | 'decimal',
  suffix = ''
) => {
  if (format === 'percentage') return `${Math.round(value)}%`
  if (format === 'decimal') return `${value.toFixed(2).replace(/\.?0+$/, '')}${suffix}`

  return `${Math.round(value)}${suffix}`
}

const MyPerformanceMockupView = () => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()
  const [period, setPeriod] = useState('2026-05')
  const [nexaMode, setNexaMode] = useState<NexaMode>('summary')
  const [refreshTick, setRefreshTick] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const donutOptions = useMemo<ApexOptions>(() => ({
    chart: { type: 'donut', toolbar: { show: false }, background: 'transparent' },
    labels: cscEntries.map(item => item.label),
    colors: cscEntries.map(item => item.color),
    stroke: { width: 2 },
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            name: { show: true, fontSize: '12px', color: theme.palette.text.secondary },
            value: { show: true, fontSize: '28px', fontWeight: 800, color: theme.palette.text.primary },
            total: {
              show: true,
              label: GH_MY_PERFORMANCE.cscCenterLabel,
              color: theme.palette.text.secondary,
              formatter: () => '24'
            }
          }
        }
      }
    },
    tooltip: { theme: theme.palette.mode }
  }), [theme])

  return (
    <Stack
      spacing={{ xs: 3, md: 4 }}
      data-capture='my-performance-mockup'
      sx={{
        pb: 2,
        '& .MuiCard-root': {
          boxShadow: 'none',
          border: theme => `1px solid ${theme.palette.divider}`
        }
      }}
    >
      <Header
        period={period}
        onPeriodChange={setPeriod}
        isRefreshing={isRefreshing}
        prefersReduced={prefersReduced}
        onRefresh={() => {
          setRefreshTick(value => value + 1)
          setIsRefreshing(true)
          window.setTimeout(() => setIsRefreshing(false), prefersReduced ? 180 : 650)
        }}
        refreshTick={refreshTick}
      />

      <FocusSignals />

      <NexaPanel mode={nexaMode} onModeChange={setNexaMode} />

      <Grid container spacing={4} data-capture='my-performance-kpis'>
        {kpiMetrics.map(metric => (
          <Grid key={metric.id} size={{ xs: 12, sm: 6, md: 4, xl: 2 }}>
            <MotionPanel index={kpiMetrics.findIndex(item => item.id === metric.id)}>
              <MetricSummaryCard
                title={metric.title}
                value={
                  <AnimatedCounter
                    value={metric.valueNumber}
                    formatter={value => formatAnimatedValue(value, metric.valueFormat, metric.valueSuffix)}
                  />
                }
                subtitle={metric.target}
                icon={metric.icon}
                iconColor={toneToAvatarColor(metric.tone)}
                statusLabel={metric.status}
                statusTone={toneToStatusTone(metric.tone)}
              />
            </MotionPanel>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <MetricTrendCard
            title='OTD%'
            metricName='On-Time Delivery'
            periodLabel='Mensual · mayo 2026'
            value={86}
            tone={trendTone.otd}
            format='percentage'
            deltaUnit='pts'
            series={otdTrend}
            dataCapture='my-performance-otd-trend'
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <MetricTrendCard
            title='FTR%'
            metricName='First Time Right'
            periodLabel='Mensual · mayo 2026'
            value={78}
            tone={trendTone.ftr}
            format='percentage'
            deltaUnit='pts'
            series={ftrTrend}
            dataCapture='my-performance-ftr-trend'
          />
        </Grid>
      </Grid>

      <ActivityStrip />

      <Grid container spacing={4} data-capture='my-performance-charts'>
        <Grid size={{ xs: 12, lg: 7 }}>
          <OperationalPanel
            title={GH_MY_PERFORMANCE.operationalHealth}
            subheader={GH_MY_PERFORMANCE.operationalHealthSubtitle}
            icon='tabler-radar'
            iconColor='primary'
            fullHeight
          >
            <Box component='figure' role='img' aria-label={GH_MY_PERFORMANCE.aria.radar} sx={{ m: 0 }}>
              <Box sx={{ height: { xs: 300, md: 340 } }}>
                <AppRecharts style={{ width: '100%', height: '100%' }}>
                  <ResponsiveContainer width='100%' height='100%'>
                    <RadarChart data={radarMetrics} outerRadius='74%'>
                      <PolarGrid stroke={theme.palette.divider} />
                      <PolarAngleAxis
                        dataKey='label'
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                      />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                      <RechartsTooltip
                        formatter={value => [`${Math.round(Number(value ?? 0))}/100`, GH_MY_PERFORMANCE.scoreValueLabel]}
                        contentStyle={{
                          borderRadius: theme.shape.customBorderRadius.sm,
                          borderColor: theme.palette.divider
                        }}
                      />
                      <Radar
                        dataKey='value'
                        name={GH_MY_PERFORMANCE.scoreValueLabel}
                        stroke={theme.palette.primary.dark}
                        fill={theme.palette.primary.main}
                        fillOpacity={0.24}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </AppRecharts>
              </Box>
            </Box>
            <RadarMetricRail />
          </OperationalPanel>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <OperationalPanel
            title={GH_MY_PERFORMANCE.cscDistribution}
            subheader={GH_MY_PERFORMANCE.cscDistributionSubtitle}
            icon='tabler-chart-donut'
            iconColor='info'
            fullHeight
          >
            <Grid container spacing={3} alignItems='center'>
              <Grid size={{ xs: 12, sm: 6, lg: 12, xl: 6 }}>
                <Box component='figure' role='img' aria-label={GH_MY_PERFORMANCE.aria.csc} sx={{ m: 0 }}>
                  <AppReactApexCharts
                    type='donut'
                    height={260}
                    width='100%'
                    series={cscEntries.map(item => item.count)}
                    options={donutOptions}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 12, xl: 6 }}>
                <Stack spacing={2}>
                  {cscEntries.map(entry => (
                    <Stack key={entry.label} direction='row' spacing={2} alignItems='center'>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: entry.color, flexShrink: 0 }} />
                      <Typography variant='body2' sx={{ flex: 1 }} noWrap>
                        {entry.label}
                      </Typography>
                      <Typography variant='body2' sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {entry.count}
                      </Typography>
                      <Typography variant='caption' color='text.secondary' sx={{ width: 44, textAlign: 'right' }}>
                        {entry.pct}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </OperationalPanel>
        </Grid>
      </Grid>
    </Stack>
  )
}

const RadarMetricRail = () => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()

  return (
    <Box
      sx={theme => ({
        mt: 2,
        display: 'grid',
        gridTemplateColumns: {
          xs: `repeat(${radarMetrics.length}, minmax(136px, 1fr))`,
          md: 'repeat(5, minmax(0, 1fr))'
        },
        gap: { xs: 1.5, md: 2 },
        overflowX: { xs: 'auto', md: 'visible' },
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        pt: 2,
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.72)}`
      })}
    >
      {radarMetrics.map((metric, index) => {
        const tone = radarTone(metric.value)
        const color = theme.palette[tone].main

        return (
          <motion.div
            key={metric.label}
            custom={index}
            initial={prefersReduced ? false : 'hidden'}
            animate='visible'
            variants={itemMotion}
            whileHover={!prefersReduced ? { y: -2 } : undefined}
            transition={enterTransition}
          >
            <Box
              sx={theme => ({
                height: '100%',
                minHeight: { xs: 72, md: 82 },
                p: { xs: 1.5, md: 2 },
                borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                border: `1px solid ${alpha(theme.palette[tone].main, theme.palette.mode === 'dark' ? 0.28 : 0.18)}`,
                bgcolor: alpha(theme.palette[tone].main, theme.palette.mode === 'dark' ? 0.13 : 0.06),
                transition: theme.transitions.create(['background-color', 'border-color', 'transform'], {
                  duration: theme.transitions.duration.shorter
                })
              })}
            >
              <Stack spacing={1.25}>
                <Stack direction='row' alignItems='center' justifyContent='space-between' gap={1}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{
                      fontSize: { xs: 11, md: 12 },
                      fontWeight: 800,
                      lineHeight: 1.1,
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {metric.label}
                  </Typography>
                  <Typography
                    variant='subtitle2'
                    sx={{ color, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}
                  >
                    {metric.value}
                  </Typography>
                </Stack>
                <Box
                  sx={theme => ({
                    height: 6,
                    overflow: 'hidden',
                    borderRadius: 999,
                    bgcolor: alpha(theme.palette[tone].main, theme.palette.mode === 'dark' ? 0.18 : 0.14)
                  })}
                >
                  <Box
                    sx={theme => ({
                      width: `${metric.value}%`,
                      height: '100%',
                      borderRadius: 'inherit',
                      bgcolor: theme.palette[tone].main,
                      transition: prefersReduced
                        ? 'none'
                        : theme.transitions.create('width', {
                            duration: theme.transitions.duration.standard,
                            easing: theme.transitions.easing.easeOut
                          })
                    })}
                  />
                </Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ fontSize: 11, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}
                >
                  {GH_MY_PERFORMANCE.scoreSuffix}
                </Typography>
              </Stack>
            </Box>
          </motion.div>
        )
      })}
    </Box>
  )
}

const Header = ({
  period,
  onPeriodChange,
  isRefreshing,
  prefersReduced,
  onRefresh,
  refreshTick
}: {
  period: string
  onPeriodChange: (period: string) => void
  isRefreshing: boolean
  prefersReduced: boolean
  onRefresh: () => void
  refreshTick: number
}) => (
  <Stack spacing={3} data-capture='my-performance-header'>
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      alignItems={{ xs: 'stretch', md: 'flex-start' }}
      justifyContent='space-between'
      gap={3}
    >
      <Box>
        <Typography variant='h3' sx={{ fontSize: { xs: 30, md: 34 }, lineHeight: 1.08, mb: 0.75 }}>
          {GH_MY_PERFORMANCE.title}
        </Typography>
        <Typography color='text.secondary' sx={{ maxWidth: 680 }}>
          {GH_MY_PERFORMANCE.subtitle}
        </Typography>
      </Box>

      <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
        <CustomTextField
          select
          size='small'
          label={GH_MY_PERFORMANCE.period}
          value={period}
          onChange={event => onPeriodChange(event.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value='2026-06'>Junio 2026</MenuItem>
          <MenuItem value='2026-05'>Mayo 2026</MenuItem>
          <MenuItem value='2026-04'>Abril 2026</MenuItem>
        </CustomTextField>
        <StatusPill label={GH_MY_PERFORMANCE.statusCurrent} tone='success' icon='tabler-point-filled' />
        <Tooltip title={GH_MY_PERFORMANCE.refresh}>
          <IconButton
            aria-label={GH_MY_PERFORMANCE.refresh}
            onClick={onRefresh}
            sx={theme => ({
              width: 40,
              height: 40,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              border: `1px solid ${theme.palette.divider}`
            })}
          >
            <motion.i
              className='tabler-refresh'
              aria-hidden='true'
              animate={isRefreshing && !prefersReduced ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 0.55, ease: 'easeInOut' }}
              style={{ display: 'inline-block' }}
            />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>

    <AnimatePresence>
      {isRefreshing ? (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={enterTransition}
        >
          <LinearProgress sx={{ borderRadius: 999 }} aria-label={GH_MY_PERFORMANCE.aria.updating} />
        </motion.div>
      ) : refreshTick > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={enterTransition}
        >
          <Typography variant='caption' color='text.secondary' role='status' aria-live='polite'>
            {GH_MY_PERFORMANCE.updated}: {GH_MY_PERFORMANCE.justNow}.
          </Typography>
        </motion.div>
      ) : null}
    </AnimatePresence>
  </Stack>
)

const FocusSignals = () => (
  <Grid container spacing={4} data-capture='my-performance-focus'>
    {focusSignals.map(signal => (
      <Grid key={signal.id} size={{ xs: 12, md: 4 }}>
        <MotionPanel index={focusSignals.findIndex(item => item.id === signal.id)}>
          <Card
            sx={theme => ({
              height: '100%',
              borderLeft: `4px solid ${theme.palette[toneToStatusTone(signal.tone)].main}`,
              transition: theme.transitions.create(['border-color', 'box-shadow'], {
                duration: theme.transitions.duration.shorter
              }),
              '&:hover': {
                boxShadow: 'var(--mui-customShadows-sm)'
              }
            })}
          >
            <CardContent sx={{ py: 3 }}>
              <Stack direction='row' spacing={2.5} alignItems='flex-start'>
                <CustomAvatar skin='light' color={toneToAvatarColor(signal.tone)} variant='rounded'>
                  <i className={signal.icon} aria-hidden='true' />
                </CustomAvatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='subtitle1' sx={{ fontWeight: 800 }}>
                    {signal.title}
                  </Typography>
                  <Typography variant='h4' color={`${toneToStatusTone(signal.tone)}.main`} sx={{ my: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                    <AnimatedCounter
                      value={signal.valueNumber}
                      formatter={value => formatAnimatedValue(value, signal.valueFormat, signal.valueSuffix)}
                    />
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {signal.helper}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </MotionPanel>
      </Grid>
    ))}
  </Grid>
)

const NexaPanel = ({
  mode,
  onModeChange
}: {
  mode: NexaMode
  onModeChange: (mode: NexaMode) => void
}) => (
  <Card data-capture='my-performance-nexa'>
    <CardContent sx={{ py: 3 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'flex-start' }}>
          <Stack direction='row' spacing={2} alignItems='flex-start'>
            <CustomAvatar skin='light' color='primary' variant='rounded'>
              <i className='tabler-sparkles' aria-hidden='true' />
            </CustomAvatar>
            <Box>
              <Typography variant='h5'>{GH_MY_PERFORMANCE.nexaTitle}</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 620 }}>
                {GH_MY_PERFORMANCE.nexaSubtitle}
              </Typography>
            </Box>
          </Stack>

          <ToggleButtonGroup
            exclusive
            size='small'
            value={mode}
            onChange={(_, value: NexaMode | null) => {
              if (value) onModeChange(value)
            }}
            aria-label={GH_MY_PERFORMANCE.aria.nexaMode}
          >
            <ToggleButton value='summary'>{GH_MY_PERFORMANCE.nexaSummary}</ToggleButton>
            <ToggleButton value='history'>{GH_MY_PERFORMANCE.nexaHistory}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Alert
          severity='info'
          variant='outlined'
          icon={<i className='tabler-info-circle' aria-hidden='true' />}
          sx={{ py: 1 }}
        >
          {GH_MY_PERFORMANCE.advisoryNote}
        </Alert>

        <AnimatePresence mode='wait'>
          {mode === 'summary' ? (
            <motion.div
              key='summary'
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={enterTransition}
            >
              <Grid container spacing={4}>
                {nexaInsights.map((insight, index) => (
                  <Grid key={insight.title} size={{ xs: 12, md: 4 }}>
                    <MotionPanel index={index}>
                      <Box
                        sx={theme => ({
                          height: '100%',
                          p: 2.5,
                          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                          bgcolor: alpha(theme.palette[toneToStatusTone(insight.tone)].main, 0.06),
                          border: `1px solid ${alpha(theme.palette[toneToStatusTone(insight.tone)].main, 0.16)}`,
                          transition: theme.transitions.create(['background-color', 'border-color'], {
                            duration: theme.transitions.duration.shorter
                          })
                        })}
                      >
                        <Stack spacing={1.5}>
                          <Stack direction='row' spacing={1.5} alignItems='center'>
                            <CustomAvatar skin='light' color={toneToAvatarColor(insight.tone)} variant='rounded'>
                              <i className={insight.icon} aria-hidden='true' />
                            </CustomAvatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant='subtitle1' sx={{ fontWeight: 800 }} noWrap>
                                {insight.title}
                              </Typography>
                              <StatusPill label={insight.chip} tone={toneToStatusTone(insight.tone)} />
                            </Box>
                          </Stack>
                          <Typography variant='body2' color='text.secondary'>
                            {insight.body}
                          </Typography>
                          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                            {insight.mentions.map(mention => (
                              <CustomChip
                                key={mention}
                                round='true'
                                size='small'
                                variant='outlined'
                                color='secondary'
                                label={mention}
                                icon={<i className='tabler-lock' aria-hidden='true' />}
                                aria-label={`${GH_MY_PERFORMANCE.aria.safeMention}: ${mention}`}
                              />
                            ))}
                          </Stack>
                        </Stack>
                      </Box>
                    </MotionPanel>
                  </Grid>
                ))}
              </Grid>
            </motion.div>
          ) : (
            <motion.div
              key='history'
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={enterTransition}
            >
              <Stack spacing={2}>
                {nexaHistory.map(item => (
                  <Stack key={`${item.date}-${item.time}`} direction='row' spacing={2} alignItems='flex-start'>
                    <Box
                      sx={theme => ({
                        width: 10,
                        height: 10,
                        mt: 1,
                        borderRadius: '50%',
                        bgcolor: theme.palette[toneToStatusTone(item.tone)].main,
                        flexShrink: 0
                      })}
                    />
                    <Box sx={{ minWidth: 120 }}>
                      <Typography variant='body2' sx={{ fontWeight: 700 }}>
                        {item.date}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {item.time}
                      </Typography>
                    </Box>
                    <Typography variant='body2' color='text.secondary'>
                      {item.body}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </motion.div>
          )}
        </AnimatePresence>
      </Stack>
    </CardContent>
  </Card>
)

const ActivityStrip = () => (
  <Card data-capture='my-performance-activity'>
    <CardContent>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'center' }}>
          <Box>
            <Typography variant='h5'>{GH_MY_PERFORMANCE.activity}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {GH_MY_PERFORMANCE.activitySubtitle}
            </Typography>
          </Box>
          <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap>
            {activityChips.map(chip => (
              <CustomChip
                key={chip.label}
                round='true'
                variant='tonal'
                color={toneToStatusTone(chip.tone)}
                icon={<i className={chip.icon} aria-hidden='true' />}
                label={`${chip.label} ${chip.value}`}
              />
            ))}
          </Stack>
        </Stack>
        <Alert severity='info' variant='outlined' icon={<i className='tabler-info-circle' aria-hidden='true' />}>
          {GH_MY_PERFORMANCE.partialAlert}
        </Alert>
      </Stack>
    </CardContent>
  </Card>
)

export default MyPerformanceMockupView
