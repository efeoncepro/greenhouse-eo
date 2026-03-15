'use client'

import { useEffect, useState } from 'react'

import dynamic from 'next/dynamic'
import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'
import { useTheme } from '@mui/material/styles'

import type { ApexOptions } from 'apexcharts'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import OptionMenu from '@core/components/option-menu'
import CreateIncomeDrawer from '@views/greenhouse/finance/drawers/CreateIncomeDrawer'
import CreateExpenseDrawer from '@views/greenhouse/finance/drawers/CreateExpenseDrawer'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccountSummary {
  accountId: string
  accountName: string
  currency: string
  openingBalance: number
  isActive: boolean
}

interface ExchangeRate {
  available: boolean
  fromCurrency?: string
  toCurrency?: string
  rate?: number
  rateDate?: string
  source?: string
}

interface MonthlyDataPoint {
  year: number
  month: number
  totalAmountClp: number
}

interface SummaryData {
  currentMonth: {
    totalAmountClp: number
    changePercent: number
    trend: 'positive' | 'negative'
  }
  monthly: MonthlyDataPoint[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCLP = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)
}

const formatRate = (rate: number): string => {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(rate)
}

const MONTH_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// ---------------------------------------------------------------------------
// Chart config builders
// ---------------------------------------------------------------------------

