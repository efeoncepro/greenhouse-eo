'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
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
import MenuItem from '@mui/material/MenuItem'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import PaymentInstrumentChip from '@/components/greenhouse/PaymentInstrumentChip'
import type { InstrumentCategory } from '@/config/payment-instruments'
import AccountDetailDrawer from '@/views/greenhouse/finance/components/AccountDetailDrawer'
import AssignAccountDrawer from '@/views/greenhouse/finance/drawers/AssignAccountDrawer'
import DeclareReconciliationDrawer from '@/views/greenhouse/finance/drawers/DeclareReconciliationDrawer'
import InternalTransferDrawer from '@/views/greenhouse/finance/drawers/InternalTransferDrawer'

type Coverage = {
  assignedCount: number
  totalCount: number
  coveragePct: number
  unassignedCount: number
}

type ReconciliationDriftView = {
  hasOpenDrift: boolean
  driftAmount: number
  driftStatus: 'open' | 'accepted' | 'reconciled' | null
  driftAgeMinutes: number | null
  bankClosingBalance: number | null
  bankAvailableBalance: number | null
  bankHoldsAmount: number | null
  bankCreditLimit: number | null
  pgClosingBalance: number | null
  snapshotId: string | null
  snapshotAt: string | null
  sourceKind: string | null
  sourceEvidenceRef: string | null
  driftExplanation: string | null
}

type TreasuryAccount = {
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
  drift: ReconciliationDriftView | null
}

type CreditCardSummary = {
  accountId: string
  accountName: string
  providerSlug: string | null
  currency: string
  creditLimit: number | null
  consumed: number
  available: number | null
}

type UnassignedPayment = {
  paymentType: 'income' | 'expense'
  paymentId: string
  paymentDate: string | null
  amount: number
  amountClp: number | null
  currency: string | null
  reference: string | null
  paymentMethod: string | null
  counterpartyName: string | null
  documentId: string | null
  documentLabel: string | null
}

type FxGainLossBreakdown = {
  totalClp: number
  realizedClp: number
  translationClp: number
  internalTransferClp: number
  hasExposure: boolean
  isDegraded: boolean
}

type BankResponse = {
  period: {
    year: number
    month: number
    startDate: string
    endDate: string
    isCurrentPeriod: boolean
  }
  kpis: {
    totalClp: number
    totalUsd: number
    consolidatedClp: number
    activeAccounts: number
    fxGainLossClp: number
    fxGainLoss: FxGainLossBreakdown
    coverage: Coverage
  }
  accounts: TreasuryAccount[]
  creditCards: CreditCardSummary[]
  unassignedPayments: UnassignedPayment[]
}

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
]

const getCurrentPeriod = () => {
  const now = new Date()

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1
  }
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

const getStatusColor = (status: string | null) => {
  if (status === 'closed' || status === 'reconciled') return 'success'
  if (status === 'in_progress') return 'warning'

  return 'secondary'
}

const getDiscrepancyColor = (difference: number) => {
  if (Math.abs(difference) < 0.01) return 'success'
  if (Math.abs(difference) < 1000) return 'warning'

  return 'error'
}

