'use client'

import { useEffect, useMemo, useState } from 'react'

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

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'
import PaymentInstrumentChip from '@/components/greenhouse/PaymentInstrumentChip'
import type { InstrumentCategory } from '@/config/payment-instruments'

const GREENHOUSE_COPY = getMicrocopy()

type AccountOption = {
  accountId: string
  accountName: string
  providerSlug: string | null
  instrumentCategory: string | null
  currency: string
}

type Props = {
  open: boolean
  accounts: AccountOption[]
  onClose: () => void
  onSuccess: () => void
}

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2
  }).format(amount)

const getToday = () => {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const InternalTransferDrawer = ({ open, accounts, onClose, onSuccess }: Props) => {
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [transferDate, setTransferDate] = useState(getToday())
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [exchangeRateOverride, setExchangeRateOverride] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fromAccount = accounts.find(account => account.accountId === fromAccountId) || null
  const toAccount = accounts.find(account => account.accountId === toAccountId) || null
  const usesFx = Boolean(fromAccount && toAccount && fromAccount.currency !== toAccount.currency)

  const estimatedConversion = useMemo(() => {
    const amountValue = Number(amount)
    const fxOverride = Number(exchangeRateOverride)

    if (!usesFx || !Number.isFinite(amountValue) || amountValue <= 0) {
      return null
    }

    if (Number.isFinite(fxOverride) && fxOverride > 0) {
      return {
        amount: amountValue * fxOverride,
        rate: fxOverride
      }
    }

    return null
  }, [amount, exchangeRateOverride, usesFx])

  useEffect(() => {
    if (!open) {
      setFromAccountId('')
      setToAccountId('')
      setAmount('')
      setTransferDate(getToday())
      setReference('')
      setNotes('')
      setExchangeRateOverride('')
      setSaving(false)
      setError(null)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!fromAccountId || !toAccountId || !amount.trim() || !transferDate) {
      setError('Completa cuenta origen, cuenta destino, monto y fecha.')

      return
    }

    if (fromAccountId === toAccountId) {
      setError('La cuenta origen y la cuenta destino deben ser distintas.')

      return
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setError('Ingresa un monto mayor a cero.')

      return
    }

    if (usesFx && exchangeRateOverride.trim() && (!Number.isFinite(Number(exchangeRateOverride)) || Number(exchangeRateOverride) <= 0)) {
      setError('El tipo de cambio manual debe ser un número mayor a cero.')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/finance/bank/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount: Number(amount),
          currency: fromAccount?.currency || 'CLP',
          transferDate,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
          exchangeRateOverride: exchangeRateOverride.trim() ? Number(exchangeRateOverride) : null
        })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        setError(body.error || 'No pudimos registrar la transferencia interna.')

        return
      }

      toast.success('Transferencia interna registrada.')
      onClose()
      onSuccess()
    } catch {
      setError('No pudimos conectar con Banco. Intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 440 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Box>
          <Typography variant='h6'>Transferencia interna</Typography>
          <Typography variant='body2' color='text.secondary'>
            Mueve fondos entre instrumentos propios sin registrar un gasto ni un cobro nuevo.
          </Typography>
        </Box>
        <IconButton size='small' onClick={onClose}>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={4} sx={{ p: 4 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}

        <CustomTextField
          select
          fullWidth
          label='Cuenta origen'
          value={fromAccountId}
          onChange={event => setFromAccountId(event.target.value)}
        >
          {accounts.map(account => (
            <MenuItem key={account.accountId} value={account.accountId}>
              <PaymentInstrumentChip
                providerSlug={account.providerSlug}
                instrumentName={`${account.accountName} · ${account.currency}`}
                instrumentCategory={(account.instrumentCategory || 'bank_account') as InstrumentCategory}
                size='sm'
              />
            </MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          select
          fullWidth
          label='Cuenta destino'
          value={toAccountId}
          onChange={event => setToAccountId(event.target.value)}
        >
          {accounts
            .filter(account => account.accountId !== fromAccountId)
            .map(account => (
              <MenuItem key={account.accountId} value={account.accountId}>
                <PaymentInstrumentChip
                  providerSlug={account.providerSlug}
                  instrumentName={`${account.accountName} · ${account.currency}`}
                  instrumentCategory={(account.instrumentCategory || 'bank_account') as InstrumentCategory}
                  size='sm'
                />
              </MenuItem>
            ))}
        </CustomTextField>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
          <CustomTextField
            fullWidth
            label={`Monto ${fromAccount ? `(${fromAccount.currency})` : ''}`}
            value={amount}
            onChange={event => setAmount(event.target.value)}
            placeholder='0'
          />
          <CustomTextField
            fullWidth
            type='date'
            label='Fecha'
            value={transferDate}
            onChange={event => setTransferDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>

        <CustomTextField
          fullWidth
          label='Referencia'
          value={reference}
          onChange={event => setReference(event.target.value)}
          placeholder='TRF-SANTANDER-G66-2026-04'
        />

        {usesFx ? (
          <>
            <Alert severity='info'>
              Esta transferencia cruza monedas. Greenhouse la registrará como cadena multi-leg con `internal_transfer`
              y `fx_conversion`.
            </Alert>

            <CustomTextField
              fullWidth
              label={`Tipo de cambio manual (${fromAccount?.currency} → ${toAccount?.currency})`}
              value={exchangeRateOverride}
              onChange={event => setExchangeRateOverride(event.target.value)}
              placeholder='Opcional'
              helperText='Si lo dejas vacío, Greenhouse intentará resolver la tasa vigente.'
            />

            {estimatedConversion ? (
              <Alert severity='success'>
                Estimado destino: {formatAmount(estimatedConversion.amount, toAccount?.currency || 'CLP')} con TC {estimatedConversion.rate}.
              </Alert>
            ) : null}
          </>
        ) : null}

        <CustomTextField
          fullWidth
          multiline
          minRows={3}
          label='Notas'
          value={notes}
          onChange={event => setNotes(event.target.value)}
          placeholder='Contexto operativo, rail usado o aclaraciones para conciliación.'
        />

        <Stack direction='row' spacing={3} justifyContent='flex-end'>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={saving}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' onClick={handleSubmit} disabled={saving}>
            {saving ? 'Registrando...' : 'Registrar transferencia'}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}

export default InternalTransferDrawer
