'use client'

import { useEffect, useMemo, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
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

type AccountOption = {
  accountId: string
  accountName: string
  providerSlug: string | null
  instrumentCategory: string | null
  currency: string
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

type Props = {
  open: boolean
  accounts: AccountOption[]
  payments: UnassignedPayment[]
  onClose: () => void
  onSuccess: () => void
}

const formatAmount = (amount: number, currency: string = 'CLP') =>
  formatGreenhouseCurrency(amount, currency, {
  maximumFractionDigits: currency === 'CLP' ? 0 : 2
}, 'es-CL')

const formatDate = (date: string | null) => {
  if (!date) return '—'

  const [year, month, day] = date.split('-')

  return `${day}/${month}/${year}`
}

const AssignAccountDrawer = ({ open, accounts, payments, onClose, onSuccess }: Props) => {
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedPayments = useMemo(
    () => payments.filter(payment => selectedPaymentIds.includes(payment.paymentId)),
    [payments, selectedPaymentIds]
  )

  useEffect(() => {
    if (!open) {
      setSelectedAccountId('')
      setSelectedPaymentIds([])
      setSaving(false)
      setError(null)
    }
  }, [open])

  const togglePayment = (paymentId: string) => {
    setSelectedPaymentIds(current =>
      current.includes(paymentId)
        ? current.filter(item => item !== paymentId)
        : [...current, paymentId]
    )
  }

  const toggleAll = () => {
    setSelectedPaymentIds(current =>
      current.length === payments.length ? [] : payments.map(payment => payment.paymentId)
    )
  }

  const handleSubmit = async () => {
    if (!selectedAccountId) {
      setError('Selecciona la cuenta destino para la asignación retroactiva.')

      return
    }

    if (selectedPaymentIds.length === 0) {
      setError('Selecciona al menos un movimiento para asignar.')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/finance/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccountId,
          assignments: selectedPayments.map(payment => ({
            paymentType: payment.paymentType,
            paymentId: payment.paymentId
          }))
        })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        setError(body.error || 'No pudimos asignar los instrumentos seleccionados.')

        return
      }

      toast.success('Instrumentos asignados correctamente.')
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
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', md: 620 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Box>
          <Typography variant='h6'>Asignación retroactiva</Typography>
          <Typography variant='body2' color='text.secondary'>
            Completa la cobertura de instrumentos para que tesorería, conciliación y cash position lean el mismo ledger.
          </Typography>
        </Box>
        <IconButton size='small' onClick={onClose}>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={4} sx={{ p: 4 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}

        {!payments.length ? (
          <Alert severity='success'>
            No hay pagos o cobros sin instrumento en este período. La cobertura está completa.
          </Alert>
        ) : null}

        <CustomTextField
          select
          fullWidth
          label='Cuenta destino'
          value={selectedAccountId}
          onChange={event => setSelectedAccountId(event.target.value)}
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

        {payments.length ? (
          <>
            <Stack direction='row' alignItems='center' justifyContent='space-between'>
              <Typography variant='subtitle2'>
                Movimientos sin instrumento: {payments.length}
              </Typography>
              <Button size='small' variant='text' onClick={toggleAll}>
                {selectedPaymentIds.length === payments.length ? 'Quitar selección' : 'Seleccionar todo'}
              </Button>
            </Stack>

            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell padding='checkbox'>
                      <Checkbox
                        checked={payments.length > 0 && selectedPaymentIds.length === payments.length}
                        indeterminate={selectedPaymentIds.length > 0 && selectedPaymentIds.length < payments.length}
                        onChange={toggleAll}
                      />
                    </TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Contraparte</TableCell>
                    <TableCell>Documento</TableCell>
                    <TableCell>Monto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map(payment => (
                    <TableRow
                      key={payment.paymentId}
                      hover
                      onClick={() => togglePayment(payment.paymentId)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell padding='checkbox'>
                        <Checkbox checked={selectedPaymentIds.includes(payment.paymentId)} />
                      </TableCell>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell>{payment.paymentType === 'income' ? 'Cobro' : 'Pago'}</TableCell>
                      <TableCell>{payment.counterpartyName || '—'}</TableCell>
                      <TableCell>{payment.documentLabel || payment.documentId || '—'}</TableCell>
                      <TableCell>{formatAmount(payment.amount, payment.currency || 'CLP')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : null}

        <Stack direction='row' spacing={3} justifyContent='flex-end'>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={saving}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' onClick={handleSubmit} disabled={saving || !payments.length}>
            {saving ? 'Asignando...' : 'Asignar instrumento'}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}

export default AssignAccountDrawer
