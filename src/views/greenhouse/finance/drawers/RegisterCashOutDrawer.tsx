'use client'

import { useCallback, useEffect, useState } from 'react'

import { toast } from 'react-toastify'

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExpenseOption {
  expenseId: string
  description: string
  supplierName: string | null
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  currency: string
}

const PAYMENT_METHODS = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'credit_card', label: 'Tarjeta de credito' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'wise', label: 'Wise' },
  { value: 'check', label: 'Cheque' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'other', label: 'Otro' }
]

const formatAmount = (amount: number, currency = 'CLP'): string =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2
  }).format(amount)

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const RegisterCashOutDrawer = ({ open, onClose, onSuccess }: Props) => {
  const [selectedExpenseId, setSelectedExpenseId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [reference, setReference] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Expense dropdown data
  const [expenses, setExpenses] = useState<ExpenseOption[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(false)
  const [expensesError, setExpensesError] = useState<string | null>(null)

  // Selected expense for pending balance display
  const selectedExpense = expenses.find(e => e.expenseId === selectedExpenseId) ?? null

  const fetchExpenses = useCallback(async () => {
    setLoadingExpenses(true)
    setExpensesError(null)

    try {
      const res = await fetch('/api/finance/expenses?pageSize=200&status=pending,partial', { cache: 'no-store' })

      if (res.ok) {
        const data = await res.json()

        const items: ExpenseOption[] = (data.items ?? []).map((e: any) => ({
          expenseId: e.expenseId,
          description: e.description ?? '',
          supplierName: e.supplierName ?? null,
          totalAmount: Number(e.totalAmountClp ?? e.totalAmount ?? 0),
          paidAmount: Number(e.amountPaid ?? 0),
          pendingAmount: Math.max(0, Number(e.totalAmountClp ?? e.totalAmount ?? 0) - Number(e.amountPaid ?? 0)),
          currency: e.currency ?? 'CLP'
        }))

        setExpenses(items)

        return
      }

      const data = await res.json().catch(() => ({}))

      setExpenses([])
      setExpensesError(data.error || `No pudimos cargar los documentos de compra (${res.status}).`)
    } catch {
      setExpenses([])
      setExpensesError('No pudimos cargar los documentos de compra. Revisa la conexion o intenta nuevamente.')
    } finally {
      setLoadingExpenses(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchExpenses()
    }
  }, [open, fetchExpenses])

  const handleExpenseChange = (value: string) => {
    setSelectedExpenseId(value)

    const expense = expenses.find(e => e.expenseId === value)

    if (expense) {
      setAmount(String(expense.pendingAmount))
    } else {
      setAmount('')
    }
  }

  const resetForm = () => {
    setSelectedExpenseId('')
    setAmount('')
    setPaymentDate('')
    setReference('')
    setPaymentMethod('')
    setNotes('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    if (!selectedExpenseId || !amount.trim() || !paymentDate) {
      setError('Todos los campos obligatorios deben completarse.')

      return
    }

    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('El monto debe ser un numero mayor a 0.')

      return
    }

    if (selectedExpense && Number(amount) > selectedExpense.pendingAmount) {
      setError(`El monto no puede superar el saldo pendiente (${formatAmount(selectedExpense.pendingAmount, selectedExpense.currency)}).`)

      return
    }

    setSaving(true)
    setError(null)

    const body: Record<string, unknown> = {
      amount: Number(amount),
      paymentDate
    }

    if (reference.trim()) body.reference = reference.trim()
    if (paymentMethod) body.paymentMethod = paymentMethod
    if (notes.trim()) body.notes = notes.trim()

    try {
      const res = await fetch(`/api/finance/expenses/${selectedExpenseId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al registrar pago')
        setSaving(false)

        return
      }

      toast.success('Pago registrado')
      resetForm()
      onClose()
      onSuccess()
    } catch {
      setError('Error de conexion')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={handleClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 480 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Typography variant='h6'>Registrar pago</Typography>
        <IconButton onClick={handleClose} size='small' aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}
        {expensesError && <Alert severity='warning' onClose={() => setExpensesError(null)}>{expensesError}</Alert>}

        <CustomTextField
          select
          fullWidth
          size='small'
          label='Documento de compra'
          value={selectedExpenseId}
          onChange={e => handleExpenseChange(e.target.value)}
          required
          disabled={loadingExpenses}
        >
          <MenuItem value=''>
            {loadingExpenses
              ? 'Cargando...'
              : expenses.length === 0
                ? 'No hay documentos pendientes'
                : '— Seleccionar documento —'}
          </MenuItem>
          {expenses.map(e => (
            <MenuItem key={e.expenseId} value={e.expenseId}>
              {e.description}{e.supplierName ? ` (${e.supplierName})` : ''} — {formatAmount(e.pendingAmount, e.currency)}
            </MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          fullWidth
          size='small'
          label='Monto'
          type='number'
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
          helperText={
            selectedExpense
              ? `Saldo pendiente: ${formatAmount(selectedExpense.pendingAmount, selectedExpense.currency)}`
              : undefined
          }
        />

        <CustomTextField
          fullWidth
          size='small'
          label='Fecha de pago'
          type='date'
          value={paymentDate}
          onChange={e => setPaymentDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          required
        />

        <Divider />
        <Typography variant='subtitle2' color='text.secondary'>Campos opcionales</Typography>

        <CustomTextField
          fullWidth
          size='small'
          label='Referencia'
          value={reference}
          onChange={e => setReference(e.target.value)}
          placeholder='N de transferencia, comprobante, etc.'
        />

        <CustomTextField
          select
          fullWidth
          size='small'
          label='Metodo de pago'
          value={paymentMethod}
          onChange={e => setPaymentMethod(e.target.value)}
        >
          <MenuItem value=''>—</MenuItem>
          {PAYMENT_METHODS.map(pm => (
            <MenuItem key={pm.value} value={pm.value}>{pm.label}</MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          fullWidth
          size='small'
          label='Notas'
          multiline
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={handleClose} fullWidth>
          Cancelar
        </Button>
        <Button variant='contained' color='success' onClick={handleSubmit} disabled={saving} fullWidth>
          {saving ? 'Registrando...' : 'Registrar pago'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default RegisterCashOutDrawer
