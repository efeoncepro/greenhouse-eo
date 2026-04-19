'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import dynamic from 'next/dynamic'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import type { ApexOptions } from 'apexcharts'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import CustomChip from '@core/components/mui/Chip'

import { GH_MRR_ARR_DASHBOARD } from '@/config/greenhouse-nomenclature'

import type {
  ContractMrrArrSnapshotRow,
  MrrArrMovementType,
  MrrArrNrrComputation,
  MrrArrPeriodTotals,
  MrrArrSeriesPoint
} from '@/lib/commercial-intelligence/contracts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })

interface PeriodResponse {
  period: { year: number; month: number }
  totals: MrrArrPeriodTotals
  items: ContractMrrArrSnapshotRow[]
  count: number
}

interface TimelineResponse {
  range: { fromYear: number; fromMonth: number; toYear: number; toMonth: number }
  series: MrrArrSeriesPoint[]
  nrr: MrrArrNrrComputation
}

const formatCLP = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—'

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount)
}

const formatPct = (value: number | null | undefined, digits = 1): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'

  return `${value.toFixed(digits)}%`
}

const formatMonthShort = (year: number, month: number): string => {
  const d = new Date(year, month - 1, 1)

  return d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })
}

const formatMonthLong = (year: number, month: number): string => {
  const d = new Date(year, month - 1, 1)
  const s = d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

  return s.charAt(0).toUpperCase() + s.slice(1)
}

const MOVEMENT_LABEL: Record<MrrArrMovementType, string> = {
  new: GH_MRR_ARR_DASHBOARD.movementNew,
  expansion: GH_MRR_ARR_DASHBOARD.movementExpansion,
  contraction: GH_MRR_ARR_DASHBOARD.movementContraction,
  churn: GH_MRR_ARR_DASHBOARD.movementChurn,
  reactivation: GH_MRR_ARR_DASHBOARD.movementReactivation,
  unchanged: GH_MRR_ARR_DASHBOARD.movementUnchanged
}

const MOVEMENT_COLOR: Record<MrrArrMovementType, 'success' | 'info' | 'primary' | 'warning' | 'error' | 'default'> = {
  new: 'success',
  expansion: 'info',
  reactivation: 'primary',
  contraction: 'warning',
  churn: 'error',
  unchanged: 'default'
}

const getCurrentPeriod = (): { year: number; month: number } => {
  const now = new Date()

  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
}

const nrrStatusColor = (pct: number | null): 'success' | 'warning' | 'error' | 'secondary' => {
  if (pct === null) return 'secondary'
  if (pct >= 100) return 'success'
  if (pct >= 90) return 'warning'

  return 'error'
}

const nrrSubtitle = (pct: number | null): string => {
  if (pct === null) return GH_MRR_ARR_DASHBOARD.kpiNrrNoData
  if (pct > 100) return GH_MRR_ARR_DASHBOARD.kpiNrrSubtitleAbove
  if (pct >= 90) return GH_MRR_ARR_DASHBOARD.kpiNrrSubtitleHealthy

  return GH_MRR_ARR_DASHBOARD.kpiNrrSubtitleRisk
}

