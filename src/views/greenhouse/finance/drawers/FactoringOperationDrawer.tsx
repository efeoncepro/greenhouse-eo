'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import PaymentInstrumentChip from '@/components/greenhouse/PaymentInstrumentChip'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FactoringProvider {
  providerId: string
  providerName: string
  legalName: string | null
}

interface AccountOption {
  accountId: string
  accountName: string
  providerSlug: string | null
  instrumentCategory: string
  currency: string
  isActive: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  incomeId: string
  nominalAmount: number
  currency: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getTodayInSantiago = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())

const formatCLP = (amount: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const parseSafeNumber = (v: string): number => {
  const n = Number(v.replace(/\./g, '').replace(',', '.'))

  return Number.isFinite(n) ? n : 0
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FactoringOperationDrawer = ({ open, onClose, onSuccess, incomeId, nominalAmount, currency }: Props) => {
  // Provider + account catalog
  const [providers, setProviders] = useState<FactoringProvider[]>([])
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(false)

  // Form fields
  const [factoringProviderId, setFactoringProviderId] = useState('')
  const [advanceAmount, setAdvanceAmount] = useState('')
  const [interestAmount, setInterestAmount] = useState('')
  const [advisoryFeeAmount, setAdvisoryFeeAmount] = useState('')
  const [feeRate, setFeeRate] = useState('')
  const [operationDate, setOperationDate] = useState(getTodayInSantiago)
  const [settlementDate, setSettlementDate] = useState('')
  const [externalReference, setExternalReference] = useState('')
  const [externalFolio, setExternalFolio] = useState('')
  const [paymentAccountId, setPaymentAccountId] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Derived: fee total for live display
  const feeTotal = useMemo(() => {
    const interest = parseSafeNumber(interestAmount)
    const advisory = parseSafeNumber(advisoryFeeAmount)

    return interest + advisory
  }, [interestAmount, advisoryFeeAmount])

  const expectedFee = nominalAmount - parseSafeNumber(advanceAmount)
  const feeGap = Math.abs(feeTotal - expectedFee)
  const feeBalances = parseSafeNumber(advanceAmount) > 0 && feeGap <= 1

  // Load catalogs when drawer opens
  const fetchCatalogs = useCallback(async () => {
    setLoadingCatalogs(true)

    try {
      const [provRes, accRes] = await Promise.all([
        fetch('/api/finance/factoring/providers', { cache: 'no-store' }),
        fetch('/api/finance/accounts', { cache: 'no-store' })
      ])

      if (provRes.ok) {
        const data = await provRes.json()

        setProviders(data.providers ?? [])
      }

      if (accRes.ok) {
        const data = await accRes.json()

        setAccounts((data.items ?? []).filter((i: AccountOption) => i.isActive))
      }
    } catch {
      // silently ignore — errors shown at submit
    } finally {
      setLoadingCatalogs(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchCatalogs()
    }
  }, [open, fetchCatalogs])

  const resetForm = () => {
    setFactoringProviderId('')
    setAdvanceAmount('')
    setInterestAmount('')
    setAdvisoryFeeAmount('')
    setFeeRate('')
    setOperationDate(getTodayInSantiago())
    setSettlementDate('')
    setExternalReference('')
    setExternalFolio('')
    setPaymentAccountId('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    setError(null)

    const advance = parseSafeNumber(advanceAmount)
    const interest = parseSafeNumber(interestAmount)
    const advisory = parseSafeNumber(advisoryFeeAmount)

    if (!factoringProviderId) {
      setError('Selecciona un proveedor de factoring.')

      return
    }

    if (advance <= 0) {
      setError('El monto de anticipo debe ser mayor a 0.')

      return
    }

    if (!operationDate) {
      setError('La fecha de operación es requerida.')

      return
    }

    if (!paymentAccountId) {
      setError('La cuenta de depósito del anticipo es requerida.')

      return
    }

    setSaving(true)

    const body: Record<string, unknown> = {
      factoringProviderId,
      nominalAmount,
      advanceAmount: advance,
      interestAmount: interest,
      advisoryFeeAmount: advisory,
      feeRate: parseSafeNumber(feeRate),
      operationDate,
      paymentAccountId
    }

    if (settlementDate) body.settlementDate = settlementDate
    if (externalReference.trim()) body.externalReference = externalReference.trim()
    if (externalFolio.trim()) body.externalFolio = externalFolio.trim()

    try {
      const res = await fetch(`/api/finance/income/${incomeId}/factor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al registrar la operación de factoring.')
        setSaving(false)

        return
      }

      toast.success('Operación de factoring registrada.')
      resetForm()
      onClose()
      onSuccess()
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={handleClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 520 } } }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Box>
          <Typography variant='h6'>Ceder a factoring</Typography>
          <Typography variant='caption' color='text.secondary'>Cesión de factura — registro atómico</Typography>
        </Box>
        <IconButton onClick={handleClose} size='small' aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

        {/* Nominal amount (read-only context) */}
        <Box sx={{ p: 2, bgcolor: 'primary.lightOpacity', borderRadius: 1 }}>
          <Typography variant='caption' color='primary.main' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Monto nominal de la factura
          </Typography>
          <Typography variant='h6' color='primary.main' fontWeight={700}>
            {currency === 'CLP' ? formatCLP(nominalAmount) : `${nominalAmount.toLocaleString('es-CL')} ${currency}`}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            La obligación del cliente quedará saldada en su totalidad
          </Typography>
        </Box>

        {/* Provider selector */}
        <CustomTextField
          select
          fullWidth
          size='small'
          label='Proveedor de factoring *'
          value={factoringProviderId}
          onChange={e => setFactoringProviderId(e.target.value)}
          disabled={loadingCatalogs}
        >
          <MenuItem value=''>
            {loadingCatalogs ? 'Cargando...' : providers.length === 0 ? 'Sin proveedores activos' : '— Seleccionar —'}
          </MenuItem>
          {providers.map(p => (
            <MenuItem key={p.providerId} value={p.providerId}>
              {p.providerName}{p.legalName && p.legalName !== p.providerName ? ` (${p.legalName})` : ''}
            </MenuItem>
          ))}
        </CustomTextField>

        <Divider />
        <Typography variant='subtitle2' color='text.secondary'>Montos de la operación</Typography>

        {/* Advance amount */}
        <CustomTextField
          fullWidth
          size='small'
          label='Anticipo recibido (advance) *'
          type='number'
          value={advanceAmount}
          onChange={e => setAdvanceAmount(e.target.value)}
          helperText='Efectivo real depositado por la empresa de factoring'
          inputProps={{ min: 0, step: 1 }}
        />

        {/* Interest and advisory fee side by side */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <CustomTextField
            fullWidth
            size='small'
            label='Interés de tasa'
            type='number'
            value={interestAmount}
            onChange={e => setInterestAmount(e.target.value)}
            helperText='Variable según plazo y monto'
            inputProps={{ min: 0, step: 1 }}
          />
          <CustomTextField
            fullWidth
            size='small'
            label='Asesoría fija'
            type='number'
            value={advisoryFeeAmount}
            onChange={e => setAdvisoryFeeAmount(e.target.value)}
            helperText='Cargo fijo por operación'
            inputProps={{ min: 0, step: 1 }}
          />
        </Box>

        {/* Live fee summary */}
        {parseSafeNumber(advanceAmount) > 0 && (
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: feeBalances ? 'success.lightOpacity' : 'warning.lightOpacity',
              border: t => `1px solid ${feeBalances ? t.palette.success.light : t.palette.warning.light}`
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant='caption' color='text.secondary'>Fee total (interés + asesoría)</Typography>
              <Typography variant='caption' fontWeight={700} color={feeBalances ? 'success.main' : 'warning.main'}>
                {formatCLP(feeTotal)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant='caption' color='text.secondary'>Fee esperado (nominal − anticipo)</Typography>
              <Typography variant='caption' fontWeight={700}>
                {formatCLP(expectedFee)}
              </Typography>
            </Box>
            {!feeBalances && parseSafeNumber(advanceAmount) > 0 && (
              <Typography variant='caption' color='warning.main' sx={{ mt: 0.5, display: 'block' }}>
                Diferencia: {formatCLP(feeGap)} — los montos deben cuadrar (tolerancia ±$1)
              </Typography>
            )}
          </Box>
        )}

        {/* Fee rate */}
        <CustomTextField
          fullWidth
          size='small'
          label='Tasa mensual (%)'
          type='number'
          value={feeRate}
          onChange={e => setFeeRate(e.target.value)}
          helperText='Opcional. Tasa mensual aplicada por el proveedor'
          inputProps={{ min: 0, step: 0.01 }}
        />

        <Divider />
        <Typography variant='subtitle2' color='text.secondary'>Fechas y referencias</Typography>

        {/* Dates */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <CustomTextField
            fullWidth
            size='small'
            label='Fecha de operación *'
            type='date'
            value={operationDate}
            onChange={e => setOperationDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: getTodayInSantiago() }}
          />
          <CustomTextField
            fullWidth
            size='small'
            label='Fecha de liquidación'
            type='date'
            value={settlementDate}
            onChange={e => setSettlementDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText='Opcional'
          />
        </Box>

        {/* External references */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <CustomTextField
            fullWidth
            size='small'
            label='Nº solicitud'
            value={externalReference}
            onChange={e => setExternalReference(e.target.value)}
            placeholder='Ej: 371497'
            helperText='Opcional'
          />
          <CustomTextField
            fullWidth
            size='small'
            label='Folio proveedor'
            value={externalFolio}
            onChange={e => setExternalFolio(e.target.value)}
            placeholder='Ej: 115'
            helperText='Opcional'
          />
        </Box>

        <Divider />
        <Typography variant='subtitle2' color='text.secondary'>Cuenta de depósito</Typography>

        {/* Payment account */}
        <CustomTextField
          select
          fullWidth
          size='small'
          label='Cuenta donde se deposita el anticipo *'
          value={paymentAccountId}
          onChange={e => setPaymentAccountId(e.target.value)}
          disabled={loadingCatalogs}
        >
          <MenuItem value=''>
            {loadingCatalogs ? 'Cargando...' : accounts.length === 0 ? 'Sin cuentas activas' : '— Seleccionar —'}
          </MenuItem>
          {accounts.map(acc => (
            <MenuItem key={acc.accountId} value={acc.accountId}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaymentInstrumentChip
                  providerSlug={acc.providerSlug}
                  instrumentName={acc.accountName}
                  size='sm'
                  showName={false}
                />
                {acc.accountName} ({acc.currency})
              </Box>
            </MenuItem>
          ))}
        </CustomTextField>
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={handleClose} fullWidth disabled={saving}>
          Cancelar
        </Button>
        <Button
          variant='contained'
          color='warning'
          onClick={handleSubmit}
          disabled={saving}
          fullWidth
          startIcon={<i className='tabler-building-bank' />}
        >
          {saving ? 'Registrando...' : 'Ceder factura'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default FactoringOperationDrawer
