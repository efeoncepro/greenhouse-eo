'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

import type { ThemeColor } from '@core/types'
import CustomAvatar from '@core/components/mui/Avatar'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import { EmptyState, ExecutiveCardShell } from '@/components/greenhouse'
import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import type { CapabilityCardData, CapabilityModuleCard, CapabilityModuleData } from '@/types/capabilities'

type CapabilityCardProps = {
  card: CapabilityModuleCard
  data: CapabilityModuleData
}

type TypedCapabilityCardProps<T extends CapabilityCardData['type']> = CapabilityCardProps & {
  cardData: Extract<CapabilityCardData, { type: T }>
}

const metricIcons = ['tabler-chart-line', 'tabler-message-circle', 'tabler-stack-2', 'tabler-bolt']
const listIcons = ['tabler-chart-bar', 'tabler-alert-triangle', 'tabler-bolt', 'tabler-stars', 'tabler-wave-sine']

const toneToColor: Record<'success' | 'warning' | 'info' | 'error', ThemeColor> = {
  success: 'success',
  warning: 'warning',
  info: 'info',
  error: 'error'
}

const parsePercent = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, '')
  const parsed = Number(cleaned)

  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0
}

const getMetricIcon = (metricId: string, index: number) => {
  if (metricId.includes('review')) return 'tabler-message-circle'
  if (metricId.includes('otd') || metricId.includes('completion') || metricId.includes('output')) return 'tabler-chart-line'
  if (metricId.includes('risk')) return 'tabler-alert-triangle'
  if (metricId.includes('blocked')) return 'tabler-lock-exclamation'
  if (metricId.includes('active') || metricId.includes('queue') || metricId.includes('load')) return 'tabler-stack-2'

  return metricIcons[index] || 'tabler-chart-dots'
}

const buildBarChartOptions = (categories: string[]): ApexOptions => ({
  chart: {
    toolbar: { show: false },
    parentHeightOffset: 0
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 6,
      borderRadiusApplication: 'end',
      barHeight: '48%'
    }
  },
  dataLabels: { enabled: false },
  legend: {
    position: 'top',
    horizontalAlign: 'left',
    fontSize: '13px',
    markers: { offsetX: -2 }
  },
  grid: {
    borderColor: 'rgba(var(--mui-mainColorChannels-lightShadow) / 0.16)',
    strokeDashArray: 6,
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: false } },
    padding: { top: -6, left: 0, right: 0, bottom: -4 }
  },
  colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-warning-main)'],
  xaxis: {
    categories,
    labels: {
      style: {
        fontSize: '12px',
        colors: 'var(--mui-palette-text-disabled)'
      }
    },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    labels: {
      style: {
        fontSize: '12px',
        colors: 'var(--mui-palette-text-primary)'
      }
    }
  },
  tooltip: {
    theme: 'false'
  },
  stroke: {
    width: 0
  }
})

const buildQualityRadialOptions = (fontFamily: string, label: string): ApexOptions => ({
  stroke: { dashArray: 10 },
  labels: [label],
  colors: ['var(--mui-palette-primary-main)'],
  states: {
    hover: { filter: { type: 'none' } },
    active: { filter: { type: 'none' } }
  },
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'dark',
      opacityTo: 0.45,
      opacityFrom: 1,
      shadeIntensity: 0.4,
      stops: [30, 70, 100],
      inverseColors: false,
      gradientToColors: ['var(--mui-palette-info-main)']
    }
  },
  plotOptions: {
    radialBar: {
      endAngle: 130,
      startAngle: -140,
      hollow: { size: '62%' },
      track: { background: 'transparent' },
      dataLabels: {
        name: {
          offsetY: -22,
          color: 'var(--mui-palette-text-disabled)',
          fontFamily,
          fontSize: '0.875rem'
        },
        value: {
          offsetY: 6,
          color: 'var(--mui-palette-text-primary)',
          fontFamily,
          fontWeight: 700,
          fontSize: '2rem',
          formatter: value => `${Math.round(value)}%`
        }
      }
    }
  },
  grid: {
    padding: {
      top: -16,
      left: 0,
      right: 0,
      bottom: 0
    }
  }
})

const MissingCardData = ({ card }: Pick<CapabilityCardProps, 'card'>) => (
  <ExecutiveCardShell title={card.title} subtitle={card.description}>
    <EmptyState
      icon='tabler-layout-grid'
      title='Card data no disponible'
      description='El modulo no entrego payload suficiente para renderizar esta tarjeta.'
      minHeight={180}
    />
  </ExecutiveCardShell>
)