const BankView = () => {
  const current = getCurrentPeriod()

  const [year, setYear] = useState(current.year)
  const [month, setMonth] = useState(current.month)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<BankResponse | null>(null)

  const [transferOpen, setTransferOpen] = useState(false)
  const [reconcileOpen, setReconcileOpen] = useState(false)
  const [reconcilePreselect, setReconcilePreselect] = useState<string | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [detailAccountId, setDetailAccountId] = useState<string | null>(null)

  const yearOptions = useMemo(
    () => Array.from({ length: 5 }, (_, index) => current.year - 2 + index),
    [current.year]
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/finance/bank?year=${year}&month=${month}`, { cache: 'no-store' })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        setError(body.error || 'No pudimos cargar la vista bancaria.')

        return
      }

      const body: BankResponse = await res.json()

      setData(body)
    } catch {
      setError('No pudimos conectar con Banco. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const accountOptions = useMemo(
    () => (data?.accounts || []).map(account => ({
      accountId: account.accountId,
      accountName: account.accountName,
      providerSlug: account.providerSlug,
      instrumentCategory: account.instrumentCategory,
      currency: account.currency
    })),
    [data?.accounts]
  )

  if (loading) {
    return (
      <Grid container spacing={6}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Card>
              <CardContent>
                <Skeleton variant='text' width='50%' height={24} />
                <Skeleton variant='text' width='35%' height={34} sx={{ mt: 2 }} />
                <Skeleton variant='text' width='80%' height={18} sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Skeleton variant='rectangular' height={420} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )
  }

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

  return (
    <>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                spacing={4}
                justifyContent='space-between'
                alignItems={{ xs: 'flex-start', lg: 'center' }}
              >
                <Box>
                  <Typography variant='h4' sx={{ mb: 1 }}>
                    Banco
                  </Typography>
                  <Typography color='text.secondary'>
                    Tesorería por cuenta, tarjeta, fintech e instrumentos con lectura ledger-first.
                  </Typography>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <CustomTextField
                    select
                    value={month}
                    label='Mes'
                    onChange={event => setMonth(Number(event.target.value))}
                    sx={{ minWidth: 180 }}
                  >
                    {MONTHS.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </CustomTextField>

                  <CustomTextField
                    select
                    value={year}
                    label='Año'
                    onChange={event => setYear(Number(event.target.value))}
                    sx={{ minWidth: 120 }}
                  >
                    {yearOptions.map(option => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </CustomTextField>

                  <Button variant='tonal' color='secondary' onClick={() => setAssignOpen(true)}>
                    Asignación retroactiva
                  </Button>
                  <Button variant='contained' onClick={() => setTransferOpen(true)}>
                    Transferencia interna
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {data.kpis.coverage.unassignedCount > 0 ? (
          <Grid size={{ xs: 12 }}>
            <Alert
              severity='warning'
              action={
                <Button color='inherit' size='small' onClick={() => setAssignOpen(true)}>
                  Resolver
                </Button>
              }
            >
              Hay {data.kpis.coverage.unassignedCount} movimiento(s) sin instrumento en el período. La cobertura actual es {data.kpis.coverage.coveragePct}% y afecta Banco, Cobros, Pagos y Conciliación.
            </Alert>
          </Grid>
        ) : null}

        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <HorizontalWithSubtitle
            title='Saldo CLP'
            stats={formatAmount(data.kpis.totalClp, 'CLP')}
            subtitle='Suma de instrumentos en pesos'
            avatarIcon='tabler-currency-dollar'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <HorizontalWithSubtitle
            title='Saldo USD'
            stats={formatAmount(data.kpis.totalUsd, 'USD')}
            subtitle='Suma de instrumentos en dólares'
            avatarIcon='tabler-coin'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <HorizontalWithSubtitle
            title='Equivalente CLP'
            stats={formatAmount(data.kpis.consolidatedClp, 'CLP')}
            subtitle='Consolidado multi-moneda del período'
            avatarIcon='tabler-scale'
            avatarColor='success'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <HorizontalWithSubtitle
            title='Instrumentos activos'
            stats={String(data.kpis.activeAccounts)}
            subtitle='Cuentas bancarias, tarjetas y fintech vigentes'
            avatarIcon='tabler-building-bank'
            avatarColor='secondary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <HorizontalWithSubtitle
            title='Coverage'
            stats={`${data.kpis.coverage.coveragePct}%`}
            subtitle={`${data.kpis.coverage.assignedCount} de ${data.kpis.coverage.totalCount} movimientos con instrumento`}
            avatarIcon='tabler-link'
            avatarColor={data.kpis.coverage.unassignedCount > 0 ? 'warning' : 'success'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          {(() => {
            const fx = data.kpis.fxGainLoss

            if (!fx.hasExposure) {
              return (
                <HorizontalWithSubtitle
                  title='Resultado cambiario'
                  stats='—'
                  subtitle='Sin exposición FX en el período'
                  avatarIcon='tabler-arrows-exchange-2'
                  avatarColor='secondary'
                  footer='Aparecerá un resultado cuando exista una cuenta o pago en moneda extranjera.'
                />
              )
            }

            if (fx.isDegraded) {
              return (
                <HorizontalWithSubtitle
                  title='Resultado cambiario'
                  stats='Pendiente'
                  subtitle='No se pudo resolver el tipo de cambio para una cuenta en moneda extranjera.'
                  avatarIcon='tabler-arrows-exchange-2'
                  avatarColor='error'
                  statusLabel='Materialización degradada'
                  statusColor='error'
                  statusIcon='tabler-alert-triangle'
                  footer='Revisar Reliability Control Plane > Finance.'
                />
              )
            }

            return (
              <HorizontalWithSubtitle
                title='Resultado cambiario'
                stats={formatAmount(fx.totalClp, 'CLP')}
                subtitle={`Realizado ${formatAmount(fx.realizedClp, 'CLP')} · Translación ${formatAmount(fx.translationClp, 'CLP')}`}
                avatarIcon='tabler-arrows-exchange-2'
                avatarColor='warning'
                titleTooltip={`Composición canónica: realized (rate documento vs rate pago) + translation (revaluación de saldos no-CLP) + transferencias internas. Internal transfers actualmente $0 — se activa con TASK derivada.`}
                footer='Total acumulado por cuenta en el período seleccionado.'
              />
            )
          })()}
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader
              title='Saldos por instrumento'
              subheader={`Período ${MONTHS.find(option => option.value === month)?.label || month} ${year}. Click en una cuenta para abrir el detalle y el cierre del período.`}
              action={
                <Button
                  variant='tonal'
                  color='primary'
                  size='small'
                  onClick={() => {
                    setReconcilePreselect(null)
                    setReconcileOpen(true)
                  }}
                >
                  Declarar conciliación
                </Button>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Instrumento</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell>Moneda</TableCell>
                      <TableCell>Apertura</TableCell>
                      <TableCell>Ingresos</TableCell>
                      <TableCell>Salidas</TableCell>
                      <TableCell>Saldo estimado</TableCell>
                      <TableCell>Discrepancia</TableCell>
                      <TableCell>Conciliación</TableCell>
                      <TableCell>Última actividad</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.accounts.map((account, index) => {
                      const previousCurrency = index > 0 ? data.accounts[index - 1]?.currency : null
                      const showCurrencyDivider = previousCurrency !== account.currency

                      return (
                        <Fragment key={account.accountId}>
                          {showCurrencyDivider ? (
                            <TableRow>
                              <TableCell colSpan={10} sx={{ bgcolor: 'action.hover' }}>
                                <Typography variant='subtitle2'>
                                  {account.currency === 'CLP' ? 'Instrumentos CLP' : `Instrumentos ${account.currency}`}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : null}

                          <TableRow
                            key={account.accountId}
                            hover
                            onClick={() => setDetailAccountId(account.accountId)}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell>
                              <Stack spacing={0.5}>
                                <PaymentInstrumentChip
                                  providerSlug={account.providerSlug}
                                  instrumentName={account.accountName}
                                  instrumentCategory={(account.instrumentCategory || 'bank_account') as InstrumentCategory}
                                  size='sm'
                                />
                                <Typography variant='caption' color='text.secondary'>
                                  {account.bankName || 'Sin emisor registrado'}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <CustomChip
                                round='true'
                                size='small'
                                variant='tonal'
                                color='primary'
                                label={account.instrumentCategory || 'bank_account'}
                              />
                            </TableCell>
                            <TableCell>{account.currency}</TableCell>
                            <TableCell>{formatAmount(account.openingBalance, account.currency)}</TableCell>
                            <TableCell>{formatAmount(account.periodInflows, account.currency)}</TableCell>
                            <TableCell>{formatAmount(account.periodOutflows, account.currency)}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>
                              <Stack spacing={0.5}>
                                <Box>{formatAmount(account.closingBalance, account.currency)}</Box>
                                {account.drift && account.drift.driftStatus !== 'reconciled' && Math.abs(account.drift.driftAmount) >= 1 && (
                                  <CustomChip
                                    round='true'
                                    size='small'
                                    variant='tonal'
                                    color={account.drift.driftStatus === 'accepted' ? 'info' : 'warning'}
                                    label={`${account.drift.driftStatus === 'accepted' ? 'Por conciliar' : 'Drift'} ${formatAmount(Math.abs(account.drift.driftAmount), account.currency)}`}
                                    title={`Banco: ${formatAmount(account.drift.bankClosingBalance ?? 0, account.currency)} • Greenhouse: ${formatAmount(account.drift.pgClosingBalance ?? 0, account.currency)}${account.drift.driftExplanation ? ` • ${account.drift.driftExplanation}` : ''}`}
                                  />
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <CustomChip
                                round='true'
                                size='small'
                                variant='tonal'
                                color={getDiscrepancyColor(account.discrepancy) as 'success' | 'warning' | 'error'}
                                label={formatAmount(account.discrepancy, 'CLP')}
                              />
                            </TableCell>
                            <TableCell>
                              <Stack spacing={1}>
                                <CustomChip
                                  round='true'
                                  size='small'
                                  variant='tonal'
                                  color={getStatusColor(account.reconciliationStatus) as 'success' | 'warning' | 'secondary'}
                                  label={account.reconciliationStatus || 'Sin período'}
                                />
                                <CustomChip
                                  round='true'
                                  size='small'
                                  variant='tonal'
                                  color={account.isPeriodClosed ? 'success' : 'secondary'}
                                  label={account.isPeriodClosed ? 'Cerrado' : 'Abierto'}
                                />
                              </Stack>
                            </TableCell>
                            <TableCell>{formatDate(data.period.endDate)}</TableCell>
                          </TableRow>
                        </Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader
              title='Tarjetas de crédito'
              subheader='Cupo, consumo del período y disponibilidad estimada'
            />
            <CardContent sx={{ pt: 0 }}>
              {data.creditCards.length === 0 ? (
                <Alert severity='info'>
                  No hay tarjetas de crédito activas registradas en este tenant.
                </Alert>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Tarjeta</TableCell>
                        <TableCell>Moneda</TableCell>
                        <TableCell>Cupo</TableCell>
                        <TableCell>Consumo</TableCell>
                        <TableCell>Disponible</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.creditCards.map(card => (
                        <TableRow key={card.accountId}>
                          <TableCell>
                            <PaymentInstrumentChip
                              providerSlug={card.providerSlug}
                              instrumentName={card.accountName}
                              instrumentCategory='credit_card'
                              size='sm'
                            />
                          </TableCell>
                          <TableCell>{card.currency}</TableCell>
                          <TableCell>{card.creditLimit != null ? formatAmount(card.creditLimit, card.currency) : 'Sin cupo'}</TableCell>
                          <TableCell>{formatAmount(card.consumed, card.currency)}</TableCell>
                          <TableCell>{card.available != null ? formatAmount(card.available, card.currency) : 'Sin dato'}</TableCell>
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

      <InternalTransferDrawer
        open={transferOpen}
        accounts={accountOptions}
        onClose={() => setTransferOpen(false)}
        onSuccess={() => void fetchData()}
      />

      <DeclareReconciliationDrawer
        open={reconcileOpen}
        accounts={data.accounts.map(a => ({
          accountId: a.accountId,
          accountName: a.accountName,
          currency: a.currency,
          instrumentCategory: a.instrumentCategory,
          closingBalance: a.closingBalance,
          creditLimit: data.creditCards.find(cc => cc.accountId === a.accountId)?.creditLimit ?? null
        }))}
        preselectedAccountId={reconcilePreselect}
        onClose={() => setReconcileOpen(false)}
        onDeclared={() => void fetchData()}
      />

      <AssignAccountDrawer
        open={assignOpen}
        accounts={accountOptions}
        payments={data.unassignedPayments}
        onClose={() => setAssignOpen(false)}
        onSuccess={() => void fetchData()}
      />

      <AccountDetailDrawer
        open={Boolean(detailAccountId)}
        accountId={detailAccountId}
        year={year}
        month={month}
        onClose={() => setDetailAccountId(null)}
        onSuccess={() => void fetchData()}
      />
    </>
  )
}

export default BankView
