'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import dynamic from 'next/dynamic'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import type { ApexOptions } from 'apexcharts'

import PeriodNavigator from '@/components/greenhouse/PeriodNavigator'
import EmptyState from '@/components/greenhouse/EmptyState'
import HorizontalWithSubtitle from '@/components/card-statistics/HorizontalWithSubtitle'
import StatsWithAreaChart from '@/components/card-statistics/StatsWithAreaChart'
import type { AgencyEconomicsResponse, AgencyEconomicsSpaceRow } from '@/types/agency-economics'
import { formatCurrency as formatGreenhouseCurrency } from '@/lib/format'
import CustomChip from '@core/components/mui/Chip'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })

const formatMoney = (value: number) => formatGreenhouseCurrency(value, 'CLP', { maximumFractionDigits: 0 })

const formatPct = (value: number | null | undefined) => {
  if (value == null) return 'Sin dato'

  return `${value.toFixed(1)}%`
}

const getMarginColor = (value: number | null | undefined): 'success' | 'warning' | 'error' | 'secondary' => {
  if (value == null) return 'secondary'
  if (value >= 30) return 'success'
  if (value >= 15) return 'warning'

  return 'error'
}

const toTrendDirection = (value: number | null | undefined): 'positive' | 'negative' | 'neutral' | undefined => {
  if (value == null) return undefined
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'

  return 'neutral'
}

const buildRevenueVsCostOptions = (categories: string[], paletteMode: 'light' | 'dark'): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    toolbar: { show: false },
    stacked: false
  },
  stroke: {
    width: [0, 3],
    curve: 'smooth'
  },
  dataLabels: { enabled: false },
  fill: {
    type: ['solid', 'gradient'],
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.06,
      stops: [0, 95, 100]
    }
  },
  colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-warning-main)'],
  xaxis: {
    categories,
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  legend: {
    position: 'top',
    horizontalAlign: 'left'
  },
  grid: {
    borderColor: 'var(--mui-palette-divider)',
    strokeDashArray: 5
  },
  tooltip: {
    theme: paletteMode,
    y: {
      formatter: value => formatMoney(Number(value))
    }
  }
})

const buildMarginOptions = (categories: string[], paletteMode: 'light' | 'dark'): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    toolbar: { show: false }
  },
  stroke: {
    width: 3,
    curve: 'smooth'
  },
  dataLabels: { enabled: false },
  colors: ['var(--mui-palette-success-main)'],
  xaxis: {
    categories,
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    labels: {
      formatter: value => `${Number(value).toFixed(0)}%`
    }
  },
  grid: {
    borderColor: 'var(--mui-palette-divider)',
    strokeDashArray: 5
  },
  tooltip: {
    theme: paletteMode,
    y: {
      formatter: value => `${Number(value).toFixed(1)}%`
    }
  }
})