const MetricCard = ({ card, cardData }: TypedCapabilityCardProps<'metric'>) => (
  <ExecutiveCardShell title={card.title} subtitle={card.description} contentSx={{ pt: 3.5 }}>
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: {
          xs: '1fr',
          md: 'repeat(3, minmax(0, 1fr))'
        }
      }}
    >
      {cardData.metrics.map((metric, index) => (
        <HorizontalWithSubtitle
          key={metric.id}
          title={metric.title}
          stats={metric.value}
          subtitle={metric.detail}
          avatarIcon={getMetricIcon(metric.id, index)}
          avatarColor={toneToColor[metric.chipTone]}
          statusLabel={metric.chipLabel}
          statusColor={toneToColor[metric.chipTone]}
        />
      ))}
    </Box>
  </ExecutiveCardShell>
)

const ProjectListCard = ({ card, cardData }: TypedCapabilityCardProps<'project-list'>) => (
  <ExecutiveCardShell title={card.title} subtitle={card.description} contentSx={{ pt: 3.5 }}>
    {cardData.items.length > 0 ? (
      <Stack spacing={3}>
        {cardData.items.map((project, index) => (
          <Box
            key={project.id}
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              pb: 2.5,
              borderBottom: theme => `1px solid ${theme.palette.divider}`,
              '&:last-of-type': { borderBottom: 'none', pb: 0 }
            }}
          >
            <Stack direction='row' spacing={2} alignItems='flex-start' sx={{ flex: 1, minWidth: 0 }}>
              <CustomAvatar skin='light' variant='rounded' color={index === 0 ? 'primary' : 'secondary'} size={38}>
                <i className='tabler-folder text-[22px]' />
              </CustomAvatar>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction='row' spacing={1.25} alignItems='center' flexWrap='wrap' useFlexGap>
                  <Typography variant='h6' sx={{ lineHeight: 1.2 }}>
                    {project.name}
                  </Typography>
                  <Chip label={project.status} size='small' variant='tonal' color='primary' />
                </Stack>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  {project.detail}
                </Typography>
              </Box>
            </Stack>
            <Button component={Link} href={project.href} size='small' variant='text' sx={{ flexShrink: 0 }}>
              Ver proyecto
            </Button>
          </Box>
        ))}
      </Stack>
    ) : (
      <EmptyState
        icon='tabler-folder-search'
        title='Sin proyectos visibles todavia'
        description='Este modulo necesita proyectos en alcance para construir la lectura ejecutiva.'
        minHeight={180}
      />
    )}
  </ExecutiveCardShell>
)

