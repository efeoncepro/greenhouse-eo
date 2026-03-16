'use client'

import { useCallback, useEffect, useState } from 'react'

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
import Chip from '@mui/material/Chip'

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
  currentBalance?: number
  balanceAsOf?: string | null
  balanceSource?: string | null
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

interface IncomeListItem {
  incomeId: string
  clientName: string
  invoiceDate: string | null
  totalAmountClp: number
}

interface ExpenseListItem {
  expenseId: string
  description: string
  supplierName: string | null
  memberName: string | null
  paymentAccountId: string | null
  paymentDate: string | null
  documentDate: string | null
  totalAmountClp: number
}

interface RecentMovement {
  id: string
  type: 'income' | 'expense'
  description: string
  partyName: string | null
  accountName: string | null
  date: string | null
  amount: number
}

interface PnlData {
  year: number
  month: number
  revenue: {
    totalRevenue: number
    partnerShare: number
    netRevenue: number
    invoiceCount: number
  }
  costs: {
    directLabor: number
    indirectLabor: number
    operational: number
    infrastructure: number
    taxSocial: number
    totalExpenses: number
  }
  margins: {
    grossMargin: number
    grossMarginPercent: number
    operatingExpenses: number
    ebitda: number
    ebitdaPercent: number
    netResult: number
    netMarginPercent: number
  }
  payroll: {
    headcount: number
    totalGross: number
    totalNet: number
    totalDeductions: number
    totalBonuses: number
  }
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

const formatDate = (date: string | null): string => {
  if (!date) {
    return '—'
  }

  const [year, month, day] = date.split('-')

  return `${day}/${month}/${year}`
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
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([])
  const [pnl, setPnl] = useState<PnlData | null>(null)
  const [incomeDrawerOpen, setIncomeDrawerOpen] = useState(false)
  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false)
  const [fetchErrors, setFetchErrors] = useState<string[]>([])