const MrrArrDashboardView = () => {
  const theme = useTheme()

  const [period, setPeriod] = useState<{ year: number; month: number }>(() => getCurrentPeriod())
  const [periodData, setPeriodData] = useState<PeriodResponse | null>(null)
  const [timelineData, setTimelineData] = useState<TimelineResponse | null>(null)

  const [loadingPeriod, setLoadingPeriod] = useState(false)
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [errorPeriod, setErrorPeriod] = useState<string | null>(null)
  const [errorTimeline, setErrorTimeline] = useState<string | null>(null)

  const fetchPeriod = useCallback(async (year: number, month: number) => {
    setLoadingPeriod(true)
    setErrorPeriod(null)

    try {
      const res = await fetch(`/api/finance/commercial-intelligence/mrr-arr?year=${year}&month=${month}`)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = (await res.json()) as PeriodResponse

      setPeriodData(data)
    } catch (err) {
      setErrorPeriod(err instanceof Error ? err.message : GH_MRR_ARR_DASHBOARD.errorText)
    } finally {
      setLoadingPeriod(false)
    }
  }, [])

  const fetchTimeline = useCallback(async () => {
    setLoadingTimeline(true)
    setErrorTimeline(null)

    try {
      const res = await fetch('/api/finance/commercial-intelligence/mrr-arr/timeline?months=12')

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = (await res.json()) as TimelineResponse

      setTimelineData(data)
    } catch (err) {
      setErrorTimeline(err instanceof Error ? err.message : GH_MRR_ARR_DASHBOARD.errorText)
    } finally {
      setLoadingTimeline(false)
    }
  }, [])

  useEffect(() => {
    fetchPeriod(period.year, period.month)
  }, [fetchPeriod, period.year, period.month])

  useEffect(() => {
    fetchTimeline()
  }, [fetchTimeline])

  const handlePrev = () => {
    setPeriod(prev => {
      const m = prev.month === 1 ? 12 : prev.month - 1
      const y = prev.month === 1 ? prev.year - 1 : prev.year

      return { year: y, month: m }
    })
  }

  const handleNext = () => {
    setPeriod(prev => {
      const m = prev.month === 12 ? 1 : prev.month + 1
      const y = prev.month === 12 ? prev.year + 1 : prev.year

      return { year: y, month: m }
    })
  }

  const totals = periodData?.totals

  const topContracts = useMemo(() => {
    const items = periodData?.items ?? []

    return [...items].sort((a, b) => b.mrrClp - a.mrrClp).slice(0, 10)
  }, [periodData?.items])

  const chartOptions: ApexOptions = useMemo(() => {
    const categories = (timelineData?.series ?? []).map(s => formatMonthShort(s.periodYear, s.periodMonth))

    return {
      chart: {
        type: 'bar',
        stacked: true,
        toolbar: { show: false },
        fontFamily: 'inherit'
      },
      plotOptions: {
        bar: { horizontal: false, borderRadius: 4 }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories,
        labels: { style: { colors: theme.palette.text.secondary } }
      },
      yaxis: {
        labels: {
          style: { colors: theme.palette.text.secondary },
          formatter: (val: number) => {
            const abs = Math.abs(val)

            if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
            if (abs >= 1_000) return `${(val / 1_000).toFixed(0)}K`

            return String(val)
          }
        }
      },
      tooltip: {
        y: {
          formatter: (val: number) => formatCLP(Math.abs(val))
        }
      },
      legend: { position: 'top', horizontalAlign: 'left' },
      grid: { borderColor: theme.palette.divider },
      colors: [
        theme.palette.success.main,   // new
        theme.palette.info.main,      // expansion
        theme.palette.primary.main,   // reactivation
        theme.palette.warning.main,   // contraction (negated)
        theme.palette.error.main      // churn (negated)
      ]
    }
  }, [theme, timelineData?.series])

  const chartSeries = useMemo(() => {
    const series = timelineData?.series ?? []

    return [
      { name: GH_MRR_ARR_DASHBOARD.movementNew, data: series.map(s => s.movements.new.mrrClp) },
      { name: GH_MRR_ARR_DASHBOARD.movementExpansion, data: series.map(s => s.movements.expansion.mrrClp) },
      { name: GH_MRR_ARR_DASHBOARD.movementReactivation, data: series.map(s => s.movements.reactivation.mrrClp) },
      {
        name: GH_MRR_ARR_DASHBOARD.movementContraction,
        data: series.map(s => -Math.abs(s.movements.contraction.mrrClp))
      },
      {
        name: GH_MRR_ARR_DASHBOARD.movementChurn,
        data: series.map(s => -Math.abs(s.movements.churn.mrrClp))
      }
    ]
  }, [timelineData?.series])

  const nrr = timelineData?.nrr ?? null

  const trendChip = useMemo(() => {
    if (!totals || totals.mrrDeltaPctFromPrev === null) return null

    const pct = totals.mrrDeltaPctFromPrev

    if (Math.abs(pct) < 0.1) return 'Sin cambios'

    const sign = pct > 0 ? '↑' : '↓'

    return `${sign} ${Math.abs(pct).toFixed(1)}% ${GH_MRR_ARR_DASHBOARD.kpiMrrDeltaMomLabel}`
  }, [totals])

  return (
    <Stack spacing={4} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 500 }}>
            {GH_MRR_ARR_DASHBOARD.headerTitle}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {GH_MRR_ARR_DASHBOARD.headerSubtitle}
          </Typography>
        </Box>
        <Stack direction='row' spacing={1} alignItems='center'>
          <Button
            variant='outlined'
            size='small'
            startIcon={<i className='tabler-chevron-left' />}
            onClick={handlePrev}
            disabled={loadingPeriod}
          >
            {GH_MRR_ARR_DASHBOARD.prevMonthButton}
          </Button>
          <Typography variant='body1' sx={{ fontWeight: 500, minWidth: 160, textAlign: 'center' }}>
            {formatMonthLong(period.year, period.month)}
          </Typography>
          <Button
            variant='outlined'
            size='small'
            endIcon={<i className='tabler-chevron-right' />}
            onClick={handleNext}
            disabled={loadingPeriod}
          >
            {GH_MRR_ARR_DASHBOARD.nextMonthButton}
          </Button>
        </Stack>
      </Box>

      {errorPeriod && (
        <Alert severity='error' role='alert'>
          {errorPeriod}
        </Alert>
      )}

      {/* KPI row */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {loadingPeriod ? (
            <Skeleton variant='rounded' height={130} />
          ) : (
            <HorizontalWithSubtitle
              title={GH_MRR_ARR_DASHBOARD.kpiMrrLabel}
              stats={formatCLP(totals?.mrrClp ?? 0)}
              subtitle={trendChip ?? '—'}
              titleTooltip={GH_MRR_ARR_DASHBOARD.kpiMrrTooltip}
              avatarIcon='tabler-chart-line'
              avatarColor='primary'
              trend={
                totals?.mrrDeltaPctFromPrev === null || totals?.mrrDeltaPctFromPrev === undefined
                  ? 'neutral'
                  : totals.mrrDeltaPctFromPrev > 0
                    ? 'positive'
                    : totals.mrrDeltaPctFromPrev < 0
                      ? 'negative'
                      : 'neutral'
              }
            />
          )}
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {loadingPeriod ? (
            <Skeleton variant='rounded' height={130} />
          ) : (
            <HorizontalWithSubtitle
              title={GH_MRR_ARR_DASHBOARD.kpiArrLabel}
              stats={formatCLP(totals?.arrClp ?? 0)}
              subtitle='MRR × 12'
              titleTooltip={GH_MRR_ARR_DASHBOARD.kpiArrTooltip}
              avatarIcon='tabler-trending-up'
              avatarColor='info'
            />
          )}
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {loadingTimeline ? (
            <Skeleton variant='rounded' height={130} />
          ) : (
            <HorizontalWithSubtitle
              title={GH_MRR_ARR_DASHBOARD.kpiNrrLabel}
              stats={formatPct(nrr?.nrrPct ?? null)}
              subtitle={nrrSubtitle(nrr?.nrrPct ?? null)}
              titleTooltip={GH_MRR_ARR_DASHBOARD.kpiNrrTooltip}
              avatarIcon='tabler-heart-rate-monitor'
              avatarColor={nrrStatusColor(nrr?.nrrPct ?? null)}
            />
          )}
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {loadingPeriod ? (
            <Skeleton variant='rounded' height={130} />
          ) : (
            <HorizontalWithSubtitle
              title={GH_MRR_ARR_DASHBOARD.kpiContractsCountLabel}
              stats={String(totals?.contractsCount ?? 0)}
              subtitle={GH_MRR_ARR_DASHBOARD.kpiContractsCountSubtitle}
              titleTooltip={GH_MRR_ARR_DASHBOARD.kpiContractsCountTooltip}
              avatarIcon='tabler-file-text'
              avatarColor='success'
            />
          )}
        </Grid>
      </Grid>

      {/* Timeline chart */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title={GH_MRR_ARR_DASHBOARD.timelineChartTitle}
          subheader={GH_MRR_ARR_DASHBOARD.timelineChartSubtitle}
        />
        <Divider />
        <CardContent>
          {loadingTimeline ? (
            <Skeleton variant='rounded' height={360} />
          ) : errorTimeline ? (
            <Alert severity='error' role='alert'>
              {errorTimeline}
            </Alert>
          ) : !timelineData || timelineData.series.length === 0 ? (
            <Alert severity='info' role='status' icon={<i className='tabler-chart-bar' />}>
              <AlertTitle>{GH_MRR_ARR_DASHBOARD.emptyTitle}</AlertTitle>
              {GH_MRR_ARR_DASHBOARD.emptyDescription}
            </Alert>
          ) : (
            <AppReactApexCharts type='bar' height={360} options={chartOptions} series={chartSeries} />
          )}
        </CardContent>
      </Card>

      {/* Breakdown cards */}
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          <BreakdownCard
            title={GH_MRR_ARR_DASHBOARD.breakdownByCommercialModelTitle}
            data={totals?.byCommercialModel ?? {}}
            loading={loadingPeriod}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <BreakdownCard
            title={GH_MRR_ARR_DASHBOARD.breakdownByStaffingModelTitle}
            data={totals?.byStaffingModel ?? {}}
            loading={loadingPeriod}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <BreakdownCard
            title={GH_MRR_ARR_DASHBOARD.breakdownByBusinessLineTitle}
            data={totals?.byBusinessLine ?? {}}
            loading={loadingPeriod}
            limit={5}
          />
        </Grid>
      </Grid>

      {/* Top 10 contracts table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title={GH_MRR_ARR_DASHBOARD.topContractsTitle}
          subheader={GH_MRR_ARR_DASHBOARD.topContractsSubtitle}
        />
        <Divider />
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell scope='col'>{GH_MRR_ARR_DASHBOARD.colContract}</TableCell>
                <TableCell scope='col'>{GH_MRR_ARR_DASHBOARD.colCommercialModel}</TableCell>
                <TableCell scope='col'>{GH_MRR_ARR_DASHBOARD.colStaffingModel}</TableCell>
                <TableCell scope='col' align='right'>{GH_MRR_ARR_DASHBOARD.colMrr}</TableCell>
                <TableCell scope='col' align='right'>{GH_MRR_ARR_DASHBOARD.colArr}</TableCell>
                <TableCell scope='col' align='right'>{GH_MRR_ARR_DASHBOARD.colDelta}</TableCell>
                <TableCell scope='col'>{GH_MRR_ARR_DASHBOARD.colMovement}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingPeriod ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Skeleton variant='rounded' height={120} />
                  </TableCell>
                </TableRow>
              ) : topContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Alert severity='info' role='status'>
                      <AlertTitle>{GH_MRR_ARR_DASHBOARD.emptyTitle}</AlertTitle>
                      {GH_MRR_ARR_DASHBOARD.emptyDescription}
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : (
                topContracts.map(row => (
                  <TableRow key={row.contractId} hover>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant='body2' sx={{ fontWeight: 500 }}>
                          {row.contractNumber ?? row.contractId}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {row.clientName ?? '—'}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>{row.commercialModel}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>{row.staffingModel}</Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                        {formatCLP(row.mrrClp)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }} color='text.secondary'>
                        {formatCLP(row.arrClp)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography
                        variant='body2'
                        sx={{ fontFamily: 'monospace' }}
                        color={row.mrrDeltaClp > 0 ? 'success.main' : row.mrrDeltaClp < 0 ? 'error.main' : 'text.secondary'}
                      >
                        {row.mrrDeltaClp > 0 ? '+' : ''}{formatCLP(row.mrrDeltaClp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <CustomChip
                        round='true'
                        size='small'
                        variant='tonal'
                        color={MOVEMENT_COLOR[row.movementType]}
                        label={MOVEMENT_LABEL[row.movementType]}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  )
}

interface BreakdownCardProps {
  title: string
  data: Record<string, { mrrClp: number; count: number }>
  loading: boolean
  limit?: number
}

const BreakdownCard = ({ title, data, loading, limit }: BreakdownCardProps) => {
  const entries = Object.entries(data).sort((a, b) => b[1].mrrClp - a[1].mrrClp)
  const visible = limit ? entries.slice(0, limit) : entries
  const remaining = limit && entries.length > limit ? entries.length - limit : 0

  return (
    <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, height: '100%' }}>
      <CardHeader title={title} titleTypographyProps={{ variant: 'subtitle1' }} />
      <Divider />
      <CardContent>
        {loading ? (
          <Skeleton variant='rounded' height={160} />
        ) : visible.length === 0 ? (
          <Typography variant='body2' color='text.secondary'>
            {GH_MRR_ARR_DASHBOARD.breakdownEmpty}
          </Typography>
        ) : (
          <Stack spacing={1}>
            {visible.map(([key, value]) => (
              <Stack key={key} direction='row' justifyContent='space-between' alignItems='center'>
                <Typography variant='body2'>
                  {key} <Typography component='span' variant='caption' color='text.secondary'>({value.count})</Typography>
                </Typography>
                <Typography variant='body2' sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                  {formatCLP(value.mrrClp)}
                </Typography>
              </Stack>
            ))}
            {remaining > 0 && (
              <Typography variant='caption' color='text.secondary'>
                {GH_MRR_ARR_DASHBOARD.breakdownMoreItems(remaining)}
              </Typography>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

export default MrrArrDashboardView