const ToolingListCard = ({ card, cardData }: TypedCapabilityCardProps<'tooling-list'>) => (
  <ExecutiveCardShell title={card.title} subtitle={card.description} contentSx={{ pt: 3.5 }}>
    {cardData.items.length > 0 ? (
      <Stack spacing={3}>
        {cardData.items.map(tool => (
          <Box
            key={tool.key}
            component={tool.href ? Link : 'div'}
            href={tool.href || undefined}
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start',
              pb: 2.5,
              borderBottom: theme => `1px solid ${theme.palette.divider}`,
              '&:last-of-type': { borderBottom: 'none', pb: 0 },
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            <CustomAvatar skin='light' variant='rounded' color='info' size={38}>
              <i className='tabler-tool text-[22px]' />
            </CustomAvatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction='row' spacing={1.25} alignItems='center' flexWrap='wrap' useFlexGap>
                <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                  {tool.label}
                </Typography>
                <Chip label={tool.category} size='small' variant='tonal' color='secondary' />
              </Stack>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                {tool.description}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    ) : (
      <EmptyState
        icon='tabler-tool'
        title='Sin tooling visible'
        description='No hay herramientas registradas para esta cuenta dentro del runtime actual.'
        minHeight={180}
      />
    )}
  </ExecutiveCardShell>
)

const QualityListCard = ({ card, cardData }: TypedCapabilityCardProps<'quality-list'>) => {
  const theme = useTheme()
  const latestSignal = cardData.items[0]
  const latestFirstTimeRight = latestSignal ? parsePercent(latestSignal.firstTimeRight) : 0

  return (
    <ExecutiveCardShell title={card.title} subtitle={card.description} contentSx={{ pt: 3.5 }}>
      {cardData.items.length > 0 ? (
        <Stack spacing={3}>
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              alignItems: 'center',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 220px) minmax(0, 1fr)' }
            }}
          >
            <Stack spacing={1.5}>
              <Box>
                <Typography variant='body2' color='text.secondary'>
                  Quality focus
                </Typography>
                <Typography variant='h3' sx={{ mt: 0.5 }}>
                  {latestSignal?.firstTimeRight || 'N/A'}
                </Typography>
              </Box>
              <Chip
                variant='tonal'
                color='primary'
                label={latestSignal ? `${latestSignal.month} | RpA ${latestSignal.avgRpa}` : 'Sin lectura reciente'}
                sx={{ width: 'fit-content' }}
              />
              <Typography variant='body2' color='text.secondary'>
                Lectura compacta tipo health card basada en el ultimo mes visible y la secuencia reciente de calidad.
              </Typography>
            </Stack>
            <AppReactApexCharts
              type='radialBar'
              height={250}
              width='100%'
              series={[latestFirstTimeRight]}
              options={buildQualityRadialOptions(theme.typography.fontFamily || 'inherit', latestSignal?.month || 'Latest')}
            />
          </Box>

          <Divider />

          <Stack spacing={2.25}>
            {cardData.items.map((item, index) => (
              <Box key={item.month} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <CustomAvatar
                  skin='light'
                  variant='rounded'
                  color={index === 0 ? 'primary' : 'secondary'}
                  size={34}
                >
                  <i className='tabler-sparkles text-[20px]' />
                </CustomAvatar>
                <Box sx={{ flex: 1 }}>
                  <Stack direction='row' spacing={1.25} alignItems='center' flexWrap='wrap' useFlexGap>
                    <Typography variant='subtitle2'>{item.month}</Typography>
                    <Chip size='small' variant='tonal' color='success' label={`FTR ${item.firstTimeRight}`} />
                  </Stack>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                    RpA: {item.avgRpa}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Stack>
      ) : (
        <EmptyState
          icon='tabler-chart-line'
          title='Sin quality signals suficientes'
          description='La cuenta todavia no entrega una senal de calidad util para este modulo.'
          minHeight={180}
        />
      )}
    </ExecutiveCardShell>
  )
}

const MetricListCard = ({ card, cardData }: TypedCapabilityCardProps<'metric-list'>) => (
  <ExecutiveCardShell title={card.title} subtitle={card.description} contentSx={{ pt: 3.5 }}>
    {cardData.items.length > 0 ? (
      <Stack spacing={3}>
        {cardData.items.map((item, index) => (
          <Box
            key={item.label}
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2.25,
              borderRadius: 3,
              bgcolor: theme => alpha(theme.palette.action.hover, 0.72),
              border: theme => `1px solid ${alpha(theme.palette.divider, 0.7)}`
            }}
          >
            <Stack direction='row' spacing={2} alignItems='center' sx={{ minWidth: 0, flex: 1 }}>
              <CustomAvatar skin='light' variant='rounded' color='primary' size={38}>
                <i className={listIcons[index] || 'tabler-list-details'} />
              </CustomAvatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                  {item.label}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                  {item.detail}
                </Typography>
              </Box>
            </Stack>
            <Chip label={item.value} color='primary' variant='tonal' sx={{ fontWeight: 700, flexShrink: 0 }} />
          </Box>
        ))}
      </Stack>
    ) : (
      <EmptyState
        icon='tabler-list-details'
        title='Sin pipeline visible'
        description='Todavia no hay suficiente senal para resumir este tramo del modulo.'
        minHeight={180}
      />
    )}
  </ExecutiveCardShell>
)

const BarChartCard = ({ card, cardData }: TypedCapabilityCardProps<'chart-bar'>) => {
  const hasChartData = cardData.chart.categories.length > 0

  return (
    <ExecutiveCardShell title={card.title} subtitle={card.description} contentSx={{ pt: 3.5 }}>
      {hasChartData ? (
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent='space-between'
          >
            <Stack direction='row' spacing={2} alignItems='flex-start'>
              <CustomAvatar skin='light' variant='rounded' color='warning' size={42}>
                <i className='tabler-chart-bar text-[22px]' />
              </CustomAvatar>
              <Box>
                <Typography variant='body2' color='text.secondary'>
                  {cardData.chart.summaryLabel}
                </Typography>
                <Typography variant='h5'>{cardData.chart.summaryValue}</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                  {cardData.chart.summaryDetail}
                </Typography>
              </Box>
            </Stack>
            <Chip
              variant='tonal'
              color='primary'
              label={`${cardData.chart.totalLabel}: ${cardData.chart.totalValue}`}
              sx={{ maxWidth: '100%' }}
            />
          </Stack>
          <AppReactApexCharts
            type='bar'
            height={280}
            width='100%'
            series={cardData.chart.series}
            options={buildBarChartOptions(cardData.chart.categories)}
          />
        </Stack>
      ) : (
        <EmptyState
          icon='tabler-chart-bar'
          title='Sin comparativa suficiente'
          description='Todavia no hay proyectos visibles para construir este grafico.'
          minHeight={220}
        />
      )}
    </ExecutiveCardShell>
  )
}

const CapabilityCard = (props: CapabilityCardProps) => {
  const cardData = props.data.cardData[props.card.id]

  if (!cardData || cardData.type !== props.card.type) {
    return <MissingCardData card={props.card} />
  }

  switch (cardData.type) {
    case 'metric':
      return <MetricCard {...props} cardData={cardData} />
    case 'project-list':
      return <ProjectListCard {...props} cardData={cardData} />
    case 'tooling-list':
      return <ToolingListCard {...props} cardData={cardData} />
    case 'quality-list':
      return <QualityListCard {...props} cardData={cardData} />
    case 'metric-list':
      return <MetricListCard {...props} cardData={cardData} />
    case 'chart-bar':
      return <BarChartCard {...props} cardData={cardData} />
    default:
      return <MissingCardData card={props.card} />
  }
}

export default CapabilityCard