const SpaceServicesPanel = ({ row }: { row: AgencyEconomicsSpaceRow }) => (
  <Stack spacing={2.5}>
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      justifyContent='space-between'
      alignItems={{ xs: 'flex-start', md: 'center' }}
    >
      <div>
        <Typography variant='body2' fontWeight={600}>
          Contexto de servicios
        </Typography>
        <Typography variant='caption' color='text.secondary'>
          Esta expansión muestra catálogo y costo contratado. El detalle económico por servicio todavía no está disponible.
        </Typography>
      </div>
      <Chip
        size='small'
        variant='outlined'
        color='warning'
        label='Detalle por servicio pendiente'
      />
    </Stack>

    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Typography variant='caption' color='text.secondary'>
          Servicios activos
        </Typography>
        <Typography variant='h6'>{row.serviceCount}</Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Typography variant='caption' color='text.secondary'>
          Costo contratado visible
        </Typography>
        <Typography variant='h6'>{formatMoney(row.serviceTotalContractClp)}</Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Button component={Link} href={`/agency/spaces/${row.spaceId}`} variant='outlined' size='small'>
          Abrir Space 360
        </Button>
      </Grid>
    </Grid>

    {row.services.length === 0 ? (
      <EmptyState
        icon='tabler-briefcase-off'
        title='Sin servicios activos'
        description='No encontramos servicios activos vinculados a este Space para mostrar contexto contractual.'
        minHeight={180}
      />
    ) : (
      <List
        disablePadding
        sx={{
          border: theme => `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {row.services.map((service, index) => (
          <ListItem
            key={service.serviceId}
            divider={index < row.services.length - 1}
            sx={{ alignItems: 'flex-start', py: 1.75 }}
          >
            <ListItemText
              primary={
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                  <Typography variant='body2' fontWeight={600}>
                    {service.name}
                  </Typography>
                  <Chip size='small' label={service.pipelineStage} />
                </Stack>
              }
              secondary={
                <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                  <Typography variant='caption' color='text.secondary'>
                    {service.lineaDeServicio} · {service.servicioEspecifico}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {service.startDate || 'Sin inicio'} · {service.targetEndDate || 'Sin cierre objetivo'}
                  </Typography>
                </Stack>
              }
            />
            <Typography variant='body2' fontWeight={600}>
              {service.totalCostClp != null ? formatMoney(service.totalCostClp) : 'Sin costo'}
            </Typography>
          </ListItem>
        ))}
      </List>
    )}
  </Stack>
)

const EconomicsView = () => {
  const theme = useTheme()
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [data, setData] = useState<AgencyEconomicsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSpaceId, setExpandedSpaceId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/agency/economics?year=${year}&month=${month}&trendMonths=6`, {
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = (await response.json()) as AgencyEconomicsResponse

      setData(payload)
      setExpandedSpaceId(current => (current && payload.bySpace.some(row => row.spaceId === current) ? current : null))
    } catch (fetchError) {
      setData(null)
      setError(fetchError instanceof Error ? fetchError.message : 'No pudimos cargar la economía de la agencia.')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const trendCategories = useMemo(() => data?.trends.map(point => point.label) || [], [data])

  const revenueVsCostSeries = useMemo(
    () => [
      {
        name: 'Ingresos',
        type: 'column',
        data: data?.trends.map(point => point.revenueClp) || []
      },
      {
        name: 'Costo total',
        type: 'area',
        data: data?.trends.map(point => point.totalCostClp) || []
      }
    ],
    [data]
  )

  const marginSeries = useMemo(
    () => [
      {
        name: 'Margen',
        data: data?.trends.map(point => point.grossMarginPct ?? 0) || []
      }
    ],
    [data]
  )

  const revenueSparkline = useMemo(
    () => [
      {
        data: data?.trends.map(point => point.revenueClp) || []
      }
    ],
    [data]
  )

  const revenueVsCostOptions = useMemo(
    () => buildRevenueVsCostOptions(trendCategories, theme.palette.mode),
    [theme.palette.mode, trendCategories]
  )

  const marginOptions = useMemo(
    () => buildMarginOptions(trendCategories, theme.palette.mode),
    [theme.palette.mode, trendCategories]
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity='error' sx={{ mb: 6 }}>
        No pudimos cargar la economía de la agencia. Detalle: {error}
      </Alert>
    )
  }

  if (!data) {
    return null
  }

  const isEmpty = data.bySpace.length === 0
  const selectedPeriodLabel = data.period.label

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card variant='outlined'>
          <CardHeader
            title='Economía de la agencia'
            subheader='Rentabilidad por Space con ingresos, costos y evolución reciente del período.'
            action={
              <PeriodNavigator
                year={year}
                month={month}
                onChange={({ year: nextYear, month: nextMonth }) => {
                  setYear(nextYear)
                  setMonth(nextMonth)
                }}
              />
            }
          />
        </Card>
      </Grid>

      {data.partialState.messages.length > 0 ? (
        <Grid size={{ xs: 12 }}>
          <Stack spacing={2}>
            {data.partialState.messages.map(message => (
              <Alert key={message} severity={data.bySpace.length === 0 ? 'info' : 'warning'}>
                {message}
              </Alert>
            ))}
          </Stack>
        </Grid>
      ) : null}

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatsWithAreaChart
          title='Ingresos del período'
          stats={formatMoney(data.totals.revenueClp)}
          avatarIcon='tabler-building-bank'
          avatarColor='success'
          chartColor='success'
          chartSeries={revenueSparkline}
          subtitle={selectedPeriodLabel}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <HorizontalWithSubtitle
          title='Margen bruto'
          stats={formatPct(data.totals.grossMarginPct)}
          avatarIcon='tabler-chart-line'
          avatarColor='primary'
          subtitle={`${formatMoney(data.totals.grossMarginClp)} disponibles tras costo total`}
          statusLabel={data.period.periodClosed ? 'Período cerrado' : 'Período abierto'}
          statusColor={data.period.periodClosed ? 'success' : 'warning'}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <HorizontalWithSubtitle
          title='Payroll ratio'
          stats={formatPct(data.totals.payrollRatioPct)}
          avatarIcon='tabler-users'
          avatarColor='info'
          subtitle={`${formatMoney(data.totals.laborCostClp)} en costo laboral comercial`}
          footer='Costo laboral sobre ingresos del período'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <HorizontalWithSubtitle
          title='Costo total'
          stats={formatMoney(data.totals.totalCostClp)}
          avatarIcon='tabler-receipt-2'
          avatarColor='warning'
          subtitle={`${data.totals.spaceCount} spaces con snapshot vigente`}
          footer={`${data.totals.activeServiceCount} servicios activos visibles`}
        />
      </Grid>

      {isEmpty ? (
        <Grid size={{ xs: 12 }}>
          <EmptyState
            icon='tabler-chart-bar-off'
            animatedIcon='/animations/empty-chart.json'
            title='Sin P&L por Space para este período'
            description='Prueba otro mes o espera a que el cierre operativo consolide el P&L del período.'
            action={
              <Button component={Link} href='/finance/intelligence' variant='contained'>
                Ir a Finance Intelligence
              </Button>
            }
          />
        </Grid>
      ) : (
        <>
          <Grid size={{ xs: 12, xl: 8 }}>
            <Card variant='outlined'>
              <CardHeader
                title='P&L por Space'
                subheader='Ingresos, costos y margen consolidados para cada Space del período.'
              />
              <CardContent sx={{ pt: 0 }}>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell width={48} />
                      <TableCell>Space</TableCell>
                      <TableCell align='right'>Ingresos</TableCell>
                      <TableCell align='right'>Labor</TableCell>
                      <TableCell align='right'>Directos</TableCell>
                      <TableCell align='right'>Overhead</TableCell>
                      <TableCell align='right'>Margen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.bySpace.map(row => {
                      const expanded = expandedSpaceId === row.spaceId

                      return (
                        <FragmentRow
                          key={row.spaceId}
                          row={row}
                          expanded={expanded}
                          onToggle={() => setExpandedSpaceId(current => (current === row.spaceId ? null : row.spaceId))}
                        />
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, xl: 4 }}>
            <Card variant='outlined' sx={{ height: '100%' }}>
              <CardHeader
                title='Ranking de rentabilidad'
                subheader='Spaces con mejor margen bruto en el período.'
              />
              <CardContent sx={{ pt: 0 }}>
                <Stack spacing={2}>
                  {data.ranking.map((item, index) => (
                    <Box
                      key={item.spaceId}
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        border: theme => `1px solid ${theme.palette.divider}`,
                        backgroundColor: theme => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.04)
                      }}
                    >
                      <Stack direction='row' justifyContent='space-between' spacing={2}>
                        <div>
                          <Typography variant='body2' fontWeight={700}>
                            #{index + 1} {item.spaceName}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {item.organizationName || 'Sin organización resuelta'}
                          </Typography>
                        </div>
                        <CustomChip
                          size='small'
                          variant='tonal'
                          round='true'
                          color={getMarginColor(item.grossMarginPct)}
                          label={formatPct(item.grossMarginPct)}
                        />
                      </Stack>
                      <Divider sx={{ my: 1.5 }} />
                      <Stack direction='row' justifyContent='space-between' spacing={2}>
                        <Typography variant='caption' color='text.secondary'>
                          Ingresos {formatMoney(item.revenueClp)}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          Margen {formatMoney(item.grossMarginClp)}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, xl: 7 }}>
            <Card variant='outlined'>
              <CardHeader
                title='Ingresos vs costo total'
                subheader='Serie agregada de los últimos seis meses para los Spaces con P&L disponible.'
              />
              <CardContent>
                <AppReactApexCharts
                  type='line'
                  height={320}
                  width='100%'
                  options={revenueVsCostOptions}
                  series={revenueVsCostSeries}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, xl: 5 }}>
            <Card variant='outlined'>
              <CardHeader
                title='Tendencia de margen'
                subheader='Margen bruto agregado por período sobre la misma base operativa.'
              />
              <CardContent>
                <AppReactApexCharts
                  type='line'
                  height={320}
                  width='100%'
                  options={marginOptions}
                  series={marginSeries}
                />
              </CardContent>
            </Card>
          </Grid>
        </>
      )}
    </Grid>
  )
}