  const fetchData = useCallback(async () => {
    let cancelled = false

    setLoading(true)

    const errors: string[] = []

    try {
      const [accountsRes, rateRes, incomeSummaryRes, expenseSummaryRes, incomeListRes, expenseListRes, pnlRes] = await Promise.all([
        fetch('/api/finance/accounts', { cache: 'no-store' }),
        fetch('/api/finance/exchange-rates/latest', { cache: 'no-store' }),
        fetch('/api/finance/income/summary', { cache: 'no-store' }),
        fetch('/api/finance/expenses/summary', { cache: 'no-store' }),
        fetch('/api/finance/income?pageSize=12', { cache: 'no-store' }),
        fetch('/api/finance/expenses?pageSize=12', { cache: 'no-store' }),
        fetch('/api/finance/dashboard/pnl', { cache: 'no-store' })
      ])

      if (cancelled) return

      let accountItems: AccountSummary[] = []

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()

        accountItems = accountsData.items ?? []
        setAccounts(accountItems)
      } else {
        errors.push(`Cuentas: ${accountsRes.status}`)
      }

      if (rateRes.ok) {
        const rateData = await rateRes.json()

        setExchangeRate(rateData)

        if (!rateData.available) {
          errors.push('Tipo de cambio: sin snapshot disponible')
        }
      } else {
        const d = await rateRes.json().catch(() => ({}))

        errors.push(`Tipo de cambio: ${d.error || rateRes.status}`)
      }

      if (incomeSummaryRes.ok) {
        setIncomeSummary(await incomeSummaryRes.json())
      } else {
        const d = await incomeSummaryRes.json().catch(() => ({}))

        errors.push(`Ingresos: ${d.error || incomeSummaryRes.status}`)
      }

      if (expenseSummaryRes.ok) {
        setExpenseSummary(await expenseSummaryRes.json())
      } else {
        const d = await expenseSummaryRes.json().catch(() => ({}))

        errors.push(`Egresos: ${d.error || expenseSummaryRes.status}`)
      }

      if (incomeListRes.ok && expenseListRes.ok) {
        const incomeListData = await incomeListRes.json()
        const expenseListData = await expenseListRes.json()
        const accountMap = new Map(accountItems.map(account => [account.accountId, account.accountName]))

        const incomes: RecentMovement[] = (incomeListData.items ?? []).map((item: IncomeListItem) => ({
          id: item.incomeId,
          type: 'income',
          description: item.clientName || item.incomeId,
          partyName: item.clientName || null,
          accountName: null,
          date: item.invoiceDate,
          amount: item.totalAmountClp
        }))

        const expenses: RecentMovement[] = (expenseListData.items ?? []).map((item: ExpenseListItem) => ({
          id: item.expenseId,
          type: 'expense',
          description: item.description,
          partyName: item.supplierName || item.memberName || null,
          accountName: item.paymentAccountId ? accountMap.get(item.paymentAccountId) || item.paymentAccountId : null,
          date: item.paymentDate || item.documentDate,
          amount: -item.totalAmountClp
        }))

        const combined = [...incomes, ...expenses]
          .sort((left, right) => (right.date || '').localeCompare(left.date || ''))
          .slice(0, 8)

        setRecentMovements(combined)
      } else {
        if (!incomeListRes.ok) {
          errors.push(`Movimientos ingresos: ${incomeListRes.status}`)
        }

        if (!expenseListRes.ok) {
          errors.push(`Movimientos egresos: ${expenseListRes.status}`)
        }
      }

      if (pnlRes.ok) {
        setPnl(await pnlRes.json())
      }
    } catch (e) {
      errors.push(`Conexión: ${e instanceof Error ? e.message : 'Error desconocido'}`)
    } finally {
      if (!cancelled) {
        setFetchErrors(errors)
        setLoading(false)
      }
    }

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const dispose = fetchData()

    return () => {
      Promise.resolve(dispose).then(cleanup => cleanup?.())
    }
  }, [fetchData])

  // Derived values
  const totalBalance = accounts.length > 0
    ? accounts.reduce((sum, account) => sum + (account.currentBalance ?? account.openingBalance ?? 0), 0)
    : null

  const activeAccountCount = accounts.filter(a => a.isActive).length

  const latestBalanceAsOf = [...accounts]
    .map(account => account.balanceAsOf)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null

  const incomeMonthly = incomeSummary?.monthly ?? []
  const expenseMonthly = expenseSummary?.monthly ?? []

  // Build aligned month labels and data from the last 6 months
  const allMonths = new Set<string>()

  incomeMonthly.forEach(m => allMonths.add(`${m.year}-${String(m.month).padStart(2, '0')}`))
  expenseMonthly.forEach(m => allMonths.add(`${m.year}-${String(m.month).padStart(2, '0')}`))

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

      {accounts.length === 0 && recentMovements.length > 0 && (
        <Alert severity='info'>
          Hay movimientos financieros registrados, pero aún no existen cuentas activas en `Finance`. Por eso el saldo total no puede calcularse desde bancos y conciliación todavía no tiene base operativa.
        </Alert>
      )}

      {/* KPI row */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Saldo total'
            stats={totalBalance === null ? 'Sin datos' : formatCLP(totalBalance)}
            subtitle={accounts.length === 0
              ? 'Sin cuentas activas registradas'
              : latestBalanceAsOf
                ? `${activeAccountCount} cuenta${activeAccountCount !== 1 ? 's' : ''} activa${activeAccountCount !== 1 ? 's' : ''} · al ${formatDate(latestBalanceAsOf)}`
                : `${activeAccountCount} cuenta${activeAccountCount !== 1 ? 's' : ''} activa${activeAccountCount !== 1 ? 's' : ''}`}
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
            subtitle={exchangeRate.available
              ? `USD → CLP · ${exchangeRate.source ?? 'manual'}${exchangeRate.rateDate ? ` · ${formatDate(exchangeRate.rateDate)}` : ''}`
              : 'Sin registros'}
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

      {/* P&L Section */}
      {pnl && (
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader
                title='Estado de Resultados'
                subheader={`${MONTH_SHORT[pnl.month]} ${pnl.year}`}
                avatar={
                  <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                    <i className='tabler-report-analytics' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
                  </Avatar>
                }
              />
              <Divider />
              <CardContent>
                <Table size='small'>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Ingresos brutos</TableCell>
                      <TableCell align='right'>{formatCLP(pnl.revenue.totalRevenue)}</TableCell>
                    </TableRow>
                    {pnl.revenue.partnerShare > 0 && (
                      <TableRow>
                        <TableCell sx={{ pl: 4, color: 'text.secondary' }}>Partner share</TableCell>
                        <TableCell align='right' sx={{ color: 'error.main' }}>−{formatCLP(pnl.revenue.partnerShare)}</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Ingreso neto</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 600 }}>{formatCLP(pnl.revenue.netRevenue)}</TableCell>
                    </TableRow>

                    <TableRow><TableCell colSpan={2} sx={{ py: 1 }}><Divider /></TableCell></TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 4, color: 'text.secondary' }}>Costo laboral directo</TableCell>
                      <TableCell align='right' sx={{ color: 'error.main' }}>−{formatCLP(pnl.costs.directLabor)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 4, color: 'text.secondary' }}>Costo laboral indirecto</TableCell>
                      <TableCell align='right' sx={{ color: 'error.main' }}>−{formatCLP(pnl.costs.indirectLabor)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 4, color: 'text.secondary' }}>Gastos operacionales</TableCell>
                      <TableCell align='right' sx={{ color: 'error.main' }}>−{formatCLP(pnl.costs.operational)}</TableCell>
                    </TableRow>
                    {pnl.costs.infrastructure > 0 && (
                      <TableRow>
                        <TableCell sx={{ pl: 4, color: 'text.secondary' }}>Infraestructura</TableCell>
                        <TableCell align='right' sx={{ color: 'error.main' }}>−{formatCLP(pnl.costs.infrastructure)}</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell sx={{ pl: 4, color: 'text.secondary' }}>Impuestos y previsión</TableCell>
                      <TableCell align='right' sx={{ color: 'error.main' }}>−{formatCLP(pnl.costs.taxSocial)}</TableCell>
                    </TableRow>

                    <TableRow><TableCell colSpan={2} sx={{ py: 1 }}><Divider /></TableCell></TableRow>

                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>
                        Margen bruto
                        <Chip label={`${pnl.margins.grossMarginPercent}%`} size='small' color={pnl.margins.grossMargin >= 0 ? 'success' : 'error'} sx={{ ml: 1 }} />
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: pnl.margins.grossMargin >= 0 ? 'success.main' : 'error.main' }}>
                        {formatCLP(pnl.margins.grossMargin)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>
                        EBITDA
                        <Chip label={`${pnl.margins.ebitdaPercent}%`} size='small' color={pnl.margins.ebitda >= 0 ? 'success' : 'error'} sx={{ ml: 1 }} />
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: pnl.margins.ebitda >= 0 ? 'success.main' : 'error.main' }}>
                        {formatCLP(pnl.margins.ebitda)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: pnl.margins.netResult >= 0 ? 'success.lightOpacity' : 'error.lightOpacity' }}>
                      <TableCell sx={{ fontWeight: 700 }}>
                        Resultado neto
                        <Chip label={`${pnl.margins.netMarginPercent}%`} size='small' color={pnl.margins.netResult >= 0 ? 'success' : 'error'} sx={{ ml: 1 }} />
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: pnl.margins.netResult >= 0 ? 'success.main' : 'error.main' }}>
                        {formatCLP(pnl.margins.netResult)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, height: '100%' }}>
              <CardHeader
                title='Costo de Personal'
                subheader={`${MONTH_SHORT[pnl.month]} ${pnl.year}`}
                avatar={
                  <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                    <i className='tabler-users' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
                  </Avatar>
                }
              />
              <Divider />
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {pnl.payroll.headcount > 0 ? (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant='body2' color='text.secondary'>Dotación</Typography>
                      <Typography variant='h5' sx={{ fontWeight: 600 }}>{pnl.payroll.headcount}</Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant='body2' color='text.secondary'>Total bruto</Typography>
                      <Typography variant='body1' sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {formatCLP(pnl.payroll.totalGross)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant='body2' color='text.secondary'>Total líquido</Typography>
                      <Typography variant='body1' sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {formatCLP(pnl.payroll.totalNet)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant='body2' color='text.secondary'>Descuentos legales</Typography>
                      <Typography variant='body1' sx={{ fontFamily: 'monospace' }}>
                        {formatCLP(pnl.payroll.totalDeductions)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant='body2' color='text.secondary'>Bonos</Typography>
                      <Typography variant='body1' sx={{ fontFamily: 'monospace' }}>
                        {formatCLP(pnl.payroll.totalBonuses)}
                      </Typography>
                    </Box>
                    {pnl.revenue.netRevenue > 0 && (
                      <>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <Typography variant='body2' color='text.secondary'>Costo laboral / Ingreso</Typography>
                          <Chip
                            label={`${Math.round((pnl.payroll.totalGross / pnl.revenue.netRevenue) * 100)}%`}
                            size='small'
                            color='warning'
                          />
                        </Box>
                      </>
                    )}
                  </>
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant='body2' color='text.secondary'>
                      Sin nómina aprobada para este período
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

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
                <TableCell sx={{ width: 160 }}>Entidad / Cuenta</TableCell>
                <TableCell sx={{ width: 100 }}>Fecha</TableCell>
                <TableCell sx={{ width: 120 }} align='right'>Monto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align='center' sx={{ py: 6 }}>
                    <Typography variant='body2' color='text.secondary'>
                      No hay movimientos registrados aún
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                recentMovements.map(movement => (
                  <TableRow key={movement.id} hover>
                    <TableCell>
                      <Typography
                        variant='body2'
                        fontWeight={600}
                        color={movement.type === 'income' ? 'success.main' : 'error.main'}
                      >
                        {movement.type === 'income' ? 'Ingreso' : 'Egreso'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' fontWeight={500}>
                        {movement.description}
                      </Typography>
                      {movement.id && (
                        <Typography variant='caption' color='text.secondary'>
                          {movement.id}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>
                        {movement.partyName || movement.accountName || '—'}
                      </Typography>
                      {movement.accountName && movement.partyName && (
                        <Typography variant='caption' color='text.secondary'>
                          {movement.accountName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{formatDate(movement.date)}</Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography
                        variant='body2'
                        fontWeight={600}
                        color={movement.amount >= 0 ? 'success.main' : 'error.main'}
                      >
                        {formatCLP(movement.amount)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <CreateIncomeDrawer
        open={incomeDrawerOpen}
        onClose={() => setIncomeDrawerOpen(false)}
        onSuccess={() => {
          setIncomeDrawerOpen(false)
          void fetchData()
        }}
      />
      <CreateExpenseDrawer
        open={expenseDrawerOpen}
        onClose={() => setExpenseDrawerOpen(false)}
        onSuccess={() => {
          setExpenseDrawerOpen(false)
          void fetchData()
        }}
      />
    </Box>
  )
}

export default FinanceDashboardView
