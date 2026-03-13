import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

import { GH_COLORS, GH_LABELS, GH_MESSAGES } from '@/config/greenhouse-nomenclature'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'
import { effortColorMap, statusColorMap } from '@views/greenhouse/dashboard/config'

const clientStatusColors = [GH_COLORS.chart.primary, GH_COLORS.chart.warning, GH_COLORS.chart.error, GH_COLORS.chart.success]

export const createThroughputOptions = (theme: Theme, data: GreenhouseDashboardData): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    toolbar: { show: false }
  },
  dataLabels: { enabled: false },
  legend: {
    position: 'top',
    horizontalAlign: 'left',
    labels: {
      colors: 'var(--mui-palette-text-secondary)'
    }
  },
  stroke: {
    width: [0, 0]
  },
  plotOptions: {
    bar: {
      borderRadius: 8,
      columnWidth: '42%'
    }
  },
  colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-success-main)'],
  grid: {
    borderColor: 'var(--mui-palette-divider)',
    strokeDashArray: 6,
    padding: {
      left: 0,
      right: 0,
      top: -12,
      bottom: -8
    }
  },
  xaxis: {
    categories: data.charts.throughput.map(item => item.label),
    axisTicks: { show: false },
    axisBorder: { show: false },
    labels: {
      style: {
        colors: 'var(--mui-palette-text-disabled)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  yaxis: {
    labels: {
      style: {
        colors: 'var(--mui-palette-text-disabled)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  tooltip: {
    shared: true,
    intersect: false
  }
})

export const createStatusMixOptions = (theme: Theme, data: GreenhouseDashboardData): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    toolbar: { show: false }
  },
  dataLabels: { enabled: false },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 8,
      barHeight: '54%',
      distributed: true
    }
  },
  colors: data.charts.statusMix.map(item => statusColorMap[item.key] || statusColorMap.other),
  grid: {
    borderColor: 'var(--mui-palette-divider)',
    strokeDashArray: 5,
    xaxis: {
      lines: { show: true }
    },
    padding: {
      top: -8,
      right: 8,
      left: 8,
      bottom: -10
    }
  },
  legend: { show: false },
  xaxis: {
    categories: data.charts.statusMix.map(item => item.label),
    labels: {
      style: {
        colors: 'var(--mui-palette-text-disabled)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  yaxis: {
    labels: {
      style: {
        colors: 'var(--mui-palette-text-secondary)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  tooltip: {
    y: {
      formatter: value => `${value} tareas`
    }
  }
})

export const createEffortMixOptions = (data: GreenhouseDashboardData): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    toolbar: { show: false }
  },
  labels: data.charts.effortMix.map(item => item.label),
  colors: data.charts.effortMix.map(item => effortColorMap[item.key] || effortColorMap.unknown),
  dataLabels: { enabled: false },
  stroke: {
    width: 4,
    colors: ['var(--mui-palette-background-paper)']
  },
  legend: {
    position: 'bottom',
    labels: {
      colors: 'var(--mui-palette-text-secondary)'
    }
  },
  plotOptions: {
    pie: {
      donut: {
        size: '72%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Estimadas',
            formatter: () => String(data.charts.effortMix.reduce((sum, item) => sum + item.value, 0))
          }
        }
      }
    }
  },
  tooltip: {
    y: {
      formatter: value => `${value} tareas`
    }
  }
})

export const createOnTimeOptions = (theme: Theme): ApexOptions => ({
  stroke: { dashArray: 10 },
  labels: ['On-time portfolio'],
  colors: ['var(--mui-palette-success-main)'],
  states: {
    hover: {
      filter: { type: 'none' }
    },
    active: {
      filter: { type: 'none' }
    }
  },
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'dark',
      opacityTo: 0.45,
      opacityFrom: 1,
      shadeIntensity: 0.45,
      stops: [30, 70, 100],
      inverseColors: false,
      gradientToColors: ['var(--mui-palette-success-main)']
    }
  },
  plotOptions: {
    radialBar: {
      startAngle: -135,
      endAngle: 135,
      hollow: { size: '58%' },
      track: { background: alpha(theme.palette.success.main, 0.12) },
      dataLabels: {
        name: {
          offsetY: -18,
          color: 'var(--mui-palette-text-secondary)',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body2.fontSize as string
        },
        value: {
          offsetY: 14,
          formatter: value => `${Math.round(value)}%`,
          color: 'var(--mui-palette-text-primary)',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.h3.fontSize as string,
          fontWeight: 600
        }
      }
    }
  },
  grid: {
    padding: {
      top: -18,
      bottom: -4
    }
  }
})

