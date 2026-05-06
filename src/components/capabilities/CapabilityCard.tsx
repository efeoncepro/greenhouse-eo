'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

import type { ThemeColor } from '@core/types'
import CustomAvatar from '@core/components/mui/Avatar'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import { EmptyState, ExecutiveCardShell } from '@/components/greenhouse'
import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import type {
  CapabilityCardData,
  CapabilityMetricsRowItem,
  CapabilityModuleCard,
  CapabilityModuleData,
  CapabilityTierMatrixCell
} from '@/types/capabilities'

const TASK407_ARIA_MATRIZ_DE_VISIBILIDAD_POR_TIER_PARA_CREATIVE_VELOCITY_REVI = "Matriz de visibilidad por tier para Creative Velocity Review"


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

const tierCellToneToMuiColor: Record<CapabilityTierMatrixCell['tone'], ThemeColor> = {
  success: 'success',
  warning: 'warning',
  info: 'info',
  default: 'secondary'
}

const TierMatrixCard = ({ card, cardData }: TypedCapabilityCardProps<'tier-matrix'>) => (
  <ExecutiveCardShell title={card.title} subtitle={card.description} contentSx={{ pt: 3.5 }}>
    {cardData.rows.length > 0 ? (
      <Stack spacing={3}>
        <Typography variant='body2' color='text.secondary'>
          {cardData.intro}
        </Typography>

        <Box
          sx={{
            borderRadius: 3,
            border: theme => `1px solid ${theme.palette.divider}`,
            overflow: 'hidden'
          }}
        >
          <Table size='small' aria-label={TASK407_ARIA_MATRIZ_DE_VISIBILIDAD_POR_TIER_PARA_CREATIVE_VELOCITY_REVI}>
            <TableHead>
              <TableRow sx={{ bgcolor: theme => alpha(theme.palette.action.hover, 0.72) }}>
                <TableCell sx={{ fontWeight: 700 }}>Metrica</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Basic</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Pro</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Enterprise</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cardData.rows.map(row => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ minWidth: 180 }}>
                    <Stack spacing={0.5}>
                      <Typography variant='subtitle2'>{row.metric}</Typography>
                      {row.note ? (
                        <Typography variant='caption' color='text.secondary'>
                          {row.note}
                        </Typography>
                      ) : null}
                    </Stack>
                  </TableCell>
                  {[row.basic, row.pro, row.enterprise].map((cell, index) => (
                    <TableCell key={`${row.id}-${index}`} sx={{ verticalAlign: 'top', minWidth: 170 }}>
                      <Stack spacing={0.75} alignItems='flex-start'>
                        <Chip
                          label={cell.label}
                          size='small'
                          variant='tonal'
                          color={tierCellToneToMuiColor[cell.tone]}
                          sx={{ fontWeight: 600 }}
                        />
                        {cell.detail ? (
                          <Typography variant='caption' color='text.secondary'>
                            {cell.detail}
                          </Typography>
                        ) : null}
                      </Stack>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        {cardData.footnote ? (
          <Typography variant='caption' color='text.secondary'>
            {cardData.footnote}
          </Typography>
        ) : null}
      </Stack>
    ) : (
      <EmptyState
        icon='tabler-layout-grid'
        title='Sin matriz de visibilidad'
        description='Todavia no hay una policy visible por tier para este modulo.'
        minHeight={180}
      />
    )}
  </ExecutiveCardShell>
)

const toneToMuiColor: Record<CapabilityMetricsRowItem['tone'], ThemeColor> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info'
}

const SectionHeaderCard = ({ card, cardData }: TypedCapabilityCardProps<'section-header'>) => (
  <Box sx={{ pt: 3, pb: 0.5 }}>
    <Stack direction='row' spacing={1.5} alignItems='center'>
      <CustomAvatar skin='light' variant='rounded' color='primary' size={36}>
        <i className={`${cardData.icon} text-[20px]`} />
      </CustomAvatar>
      <Box>
        <Typography variant='h5'>{card.title}</Typography>
        <Typography variant='body2' color='text.secondary'>
          {cardData.subtitle}
        </Typography>
      </Box>
    </Stack>
    <Divider sx={{ mt: 2 }} />
  </Box>
)

const MetricsRowCard = ({ card, cardData }: TypedCapabilityCardProps<'metrics-row'>) => (
  <ExecutiveCardShell title={card.title} subtitle={card.description} contentSx={{ pt: 3.5 }}>
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          xl: 'repeat(4, minmax(0, 1fr))'
        }
      }}
    >
      {cardData.items.map(item => (
        <Box
          key={item.id}
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: theme => `1px solid ${theme.palette.customColors.lightAlloy}`,
            bgcolor: 'background.default',
            display: 'grid',
            gap: 1
          }}
        >
          <Typography variant='caption' color='text.secondary'>
            {item.label}
          </Typography>
          {item.value !== null ? (
            <Typography variant='h5' sx={{ color: `var(--mui-palette-${toneToMuiColor[item.tone]}-main)` }}>
              {item.value}
            </Typography>
          ) : (
            <Typography variant='body2' color='text.disabled'>
              Proximamente
            </Typography>
          )}
          <Typography variant='caption' color='text.secondary'>
            {item.description}
          </Typography>
        </Box>
      ))}
    </Box>
  </ExecutiveCardShell>
)

