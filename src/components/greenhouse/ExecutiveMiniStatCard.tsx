'use client'

import type { ApexOptions } from 'apexcharts'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'

import type { GreenhouseKpiTone } from '@/types/greenhouse-dashboard'

type SupportItem = {
  label: string
  value: string
}

type MiniChart = {
  variant: 'bars' | 'area' | 'split-bars'
  data: number[]
  categories?: string[]
}

type ExecutiveMiniStatCardProps = {
  eyebrow?: string
  tone?: GreenhouseKpiTone
  title: string
  value: string
  detail: string
  icon?: string
  delta?: string
  supportItems?: SupportItem[]
  miniChart?: MiniChart
}

const ExecutiveMiniStatCard = ({
  eyebrow,
  tone = 'info',
  title,
  value,
  detail,
  icon,
  delta,
  supportItems = [],
  miniChart
}: ExecutiveMiniStatCardProps) => {
  const theme = useTheme()
  const toneColor = theme.palette[tone].main
  const toneSoftColor = alpha(toneColor, 0.14)
  const toneBackgroundColor = alpha(theme.palette[tone].main, 0.08)
  const actionSelectedColor = 'var(--mui-palette-action-selected)'

  const chartOptions: ApexOptions | null = miniChart
    ? miniChart.variant === 'area'
      ? {
          chart: {
            parentHeightOffset: 0,
            toolbar: { show: false },
            sparkline: { enabled: true }
          },
          tooltip: { enabled: false },
          dataLabels: { enabled: false },
          stroke: {
            width: 2,
            curve: 'smooth'
          },
          grid: {
            show: false,
            padding: {
              top: 10,
              bottom: 12
            }
          },
          fill: {
            type: 'gradient',
            gradient: {
              opacityTo: 0,
              opacityFrom: 0.42,
              shadeIntensity: 1,
              stops: [0, 100],
              colorStops: [
                [
                  {
                    offset: 0,
                    opacity: 0.38,
                    color: toneColor
                  },
                  {
                    opacity: 0,
                    offset: 100,
                    color: 'var(--mui-palette-background-paper)'
                  }
                ]
              ]
            }
          },
          theme: {
            monochrome: {
              enabled: true,
              shadeTo: 'light',
              shadeIntensity: 1,
              color: toneColor
            }
          },
          xaxis: {
            labels: { show: false },
            axisTicks: { show: false },
            axisBorder: { show: false }
          },
          yaxis: { show: false }
        }
      : miniChart.variant === 'split-bars'
        ? {
            chart: {
              parentHeightOffset: 0,
              toolbar: { show: false }
            },
            plotOptions: {
              bar: {
                borderRadius: 5,
                distributed: true,
                columnWidth: '55%'
              }
            },
            legend: { show: false },
            tooltip: { enabled: false },
            dataLabels: { enabled: false },
            colors: miniChart.data.map((_, index, items) =>
              index === items.length - 3 ? toneColor : toneSoftColor
            ),
            states: {
              hover: { filter: { type: 'none' } },
              active: { filter: { type: 'none' } }
            },
            grid: {
              show: false,
              padding: {
                top: -15,
                left: 0,
                right: 0,
                bottom: -6
              }
            },
            xaxis: {
              categories: miniChart.categories,
              axisTicks: { show: false },
              axisBorder: { show: false },
              tickPlacement: 'on',
              labels: {
                style: {
                  colors: 'var(--mui-palette-text-disabled)',
                  fontFamily: theme.typography.fontFamily,
                  fontSize: theme.typography.body2.fontSize as string
                }
              }
            },
            yaxis: { show: false }
          }
        : {
            chart: {
              type: 'bar',
              stacked: false,
              parentHeightOffset: 0,
              toolbar: { show: false },
              sparkline: { enabled: true }
            },
            tooltip: { enabled: false },
            legend: { show: false },
            dataLabels: { enabled: false },
            colors: [toneColor],
            states: {
              hover: { filter: { type: 'none' } },
              active: { filter: { type: 'none' } }
            },
            plotOptions: {
              bar: {
                borderRadius: 3,
                horizontal: false,
                columnWidth: '34%',
                colors: {
                  backgroundBarRadius: 5,
                  backgroundBarColors: new Array(miniChart.data.length).fill(actionSelectedColor)
                }
              }
            },
            grid: {
              show: false,
              padding: {
                left: -3,
                right: 5,
                top: 15,
                bottom: 18
              }
            },
            xaxis: {
              labels: { show: false },
              axisTicks: { show: false },
              axisBorder: { show: false }
            },
            yaxis: { show: false }
          }
    : null

  const chartSeries = miniChart ? [{ data: miniChart.data }] : []

  if (miniChart?.variant === 'split-bars' && chartOptions) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 4, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Stack justifyContent='space-between' spacing={3} sx={{ minWidth: 0, flex: 1 }}>
            <Stack spacing={1.25}>
              <Stack direction='row' spacing={1.5} alignItems='center'>
                {icon ? (
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2.5,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: toneBackgroundColor,
                      color: toneColor
                    }}
                  >
                    <i className={icon} />
                  </Box>
                ) : null}
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='h5'>{title}</Typography>
                  <Typography color='text.secondary'>{detail}</Typography>
                </Box>
              </Stack>
            </Stack>
            <Stack spacing={1.5} alignItems='flex-start'>
              <Typography variant='h3'>{value}</Typography>
              {delta ? <Chip variant='tonal' size='small' color={tone} label={delta} /> : null}
            </Stack>
          </Stack>
          <AppReactApexCharts type='bar' width={170} height={172} series={chartSeries} options={chartOptions} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 4 }}>
        <Stack spacing={3}>
          <Stack spacing={0.75}>
            <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
              <Stack spacing={0.5}>
                <Typography variant='h5'>{title}</Typography>
                <Typography color='text.secondary'>{detail}</Typography>
              </Stack>
              {eyebrow ? <Chip size='small' color={tone} variant='tonal' label={eyebrow} /> : null}
            </Stack>
            {icon && !miniChart ? (
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: toneBackgroundColor,
                  color: toneColor
                }}
              >
                <i className={icon} />
              </Box>
            ) : null}
          </Stack>
          {miniChart && chartOptions ? (
            <AppReactApexCharts
              type={miniChart.variant === 'area' ? 'area' : 'bar'}
              height={84}
              width='100%'
              series={chartSeries}
              options={chartOptions}
            />
          ) : null}
          <Stack direction='row' justifyContent='space-between' alignItems='center' gap={2}>
            <Typography variant='h3'>{value}</Typography>
            {delta ? (
              <Typography variant='body2' color={`${tone}.main`}>
                {delta}
              </Typography>
            ) : null}
          </Stack>
          {supportItems.length > 0 ? (
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: `repeat(${supportItems.length}, minmax(0, 1fr))` }}>
              {supportItems.map(item => (
                <Box
                  key={item.label}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    backgroundColor: toneBackgroundColor
                  }}
                >
                  <Typography variant='caption' color='text.secondary'>
                    {item.label}
                  </Typography>
                  <Typography variant='h6'>{item.value}</Typography>
                </Box>
              ))}
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default ExecutiveMiniStatCard