export const createMonthlyOnTimeOptions = (theme: Theme, data: GreenhouseDashboardData): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    toolbar: { show: false }
  },
  stroke: {
    curve: 'smooth',
    width: 3
  },
  markers: {
    size: 4,
    strokeWidth: 0,
    colors: ['var(--mui-palette-background-paper)']
  },
  dataLabels: { enabled: false },
  colors: ['var(--mui-palette-success-main)'],
  grid: {
    borderColor: 'var(--mui-palette-divider)',
    strokeDashArray: 6,
    padding: {
      left: 0,
      right: 8,
      top: -8,
      bottom: -8
    }
  },
  xaxis: {
    categories: data.charts.monthlyDelivery.map(item => item.label),
    axisTicks: { show: false },
    axisBorder: { show: false },
    labels: {
      style: {
        colors: 'var(--mui-palette-text-disabled)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  yaxis: {
    min: 0,
    max: 100,
    tickAmount: 4,
    labels: {
      formatter: value => `${Math.round(value)}%`,
      style: {
        colors: 'var(--mui-palette-text-disabled)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  tooltip: {
    y: {
      formatter: value => `${Math.round(value)}% on-time`
    }
  }
})

export const createMonthlyAdjustmentOptions = (theme: Theme, data: GreenhouseDashboardData): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    stacked: true,
    toolbar: { show: false }
  },
  dataLabels: { enabled: false },
  stroke: {
    width: 0
  },
  plotOptions: {
    bar: {
      borderRadius: 8,
      columnWidth: '48%'
    }
  },
  colors: ['var(--mui-palette-success-main)', 'var(--mui-palette-warning-main)'],
  grid: {
    borderColor: 'var(--mui-palette-divider)',
    strokeDashArray: 6,
    padding: {
      left: 0,
      right: 8,
      top: -10,
      bottom: -8
    }
  },
  legend: {
    position: 'top',
    horizontalAlign: 'left',
    labels: {
      colors: 'var(--mui-palette-text-secondary)'
    }
  },
  xaxis: {
    categories: data.charts.monthlyDelivery.map(item => item.label),
    axisTicks: { show: false },
    axisBorder: { show: false },
    labels: {
      style: {
        colors: 'var(--mui-palette-text-disabled)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  yaxis: {
    labels: {
      style: {
        colors: 'var(--mui-palette-text-disabled)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  tooltip: {
    y: {
      formatter: value => `${value} entregables`
    }
  }
})

export const createQualitySignalsOptions = (theme: Theme, data: GreenhouseDashboardData): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    stacked: false,
    toolbar: { show: false }
  },
  stroke: {
    curve: 'smooth',
    width: [3, 3]
  },
  markers: {
    size: 4,
    strokeWidth: 0
  },
  dataLabels: { enabled: false },
  colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-success-main)'],
  legend: {
    position: 'top',
    horizontalAlign: 'left',
    labels: {
      colors: 'var(--mui-palette-text-secondary)'
    }
  },
  grid: {
    borderColor: 'var(--mui-palette-divider)',
    strokeDashArray: 6,
    padding: {
      left: 0,
      right: 8,
      top: -8,
      bottom: -8
    }
  },
  xaxis: {
    categories: data.qualitySignals.map(item => item.label),
    axisTicks: { show: false },
    axisBorder: { show: false },
    labels: {
      style: {
        colors: 'var(--mui-palette-text-disabled)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  yaxis: [
    {
      min: 0,
      labels: {
        formatter: value => value.toFixed(1),
        style: {
          colors: 'var(--mui-palette-text-disabled)',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body2.fontSize as string
        }
      }
    },
    {
      opposite: true,
      min: 0,
      max: 100,
      tickAmount: 4,
      labels: {
        formatter: value => `${Math.round(value)}%`,
        style: {
          colors: 'var(--mui-palette-text-disabled)',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body2.fontSize as string
        }
      }
    }
  ],
  tooltip: {
    shared: true,
    intersect: false
  }
})

export const createClientStatusDonutOptions = (theme: Theme, data: GreenhouseDashboardData): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    toolbar: { show: false }
  },
  labels: data.charts.statusMix.map(item => item.label),
  colors: clientStatusColors,
  legend: {
    position: 'bottom',
    labels: {
      colors: 'var(--mui-palette-text-secondary)'
    }
  },
  dataLabels: { enabled: false },
  stroke: {
    width: 4,
    colors: ['var(--mui-palette-background-paper)']
  },
  plotOptions: {
    pie: {
      donut: {
        size: '72%',
        labels: {
          show: true,
          total: {
            show: true,
            label: GH_LABELS.chart_total_assets,
            formatter: () => String(data.charts.statusMix.reduce((sum, item) => sum + item.value, 0))
          }
        }
      }
    }
  },
  tooltip: {
    y: {
      formatter: value => GH_MESSAGES.chart_tooltip_assets(value)
    }
  }
})

