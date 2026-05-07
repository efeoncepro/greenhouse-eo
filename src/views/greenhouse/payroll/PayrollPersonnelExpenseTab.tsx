'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import dynamic from 'next/dynamic'

import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme, type Theme } from '@mui/material/styles'

import type { ApexOptions } from 'apexcharts'
import { TabContext, TabPanel } from '@mui/lab'

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'
import CustomTextField from '@core/components/mui/TextField'

import { HorizontalWithSubtitle } from '@/components/card-statistics'
import type { PayrollCurrency } from '@/types/payroll'
import type { PersonnelExpenseReport, PersonnelExpenseCurrencyMeta } from '@/lib/payroll/personnel-expense'
import { formatCurrency, formatPeriodLabel } from './helpers'
import { getMicrocopy } from '@/lib/copy'

const GREENHOUSE_COPY = getMicrocopy()
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

const SHORT_MONTH_NAMES = GREENHOUSE_COPY.months.short

const formatMonthRange = (meta: PersonnelExpenseCurrencyMeta): string => {
  if (meta.periodCount === 1) {
    return `${SHORT_MONTH_NAMES[meta.monthFrom - 1]} ${meta.yearFrom}`
  }

  const from = `${SHORT_MONTH_NAMES[meta.monthFrom - 1]}`
  const to = `${SHORT_MONTH_NAMES[meta.monthTo - 1]}`

  return meta.yearFrom === meta.yearTo
    ? `${from}–${to} ${meta.yearFrom}`
    : `${from} ${meta.yearFrom}–${to} ${meta.yearTo}`
}

const PayrollPersonnelExpenseTab = () => {
  const theme = useTheme()
  const now = new Date()
  const [yearFrom, setYearFrom] = useState(now.getFullYear())
  const [monthFrom, setMonthFrom] = useState(1)
  const [yearTo, setYearTo] = useState(now.getFullYear())
  const [monthTo, setMonthTo] = useState(now.getMonth() + 1)

  const [data, setData] = useState<PersonnelExpenseReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartCurrencyTab, setChartCurrencyTab] = useState<string>('CLP')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        yearFrom: String(yearFrom),
        monthFrom: String(monthFrom),
        yearTo: String(yearTo),
        monthTo: String(monthTo)
      })

      const res = await fetch(`/api/hr/payroll/personnel-expense?${params}`)

      if (!res.ok) {
        const json = await res.json().catch(() => null)

        setError(json?.error || 'Error cargando datos de gasto')

        return
      }

      setData(await res.json())
    } catch {
      setError('Error de red al cargar gasto de personal')
    } finally {
      setLoading(false)
    }
  }, [yearFrom, monthFrom, yearTo, monthTo])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set initial chart tab to first available currency
  useEffect(() => {
    if (data && data.totals.byCurrency.length > 0) {
      setChartCurrencyTab(data.totals.byCurrency[0].currency)
    }
  }, [data])

  if (loading) {
    return (
      <Stack spacing={6}>
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant='rounded' height={120} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={300} />
        <Skeleton variant='rounded' height={200} />
      </Stack>
    )
  }

  if (error) {
    return (
      <Alert
        severity='error'
        onClose={() => setError(null)}
        action={(
          <Button color='inherit' size='small' onClick={() => void fetchData()}>
            Reintentar
          </Button>
        )}
      >
        {error}
      </Alert>
    )
  }

  if (!data || data.periods.length === 0) {
    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <Stack alignItems='center' spacing={1}>
            <i className='tabler-chart-bar-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
            <Typography color='text.secondary'>
              No hay períodos aprobados en el rango seleccionado.
            </Typography>
            <Typography variant='caption' color='text.disabled'>
              Los datos aparecerán cuando haya períodos aprobados o exportados.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return <ExpenseContent data={data} theme={theme} chartCurrencyTab={chartCurrencyTab} setChartCurrencyTab={setChartCurrencyTab} yearFrom={yearFrom} setYearFrom={setYearFrom} monthFrom={monthFrom} setMonthFrom={setMonthFrom} yearTo={yearTo} setYearTo={setYearTo} monthTo={monthTo} setMonthTo={setMonthTo} />
}

