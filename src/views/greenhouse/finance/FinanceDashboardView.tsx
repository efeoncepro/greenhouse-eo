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
import TableRow from '@mui/material/TableRow'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'
import { useTheme } from '@mui/material/styles'

import type { ApexOptions } from 'apexcharts'

import { toast } from 'sonner'

import Chip from '@mui/material/Chip'

import classnames from 'classnames'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import StatsWithAreaChart from '@components/card-statistics/StatsWithAreaChart'
import TablePaginationComponent from '@components/TablePaginationComponent'
import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import NexaInsightsBlock, { type NexaInsightItem } from '@/components/greenhouse/NexaInsightsBlock'
import CustomTextField from '@core/components/mui/TextField'
import { fuzzyFilter } from '@/components/tableUtils'


import tableStyles from '@core/styles/table.module.css'
import CustomChip from '@core/components/mui/Chip'
import OptionMenu from '@core/components/option-menu'

import CreateIncomeDrawer from '@views/greenhouse/finance/drawers/CreateIncomeDrawer'
import CreateExpenseDrawer from '@views/greenhouse/finance/drawers/CreateExpenseDrawer'
import VatMonthlyPositionCard from '@views/greenhouse/finance/components/VatMonthlyPositionCard'
import type { VatMonthlyPositionPayload } from '@views/greenhouse/finance/components/vat-monthly-position-types'

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

interface IndicatorSnapshot {
  indicatorId: string
  indicatorCode: string
  indicatorDate: string
  value: number
  source: string
  unit: string
  frequency: string
}

interface IndicatorsSummary {
  USD_CLP?: IndicatorSnapshot | null
  UF?: IndicatorSnapshot | null
  UTM?: IndicatorSnapshot | null
  IPC?: IndicatorSnapshot | null
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
  accrualCurrentMonth?: {
    totalAmountClp: number
    changePercent: number
    trend: 'positive' | 'negative'
  }
  accrualMonthly?: MonthlyDataPoint[]
  cashCurrentMonth?: {
    totalAmountClp: number
    changePercent: number
    trend: 'positive' | 'negative'
  }
  cashMonthly?: MonthlyDataPoint[]
}

interface CashflowMonth {
  period: string
  cashIncome: number
  cashExpenses: number
  cashNet: number
  cumulativeBalance: number
  accrualIncome: number
  accrualExpenses: number
  accrualNet: number
}