export const createWeeklyCadenceOptions = (theme: Theme, data: GreenhouseDashboardData): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    toolbar: { show: false }
  },
  plotOptions: {
    bar: {
      borderRadius: 6,
      columnWidth: '48%'
    }
  },
  dataLabels: { enabled: false },
  colors: ['var(--mui-palette-success-main)'],
  grid: {
    borderColor: 'var(--mui-palette-divider)',
    strokeDashArray: 6,
    padding: {
      top: -8,
      left: 0,
      right: 0,
      bottom: -8
    }
  },
  xaxis: {
    categories: data.charts.deliveryCadenceWeekly.map(item => item.label),
    axisTicks: { show: false },
    axisBorder: { show: false },
    labels: {
      rotate: 0,
      style: {
        colors: 'var(--mui-palette-text-disabled)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  yaxis: {
    labels: {
      style: {
        colors: 'var(--mui-palette-text-disabled)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  tooltip: {
    y: {
      formatter: value => GH_MESSAGES.chart_tooltip_weekly_assets(value)
    }
  }
})

export const createProjectRpaOptions = (theme: Theme): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    toolbar: { show: false }
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 6,
      barHeight: '52%'
    }
  },
  dataLabels: {
    enabled: true,
    formatter: value => Number(value).toFixed(1),
    style: {
      colors: ['var(--mui-palette-text-primary)']
    }
  },
  colors: ['var(--mui-palette-primary-main)'],
  grid: {
    borderColor: 'var(--mui-palette-divider)',
    strokeDashArray: 6,
    padding: {
      top: -8,
      left: 4,
      right: 8,
      bottom: -8
    }
  },
  annotations: {
    xaxis: [
      {
        x: 2,
        borderColor: 'var(--mui-palette-warning-main)',
        strokeDashArray: 4,
        label: {
          text: GH_MESSAGES.chart_goal_rpa,
          style: {
            background: 'var(--mui-palette-warning-main)',
            color: '#fff'
          }
        }
      }
    ]
  },
  xaxis: {
    labels: {
      formatter: value => Number(value).toFixed(1),
      style: {
        colors: 'var(--mui-palette-text-disabled)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  yaxis: {
    labels: {
      style: {
        colors: 'var(--mui-palette-text-secondary)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  tooltip: {
    y: {
      formatter: value => `${Number(value).toFixed(1)} RpA`
    }
  }
})

export const createClientOtdTrendOptions = (theme: Theme, data: GreenhouseDashboardData): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    toolbar: { show: false }
  },
  stroke: {
    curve: 'smooth',
    width: 3
  },
  markers: {
    size: 4,
    strokeWidth: 0,
    colors: ['var(--mui-palette-background-paper)']
  },
  dataLabels: { enabled: false },
  colors: ['var(--mui-palette-success-main)'],
  annotations: {
    yaxis: [
      {
        y: 90,
        borderColor: 'var(--mui-palette-success-main)',
        strokeDashArray: 4,
        label: {
          text: GH_MESSAGES.chart_goal_otd,
          style: {
            background: 'var(--mui-palette-success-main)',
            color: '#fff'
          }
        }
      }
    ]
  },
  grid: {
    borderColor: 'var(--mui-palette-divider)',
    strokeDashArray: 6,
    padding: {
      top: -8,
      left: 0,
      right: 8,
      bottom: -8
    }
  },
  xaxis: {
    categories: data.charts.monthlyDelivery.map(item => item.label),
    axisTicks: { show: false },
    axisBorder: { show: false },
    labels: {
      style: {
        colors: 'var(--mui-palette-text-disabled)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  yaxis: {
    min: 0,
    max: 100,
    tickAmount: 4,
    labels: {
      formatter: value => `${Math.round(value)}%`,
      style: {
        colors: 'var(--mui-palette-text-disabled)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  tooltip: {
    y: {
      formatter: value => `${Math.round(value)}%`
    }
  }
})