const buildIncomeExpenseBarOptions = (theme: Theme, categories: string[]): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    toolbar: { show: false }
  },
  dataLabels: { enabled: false },
  legend: {
    position: 'top',
    horizontalAlign: 'left',
    labels: { colors: 'var(--mui-palette-text-secondary)' }
  },
  stroke: { width: [0, 0] },
  plotOptions: {
    bar: {
      borderRadius: 6,
      columnWidth: '45%'
    }
  },
  colors: ['var(--mui-palette-success-main)', 'var(--mui-palette-error-main)'],
  grid: {
    borderColor: 'var(--mui-palette-divider)',
    strokeDashArray: 4,
    padding: { left: 0, right: 0, top: -12, bottom: -8 }
  },
  xaxis: {
    categories,
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
      },
      formatter: (val: number) => {
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
        if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`

        return `$${val}`
      }
    }
  }
})

const buildCashFlowAreaOptions = (theme: Theme, categories: string[]): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    toolbar: { show: false }
  },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 },
  colors: ['var(--mui-palette-primary-main)'],
  fill: {
    type: 'gradient',
    gradient: { shadeIntensity: 0.3, opacityFrom: 0.4, opacityTo: 0.1 }
  },
  grid: {
    borderColor: 'var(--mui-palette-divider)',
    strokeDashArray: 4,
    padding: { left: 0, right: 0, top: -12, bottom: -8 }
  },
  xaxis: {
    categories,
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
      },
      formatter: (val: number) => {
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
        if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`

        return `$${val}`
      }
    }
  }
})

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FinanceDashboardView = () => {
  const theme = useTheme()

  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<AccountSummary[]>([])
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate>({ available: false })
  const [incomeSummary, setIncomeSummary] = useState<SummaryData | null>(null)
  const [expenseSummary, setExpenseSummary] = useState<SummaryData | null>(null)
  const [incomeDrawerOpen, setIncomeDrawerOpen] = useState(false)
  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false)
  const [fetchErrors, setFetchErrors] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      const errors: string[] = []

      try {
        const [accountsRes, rateRes, incomeRes, expenseRes] = await Promise.all([
          fetch('/api/finance/accounts'),
          fetch('/api/finance/exchange-rates/latest'),
          fetch('/api/finance/income/summary'),
          fetch('/api/finance/expenses/summary')
        ])

        if (cancelled) return

        if (accountsRes.ok) {
          const accountsData = await accountsRes.json()

          setAccounts(accountsData.items ?? [])
        } else {
          errors.push(`Cuentas: ${accountsRes.status}`)
        }

        if (rateRes.ok) {
          const rateData = await rateRes.json()

          setExchangeRate(rateData)
        }

        if (incomeRes.ok) {
          setIncomeSummary(await incomeRes.json())
        } else {
          const d = await incomeRes.json().catch(() => ({}))

          errors.push(`Ingresos: ${d.error || incomeRes.status}`)
        }

        if (expenseRes.ok) {
          setExpenseSummary(await expenseRes.json())
        } else {
          const d = await expenseRes.json().catch(() => ({}))

          errors.push(`Egresos: ${d.error || expenseRes.status}`)
        }
      } catch (e) {
        errors.push(`Conexión: ${e instanceof Error ? e.message : 'Error desconocido'}`)
      } finally {
        if (!cancelled) {
          setFetchErrors(errors)
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => { cancelled = true }
  }, [])

  // Derived values
  const totalBalance = accounts.reduce((sum, a) => sum + (a.openingBalance ?? 0), 0)
  const activeAccountCount = accounts.filter(a => a.isActive).length

  const incomeMonthly = incomeSummary?.monthly ?? []
  const expenseMonthly = expenseSummary?.monthly ?? []

  // Build aligned month labels and data from the last 6 months
  const allMonths = new Set<string>()

  incomeMonthly.forEach(m => allMonths.add(`${m.year}-${m.month}`))
  expenseMonthly.forEach(m => allMonths.add(`${m.year}-${m.month}`))

  const sortedMonths = Array.from(allMonths).sort()
  const chartLabels = sortedMonths.map(key => {
    const month = parseInt(key.split('-')[1])

    return MONTH_SHORT[month] || key
  })

  const incomeData = sortedMonths.map(key => {
    const [y, mo] = key.split('-').map(Number)

    return incomeMonthly.find(m => m.year === y && m.month === mo)?.totalAmountClp ?? 0
  })

  const expenseData = sortedMonths.map(key => {
    const [y, mo] = key.split('-').map(Number)

    return expenseMonthly.find(m => m.year === y && m.month === mo)?.totalAmountClp ?? 0
  })

  const cashFlowData = incomeData.map((inc, i) => inc - expenseData[i])

  const barSeries = [
    { name: 'Ingresos', data: incomeData },
    { name: 'Egresos', data: expenseData }
  ]

  const areaSeries = [
    { name: 'Flujo neto', data: cashFlowData }
  ]

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box>
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
            Finanzas
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Vista consolidada de ingresos, egresos y posición financiera
          </Typography>
        </Box>
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant='rounded' height={120} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Skeleton variant='rounded' height={380} />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Skeleton variant='rounded' height={380} />
          </Grid>
        </Grid>
      </Box>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Page header */}
      <Box>
        <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
          Finanzas
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Vista consolidada de ingresos, egresos y posición financiera
        </Typography>
      </Box>

      {/* API errors (diagnostic) */}
      {fetchErrors.length > 0 && (
        <Alert severity='warning' sx={{ whiteSpace: 'pre-line' }}>
          {`Error cargando datos del dashboard:\n${fetchErrors.join('\n')}`}
        </Alert>
      )}

      {/* KPI row */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Saldo total'
            stats={formatCLP(totalBalance)}
            subtitle={`${activeAccountCount} cuenta${activeAccountCount !== 1 ? 's' : ''} activa${activeAccountCount !== 1 ? 's' : ''}`}
            avatarIcon='tabler-wallet'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Ingresos del mes'
            stats={formatCLP(incomeSummary?.currentMonth.totalAmountClp ?? 0)}
            subtitle={incomeSummary?.currentMonth.changePercent !== undefined && incomeSummary.currentMonth.changePercent !== 0
              ? `${incomeSummary.currentMonth.changePercent > 0 ? '+' : ''}${incomeSummary.currentMonth.changePercent}% vs mes anterior`
              : 'Sin variación'}
            avatarIcon='tabler-cash'
            avatarColor='success'
            trend={incomeSummary?.currentMonth.trend === 'positive' ? 'positive' : 'negative'}
            trendNumber={incomeSummary?.currentMonth.changePercent !== undefined ? `${Math.abs(incomeSummary.currentMonth.changePercent)}%` : undefined}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Egresos del mes'
            stats={formatCLP(expenseSummary?.currentMonth.totalAmountClp ?? 0)}
            subtitle={expenseSummary?.currentMonth.changePercent !== undefined && expenseSummary.currentMonth.changePercent !== 0
              ? `${expenseSummary.currentMonth.changePercent > 0 ? '+' : ''}${expenseSummary.currentMonth.changePercent}% vs mes anterior`
              : 'Sin variación'}
            avatarIcon='tabler-credit-card'
            avatarColor='error'
            trend={expenseSummary?.currentMonth.trend === 'positive' ? 'positive' : 'negative'}
            trendNumber={expenseSummary?.currentMonth.changePercent !== undefined ? `${Math.abs(expenseSummary.currentMonth.changePercent)}%` : undefined}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Tipo de cambio'
            stats={exchangeRate.available && exchangeRate.rate ? `$${formatRate(exchangeRate.rate)}` : 'Sin datos'}
            subtitle={exchangeRate.available ? `USD → CLP · ${exchangeRate.source ?? 'manual'}` : 'Sin registros'}
            avatarIcon='tabler-arrows-exchange'
            avatarColor='info'
          />
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Ingresos vs Egresos'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                  <i className='tabler-chart-bar' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
                </Avatar>
              }
              action={<OptionMenu options={['Exportar', 'Últimos 6 meses', 'Último año']} />}
            />
            <Divider />
            <CardContent>
              {sortedMonths.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
                  <Typography variant='body2' color='text.secondary'>
                    Los datos aparecerán cuando registres tu primer ingreso o egreso
                  </Typography>
                </Box>
              ) : (
                <AppReactApexCharts
                  type='bar'
                  height={300}
                  options={buildIncomeExpenseBarOptions(theme, chartLabels)}
                  series={barSeries}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Flujo de caja'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                  <i className='tabler-trending-up' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
                </Avatar>
              }
              action={<OptionMenu options={['Exportar']} />}
            />
            <Divider />
            <CardContent>
              {sortedMonths.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
                  <Typography variant='body2' color='text.secondary'>
                    Sin datos de flujo de caja aún
                  </Typography>
                </Box>
              ) : (
                <AppReactApexCharts
                  type='area'
                  height={300}
                  options={buildCashFlowAreaOptions(theme, chartLabels)}
                  series={areaSeries}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick actions */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Button
            variant='contained'
            color='success'
            startIcon={<i className='tabler-plus' />}
            onClick={() => setIncomeDrawerOpen(true)}
          >
            Registrar ingreso
          </Button>
          <Button
            variant='contained'
            color='error'
            startIcon={<i className='tabler-plus' />}
            onClick={() => setExpenseDrawerOpen(true)}
          >
            Registrar egreso
          </Button>
          <Button
            component={Link}
            href='/finance/reconciliation'
            variant='outlined'
            color='primary'
            startIcon={<i className='tabler-arrows-exchange' />}
          >
            Iniciar conciliación
          </Button>
        </CardContent>
      </Card>

      {/* Recent transactions table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Últimos movimientos'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'secondary.lightOpacity' }}>
              <i className='tabler-list' style={{ fontSize: 22, color: 'var(--mui-palette-secondary-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 80 }}>Tipo</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell sx={{ width: 140 }}>Cuenta</TableCell>
                <TableCell sx={{ width: 100 }}>Fecha</TableCell>
                <TableCell sx={{ width: 120 }} align='right'>Monto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} align='center' sx={{ py: 6 }}>
                  <Typography variant='body2' color='text.secondary'>
                    No hay movimientos registrados aún
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <CreateIncomeDrawer open={incomeDrawerOpen} onClose={() => setIncomeDrawerOpen(false)} onSuccess={() => setIncomeDrawerOpen(false)} />
      <CreateExpenseDrawer open={expenseDrawerOpen} onClose={() => setExpenseDrawerOpen(false)} onSuccess={() => setExpenseDrawerOpen(false)} />
    </Box>
  )
}

export default FinanceDashboardView
