'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ApexOptions } from 'apexcharts'

import { EmptyState, ExecutiveCardShell, MetricList, MetricStatCard } from '@/components/greenhouse'
import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import type { CapabilityCardData, CapabilityModuleCard, CapabilityModuleData } from '@/types/capabilities'

type CapabilityCardProps = {
  card: CapabilityModuleCard
  data: CapabilityModuleData
}

type TypedCapabilityCardProps<T extends CapabilityCardData['type']> = CapabilityCardProps & {
  cardData: Extract<CapabilityCardData, { type: T }>
}

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
  <ExecutiveCardShell title={card.title} subtitle={card.description}>
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
      {cardData.metrics.map(metric => (
        <MetricStatCard
          key={metric.id}
          chipLabel={metric.chipLabel}
          chipTone={metric.chipTone}
          title={metric.title}
          value={metric.value}
          detail={metric.detail}
        />
      ))}
    </Box>
  </ExecutiveCardShell>
)

const ProjectListCard = ({ card, cardData }: TypedCapabilityCardProps<'project-list'>) => (
  <ExecutiveCardShell title={card.title} subtitle={card.description}>
    {cardData.items.length > 0 ? (
      <List disablePadding>
        {cardData.items.map(project => (
          <ListItem
            key={project.id}
            disableGutters
            secondaryAction={
              <Button component={Link} href={project.href} size='small' variant='text'>
                Ver proyecto
              </Button>
            }
            sx={{
              py: 2.25,
              borderBottom: theme => `1px solid ${theme.palette.divider}`,
              '&:last-of-type': { borderBottom: 'none', pb: 0 }
            }}
          >
            <ListItemText
              primary={
                <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
                  <Typography variant='h6'>{project.name}</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {project.status}
                  </Typography>
                </Stack>
              }
              secondary={project.detail}
              secondaryTypographyProps={{ color: 'text.secondary', sx: { mt: 0.5 } }}
            />
          </ListItem>
        ))}
      </List>
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
  <ExecutiveCardShell title={card.title} subtitle={card.description}>
    {cardData.items.length > 0 ? (
      <List disablePadding>
        {cardData.items.map(tool => (
          <ListItem
            key={tool.key}
            disableGutters
            component={tool.href ? Link : 'div'}
            href={tool.href || undefined}
            sx={{
              py: 1.75,
              alignItems: 'flex-start',
              borderBottom: theme => `1px solid ${theme.palette.divider}`,
              '&:last-of-type': { borderBottom: 'none', pb: 0 },
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            <ListItemText
              primary={
                <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
                  <Typography variant='subtitle1'>{tool.label}</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {tool.category}
                  </Typography>
                </Stack>
              }
              secondary={tool.description}
              secondaryTypographyProps={{ color: 'text.secondary', sx: { mt: 0.5 } }}
            />
          </ListItem>
        ))}
      </List>
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

const QualityListCard = ({ card, cardData }: TypedCapabilityCardProps<'quality-list'>) => (
  <ExecutiveCardShell title={card.title} subtitle={card.description}>
    {cardData.items.length > 0 ? (
      <List disablePadding>
        {cardData.items.map(item => (
          <ListItem
            key={item.month}
            disableGutters
            sx={{
              py: 1.75,
              borderBottom: theme => `1px solid ${theme.palette.divider}`,
              '&:last-of-type': { borderBottom: 'none', pb: 0 }
            }}
          >
            <ListItemText
              primary={<Typography variant='subtitle1'>{item.month}</Typography>}
              secondary={`RpA: ${item.avgRpa} | First-Time Right: ${item.firstTimeRight}`}
              secondaryTypographyProps={{ color: 'text.secondary', sx: { mt: 0.5 } }}
            />
          </ListItem>
        ))}
      </List>
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

const MetricListCard = ({ card, cardData }: TypedCapabilityCardProps<'metric-list'>) => (
  <ExecutiveCardShell title={card.title} subtitle={card.description}>
    {cardData.items.length > 0 ? (
      <MetricList items={cardData.items} />
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
            <Box>
              <Typography variant='body2' color='text.secondary'>
                {cardData.chart.summaryLabel}
              </Typography>
              <Typography variant='h5'>{cardData.chart.summaryValue}</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                {cardData.chart.summaryDetail}
              </Typography>
            </Box>
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
