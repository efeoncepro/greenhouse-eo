'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
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
import { useTheme } from '@mui/material/styles'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import PaymentInstrumentChip from '@/components/greenhouse/PaymentInstrumentChip'
import AppRecharts from '@/libs/styles/AppRecharts'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from '@/libs/Recharts'
import { getMicrocopy } from '@/lib/copy'
import { formatCurrency as formatGreenhouseCurrency } from '@/lib/format'

const GREENHOUSE_COPY = getMicrocopy()
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccountRow {
  accountId: string
  accountName: string
  bankName: string
  currency: string
  openingBalance: number
  isActive: boolean
  instrumentCategory: string | null
  providerSlug: string | null
}

interface ReceivableSummary {
  totalClp: number
  pendingInvoices: number
}

interface PayableSummary {
  totalClp: number
  pendingExpenses: number
}

interface MonthlySeriesPoint {
  year: number
  month: number
  cashInClp: number
  cashOutClp: number
  netFlowClp: number
}

interface CashPositionData {
  accounts: AccountRow[]
  receivable: ReceivableSummary
  payable: PayableSummary
  fxGainLossClp: number
  netPosition: number
  monthlySeries: MonthlySeriesPoint[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCLP = (amount: number): string => {
  return formatGreenhouseCurrency(amount, 'CLP', {
  maximumFractionDigits: 0
}, 'es-CL')
}

const formatYAxis = (val: number): string => {
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(0)}K`

  return `$${val}`
}

const MONTH_SHORT = ['', ...GREENHOUSE_COPY.months.short]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CashPositionView = () => {
  const theme = useTheme()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CashPositionData | null>(null)

  const fetchData = useCallback(async () => {
    let cancelled = false

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/finance/cash-position', { cache: 'no-store' })

      if (cancelled) return

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        setError(body.error || `Error ${res.status} al obtener posición de caja`)

        return
      }

      const json: CashPositionData = await res.json()

      if (!cancelled) {
        setData(json)
      }
    } catch (e) {
      if (!cancelled) {
        setError(e instanceof Error ? e.message : 'Error de conexión')
      }
    } finally {
      if (!cancelled) {
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

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Grid container spacing={6}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Card>
              <CardContent>
                <Skeleton variant='text' width='60%' height={24} />
                <Skeleton variant='text' width='40%' height={36} sx={{ mt: 1 }} />
                <Skeleton variant='text' width='80%' height={18} sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Skeleton variant='text' width='30%' height={28} />
              <Skeleton variant='rectangular' height={360} sx={{ mt: 2, borderRadius: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Skeleton variant='text' width='25%' height={28} />
              <Skeleton variant='rectangular' height={200} sx={{ mt: 2, borderRadius: 1 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <Alert
        severity='error'
        action={
          <Button color='inherit' size='small' onClick={() => fetchData()}>
            Reintentar
          </Button>
        }
      >
        {error}
      </Alert>
    )
  }

  if (!data) return null

  // ---------------------------------------------------------------------------
  // Chart data
  // ---------------------------------------------------------------------------

  const chartData = data.monthlySeries.map(point => ({
    label: `${MONTH_SHORT[point.month]} ${String(point.year).slice(2)}`,
    cashIn: point.cashInClp,
    cashOut: point.cashOutClp,
    netFlow: point.netFlowClp
  }))

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Grid container spacing={6}>
      {/* KPI Row */}
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle
          title='Posicion neta'
          stats={formatCLP(data.netPosition)}
          avatarIcon='tabler-wallet'
          avatarColor={data.netPosition >= 0 ? 'success' : 'error'}
          subtitle='Caja disponible estimada'
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle
          title='Por cobrar'
          stats={formatCLP(data.receivable.totalClp)}
          avatarIcon='tabler-arrow-down-right'
          avatarColor='info'
          subtitle={`${data.receivable.pendingInvoices} facturas pendientes`}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle
          title='Por pagar'
          stats={formatCLP(data.payable.totalClp)}
          avatarIcon='tabler-arrow-up-right'
          avatarColor='warning'
          subtitle={`${data.payable.pendingExpenses} compromisos pendientes`}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle
          title='Resultado cambiario'
          stats={formatCLP(data.fxGainLossClp)}
          subtitle={data.fxGainLossClp >= 0 ? 'Ganancia cambiaria' : 'Perdida cambiaria'}
          avatarIcon='tabler-arrows-exchange'
          avatarColor={data.fxGainLossClp >= 0 ? 'success' : 'error'}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle
          title='Cuentas activas'
          stats={String(data.accounts.filter(a => a.isActive).length)}
          avatarIcon='tabler-building-bank'
          avatarColor='primary'
          subtitle='Cuentas bancarias operativas'
        />
      </Grid>

      {/* Cash flow chart */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Flujo de caja — 12 meses' />
          <Divider />
          <CardContent>
            {chartData.length === 0 ? (
              <Typography variant='body2' color='text.secondary' textAlign='center' py={6}>
                Sin datos de flujo de caja disponibles.
              </Typography>
            ) : (
              <AppRecharts>
                <ResponsiveContainer width='100%' height={360}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='label' />
                    <YAxis tickFormatter={formatYAxis} />
                    <Tooltip formatter={(v) => formatCLP(Number(v))} />
                    <Legend />
                    <ReferenceLine y={0} stroke={theme.palette.divider} />
                    <Bar dataKey='cashIn' fill={theme.palette.success.main} name='Ingresos' radius={[4, 4, 0, 0]} />
                    <Bar dataKey='cashOut' fill={theme.palette.error.main} name='Egresos' radius={[4, 4, 0, 0]} />
                    <Line
                      type='monotone'
                      dataKey='netFlow'
                      stroke={theme.palette.info.main}
                      name='Flujo neto'
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </AppRecharts>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Accounts table */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Cuentas bancarias' />
          <Divider />
          <CardContent>
            {data.accounts.length === 0 ? (
              <Typography variant='body2' color='text.secondary' textAlign='center' py={4}>
                No hay cuentas registradas.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Cuenta</TableCell>
                      <TableCell>Banco</TableCell>
                      <TableCell>Moneda</TableCell>
                      <TableCell align='right'>Saldo apertura</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.accounts.map(account => (
                      <TableRow key={account.accountId}>
                        <TableCell>
                          <PaymentInstrumentChip
                            providerSlug={account.providerSlug}
                            instrumentName={account.accountName}
                            instrumentCategory={account.instrumentCategory as any}
                            size='sm'
                          />
                        </TableCell>
                        <TableCell>{account.bankName}</TableCell>
                        <TableCell>{account.currency}</TableCell>
                        <TableCell align='right'>
                          {account.currency === 'CLP'
                            ? formatCLP(account.openingBalance)
                            : formatGreenhouseCurrency(account.openingBalance, account.currency, {
  maximumFractionDigits: 2
}, 'es-CL')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default CashPositionView