const PipelineCard = ({ card, cardData }: TypedCapabilityCardProps<'pipeline'>) => {
  const hasData = cardData.total > 0

  return (
    <ExecutiveCardShell title={card.title} subtitle={card.description} contentSx={{ pt: 3.5 }}>
      {hasData ? (
        <Stack spacing={3}>
          <Stack direction='row' spacing={1} alignItems='center'>
            <Typography variant='body2' color='text.secondary'>
              {cardData.total} assets en pipeline
            </Typography>
          </Stack>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {cardData.phases.map(phase => (
              <Tooltip key={phase.id} title={`${phase.label}: ${phase.count} assets`} arrow>
                <Box
                  sx={{
                    flex: phase.count > 0 ? `${Math.max(phase.count, 1)} 1 0` : '0 0 auto',
                    minWidth: 60,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: `1px solid ${alpha(phase.color, 0.24)}`
                  }}
                >
                  <Box sx={{ height: 6, bgcolor: phase.color }} />
                  <Stack sx={{ p: 1.5, bgcolor: alpha(phase.color, 0.06) }} spacing={0.5}>
                    <Typography variant='h6' sx={{ color: phase.color, lineHeight: 1.2 }}>
                      {phase.count}
                    </Typography>
                    <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.65rem' }}>
                      {phase.label}
                    </Typography>
                  </Stack>
                </Box>
              </Tooltip>
            ))}
          </Box>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            {cardData.phases.map(phase => (
              <Stack key={phase.id} direction='row' spacing={0.5} alignItems='center'>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: phase.color }} />
                <Typography variant='caption' color='text.secondary'>
                  {phase.label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      ) : (
        <EmptyState
          icon='tabler-git-branch'
          title='Pipeline sin actividad'
          description='Tu pipeline creativo aparecera aqui cuando haya tareas activas en tus proyectos.'
          minHeight={180}
        />
      )}
    </ExecutiveCardShell>
  )
}

const AlertListCard = ({ card, cardData }: TypedCapabilityCardProps<'alert-list'>) => (
  <ExecutiveCardShell title={card.title} subtitle={card.description} contentSx={{ pt: 3.5 }}>
    {cardData.items.length > 0 ? (
      <Stack spacing={2}>
        {cardData.items.map(item => {
          const isDanger = item.severity === 'danger'

          return (
            <Box
              key={item.id}
              sx={theme => ({
                display: 'flex',
                gap: 2,
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderRadius: 3,
                border: `1px solid ${alpha(isDanger ? theme.palette.error.main : theme.palette.warning.main, 0.24)}`,
                bgcolor: isDanger ? theme.palette.error.lighterOpacity : theme.palette.warning.lighterOpacity
              })}
            >
              <Stack direction='row' spacing={1.5} alignItems='center' sx={{ minWidth: 0, flex: 1 }}>
                <CustomAvatar skin='light' variant='rounded' color={isDanger ? 'error' : 'warning'} size={36}>
                  <i className='tabler-alert-triangle text-[20px]' />
                </CustomAvatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='subtitle2' noWrap>
                    {item.name}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {item.project} · {item.phase}
                  </Typography>
                </Box>
              </Stack>
              {item.frameUrl ? (
                <Button component={Link} href={item.frameUrl} target='_blank' size='small' variant='text' color={isDanger ? 'error' : 'warning'} sx={{ flexShrink: 0 }}>
                  Ver
                </Button>
              ) : (
                <Chip
                  size='small'
                  variant='tonal'
                  color={isDanger ? 'error' : 'warning'}
                  label={isDanger ? 'Critico' : 'Detenido'}
                />
              )}
            </Box>
          )
        })}
      </Stack>
    ) : (
      <EmptyState
        icon='tabler-circle-check'
        title='Pipeline fluye sin obstaculos'
        description={cardData.emptyMessage}
        minHeight={160}
      />
    )}
  </ExecutiveCardShell>
)

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
    case 'tier-matrix':
      return <TierMatrixCard {...props} cardData={cardData} />
    case 'chart-bar':
      return <BarChartCard {...props} cardData={cardData} />
    case 'section-header':
      return <SectionHeaderCard {...props} cardData={cardData} />
    case 'metrics-row':
      return <MetricsRowCard {...props} cardData={cardData} />
    case 'pipeline':
      return <PipelineCard {...props} cardData={cardData} />
    case 'alert-list':
      return <AlertListCard {...props} cardData={cardData} />
    default:
      return <MissingCardData card={props.card} />
  }
}

export default CapabilityCard
