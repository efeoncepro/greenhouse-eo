'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { toast } from 'sonner'

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
import {
  resolveInstrumentDetailPresentation,
  type InstrumentDetailProfile
} from '@/lib/finance/instrument-presentation'
import type { TreasuryBankAccountOverview } from '@/lib/finance/account-balances'

// TASK-714 — drawer consumes the canonical TreasuryBankAccountOverview shape
// directly (extended with cardLastFour/cardNetwork/accountKind by the API).
// Optional fields are typed loose because the read-model cutover (TASK-705)
// still streams payloads in flight.
type AccountOverview = Pick<
  TreasuryBankAccountOverview,
  | 'accountId'
  | 'accountName'
  | 'bankName'
  | 'currency'
  | 'instrumentCategory'
  | 'providerSlug'
  | 'openingBalance'
  | 'periodInflows'
  | 'periodOutflows'
  | 'closingBalance'
  | 'discrepancy'
  | 'reconciliationStatus'
  | 'reconciliationPeriodId'
  | 'isPeriodClosed'
  | 'creditLimit'
  | 'metadata'
> & {
  // Always present after TASK-714 contract extension; defaulted defensively
  // until the read-model cutover lands.
  accountKind?: 'asset' | 'liability'
  cardLastFour?: string | null
  cardNetwork?: string | null
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

type ActiveOtb = {
  obtbId: string
  genesisDate: string
  openingBalance: number
  auditStatus: 'estimated' | 'reconciled' | 'audited'
  declarationReason: string
  supersededTransactionsCount: number
}

type FreshnessSignal = {
  lastMaterializedAt: string | null
  ageSeconds: number | null
  isStale: boolean
  label: string | null
}

type DetailResponse = {
  account: AccountOverview
  currentBalance: AccountBalance
  activeOtb: ActiveOtb | null
  freshness?: FreshnessSignal
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

  // TASK-714 — derive presentation profile from the account semantic identity.
  // The drawer renders strictly from the profile; it does not interpret
  // accounting rules per category. Fallback profile guards against the brief
  // window where `detail` is null (initial load or error state).
  const profile: InstrumentDetailProfile | null = useMemo(() => {
    if (!detail?.account) return null

    // Bridge: cast the drawer's narrow AccountOverview to the canonical type
    // expected by the resolver. All fields the resolver reads are guaranteed
    // by the TASK-714 contract extension; the rest defaults safely.
    const account = detail.account as AccountOverview

    const bridged: TreasuryBankAccountOverview = {
      accountId: account.accountId,
      accountName: account.accountName,
      bankName: account.bankName,
      currency: account.currency,
      instrumentCategory: account.instrumentCategory,
      providerSlug: account.providerSlug,
      accountType: 'unknown',
      openingBalance: account.openingBalance,
      periodInflows: account.periodInflows,
      periodOutflows: account.periodOutflows,
      closingBalance: detail.currentBalance.closingBalance,
      closingBalanceClp: null,
      fxRateUsed: null,
      fxGainLossClp: 0,
      fxGainLossRealizedClp: 0,
      fxGainLossTranslationClp: 0,
      transactionCount: 0,
      lastTransactionAt: null,
      isPeriodClosed: account.isPeriodClosed,
      discrepancy: account.discrepancy,
      reconciliationStatus: account.reconciliationStatus,
      reconciliationPeriodId: account.reconciliationPeriodId,
      creditLimit: account.creditLimit ?? null,
      metadata: account.metadata ?? null,
      drift: null,
      accountKind: account.accountKind ?? 'asset',
      cardLastFour: account.cardLastFour ?? null,
      cardNetwork: account.cardNetwork ?? null
    }

    return resolveInstrumentDetailPresentation(bridged)
  }, [detail])

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', lg: 760 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Box>
          <Typography variant='h6'>{profile?.drawerTitle ?? 'Detalle del instrumento'}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {profile?.drawerSubtitle ?? 'Cargando...'}
          </Typography>
        </Box>
        <IconButton size='small' onClick={onClose} aria-label='Cerrar detalle'>
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
            {detail.freshness?.isStale && detail.freshness?.label ? (
              <Alert
                severity='info'
                variant='outlined'
                icon={<i className='tabler-clock' aria-hidden />}
                role='status'
                aria-live='polite'
              >
                Saldo actualizado {detail.freshness.label.toLowerCase()}. La materialización corre
                en segundo plano; los movimientos recientes podrían demorar unos minutos en aparecer.
              </Alert>
            ) : null}
            {profile?.contextBanner ? (
              <Alert
                severity={profile.contextBanner.tone === 'warning' ? 'warning' : 'info'}
                variant='outlined'
                role='status'
                aria-live='polite'
              >
                {profile.contextBanner.text}
              </Alert>
            ) : null}

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
                      instrumentName={detail.account.accountName}
                      instrumentCategory={(detail.account.instrumentCategory || 'bank_account') as InstrumentCategory}
                    />
                    {profile && profile.identityFields.length > 0 ? (
                      <Stack direction='row' spacing={3} useFlexGap flexWrap='wrap'>
                        {profile.identityFields.map(field => (
                          <Box key={field.label} sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {field.label}
                            </Typography>
                            <Typography variant='body2' sx={{ fontWeight: 600, fontFamily: field.label === 'Tarjeta' ? 'monospace' : undefined }}>
                              {field.value}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    ) : null}
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

            {profile ? (
              <Grid container spacing={4}>
                {profile.kpis.map(kpi => (
                  <Grid key={kpi.key} size={{ xs: 12, md: 4 }}>
                    <HorizontalWithSubtitle
                      title={kpi.title}
                      stats={kpi.value !== null ? formatAmount(kpi.value, detail.account.currency) : 'Sin datos'}
                      subtitle={kpi.subtitle}
                      avatarIcon={kpi.avatarIcon}
                      avatarColor={kpi.avatarColor}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : null}

            <Card>
              <CardHeader
                title={profile?.chart.title ?? 'Últimos 12 meses'}
                subheader={profile?.chart.subtitle ?? ''}
              />
              <CardContent>
                <AppRecharts>
                  <ResponsiveContainer width='100%' height={260}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray='3 3' />
                      <XAxis dataKey='label' />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey='inflows'
                        name={profile?.chart.inflowLabel ?? 'Ingresos'}
                        fill={profile?.chart.inflowColor ?? '#3DBA5D'}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey='outflows'
                        name={profile?.chart.outflowLabel ?? 'Salidas'}
                        fill={profile?.chart.outflowColor ?? '#FF4D49'}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </AppRecharts>
              </CardContent>
            </Card>

            <Card>
              <CardHeader
                title={profile?.movements.sectionTitle ?? 'Movimientos recientes'}
                subheader={profile?.movements.sectionSubtitle ?? ''}
              />
              <CardContent sx={{ pt: 0 }}>
                {detail.movements.length === 0 ? (
                  detail.activeOtb && detail.activeOtb.supersededTransactionsCount > 0 ? (
                    <Alert severity='info'>
                      <Typography variant='body2' sx={{ fontWeight: 600, mb: 0.5 }}>
                        Cuenta anclada al {formatDate(detail.activeOtb.genesisDate)} con saldo {formatAmount(detail.activeOtb.openingBalance, detail.account.currency)} ({detail.activeOtb.auditStatus})
                      </Typography>
                      <Typography variant='caption' display='block'>
                        {detail.activeOtb.supersededTransactionsCount} movimientos previos al ancla quedan en audit (encapsulados en el saldo opening). En el período consultado no hay movimientos posteriores al ancla todavía.
                      </Typography>
                    </Alert>
                  ) : (
                    <Alert severity='info'>
                      {profile?.movements.emptyLabel ?? 'Esta cuenta no tiene movimientos en el período consultado.'}
                    </Alert>
                  )
                ) : (
                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>Fecha</TableCell>
                          <TableCell>Tipo</TableCell>
                          <TableCell>{profile?.movements.amountHeader ?? 'Monto'}</TableCell>
                          <TableCell>Referencia</TableCell>
                          <TableCell>Conciliación</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detail.movements.map(movement => {
                          const directionLabel = movement.direction === 'incoming'
                            ? (profile?.movements.directionLabels.incoming ?? 'Entrada')
                            : (profile?.movements.directionLabels.outgoing ?? 'Salida')

                          return (
                            <TableRow key={movement.movementId}>
                              <TableCell>{formatDate(movement.transactionDate)}</TableCell>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                    {directionLabel}
                                  </Typography>
                                  <Typography variant='caption' color='text.secondary'>
                                    {movement.movementType} · {movement.movementSource}
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
                          )
                        })}
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
