'use client'

import { useEffect, useMemo, useState } from 'react'

import { toast } from 'react-toastify'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import type { ShareholderAccountSummary } from './types'
import { formatMoney, getBalanceMeta } from './utils'

type Props = {
  open: boolean
  accounts: ShareholderAccountSummary[]
  account: ShareholderAccountSummary | null
  onClose: () => void
  onSuccess: () => void
}

const DIRECTION_OPTIONS = [
  { value: 'credit', label: 'Crédito', helper: 'La empresa le debe al accionista' },
  { value: 'debit', label: 'Débito', helper: 'El accionista le debe a la empresa' }
]

const MOVEMENT_TYPE_OPTIONS = [
  { value: 'expense_paid_by_shareholder', label: 'Gasto pagado por el accionista' },
  { value: 'personal_withdrawal', label: 'Retiro personal' },
  { value: 'reimbursement', label: 'Reembolso de la empresa' },
  { value: 'return_to_company', label: 'Devolución a la empresa' },
  { value: 'salary_advance', label: 'Adelanto de sueldo' },
  { value: 'capital_contribution', label: 'Aporte de capital' },
  { value: 'other', label: 'Otro' }
]

const CURRENCY_OPTIONS = ['CLP', 'USD']

const getToday = () => {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const RegisterShareholderMovementDrawer = ({ open, accounts, account, onClose, onSuccess }: Props) => {
  const [selectedAccountId, setSelectedAccountId] = useState(account?.accountId ?? '')
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit')
  const [movementType, setMovementType] = useState('expense_paid_by_shareholder')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('CLP')
  const [movementDate, setMovementDate] = useState(getToday())
  const [description, setDescription] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [linkedExpenseId, setLinkedExpenseId] = useState('')
  const [linkedIncomeId, setLinkedIncomeId] = useState('')
  const [linkedPaymentId, setLinkedPaymentId] = useState('')
  const [settlementGroupId, setSettlementGroupId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedAccount = useMemo(
    () => account || accounts.find(item => item.accountId === selectedAccountId) || null,
    [account, accounts, selectedAccountId]
  )

  useEffect(() => {
    if (open) {
      setSelectedAccountId(account?.accountId ?? '')
      setDirection('credit')
      setMovementType('expense_paid_by_shareholder')
      setAmount('')
      setCurrency(account?.currency ?? 'CLP')
      setMovementDate(getToday())
      setDescription('')
      setEvidenceUrl('')
      setLinkedExpenseId('')
      setLinkedIncomeId('')
      setLinkedPaymentId('')
      setSettlementGroupId('')
      setError(null)
      setSaving(false)

      return
    }

    setSelectedAccountId('')
    setDirection('credit')
    setMovementType('expense_paid_by_shareholder')
    setAmount('')
    setCurrency('CLP')
    setMovementDate(getToday())
    setDescription('')
    setEvidenceUrl('')
    setLinkedExpenseId('')
    setLinkedIncomeId('')
    setLinkedPaymentId('')
    setSettlementGroupId('')
    setError(null)
    setSaving(false)
  }, [account?.accountId, account?.currency, open])

  const handleSubmit = async () => {
    if (!selectedAccountId) {
      setError('Selecciona una cuenta corriente.')

      return
    }

    if (!amount.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setError('Ingresa un monto mayor a cero.')

      return
    }

    if (!movementDate) {
      setError('Selecciona una fecha para el movimiento.')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/finance/shareholder-account/${selectedAccountId}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction,
          movementType,
          amount: Number(amount),
          currency,
          movementDate,
          description: description.trim() || null,
          evidenceUrl: evidenceUrl.trim() || null,
          linkedExpenseId: linkedExpenseId.trim() || null,
          linkedIncomeId: linkedIncomeId.trim() || null,
          linkedPaymentId: linkedPaymentId.trim() || null,
          settlementGroupId: settlementGroupId.trim() || null
        })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        setError(body.error || 'No pudimos registrar el movimiento.')

        return
      }

      toast.success('Movimiento registrado.')
      onSuccess()
      onClose()
    } catch {
      setError('No pudimos conectar con Finance. Intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  const balanceMeta = selectedAccount ? getBalanceMeta(selectedAccount.balanceClp) : null

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 520 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Box>
          <Typography variant='h6'>Registrar movimiento manual</Typography>
          <Typography variant='body2' color='text.secondary'>
            Carga un cargo o abono bilateral sobre la cuenta corriente accionista.
          </Typography>
        </Box>
        <IconButton size='small' onClick={onClose} aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}

        {selectedAccount ? (
          <Alert severity='info'>
            <strong>{selectedAccount.accountName}</strong> · {selectedAccount.shareholderName} · {balanceMeta?.label.toLowerCase()}{' '}
            {formatMoney(selectedAccount.balanceClp, selectedAccount.currency)}
          </Alert>
        ) : (
          <Alert severity='warning'>
            Selecciona una cuenta para registrar el movimiento.
          </Alert>
        )}

        {!account ? (
          <CustomTextField
            select
            fullWidth
            label='Cuenta corriente'
            value={selectedAccountId}
            onChange={event => setSelectedAccountId(event.target.value)}
          >
            {accounts.map(option => (
              <MenuItem key={option.accountId} value={option.accountId}>
                {option.accountName} · {option.shareholderName}
              </MenuItem>
            ))}
          </CustomTextField>
        ) : null}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              label='Dirección'
              value={direction}
              onChange={event => setDirection(event.target.value as 'credit' | 'debit')}
            >
              {DIRECTION_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              label='Tipo de movimiento'
              value={movementType}
              onChange={event => setMovementType(event.target.value)}
            >
              {MOVEMENT_TYPE_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              label='Monto'
              value={amount}
              onChange={event => setAmount(event.target.value)}
              placeholder='0'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              label='Moneda'
              value={currency}
              onChange={event => setCurrency(event.target.value)}
            >
              {CURRENCY_OPTIONS.map(option => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
        </Grid>

        <CustomTextField
          fullWidth
          type='date'
          label='Fecha del movimiento'
          value={movementDate}
          onChange={event => setMovementDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <CustomTextField
          fullWidth
          multiline
          minRows={3}
          label='Descripción'
          value={description}
          onChange={event => setDescription(event.target.value)}
          placeholder='Explica el origen o la razón del movimiento'
        />

        <Divider />

        <Box>
          <Typography variant='subtitle2' sx={{ mb: 2 }}>
            Trazabilidad opcional
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                label='expense_id'
                value={linkedExpenseId}
                onChange={event => setLinkedExpenseId(event.target.value)}
                placeholder='EXP-...'
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                label='income_id'
                value={linkedIncomeId}
                onChange={event => setLinkedIncomeId(event.target.value)}
                placeholder='INC-...'
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                label='payment_id'
                value={linkedPaymentId}
                onChange={event => setLinkedPaymentId(event.target.value)}
                placeholder='pay-... / exp-pay-...'
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                label='settlement_group_id'
                value={settlementGroupId}
                onChange={event => setSettlementGroupId(event.target.value)}
                placeholder='stlgrp-...'
              />
            </Grid>
          </Grid>
        </Box>

        <CustomTextField
          fullWidth
          label='Evidence URL'
          value={evidenceUrl}
          onChange={event => setEvidenceUrl(event.target.value)}
          placeholder='https://...'
        />

        <Stack direction='row' spacing={3} justifyContent='flex-end'>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant='contained' onClick={handleSubmit} disabled={saving || !accounts.length}>
            {saving ? 'Guardando...' : 'Registrar movimiento'}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}

export default RegisterShareholderMovementDrawer
