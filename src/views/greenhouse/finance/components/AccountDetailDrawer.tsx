'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { toast } from 'react-toastify'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import PaymentInstrumentChip from '@/components/greenhouse/PaymentInstrumentChip'
import AppRecharts from '@/libs/styles/AppRecharts'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from '@/libs/Recharts'
import type { InstrumentCategory } from '@/config/payment-instruments'

type AccountOverview = {
  accountId: string
  accountName: string
  bankName: string | null
  currency: string
  instrumentCategory: string | null
  providerSlug: string | null
  openingBalance: number
  periodInflows: number
  periodOutflows: number
  closingBalance: number
  discrepancy: number
  reconciliationStatus: string | null
  reconciliationPeriodId: string | null
  isPeriodClosed: boolean
}

type AccountBalance = {
  closingBalance: number
  periodInflows: number
  periodOutflows: number
}

type HistoryPoint = {
  month: string
  closingBalance: number
  closingBalanceClp: number | null
  periodInflows: number
  periodOutflows: number
  fxGainLossClp: number
}

type Movement = {
  movementId: string
  movementType: string
  movementSource: string
  direction: string
  amount: number
  currency: string
  transactionDate: string | null
  providerReference: string | null
  providerStatus: string | null
  isReconciled: boolean
}

type DetailResponse = {
  account: AccountOverview
  currentBalance: AccountBalance
  history: HistoryPoint[]
  movements: Movement[]
}

type Props = {
  open: boolean
  accountId: string | null
  year: number
  month: number
  onClose: () => void
  onSuccess: () => void
}

const formatAmount = (amount: number, currency: string = 'CLP') =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2
  }).format(amount)

const formatDate = (date: string | null) => {
  if (!date) return '—'

  const [year, month, day] = date.split('-')

  return `${day}/${month}/${year}`
}

const formatMonth = (date: string) => {
  const [year, month] = date.split('-')
  const monthIndex = Number(month) - 1
  const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  return `${MONTHS[monthIndex] || month} ${year.slice(2)}`
}

const getReconciliationColor = (status: string | null) => {
  if (status === 'closed' || status === 'reconciled') return 'success'
  if (status === 'in_progress') return 'warning'

  return 'secondary'
}