// ─── Content component (only renders when data exists) ──────────

type ExpenseContentProps = {
  data: PersonnelExpenseReport
  theme: Theme
  chartCurrencyTab: string
  setChartCurrencyTab: (v: string) => void
  yearFrom: number
  setYearFrom: (v: number) => void
  monthFrom: number
  setMonthFrom: (v: number) => void
  yearTo: number
  setYearTo: (v: number) => void
  monthTo: number
  setMonthTo: (v: number) => void
}

const ExpenseContent = ({ data, theme, chartCurrencyTab, setChartCurrencyTab, yearFrom, setYearFrom, monthFrom, setMonthFrom, yearTo, setYearTo, monthTo, setMonthTo }: ExpenseContentProps) => {
  const { totals, periods, byRegime } = data
  const chileRegime = byRegime.find(r => r.regime === 'chile')
  const intlRegime = byRegime.find(r => r.regime === 'international')
  const clpTotals = totals.byCurrency.find(b => b.currency === 'CLP')
  const usdTotals = totals.byCurrency.find(b => b.currency === 'USD')
  const clpAvg = totals.avgMonthlyByCurrency.find(b => b.currency === 'CLP')
  const usdAvg = totals.avgMonthlyByCurrency.find(b => b.currency === 'USD')
  const hasMixedCurrency = totals.byCurrency.length > 1
  const currencies = totals.byCurrency.map(b => b.currency)

  const metaFor = (currency: PayrollCurrency) => totals.currencyMeta?.find(m => m.currency === currency)
  const clpMeta = metaFor('CLP')
  const usdMeta = metaFor('USD')

  // Headcount breakdown label
  const headcountParts: string[] = []

  if (totals.headcountByRegime) {
    const chile = totals.headcountByRegime.find(r => r.regime === 'chile')
    const intl = totals.headcountByRegime.find(r => r.regime === 'international')

    if (chile && chile.headcount > 0) headcountParts.push(`${chile.headcount} Chile`)
    if (intl && intl.headcount > 0) headcountParts.push(`${intl.headcount} Internacional`)
  }

  const headcountSubtitle = headcountParts.length > 0 ? headcountParts.join(' · ') : 'Colaboradores'

  // Build KPI subtitle per currency: "N períodos · M colaboradores · Meses"
  const buildCurrencySubtitle = (meta: PersonnelExpenseCurrencyMeta | undefined) => {
    if (!meta) return ''

    const parts: string[] = []

    parts.push(`${meta.periodCount} período${meta.periodCount !== 1 ? 's' : ''}`)
    parts.push(`${meta.headcount} colab.`)
    parts.push(formatMonthRange(meta))

    return parts.join(' · ')
  }

  // Chart data per currency
  const chartCategories = periods.map(p => formatPeriodLabel(p.year, p.month))

  const buildChartForCurrency = (currency: PayrollCurrency) => {
    const gross = periods.map(p => p.totalsByCurrency.find(b => b.currency === currency)?.gross ?? 0)
    const net = periods.map(p => p.totalsByCurrency.find(b => b.currency === currency)?.net ?? 0)

    return { gross, net }
  }

  const lineOptions = useMemo((): ApexOptions => ({
    chart: { parentHeightOffset: 0, toolbar: { show: false } },
    dataLabels: { enabled: false },
    stroke: { width: 3, curve: 'smooth' },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      padding: { top: -10, bottom: -5 }
    },
    xaxis: {
      categories: chartCategories,
      labels: { style: { colors: 'var(--mui-palette-text-secondary)', fontSize: '11px' } }
    },
    yaxis: {
      labels: {
        style: { colors: 'var(--mui-palette-text-secondary)' },
        formatter: v => formatCurrency(v, chartCurrencyTab as PayrollCurrency)
      }
    },
    colors: [theme.palette.warning.main, theme.palette.success.main],
    legend: { position: 'top' },
    tooltip: {
      y: { formatter: v => formatCurrency(v, chartCurrencyTab as PayrollCurrency) }
    }
  }), [chartCategories, chartCurrencyTab, theme])

  // Donut: only for single-currency, using headcount (not amounts)
  const donutLabels: string[] = []
  const donutSeries: number[] = []
  const showDonut = !hasMixedCurrency

  if (showDonut) {
    if (chileRegime && chileRegime.headcount > 0) {
      donutLabels.push('Chile')
      donutSeries.push(chileRegime.headcount)
    }

    if (intlRegime && intlRegime.headcount > 0) {
      donutLabels.push('Internacional')
      donutSeries.push(intlRegime.headcount)
    }
  }

  const donutOptions: ApexOptions = {
    chart: { parentHeightOffset: 0 },
    labels: donutLabels,
    colors: [theme.palette.success.main, theme.palette.info.main],
    legend: { position: 'bottom' },
    dataLabels: { enabled: true, formatter: (_, opts) => `${donutSeries[opts.seriesIndex]}` },
    tooltip: {
      y: { formatter: v => `${v} colaborador${v !== 1 ? 'es' : ''}` }
    }
  }

  return (
    <Stack spacing={6}>
      {/* Date range filter */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent sx={{ py: 2 }}>
          <Grid container spacing={2} alignItems='center'>
            <Grid size={{ xs: 12, sm: 'auto' }}>
              <Typography variant='subtitle2' color='text.secondary'>Rango:</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 2 }}>
              <CustomTextField
                fullWidth size='small' label='Año desde' type='number'
                value={yearFrom}
                onChange={e => setYearFrom(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 2 }}>
              <CustomTextField
                fullWidth size='small' label='Mes desde' type='number'
                value={monthFrom}
                onChange={e => setMonthFrom(Number(e.target.value))}
                inputProps={{ min: 1, max: 12 }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 2 }}>
              <CustomTextField
                fullWidth size='small' label='Año hasta' type='number'
                value={yearTo}
                onChange={e => setYearTo(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 2 }}>
              <CustomTextField
                fullWidth size='small' label='Mes hasta' type='number'
                value={monthTo}
                onChange={e => setMonthTo(Number(e.target.value))}
                inputProps={{ min: 1, max: 12 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* KPI summary cards */}
      <Grid container spacing={6}>
        {clpTotals && (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Bruto total CLP'
              stats={formatCurrency(clpTotals.gross, 'CLP')}
              avatarIcon='tabler-coins'
              avatarColor='warning'
              subtitle={buildCurrencySubtitle(clpMeta)}
            />
          </Grid>
        )}
        {usdTotals && (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Bruto total USD'
              stats={formatCurrency(usdTotals.gross, 'USD')}
              avatarIcon='tabler-coins'
              avatarColor='info'
              subtitle={buildCurrencySubtitle(usdMeta)}
            />
          </Grid>
        )}
        {clpAvg && (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Promedio mensual CLP'
              stats={formatCurrency(clpAvg.gross, 'CLP')}
              avatarIcon='tabler-chart-bar'
              avatarColor='success'
              subtitle={`Bruto total / ${clpMeta?.periodCount ?? periods.length} meses`}
            />
          </Grid>
        )}
        {usdAvg && (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Promedio mensual USD'
              stats={formatCurrency(usdAvg.gross, 'USD')}
              avatarIcon='tabler-chart-bar'
              avatarColor='secondary'
              subtitle={`Bruto total / ${usdMeta?.periodCount ?? periods.length} meses`}
            />
          </Grid>
        )}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Headcount máximo'
            stats={String(totals.totalHeadcount)}
            avatarIcon='tabler-users'
            avatarColor='primary'
            subtitle={headcountSubtitle}
          />
        </Grid>
      </Grid>

      {/* Evolution chart + Regime distribution */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: showDonut ? 8 : 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Evolución gasto de personal'
              subheader='Bruto vs Neto por período'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                  <i className='tabler-chart-line' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
                </Avatar>
              }
            />
            <Divider />
            <CardContent>
              {hasMixedCurrency ? (
                <TabContext value={chartCurrencyTab}>
                  <CustomTabList onChange={(_, v) => setChartCurrencyTab(v)} sx={{ mb: 2 }}>
                    {currencies.map(c => (
                      <Tab key={c} value={c} label={c} />
                    ))}
                  </CustomTabList>
                  {currencies.map(c => {
                    const chartData = buildChartForCurrency(c)

                    return (
                      <TabPanel key={c} value={c} sx={{ p: 0 }}>
                        <AppReactApexCharts
                          type='line'
                          height={300}
                          options={lineOptions}
                          series={[
                            { name: `Bruto ${c}`, data: chartData.gross },
                            { name: `Neto ${c}`, data: chartData.net }
                          ]}
                        />
                      </TabPanel>
                    )
                  })}
                </TabContext>
              ) : (
                <AppReactApexCharts
                  type='line'
                  height={300}
                  options={lineOptions}
                  series={(() => {
                    const c = currencies[0] ?? 'CLP'
                    const chartData = buildChartForCurrency(c)

                    return [
                      { name: `Bruto ${c}`, data: chartData.gross },
                      { name: `Neto ${c}`, data: chartData.net }
                    ]
                  })()}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
        {showDonut && donutSeries.length > 0 && (
          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, height: '100%' }}>
              <CardHeader
                title='Distribución por régimen'
                subheader='Por headcount'
                avatar={
                  <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                    <i className='tabler-chart-pie' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
                  </Avatar>
                }
              />
              <Divider />
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AppReactApexCharts
                  type='donut'
                  height={250}
                  options={donutOptions}
                  series={donutSeries}
                />
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Regime breakdown cards */}
      <Grid container spacing={6}>
        {chileRegime && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardContent>
                <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 2 }}>
                  <CustomChip round='true' size='small' label='Chile' color='success' />
                  <Typography variant='subtitle2'>{chileRegime.headcount} colaborador{chileRegime.headcount !== 1 ? 'es' : ''}</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Bruto acumulado</Typography>
                    <Typography variant='body1' fontWeight={600}>
                      {formatCurrency(chileRegime.gross, 'CLP')}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Neto acumulado</Typography>
                    <Typography variant='body1' fontWeight={600}>
                      {formatCurrency(chileRegime.net, 'CLP')}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
        {intlRegime && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardContent>
                <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 2 }}>
                  <CustomChip round='true' size='small' label='Internacional' color='info' />
                  <Typography variant='subtitle2'>{intlRegime.headcount} colaborador{intlRegime.headcount !== 1 ? 'es' : ''}</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Bruto acumulado</Typography>
                    <Typography variant='body1' fontWeight={600}>
                      {formatCurrency(intlRegime.gross, 'USD')}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Neto acumulado</Typography>
                    <Typography variant='body1' fontWeight={600}>
                      {formatCurrency(intlRegime.net, 'USD')}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Period detail table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Detalle por período'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-table' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <CardContent>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Período</TableCell>
                  <TableCell align='right'>Headcount</TableCell>
                  <TableCell align='right'>Bruto CLP</TableCell>
                  <TableCell align='right'>Neto CLP</TableCell>
                  <TableCell align='right'>Descuentos CLP</TableCell>
                  <TableCell align='right'>Bruto USD</TableCell>
                  <TableCell align='right' sx={{ fontWeight: 700 }}>Neto USD</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {periods.map(period => {
                  const clpBucket = period.totalsByCurrency.find(b => b.currency === 'CLP')
                  const usdBucket = period.totalsByCurrency.find(b => b.currency === 'USD')

                  return (
                    <TableRow key={period.periodId} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={500}>
                          {formatPeriodLabel(period.year, period.month)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>{period.headcount}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>
                          {clpBucket ? formatCurrency(clpBucket.gross, 'CLP') : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>
                          {clpBucket ? formatCurrency(clpBucket.net, 'CLP') : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' color='error.main'>
                          {clpBucket && clpBucket.deductions > 0 ? `- ${formatCurrency(clpBucket.deductions, 'CLP')}` : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>
                          {usdBucket ? formatCurrency(usdBucket.gross, 'USD') : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                          {usdBucket ? formatCurrency(usdBucket.net, 'USD') : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default PayrollPersonnelExpenseTab
