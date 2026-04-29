'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccountRow {
  accountId: string
  accountName: string
  bankName: string
  currency: string
  openingBalance: number
  closingBalance: number
  closingBalanceClp: number | null
  periodInflows: number
  periodOutflows: number
  isActive: boolean
  instrumentCategory: string | null
  providerSlug: string | null
  accountKind: 'asset' | 'liability'
  reconciliationStatus: string | null
  driftAmount: number | null
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
  source: 'monthly_read_model' | 'legacy_safe_fallback'
  isDegraded: boolean
}

interface CashPositionKpis {
  cashAvailableClp: number
  creditUsedClp: number
  platformInternalClp: number
  receivableClp: number
  payableClp: number
  netPositionClp: number
  activeAccounts: number
}

interface FxGainLossBreakdown {
  totalClp: number
  realizedClp: number
  translationClp: number
  internalTransferClp: number
  hasExposure: boolean
  isDegraded: boolean
}

interface FreshnessSignal {
  lastMaterializedAt: string | null
  ageSeconds: number | null
  isStale: boolean
  label: string | null
}

interface CashPositionData {
  kpis: CashPositionKpis
  accounts: AccountRow[]
  receivable: ReceivableSummary
  payable: PayableSummary
  fxGainLoss: FxGainLossBreakdown
  fxGainLossClp: number
  netPosition: number
  monthlySeries: MonthlySeriesPoint[]
  freshness: FreshnessSignal
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCLP = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)
}

const formatYAxis = (val: number): string => {
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(0)}K`

  return `$${val}`
}

const MONTH_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

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
    netFlow: point.netFlowClp,
    source: point.source,
    isDegraded: point.isDegraded
  }))

  const hasMonthlyFallback = data.monthlySeries.some(point => point.isDegraded)
  const hasOpenDrift = data.accounts.some(account => account.driftAmount !== null && Math.abs(account.driftAmount) > 0)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Grid container spacing={6}>
      {(data.freshness.isStale || hasMonthlyFallback || data.fxGainLoss.isDegraded) && (
        <Grid size={{ xs: 12 }}>
          <Alert
            severity={data.freshness.isStale || data.fxGainLoss.isDegraded ? 'warning' : 'info'}
            action={
              <Stack direction='row' spacing={2}>
                <Button color='inherit' size='small' href='/finance/bank'>
                  Ver Banco
                </Button>
                {hasOpenDrift && (
                  <Button color='inherit' size='small' href='/finance/reconciliation'>
                    Revisar conciliación
                  </Button>
                )}
              </Stack>
            }
          >
            {data.freshness.isStale
              ? `Los saldos vienen del último snapshot disponible (${data.freshness.label || 'sin fecha disponible'}).`
              : hasMonthlyFallback
                ? 'Algunos meses usan fallback seguro porque el read model mensual todavía no tiene snapshots completos.'
                : 'El resultado cambiario está degradado porque falta una tasa para cerrar el periodo.'}
          </Alert>
        </Grid>
      )}

      {/* KPI Row */}
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle
          title='Caja disponible'
          stats={formatCLP(data.kpis.cashAvailableClp)}
          avatarIcon='tabler-wallet'
          avatarColor={data.kpis.cashAvailableClp >= 0 ? 'success' : 'error'}
          subtitle='Saldo materializado en Banco'
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle
          title='Por cobrar'
          stats={formatCLP(data.kpis.receivableClp)}
          avatarIcon='tabler-arrow-down-right'
          avatarColor='info'
          subtitle={`${data.receivable.pendingInvoices} facturas pendientes`}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle
          title='Por pagar'
          stats={formatCLP(data.kpis.payableClp)}
          avatarIcon='tabler-arrow-up-right'
          avatarColor='warning'
          subtitle={`${data.payable.pendingExpenses} compromisos pendientes`}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle
          title='Crédito utilizado'
          stats={formatCLP(data.kpis.creditUsedClp)}
          subtitle='Deuda activa en instrumentos'
          avatarIcon='tabler-credit-card'
          avatarColor={data.kpis.creditUsedClp > 0 ? 'warning' : 'success'}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle
          title='Posición neta'
          stats={formatCLP(data.kpis.netPositionClp)}
          avatarIcon='tabler-scale'
          avatarColor={data.kpis.netPositionClp >= 0 ? 'success' : 'error'}
          subtitle='Caja + CxC - CxP - crédito'
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle
          title='Resultado cambiario'
          stats={formatCLP(data.fxGainLoss.totalClp)}
          subtitle={
            data.fxGainLoss.hasExposure
              ? `${formatCLP(data.fxGainLoss.realizedClp)} realizado`
              : 'Sin exposición FX activa'
          }
          avatarIcon='tabler-arrows-exchange'
          avatarColor={data.fxGainLoss.isDegraded ? 'warning' : data.fxGainLoss.totalClp >= 0 ? 'success' : 'error'}
        />
      </Grid>

      {/* Cash flow chart */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Flujo de caja disponible — 12 meses'
            subheader='Entradas y salidas desde el ledger materializado; los meses sin snapshot usan fallback seguro.'
            action={
              <Button variant='outlined' size='small' href='/finance/bank'>
                Ver detalle en Banco
              </Button>
            }
          />
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
            {hasMonthlyFallback && (
              <Stack direction='row' spacing={2} flexWrap='wrap' mt={3}>
                <Chip size='small' color='warning' variant='tonal' label='Fallback seguro en algunos meses' />
                <Typography variant='caption' color='text.secondary'>
                  El fallback usa `amount_clp` de pagos y excluye pagos superseded; no rematerializa Banco.
                </Typography>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Accounts table */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Cuentas e instrumentos'
            subheader='Saldos vigentes desde Banco, con categoría financiera y estado de conciliación.'
          />
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
                      <TableCell>Categoría</TableCell>
                      <TableCell align='right'>Saldo vigente</TableCell>
                      <TableCell>Conciliación</TableCell>
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
                        <TableCell>
                          <Chip
                            size='small'
                            variant='tonal'
                            color={account.accountKind === 'liability' ? 'warning' : 'success'}
                            label={account.accountKind === 'liability' ? 'Deuda / crédito' : 'Caja'}
                          />
                        </TableCell>
                        <TableCell align='right'>
                          {account.currency === 'CLP'
                            ? formatCLP(account.closingBalance)
                            : new Intl.NumberFormat('es-CL', {
                                style: 'currency',
                                currency: account.currency,
                                maximumFractionDigits: 2
                              }).format(account.closingBalance)}
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant='body2'>
                              {account.reconciliationStatus || 'Sin periodo abierto'}
                            </Typography>
                            {account.driftAmount !== null && (
                              <Typography variant='caption' color='warning.main'>
                                Drift {formatCLP(account.driftAmount)}
                              </Typography>
                            )}
                          </Stack>
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