const AccountDetailDrawer = ({ open, accountId, year, month, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<DetailResponse | null>(null)
  const [closingPeriod, setClosingPeriod] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!open || !accountId) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/finance/bank/${accountId}?year=${year}&month=${month}`, { cache: 'no-store' })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        setError(body.error || 'No pudimos cargar el detalle de la cuenta.')

        return
      }

      const body: DetailResponse = await res.json()

      setDetail(body)
    } catch {
      setError('No pudimos conectar con Banco. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }, [accountId, month, open, year])

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  const canClosePeriod = useMemo(() => {
    if (!detail?.account || detail.account.isPeriodClosed) {
      return false
    }

    const today = new Date()
    const periodEnd = new Date(Date.UTC(year, month, 0))

    return periodEnd < today
  }, [detail?.account, month, year])

  const handleClosePeriod = async () => {
    if (!accountId) return

    setClosingPeriod(true)
    setError(null)

    try {
      const res = await fetch(`/api/finance/bank/${accountId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close-period',
          year,
          month
        })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        setError(body.error || 'No pudimos cerrar el período.')

        return
      }

      toast.success('Período cerrado para esta cuenta.')
      await fetchDetail()
      onSuccess()
    } catch {
      setError('No pudimos conectar con Banco. Intenta nuevamente.')
    } finally {
      setClosingPeriod(false)
    }
  }

  const chartData = detail?.history.map(point => ({
    label: formatMonth(point.month),
    inflows: point.periodInflows,
    outflows: point.periodOutflows
  })) || []

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', lg: 760 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Box>
          <Typography variant='h6'>Detalle de cuenta</Typography>
          <Typography variant='body2' color='text.secondary'>
            Balance, movimiento reciente y cierre del período sobre el ledger real de tesorería.
          </Typography>
        </Box>
        <IconButton size='small' onClick={onClose}>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ p: 4 }}>
        {loading ? (
          <Stack spacing={4}>
            <Skeleton variant='text' height={36} width='50%' />
            <Skeleton variant='rectangular' height={180} />
            <Skeleton variant='rectangular' height={240} />
          </Stack>
        ) : null}

        {!loading && error ? <Alert severity='error'>{error}</Alert> : null}

        {!loading && !error && detail ? (
          <Stack spacing={4}>
            <Card variant='outlined'>
              <CardContent>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={4}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  justifyContent='space-between'
                >
                  <Stack spacing={2}>
                    <PaymentInstrumentChip
                      providerSlug={detail.account.providerSlug}
                      instrumentName={`${detail.account.accountName} · ${detail.account.currency}`}
                      instrumentCategory={(detail.account.instrumentCategory || 'bank_account') as InstrumentCategory}
                    />
                    <Stack direction='row' spacing={2} useFlexGap flexWrap='wrap'>
                      <CustomChip
                        round='true'
                        size='small'
                        variant='tonal'
                        color={getReconciliationColor(detail.account.reconciliationStatus) as 'success' | 'warning' | 'secondary'}
                        label={detail.account.reconciliationStatus || 'Sin período'}
                      />
                      <CustomChip
                        round='true'
                        size='small'
                        variant='tonal'
                        color={detail.account.isPeriodClosed ? 'success' : 'secondary'}
                        label={detail.account.isPeriodClosed ? 'Período cerrado' : 'Período abierto'}
                      />
                    </Stack>
                  </Stack>

                  {canClosePeriod ? (
                    <Button variant='contained' onClick={handleClosePeriod} disabled={closingPeriod}>
                      {closingPeriod ? 'Cerrando...' : 'Cerrar período'}
                    </Button>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>

            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 4 }}>
                <HorizontalWithSubtitle
                  title='Saldo actual'
                  stats={formatAmount(detail.currentBalance.closingBalance, detail.account.currency)}
                  subtitle='Snapshot al cierre del período consultado'
                  avatarIcon='tabler-building-bank'
                  avatarColor='primary'
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <HorizontalWithSubtitle
                  title='Ingresos período'
                  stats={formatAmount(detail.currentBalance.periodInflows, detail.account.currency)}
                  subtitle='Entradas registradas en la cuenta'
                  avatarIcon='tabler-arrow-down-left'
                  avatarColor='success'
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <HorizontalWithSubtitle
                  title='Salidas período'
                  stats={formatAmount(detail.currentBalance.periodOutflows, detail.account.currency)}
                  subtitle='Pagos, fees o transferencias desde este instrumento'
                  avatarIcon='tabler-arrow-up-right'
                  avatarColor='error'
                />
              </Grid>
            </Grid>

            <Card>
              <CardHeader
                title='Últimos 12 meses'
                subheader='Ingresos y salidas materializados por cuenta'
              />
              <CardContent>
                <AppRecharts>
                  <ResponsiveContainer width='100%' height={260}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray='3 3' />
                      <XAxis dataKey='label' />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey='inflows' name='Ingresos' fill='#3DBA5D' radius={[4, 4, 0, 0]} />
                      <Bar dataKey='outflows' name='Salidas' fill='#FF4D49' radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </AppRecharts>
              </CardContent>
            </Card>

            <Card>
              <CardHeader
                title='Movimientos recientes'
                subheader='Timeline operativo leído desde settlement legs y fallback de payment ledger'
              />
              <CardContent sx={{ pt: 0 }}>
                {detail.movements.length === 0 ? (
                  <Alert severity='info'>
                    Esta cuenta no tiene movimientos en el período consultado.
                  </Alert>
                ) : (
                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>Fecha</TableCell>
                          <TableCell>Tipo</TableCell>
                          <TableCell>Monto</TableCell>
                          <TableCell>Referencia</TableCell>
                          <TableCell>Conciliación</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detail.movements.map(movement => (
                          <TableRow key={movement.movementId}>
                            <TableCell>{formatDate(movement.transactionDate)}</TableCell>
                            <TableCell>
                              <Stack spacing={0.5}>
                                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                  {movement.movementType}
                                </Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  {movement.direction === 'incoming' ? 'Entrada' : 'Salida'} · {movement.movementSource}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>{formatAmount(movement.amount, movement.currency)}</TableCell>
                            <TableCell>{movement.providerReference || '—'}</TableCell>
                            <TableCell>
                              <CustomChip
                                round='true'
                                size='small'
                                variant='tonal'
                                color={movement.isReconciled ? 'success' : 'warning'}
                                label={movement.isReconciled ? 'Conciliado' : 'Por conciliar'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Stack>
        ) : null}
      </Box>
    </Drawer>
  )
}

export default AccountDetailDrawer
