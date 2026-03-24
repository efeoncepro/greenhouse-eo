'use client'

import { useCallback, useEffect, useState } from 'react'

import dynamic from 'next/dynamic'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
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

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { HorizontalWithSubtitle } from '@/components/card-statistics'
import type { PersonnelExpenseReport } from '@/lib/payroll/personnel-expense'
import { formatCurrency, formatPeriodLabel } from './helpers'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

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
      <Alert severity='error' onClose={() => setError(null)}>
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

  const { totals, periods, byRegime } = data
  const chileRegime = byRegime.find(r => r.regime === 'chile')
  const intlRegime = byRegime.find(r => r.regime === 'international')

  // Chart: gross vs net evolution
  const chartCategories = periods.map(p => formatPeriodLabel(p.year, p.month))
  const chartGross = periods.map(p => p.totalGross)
  const chartNet = periods.map(p => p.totalNet)

  const lineOptions: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
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
        formatter: v => formatCurrency(v, 'CLP')
      }
    },
    colors: [theme.palette.warning.main, theme.palette.success.main],
    legend: { position: 'top' },
    tooltip: {
      y: { formatter: v => formatCurrency(v, 'CLP') }
    }
  }

  // Chart: regime distribution (donut)
  const donutLabels: string[] = []
  const donutSeries: number[] = []

  if (chileRegime && chileRegime.gross > 0) {
    donutLabels.push('Chile')
    donutSeries.push(chileRegime.gross)
  }

  if (intlRegime && intlRegime.gross > 0) {
    donutLabels.push('Internacional')
    donutSeries.push(intlRegime.gross)
  }

  const donutOptions: ApexOptions = {
    chart: { parentHeightOffset: 0 },
    labels: donutLabels,
    colors: [theme.palette.success.main, theme.palette.info.main],
    legend: { position: 'bottom' },
    dataLabels: { enabled: true },
    tooltip: {
      y: { formatter: v => formatCurrency(v, 'CLP') }
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
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Gasto bruto total'
            stats={formatCurrency(totals.totalGross, 'CLP')}
            avatarIcon='tabler-coins'
            avatarColor='warning'
            subtitle={`${periods.length} período${periods.length !== 1 ? 's' : ''}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Neto total pagado'
            stats={formatCurrency(totals.totalNet, 'CLP')}
            avatarIcon='tabler-wallet'
            avatarColor='success'
            subtitle='Acumulado en rango'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Promedio mensual bruto'
            stats={formatCurrency(totals.avgMonthlyGross, 'CLP')}
            avatarIcon='tabler-chart-bar'
            avatarColor='info'
            subtitle='Promedio por período'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Headcount máximo'
            stats={String(totals.totalHeadcount)}
            avatarIcon='tabler-users'
            avatarColor='primary'
            subtitle='Colaboradores'
          />
        </Grid>
      </Grid>

      {/* Evolution chart + Regime donut */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 8 }}>
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
              <AppReactApexCharts
                type='line'
                height={300}
                options={lineOptions}
                series={[
                  { name: 'Bruto', data: chartGross },
                  { name: 'Neto', data: chartNet }
                ]}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, height: '100%' }}>
            <CardHeader
              title='Distribución por régimen'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                  <i className='tabler-chart-pie' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
                </Avatar>
              }
            />
            <Divider />
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {donutSeries.length > 0 ? (
                <AppReactApexCharts
                  type='donut'
                  height={250}
                  options={donutOptions}
                  series={donutSeries}
                />
              ) : (
                <Typography color='text.disabled'>Sin datos de régimen</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Regime breakdown cards */}
      <Grid container spacing={6}>
        {chileRegime && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardContent>
                <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 2 }}>
                  <CustomChip round='true' size='small' label='Chile' color='success' />
                  <Typography variant='subtitle2'>{chileRegime.headcount} colaboradores</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Bruto acumulado</Typography>
                    <Typography variant='body1' fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                      {formatCurrency(chileRegime.gross, 'CLP')}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Neto acumulado</Typography>
                    <Typography variant='body1' fontWeight={600} sx={{ fontFamily: 'monospace' }}>
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
                  <Typography variant='subtitle2'>{intlRegime.headcount} colaboradores</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Bruto acumulado</Typography>
                    <Typography variant='body1' fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                      {formatCurrency(intlRegime.gross, 'USD')}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Neto acumulado</Typography>
                    <Typography variant='body1' fontWeight={600} sx={{ fontFamily: 'monospace' }}>
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
                  <TableCell align='right'>Total bruto</TableCell>
                  <TableCell align='right'>Bonos</TableCell>
                  <TableCell align='right'>Descuentos</TableCell>
                  <TableCell align='right' sx={{ fontWeight: 700 }}>Total neto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {periods.map(p => (
                  <TableRow key={p.periodId} hover>
                    <TableCell>
                      <Typography variant='body2' fontWeight={500}>
                        {formatPeriodLabel(p.year, p.month)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2'>{p.headcount}</Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {formatCurrency(p.totalGross, 'CLP')}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {formatCurrency(p.totalBonuses, 'CLP')}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' color='error.main' sx={{ fontFamily: 'monospace' }}>
                        {p.totalDeductions > 0 ? `- ${formatCurrency(p.totalDeductions, 'CLP')}` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='subtitle2' sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {formatCurrency(p.totalNet, 'CLP')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default PayrollPersonnelExpenseTab
