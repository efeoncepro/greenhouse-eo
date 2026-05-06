'use client'

import { useCallback, useEffect, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'

import PaymentInstrumentChip from '@/components/greenhouse/PaymentInstrumentChip'
import type { InstrumentCategory } from '@/config/payment-instruments'
import { formatCurrency as formatGreenhouseCurrency } from '@/lib/format'

const GREENHOUSE_COPY = getMicrocopy()
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SettlementPaymentType = 'income' | 'expense'
type SupplementalLegType = 'internal_transfer' | 'funding' | 'fx_conversion' | 'fee'

interface SettlementGroup {
  settlementGroupId: string
  groupDirection: string
  settlementMode: string
  sourcePaymentType: string | null
  sourcePaymentId: string | null
  primaryInstrumentId: string | null
  providerReference: string | null
  providerStatus: string
  notes: string | null
}

interface SettlementLeg {
  settlementLegId: string
  settlementGroupId: string
  linkedPaymentType: string | null
  linkedPaymentId: string | null
  legType: string
  direction: string
  instrumentId: string | null
  counterpartyInstrumentId: string | null
  amount: number
  currency: string
  amountClp: number | null
  exchangeRate: number | null
  providerReference: string | null
  providerStatus: string
  transactionDate: string | null
  isReconciled: boolean
  reconciliationRowId: string | null
  notes: string | null
}

interface SettlementDetail {
  paymentType: SettlementPaymentType
  paymentId: string
  settlementGroup: SettlementGroup
  settlementLegs: SettlementLeg[]
}

interface InstrumentOption {
  accountId: string
  accountName: string
  providerSlug: string | null
  instrumentCategory: InstrumentCategory
  currency: string
}

type Props = {
  open: boolean
  paymentType: SettlementPaymentType
  paymentId: string | null
  onClose: () => void
  onSuccess?: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—'

  const [year, month, day] = dateStr.split('-')

  return `${day}/${month}/${year}`
}

const formatMoney = (amount: number, currency: string) =>
  formatGreenhouseCurrency(amount, currency, {
  maximumFractionDigits: currency === 'CLP' ? 0 : 2
}, 'es-CL')

const getPaymentLabel = (paymentType: SettlementPaymentType) =>
  paymentType === 'income' ? 'cobro' : 'pago'

const getSettlementModeLabel = (mode: string | null) => {
  switch (mode) {
    case 'via_intermediary':
      return 'Vía intermediario'
    case 'mixed':
      return 'Cadena multi-leg'
    case 'direct':
      return 'Directo'
    default:
      return mode || 'No definido'
  }
}

const LEG_TYPE_LABELS: Record<SupplementalLegType, string> = {
  internal_transfer: 'Transferencia interna',
  funding: 'Fondeo',
  fx_conversion: 'Conversión FX',
  fee: 'Fee'
}

const LEG_TYPE_HELPERS: Record<SupplementalLegType, string> = {
  internal_transfer: 'Movimiento entre instrumentos sin cerrar la obligación.',
  funding: 'Salida de fondos hacia el rail o wallet intermedio.',
  fx_conversion: 'Tramo de cambio de moneda o conversión provista por el rail.',
  fee: 'Comisión asociada a la operación.'
}

const LEG_TYPE_OPTIONS: SupplementalLegType[] = [
  'internal_transfer',
  'funding',
  'fx_conversion',
  'fee'
]

const DEFAULT_DIRECTION_BY_TYPE: Record<SupplementalLegType, 'incoming' | 'outgoing'> = {
  internal_transfer: 'outgoing',
  funding: 'outgoing',
  fx_conversion: 'outgoing',
  fee: 'outgoing'
}

const DIRECTION_LABELS: Record<'incoming' | 'outgoing', string> = {
  incoming: 'Entrada',
  outgoing: 'Salida'
}

const LEG_STATUS_LABELS: Record<string, { label: string; color: 'success' | 'warning' | 'secondary' | 'info' }> = {
  reconciled: { label: 'Conciliado', color: 'success' },
  pending: { label: GREENHOUSE_COPY.states.pending, color: 'warning' },
  settled: { label: 'Liquidado', color: 'info' }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SettlementOrchestrationDrawer = ({ open, paymentType, paymentId, onClose, onSuccess }: Props) => {
  const [detail, setDetail] = useState<SettlementDetail | null>(null)
  const [instruments, setInstruments] = useState<InstrumentOption[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [legType, setLegType] = useState<SupplementalLegType>('funding')
  const [direction, setDirection] = useState<'incoming' | 'outgoing'>('outgoing')
  const [instrumentId, setInstrumentId] = useState('')
  const [counterpartyInstrumentId, setCounterpartyInstrumentId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('CLP')
  const [amountClp, setAmountClp] = useState('')
  const [exchangeRate, setExchangeRate] = useState('')
  const [transactionDate, setTransactionDate] = useState('')
  const [providerReference, setProviderReference] = useState('')
  const [providerStatus, setProviderStatus] = useState('pending')
  const [notes, setNotes] = useState('')

  const resetForm = useCallback(() => {
    setLegType('funding')
    setDirection('outgoing')
    setInstrumentId('')
    setCounterpartyInstrumentId('')
    setAmount('')
    setCurrency('CLP')
    setAmountClp('')
    setExchangeRate('')
    setTransactionDate('')
    setProviderReference('')
    setProviderStatus('pending')
    setNotes('')
    setError(null)
  }, [])

  const fetchData = useCallback(async () => {
    if (!paymentId) return

    setLoading(true)
    setError(null)

    try {
      const [detailRes, instrumentsRes] = await Promise.all([
        fetch(`/api/finance/settlements/payment?paymentType=${paymentType}&paymentId=${paymentId}`, { cache: 'no-store' }),
        fetch('/api/finance/accounts', { cache: 'no-store' })
      ])

      if (detailRes.ok) {
        const data = await detailRes.json()

        setDetail(data)

        const primaryInstrumentId = data?.settlementGroup?.primaryInstrumentId ?? ''

        setInstrumentId(prev => prev || primaryInstrumentId)
        setTransactionDate(prev => prev || data?.settlementLegs?.[0]?.transactionDate || '')
      } else {
        const data = await detailRes.json().catch(() => ({}))

        throw new Error(data.error || 'No pudimos cargar la liquidación.')
      }

      if (instrumentsRes.ok) {
        const data = await instrumentsRes.json()

        setInstruments((data?.items ?? []).filter((instrument: InstrumentOption & { isActive?: boolean }) => instrument.isActive !== false))
      }
    } catch (fetchError) {
      setDetail(null)
      setError(fetchError instanceof Error ? fetchError.message : 'No pudimos cargar la liquidación.')
    } finally {
      setLoading(false)
    }
  }, [paymentId, paymentType])

  useEffect(() => {
    if (open && paymentId) {
      fetchData()
    }

    if (!open) {
      resetForm()
      setDetail(null)
      setInstruments([])
    }
  }, [open, paymentId, fetchData, resetForm])

  const handleLegTypeChange = (value: SupplementalLegType) => {
    setLegType(value)
    setDirection(DEFAULT_DIRECTION_BY_TYPE[value])
  }

  const handleSubmit = async () => {
    if (!paymentId) return

    if (!instrumentId.trim() || !amount.trim() || !transactionDate) {
      setError('Completa instrumento, monto y fecha.')

      return
    }

    if (Number(amount) <= 0) {
      setError('El monto debe ser mayor a cero.')

      return
    }

    if (!Number.isFinite(Number(amount))) {
      setError('El monto debe ser numérico.')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/finance/settlements/payment?paymentType=${paymentType}&paymentId=${paymentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legType,
          direction,
          instrumentId: instrumentId.trim(),
          ...(counterpartyInstrumentId.trim() && { counterpartyInstrumentId: counterpartyInstrumentId.trim() }),
          amount: Number(amount),
          currency: currency.trim() || 'CLP',
          ...(amountClp.trim() && { amountClp: Number(amountClp) }),
          ...(exchangeRate.trim() && { exchangeRate: Number(exchangeRate) }),
          ...(providerReference.trim() && { providerReference: providerReference.trim() }),
          providerStatus,
          transactionDate,
          ...(notes.trim() && { notes: notes.trim() })
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'No pudimos registrar el tramo de liquidación.')

        return
      }

      const data = await res.json()

      setDetail(data)
      toast.success('Tramo de liquidación registrado')
      resetForm()
      onSuccess?.()
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  const paymentLabel = getPaymentLabel(paymentType)
  const primaryCurrency = detail?.settlementLegs?.[0]?.currency || currency || 'CLP'

  const getInstrumentName = (id: string | null) => {
    if (!id) return '—'

    return instruments.find(instrument => instrument.accountId === id)?.accountName || id
  }

  const getInstrumentMeta = (id: string | null) => {
    if (!id) return null

    return instruments.find(instrument => instrument.accountId === id) || null
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', md: 720 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 4, py: 3 }}>
        <Box>
          <Typography variant='h6'>Liquidación del {paymentLabel}</Typography>
          <Typography variant='body2' color='text.secondary'>
            Revisa la cadena de liquidación y agrega tramos intermedios cuando el pago pase por otro rail.
          </Typography>
        </Box>
        <IconButton onClick={onClose} size='small' aria-label={GREENHOUSE_COPY.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && detail && (
          <>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader
                title='Resumen de liquidación'
                avatar={
                  <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                    <i className='tabler-route' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
                  </Avatar>
                }
              />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Settlement group</Typography>
                    <Typography variant='body2'>
                      {detail.settlementGroup.settlementGroupId}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Modo</Typography>
                    <Typography variant='body2'>
                      {getSettlementModeLabel(detail.settlementGroup.settlementMode)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Instrumento principal</Typography>
                    <Typography variant='body2'>
                      {detail.settlementGroup.primaryInstrumentId || '—'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Proveedor / referencia</Typography>
                    <Typography variant='body2'>
                      {detail.settlementGroup.providerReference || detail.settlementGroup.providerStatus || '—'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Estado</Typography>
                    <Typography variant='body2'>
                      {detail.settlementGroup.providerStatus}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Legs</Typography>
                    <Typography variant='body2'>
                      {detail.settlementLegs.length} tramo{detail.settlementLegs.length !== 1 ? 's' : ''}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader
                title='Cadena actual'
                subheader='Tramos registrados para este pago'
                avatar={
                  <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                    <i className='tabler-list-details' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
                  </Avatar>
                }
              />
              <Divider />
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Instrumento</TableCell>
                      <TableCell align='right'>Monto</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.settlementLegs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align='center' sx={{ py: 4 }}>
                          <Typography variant='body2' color='text.secondary'>
                            No hay tramos de liquidación adicionales.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : detail.settlementLegs.map(leg => {
                      const statusKey = leg.isReconciled ? 'reconciled' : leg.providerStatus || 'pending'
                      const status = LEG_STATUS_LABELS[statusKey] || LEG_STATUS_LABELS.pending
                      const signedAmount = leg.direction === 'incoming' ? leg.amount : -leg.amount
                      const instrumentMeta = getInstrumentMeta(leg.instrumentId)

                      return (
                        <TableRow key={leg.settlementLegId}>
                          <TableCell>{formatDate(leg.transactionDate)}</TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Chip size='small' color='primary' label={leg.legType} />
                              <Typography variant='caption' color='text.secondary'>
                                {DIRECTION_LABELS[leg.direction as 'incoming' | 'outgoing'] || leg.direction}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            {leg.instrumentId ? (
                              <PaymentInstrumentChip
                                providerSlug={instrumentMeta?.providerSlug || null}
                                instrumentName={getInstrumentName(leg.instrumentId)}
                                instrumentCategory={instrumentMeta?.instrumentCategory || 'bank_account'}
                                size='sm'
                              />
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='body2' fontWeight={600} color={signedAmount < 0 ? 'error.main' : 'success.main'}>
                              {formatMoney(Math.abs(signedAmount), leg.currency || primaryCurrency)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip size='small' color={status.color} label={status.label} />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>

            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader
                title='Agregar tramo'
                subheader='Para fondeos, FX, fees o transferencias internas'
                avatar={
                  <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
                    <i className='tabler-plus' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
                  </Avatar>
                }
              />
              <Divider />
              <CardContent>
                <Stack spacing={3}>
                  <Alert severity='info'>
                    El pago principal ya existe. Usa esta acción para modelar legs intermedios sin cambiar el estado del cobro o pago base.
                  </Alert>

                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        select
                        fullWidth
                        size='small'
                        label='Tipo de tramo'
                        value={legType}
                        onChange={e => handleLegTypeChange(e.target.value as SupplementalLegType)}
                      >
                        {LEG_TYPE_OPTIONS.map(type => (
                          <MenuItem key={type} value={type}>
                            {LEG_TYPE_LABELS[type]}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
                        {LEG_TYPE_HELPERS[legType]}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        select
                        fullWidth
                        size='small'
                        label='Dirección'
                        value={direction}
                        onChange={e => setDirection(e.target.value as 'incoming' | 'outgoing')}
                      >
                        <MenuItem value='incoming'>Entrada</MenuItem>
                        <MenuItem value='outgoing'>Salida</MenuItem>
                      </CustomTextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        select
                        fullWidth
                        size='small'
                        label='Instrumento'
                        value={instrumentId}
                        onChange={e => setInstrumentId(e.target.value)}
                      >
                        <MenuItem value=''>-- Seleccionar --</MenuItem>
                        {instruments.map(instrument => (
                          <MenuItem key={instrument.accountId} value={instrument.accountId}>
                            {instrument.accountName}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        select
                        fullWidth
                        size='small'
                        label='Instrumento contraparte'
                        value={counterpartyInstrumentId}
                        onChange={e => setCounterpartyInstrumentId(e.target.value)}
                        helperText='Opcional para tramos entre instrumentos'
                      >
                        <MenuItem value=''>-- Opcional --</MenuItem>
                        {instruments.map(instrument => (
                          <MenuItem key={instrument.accountId} value={instrument.accountId}>
                            {instrument.accountName}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Monto'
                        type='number'
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Moneda'
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        helperText={`Por defecto ${primaryCurrency}`}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Monto CLP'
                        type='number'
                        value={amountClp}
                        onChange={e => setAmountClp(e.target.value)}
                        helperText='Opcional'
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Tipo de cambio'
                        type='number'
                        value={exchangeRate}
                        onChange={e => setExchangeRate(e.target.value)}
                        helperText='Opcional para FX'
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Fecha del movimiento'
                        type='date'
                        value={transactionDate}
                        onChange={e => setTransactionDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Referencia externa'
                        value={providerReference}
                        onChange={e => setProviderReference(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Estado proveedor'
                        value={providerStatus}
                        onChange={e => setProviderStatus(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Notas'
                        multiline
                        rows={3}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                      />
                    </Grid>
                  </Grid>

                  {counterpartyInstrumentId && counterpartyInstrumentId === instrumentId && (
                    <Alert severity='warning'>
                      El instrumento y su contraparte deben ser distintos.
                    </Alert>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button variant='outlined' onClick={onClose}>{GREENHOUSE_COPY.actions.close}</Button>
                    <Button
                      variant='contained'
                      onClick={handleSubmit}
                      disabled={saving || (counterpartyInstrumentId.trim() !== '' && counterpartyInstrumentId === instrumentId)}
                      startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}
                    >
                      {saving ? 'Guardando...' : 'Agregar tramo'}
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </>
        )}
      </Stack>
    </Drawer>
  )
}

export default SettlementOrchestrationDrawer