interface CashflowData {
  months: CashflowMonth[]
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

interface NuboxSyncRun {
  syncRunId: string
  type: string
  status: string
  recordsRead: number | null
  notes: string | null
  startedAt: string | null
  finishedAt: string | null
}

interface NuboxSyncStatus {
  lastSync: NuboxSyncRun | null
  lastProjection: Omit<NuboxSyncRun, 'type' | 'startedAt'> | null
  recentRuns: NuboxSyncRun[]
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
    collectedRevenue?: number
    accountsReceivable?: number
    invoiceCount: number
  }
  costs: {
    directLabor: number
    indirectLabor: number
    operational: number
    infrastructure: number
    taxSocial: number
    totalExpenses: number
    unlinkedPayrollCost?: number
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
  completeness?: 'complete' | 'partial'
  missingComponents?: string[]
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

const formatIndicatorValue = (value: number, indicatorCode: string): string => {
  if (indicatorCode === 'IPC') {
    return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}%`
  }

  return `$${formatRate(value)}`
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
  const [indicators, setIndicators] = useState<IndicatorsSummary>({})
  const [incomeSummary, setIncomeSummary] = useState<SummaryData | null>(null)
  const [expenseSummary, setExpenseSummary] = useState<SummaryData | null>(null)
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([])
  const [pnl, setPnl] = useState<PnlData | null>(null)
  const [incomeDrawerOpen, setIncomeDrawerOpen] = useState(false)
  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false)
  const [fetchErrors, setFetchErrors] = useState<string[]>([])
  const [nuboxSync, setNuboxSync] = useState<NuboxSyncStatus | null>(null)
  const [cashflow, setCashflow] = useState<CashflowData | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [workingCapital, setWorkingCapital] = useState<{ dso: number | null; dpo: number | null; payrollToRevenueRatio: number | null }>({ dso: null, dpo: null, payrollToRevenueRatio: null })
  const [vatPosition, setVatPosition] = useState<VatMonthlyPositionPayload | null>(null)

  const [nexaInsights, setNexaInsights] = useState<{
    insights: NexaInsightItem[]
    totalAnalyzed: number
    lastAnalysis: string | null
    runStatus: 'succeeded' | 'partial' | 'failed' | null
  }>({ insights: [], totalAnalyzed: 0, lastAnalysis: null, runStatus: null })

  const fetchData = useCallback(async () => {
    let cancelled = false

    setLoading(true)

    const errors: string[] = []

    try {
      const [accountsRes, indicatorsRes, incomeSummaryRes, expenseSummaryRes, incomeListRes, expenseListRes, pnlRes, nuboxSyncRes, cashflowRes, dashSummaryRes, nexaRes, vatPositionRes] = await Promise.all([
        fetch('/api/finance/accounts', { cache: 'no-store' }),
        fetch('/api/finance/economic-indicators/latest', { cache: 'no-store' }),
        fetch('/api/finance/income/summary', { cache: 'no-store' }),
        fetch('/api/finance/expenses/summary', { cache: 'no-store' }),
        fetch('/api/finance/income?pageSize=12', { cache: 'no-store' }),
        fetch('/api/finance/expenses?pageSize=12', { cache: 'no-store' }),
        fetch('/api/finance/dashboard/pnl', { cache: 'no-store' }),
        fetch('/api/finance/nubox/sync-status', { cache: 'no-store' }),
        fetch('/api/finance/dashboard/cashflow', { cache: 'no-store' }),
        fetch('/api/finance/dashboard/summary', { cache: 'no-store' }),
        fetch('/api/finance/intelligence/nexa-insights', { cache: 'no-store' }),
        fetch('/api/finance/vat/monthly-position', { cache: 'no-store' })
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

      if (indicatorsRes.ok) {
        const indicatorsData = await indicatorsRes.json()

        setIndicators(indicatorsData.indicators ?? {})

        if (!indicatorsData.indicators?.USD_CLP) {
          errors.push('Indicadores: USD/CLP sin snapshot disponible')
        }
      } else {
        const d = await indicatorsRes.json().catch(() => ({}))

        errors.push(`Indicadores: ${d.error || indicatorsRes.status}`)
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

      if (nuboxSyncRes.ok) {
        setNuboxSync(await nuboxSyncRes.json())
      }

      if (cashflowRes.ok) {
        setCashflow(await cashflowRes.json())
      }

      if (dashSummaryRes.ok) {
        const summaryData = await dashSummaryRes.json()

        setWorkingCapital({
          dso: typeof summaryData.dso === 'number' ? summaryData.dso : null,
          dpo: typeof summaryData.dpo === 'number' ? summaryData.dpo : null,
          payrollToRevenueRatio: typeof summaryData.payrollToRevenueRatio === 'number' ? summaryData.payrollToRevenueRatio : null
        })
      }

      if (nexaRes.ok) {
        const nexaData = await nexaRes.json()

        setNexaInsights({
          insights: Array.isArray(nexaData.insights) ? (nexaData.insights as NexaInsightItem[]) : [],
          totalAnalyzed: typeof nexaData.totalAnalyzed === 'number' ? nexaData.totalAnalyzed : 0,
          lastAnalysis: typeof nexaData.lastAnalysis === 'string' ? nexaData.lastAnalysis : null,
          runStatus: nexaData.runStatus ?? null
        })
      }

      if (vatPositionRes.ok) {
        setVatPosition(await vatPositionRes.json())
      } else {
        const d = await vatPositionRes.json().catch(() => ({}))

        errors.push(`IVA mensual: ${d.error || vatPositionRes.status}`)
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

  // Use accrual series (Postgres-first) for bar chart — consistent base across all months
  const incomeMonthly = incomeSummary?.accrualMonthly ?? incomeSummary?.monthly ?? []
  const expenseMonthly = expenseSummary?.accrualMonthly ?? expenseSummary?.monthly ?? []

  // Dual KPI values
  const accrualIncomeClp = incomeSummary?.accrualCurrentMonth?.totalAmountClp ?? incomeSummary?.currentMonth.totalAmountClp ?? 0
  const cashIncomeClp = incomeSummary?.cashCurrentMonth?.totalAmountClp ?? 0
  const accrualExpenseClp = expenseSummary?.accrualCurrentMonth?.totalAmountClp ?? expenseSummary?.currentMonth.totalAmountClp ?? 0
  const expenseWithPayroll = pnl ? pnl.costs.totalExpenses : accrualExpenseClp

  // Build aligned month labels from accrual series (same base for all months)
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

  // Bar chart uses consistent accrual base — no more single-month P&L patch
  const barSeries = [
    { name: 'Facturado', data: incomeData },
    { name: 'Costos', data: expenseData }
  ]

  // Cash flow from real cashflow endpoint (payment_date based)
  const cashflowMonths = cashflow?.months?.slice(-6) ?? []

  const cashflowLabels = cashflowMonths.map(m => {
    const month = parseInt(m.period.split('-')[1])

    return MONTH_SHORT[month] || m.period
  })

  const areaSeries = [
    { name: 'Cobros', data: cashflowMonths.map(m => m.cashIncome) },
    { name: 'Pagos', data: cashflowMonths.map(m => m.cashExpenses) },
    { name: 'Flujo neto', data: cashflowMonths.map(m => m.cashNet) }
  ]

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box>
          <Typography variant='h4' sx={{ fontWeight: 600, mb: 1 }}>
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
        <Typography variant='h4' sx={{ fontWeight: 600, mb: 1 }}>
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

      {/* Financial KPIs — sparkline charts + trend comparison */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {(() => {
            const prevBalance = incomeMonthly.length >= 2 ? incomeMonthly[incomeMonthly.length - 2].totalAmountClp : null

            const deltaPct = totalBalance != null && prevBalance && prevBalance > 0
              ? Math.round(((totalBalance - prevBalance) / prevBalance) * 100)
              : null

            return (
              <StatsWithAreaChart
                title='Saldo total'
                stats={totalBalance === null ? 'Sin datos' : formatCLP(totalBalance)}
                avatarIcon='tabler-wallet'
                avatarColor='primary'
                avatarSkin='light'
                chartColor='primary'
                chartSeries={[{ data: incomeMonthly.slice(-6).map(d => Math.round(d.totalAmountClp / 1000)) }]}
                trend={deltaPct != null ? (deltaPct >= 0 ? 'positive' : 'negative') : undefined}
                trendNumber={deltaPct != null ? `${Math.abs(deltaPct)}%` : undefined}
                subtitle='Posición consolidada vs mes anterior'
              />
            )
          })()}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {(() => {
            const changePct = (incomeSummary?.accrualCurrentMonth ?? incomeSummary?.currentMonth)?.changePercent

            return (
              <StatsWithAreaChart
                title='Facturación del mes'
                stats={formatCLP(accrualIncomeClp)}
                avatarIcon='tabler-file-invoice'
                avatarColor='success'
                avatarSkin='light'
                chartColor='success'
                chartSeries={[{ data: incomeMonthly.slice(-6).map(d => Math.round(d.totalAmountClp / 1000)) }]}
                trend={changePct != null ? (changePct >= 0 ? 'positive' : 'negative') : undefined}
                trendNumber={changePct != null ? `${Math.abs(Math.round(changePct))}%` : undefined}
                subtitle='Ingresos devengados vs mes anterior'
              />
            )
          })()}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {(() => {
            const changePct = (expenseSummary?.accrualCurrentMonth ?? expenseSummary?.currentMonth)?.changePercent

            return (
              <StatsWithAreaChart
                title='Costos del mes'
                stats={formatCLP(expenseWithPayroll)}
                avatarIcon='tabler-credit-card'
                avatarColor='error'
                avatarSkin='light'
                chartColor='error'
                chartSeries={[{ data: expenseMonthly.slice(-6).map(d => Math.round(d.totalAmountClp / 1000)) }]}
                trend={changePct != null ? (changePct >= 0 ? 'negative' : 'positive') : undefined}
                trendNumber={changePct != null ? `${Math.abs(Math.round(changePct))}%` : undefined}
                subtitle='Egresos + nómina vs mes anterior'
              />
            )
          })()}
        </Grid>
      </Grid>

      {/* Finance Nexa Insights — advisory layer */}
      {(nexaInsights.totalAnalyzed > 0 || nexaInsights.runStatus) && (
        <NexaInsightsBlock
          insights={nexaInsights.insights}
          totalAnalyzed={nexaInsights.totalAnalyzed}
          lastAnalysis={nexaInsights.lastAnalysis}
          runStatus={nexaInsights.runStatus}
        />
      )}

      {/* Economic Indicators */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 4, md: 4 }}>
          <HorizontalWithSubtitle
            title='Dólar obs.'
            stats={indicators.USD_CLP?.value ? <AnimatedCounter value={indicators.USD_CLP.value} formatter={v => formatIndicatorValue(v, 'USD_CLP')} /> : 'Sin datos'}
            subtitle={indicators.USD_CLP
              ? `${indicators.USD_CLP.source ?? 'manual'} · ${indicators.USD_CLP.indicatorDate ? formatDate(indicators.USD_CLP.indicatorDate) : ''}`
              : 'Sin registros'}
            avatarIcon='tabler-arrows-exchange'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 4 }}>
          <HorizontalWithSubtitle
            title='UF'
            stats={indicators.UF?.value ? <AnimatedCounter value={indicators.UF.value} formatter={v => formatIndicatorValue(v, 'UF')} /> : 'Sin datos'}
            subtitle={indicators.UF
              ? `${indicators.UF.source ?? 'manual'} · ${indicators.UF.indicatorDate ? formatDate(indicators.UF.indicatorDate) : ''}`
              : 'Sin registros'}
            avatarIcon='tabler-chart-histogram'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 4 }}>
          <HorizontalWithSubtitle
            title='UTM'
            stats={indicators.UTM?.value ? <AnimatedCounter value={indicators.UTM.value} formatter={v => formatIndicatorValue(v, 'UTM')} /> : 'Sin datos'}
            subtitle={indicators.UTM
              ? `${indicators.UTM.source ?? 'manual'} · ${indicators.UTM.indicatorDate ? formatDate(indicators.UTM.indicatorDate) : ''}`
              : 'Sin registros'}
            avatarIcon='tabler-scale'
            avatarColor='warning'
          />
        </Grid>
      </Grid>

      {/* Working Capital Metrics */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 4, md: 4 }}>
          <HorizontalWithSubtitle
            title='DSO'
            stats={workingCapital.dso !== null ? <><AnimatedCounter value={workingCapital.dso} format='integer' /> días</> : 'Sin datos'}
            subtitle='Days Sales Outstanding — días promedio de cobro'
            avatarIcon='tabler-clock-dollar'
            avatarColor={workingCapital.dso !== null && workingCapital.dso > 60 ? 'error' : workingCapital.dso !== null && workingCapital.dso > 30 ? 'warning' : 'success'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 4 }}>
          <HorizontalWithSubtitle
            title='DPO'
            stats={workingCapital.dpo !== null ? <><AnimatedCounter value={workingCapital.dpo} format='integer' /> días</> : 'Sin datos'}
            subtitle='Days Payable Outstanding — días promedio de pago'
            avatarIcon='tabler-clock-pause'
            avatarColor={workingCapital.dpo !== null && workingCapital.dpo > 90 ? 'error' : workingCapital.dpo !== null && workingCapital.dpo > 45 ? 'warning' : 'info'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 4 }}>
          {(() => {
            const ratio = pnl && pnl.revenue.netRevenue > 0
              ? Math.round((pnl.payroll.totalGross / pnl.revenue.netRevenue) * 100)
              : workingCapital.payrollToRevenueRatio

            return (
              <HorizontalWithSubtitle
                title='Ratio nómina / ingresos'
                stats={ratio !== null ? <><AnimatedCounter value={ratio} format='percentage' /></> : 'Sin datos'}
                subtitle='Costo bruto de nómina como porcentaje del ingreso neto'
                avatarIcon='tabler-percentage'
                avatarColor={ratio !== null && ratio > 70 ? 'error' : ratio !== null && ratio > 50 ? 'warning' : 'success'}
              />
            )
          })()}
        </Grid>
      </Grid>

      <VatMonthlyPositionCard
        loading={loading}
        position={vatPosition?.position ?? null}
        recentPositions={vatPosition?.recentPositions ?? []}
        entries={vatPosition?.entries ?? []}
      />

      {/* Charts row */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Facturado vs Costos (base devengada)'
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
              title='Flujo de caja real'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                  <i className='tabler-trending-up' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
                </Avatar>
              }
              action={<OptionMenu options={['Exportar']} />}
            />
            <Divider />
            <CardContent>
              {cashflowMonths.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
                  <Typography variant='body2' color='text.secondary'>
                    Sin datos de flujo de caja aún
                  </Typography>
                </Box>
              ) : (
                <AppReactApexCharts
                  type='area'
                  height={300}
                  options={buildCashFlowAreaOptions(theme, cashflowLabels)}
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
                subheader={(() => {
                  const period = `${MONTH_SHORT[pnl.month]} ${pnl.year}`

                  if (pnl.completeness === 'complete') return `${period} · P&L completo`
                  if (pnl.completeness === 'partial' && pnl.missingComponents?.includes('payroll')) return `${period} · Parcial (falta nomina)`
                  if (pnl.payroll.headcount > 0) return `${period} · P&L completo`

                  return `${period} · Parcial (falta nomina)`
                })()}
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
                      <TableCell sx={{ fontWeight: 600 }}>Ingresos brutos (facturado)</TableCell>
                      <TableCell align='right'>{formatCLP(pnl.revenue.totalRevenue)}</TableCell>
                    </TableRow>
                    {(() => {
                      const collectedVal = pnl.revenue.collectedRevenue ?? cashIncomeClp
                      const receivableVal = pnl.revenue.accountsReceivable ?? (pnl.revenue.totalRevenue > collectedVal ? pnl.revenue.totalRevenue - collectedVal : 0)

                      return (
                        <>
                          {collectedVal > 0 && (
                            <TableRow>
                              <TableCell sx={{ pl: 4, color: 'text.secondary' }}>Cobrado del periodo</TableCell>
                              <TableCell align='right' sx={{ color: 'success.main' }}>{formatCLP(collectedVal)}</TableCell>
                            </TableRow>
                          )}
                          {receivableVal > 0 && (
                            <TableRow>
                              <TableCell sx={{ pl: 4, color: 'text.secondary' }}>Cuentas por cobrar</TableCell>
                              <TableCell align='right' sx={{ color: 'warning.main' }}>{formatCLP(receivableVal)}</TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })()}
                    {pnl.payroll.headcount > 0 ? (
                      <>
                        <TableRow>
                          <TableCell sx={{ pl: 4, color: 'text.secondary' }}>Costo laboral directo</TableCell>
                          <TableCell align='right' sx={{ color: 'error.main' }}>−{formatCLP(pnl.costs.directLabor)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ pl: 4, color: 'text.secondary' }}>Costo laboral indirecto</TableCell>
                          <TableCell align='right' sx={{ color: 'error.main' }}>−{formatCLP(pnl.costs.indirectLabor)}</TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <TableRow>
                        <TableCell sx={{ pl: 4, color: 'warning.main' }}>Costo de personal</TableCell>
                        <TableCell align='right' sx={{ color: 'warning.main', fontStyle: 'italic' }}>Pendiente de aprobación</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell sx={{ pl: 4, color: 'text.secondary' }}>Gastos operacionales</TableCell>
                      <TableCell align='right' sx={{ color: 'error.main' }}>−{formatCLP(pnl.costs.operational)}</TableCell>
                    </TableRow>

                    <TableRow><TableCell colSpan={2} sx={{ py: 1 }}><Divider /></TableCell></TableRow>

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
                      <TableCell sx={{ pl: 4, color: 'text.secondary' }}>
                        {pnl.payroll.headcount > 0 ? 'Impuestos y prevision' : 'Impuestos y prevision (sin nomina)'}
                      </TableCell>
                      <TableCell align='right' sx={{ color: 'error.main' }}>-{formatCLP(pnl.costs.taxSocial)}</TableCell>
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
                {pnl.completeness === 'partial' && pnl.missingComponents && pnl.missingComponents.length > 0 && (
                  <Alert severity='info' sx={{ mt: 2 }}>
                    {pnl.missingComponents.includes('payroll')
                      ? 'Este P&L tiene datos parciales: falta nomina aprobada para el periodo'
                      : `Este P&L tiene datos parciales (faltan: ${pnl.missingComponents.join(', ')})`}
                  </Alert>
                )}
                {(pnl.completeness === 'complete' || (!pnl.completeness && pnl.payroll.headcount > 0)) && (
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      size='small'
                      color='success'
                      variant='outlined'
                      icon={<i className='tabler-check' />}
                      label='P&L completo'
                    />
                  </Box>
                )}
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
                      <Typography variant='body1' sx={{ fontWeight: 600 }}>
                        {formatCLP(pnl.payroll.totalGross)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant='body2' color='text.secondary'>Total líquido</Typography>
                      <Typography variant='body1' sx={{ fontWeight: 600 }}>
                        {formatCLP(pnl.payroll.totalNet)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant='body2' color='text.secondary'>Descuentos legales</Typography>
                      <Typography variant='body1'>
                        {formatCLP(pnl.payroll.totalDeductions)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant='body2' color='text.secondary'>Bonos</Typography>
                      <Typography variant='body1'>
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

      {/* Nubox sync status */}
      {nuboxSync && nuboxSync.lastSync && (
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Sincronización Nubox'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                <i className='tabler-refresh' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
              </Avatar>
            }
            action={
              <Button
                variant='outlined'
                size='small'
                startIcon={<i className='tabler-refresh' />}
                disabled={syncing}
                onClick={async () => {
                  setSyncing(true)

                  try {
                    const res = await fetch('/api/finance/nubox/sync', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: '{}'
                    })

                    if (!res.ok) {
                      toast.error('No se pudo iniciar la sincronización.')

                      return
                    }

                    toast.success('Sincronización completada.')
                    void fetchData()
                  } catch {
                    toast.error('Error de conexión al sincronizar.')
                  } finally {
                    setSyncing(false)
                  }
                }}
              >
                {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
              </Button>
            }
          />
          <Divider />
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>Último sync</Typography>
                <Typography variant='body2'>
                  {nuboxSync.lastSync.finishedAt
                    ? new Date(nuboxSync.lastSync.finishedAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
                    : '—'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>Estado</Typography>
                <Box sx={{ mt: 0.25 }}>
                  <CustomChip
                    round='true'
                    size='small'
                    color={nuboxSync.lastSync.status === 'succeeded' ? 'success' : nuboxSync.lastSync.status === 'running' ? 'warning' : 'error'}
                    label={nuboxSync.lastSync.status === 'succeeded' ? 'Exitoso' : nuboxSync.lastSync.status === 'running' ? 'En progreso' : 'Error'}
                    icon={<i className={nuboxSync.lastSync.status === 'succeeded' ? 'tabler-check' : nuboxSync.lastSync.status === 'running' ? 'tabler-loader' : 'tabler-alert-triangle'} />}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>Registros procesados</Typography>
                <Typography variant='body2'>{nuboxSync.lastSync.recordsRead ?? '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>Detalle</Typography>
                <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>
                  {nuboxSync.lastProjection?.notes || nuboxSync.lastSync.notes || '—'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Recent transactions table — TanStack React Table */}
      <RecentMovementsTable movements={recentMovements} />

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

// ── Recent Movements Table (TanStack) ──

const movementColumnHelper = createColumnHelper<RecentMovement>()

 
const movementColumns: any[] = [
  movementColumnHelper.accessor('type', {
    header: 'Tipo',
    cell: ({ getValue }) => (
      <CustomChip
        round='true'
        size='small'
        variant='tonal'
        color={getValue() === 'income' ? 'success' : 'error'}
        label={getValue() === 'income' ? 'Ingreso' : 'Egreso'}
      />
    )
  }),
  movementColumnHelper.accessor('description', {
    header: 'Descripción',
    cell: ({ getValue, row }) => (
      <Box>
        <Typography variant='body2' fontWeight={500}>{getValue()}</Typography>
        <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.7rem' }}>{row.original.id}</Typography>
      </Box>
    ),
    meta: { minWidth: 300 }
  }),
  movementColumnHelper.accessor('partyName', {
    header: 'Entidad',
    cell: ({ row }) => (
      <Typography variant='body2' color='text.secondary'>{row.original.partyName || row.original.accountName || '—'}</Typography>
    ),
    meta: { width: 180 }
  }),
  movementColumnHelper.accessor('date', {
    header: 'Fecha',
    cell: ({ getValue }) => <Typography variant='body2'>{formatDate(getValue())}</Typography>,
    meta: { width: 110 }
  }),
  movementColumnHelper.accessor('amount', {
    header: 'Monto',
    cell: ({ getValue }) => (
      <Typography variant='body2' fontWeight={600} color={getValue() >= 0 ? 'success.main' : 'error.main'}>
        {formatCLP(getValue())}
      </Typography>
    ),
    meta: { align: 'right', width: 130 }
  })
]

const RecentMovementsTable = ({ movements }: { movements: RecentMovement[] }) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data: movements,
    columns: movementColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  return (
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
      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
        <CustomTextField
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          placeholder='Buscar movimiento…'
          sx={{ minWidth: 250 }}
        />
        <Typography variant='caption' color='text.secondary' sx={{ alignSelf: 'center' }}>
          {table.getFilteredRowModel().rows.length} de {movements.length} movimientos
        </Typography>
      </CardContent>
      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                    className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })}
                    style={{
                      textAlign: (header.column.columnDef.meta as Record<string, unknown> | undefined)?.align === 'right' ? 'right' : 'left',
                      width: (header.column.columnDef.meta as Record<string, unknown> | undefined)?.width as number | undefined,
                      minWidth: (header.column.columnDef.meta as Record<string, unknown> | undefined)?.minWidth as number | undefined
                    }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={movementColumns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                  <Typography variant='body2' color='text.secondary'>No hay movimientos registrados aún</Typography>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className={classnames({ 'hover:bg-actionHover': true })}>
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : 'left' }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <TablePaginationComponent table={table as ReturnType<typeof useReactTable>} />
    </Card>
  )
}

export default FinanceDashboardView