const FragmentRow = ({
  row,
  expanded,
  onToggle
}: {
  row: AgencyEconomicsSpaceRow
  expanded: boolean
  onToggle: () => void
}) => {
  const revenueTrendDirection = toTrendDirection(row.revenueTrendPct)

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton size='small' onClick={onToggle} aria-label={expanded ? 'Contraer detalle' : 'Expandir detalle'}>
            <i className={expanded ? 'tabler-chevron-up' : 'tabler-chevron-down'} />
          </IconButton>
        </TableCell>
        <TableCell>
          <Stack spacing={0.5}>
            <Typography variant='body2' fontWeight={600}>
              {row.spaceName}
            </Typography>
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              <Typography variant='caption' color='text.secondary'>
                {row.organizationName || 'Sin organización resuelta'}
              </Typography>
              <Chip
                size='small'
                variant='outlined'
                color={row.periodClosed ? 'success' : 'warning'}
                label={row.periodClosed ? 'Cerrado' : 'Abierto'}
              />
            </Stack>
          </Stack>
        </TableCell>
        <TableCell align='right'>
          <Stack spacing={0.5} alignItems='flex-end'>
            <Typography variant='body2' fontWeight={600}>
              {formatMoney(row.revenueClp)}
            </Typography>
            <Typography
              variant='caption'
              color={
                revenueTrendDirection === 'positive'
                  ? 'success.main'
                  : revenueTrendDirection === 'negative'
                    ? 'error.main'
                    : 'text.secondary'
              }
            >
              {row.revenueTrendPct != null ? `${row.revenueTrendPct > 0 ? '+' : ''}${row.revenueTrendPct.toFixed(1)}% vs mes anterior` : 'Sin base comparativa'}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell align='right'>{formatMoney(row.laborCostClp)}</TableCell>
        <TableCell align='right'>{formatMoney(row.directExpenseClp)}</TableCell>
        <TableCell align='right'>{formatMoney(row.overheadClp)}</TableCell>
        <TableCell align='right'>
          <Stack spacing={0.75} alignItems='flex-end'>
            <Typography variant='body2' fontWeight={600}>
              {formatMoney(row.grossMarginClp)}
            </Typography>
            <CustomChip
              size='small'
              variant='tonal'
              round='true'
              color={getMarginColor(row.grossMarginPct)}
              label={formatPct(row.grossMarginPct)}
            />
          </Stack>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0, borderBottom: expanded ? undefined : 0 }}>
          <Collapse in={expanded} timeout='auto' unmountOnExit>
            <Box
              sx={{
                px: 3,
                py: 3,
                backgroundColor: theme => alpha(theme.palette.action.hover, theme.palette.mode === 'dark' ? 0.16 : 0.4)
              }}
            >
              <SpaceServicesPanel row={row} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

export default EconomicsView
