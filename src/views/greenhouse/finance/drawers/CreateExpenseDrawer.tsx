'use client'

import { useState } from 'react'

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

const EXPENSE_TYPE_LABELS: Record<string, string> = {
  supplier: 'Proveedor',
  payroll: 'Nomina',
  social_security: 'Prevision',
  tax: 'Impuesto',
  other: 'Otro'
}

const EXPENSE_TYPES = Object.keys(EXPENSE_TYPE_LABELS)

const CURRENCIES = ['CLP', 'USD', 'EUR']

const SERVICE_LINE_LABELS: Record<string, string> = {
  performance: 'Performance',
  branding: 'Branding',
  development: 'Desarrollo',
  strategy: 'Estrategia',
  media: 'Medios',
  consulting: 'Consultoria'
}

const SERVICE_LINES = Object.keys(SERVICE_LINE_LABELS)

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transfer: 'Transferencia',
  check: 'Cheque',
  cash: 'Efectivo',
  credit_card: 'Tarjeta de credito',
  other: 'Otro'
}

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS)

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const CreateExpenseDrawer = ({ open, onClose, onSuccess }: Props) => {
  const [description, setDescription] = useState('')
  const [expenseType, setExpenseType] = useState('')
  const [currency, setCurrency] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [documentDate, setDocumentDate] = useState('')
  const [serviceLine, setServiceLine] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setDescription('')
    setExpenseType('')
    setCurrency('')
    setTotalAmount('')
    setPaymentDate('')
    setSupplierId('')
    setDocumentNumber('')
    setDocumentDate('')
    setServiceLine('')
    setPaymentMethod('')
    setNotes('')
    setError(null)
  }

  const handleSubmit = async () => {
    if (!description.trim() || !expenseType || !currency || !totalAmount || !paymentDate) {
      setError('Descripcion, tipo de egreso, moneda, monto total y fecha de pago son obligatorios.')

      return
    }

    const amount = Number(totalAmount)

    if (isNaN(amount) || amount <= 0) {
      setError('El monto total debe ser un numero mayor a 0.')

      return
    }

    setSaving(true)
    setError(null)

    const body: Record<string, unknown> = {
      description: description.trim(),
      expenseType,
      currency,
      totalAmount: amount,
      paymentDate,
      ...(supplierId.trim() && { supplierId: supplierId.trim() }),
      ...(documentNumber.trim() && { documentNumber: documentNumber.trim() }),
      ...(documentDate && { documentDate }),
      ...(serviceLine && { serviceLine }),
      ...(paymentMethod && { paymentMethod }),
      ...(notes.trim() && { notes: notes.trim() })
    }

    try {
      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al registrar egreso')
        setSaving(false)

        return
      }

      toast.success('Egreso registrado exitosamente')
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
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 400 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Typography variant='h6'>Registrar egreso</Typography>
        <IconButton onClick={onClose} size='small' aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Descripcion'
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Tipo de egreso'
              value={expenseType}
              onChange={e => setExpenseType(e.target.value)}
              required
            >
              <MenuItem value=''>—</MenuItem>
              {EXPENSE_TYPES.map(t => (
                <MenuItem key={t} value={t}>{EXPENSE_TYPE_LABELS[t]}</MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Moneda'
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              required
            >
              <MenuItem value=''>—</MenuItem>
              {CURRENCIES.map(c => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Monto total'
              type='number'
              value={totalAmount}
              onChange={e => setTotalAmount(e.target.value)}
              required
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
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
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Divider />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant='subtitle2' color='text.secondary'>Campos opcionales</Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='ID Proveedor'
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='N° Documento'
              value={documentNumber}
              onChange={e => setDocumentNumber(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Fecha documento'
              type='date'
              value={documentDate}
              onChange={e => setDocumentDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Linea de servicio'
              value={serviceLine}
              onChange={e => setServiceLine(e.target.value)}
            >
              <MenuItem value=''>—</MenuItem>
              {SERVICE_LINES.map(s => (
                <MenuItem key={s} value={s}>{SERVICE_LINE_LABELS[s]}</MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Metodo de pago'
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
            >
              <MenuItem value=''>—</MenuItem>
              {PAYMENT_METHODS.map(m => (
                <MenuItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</MenuItem>
              ))}
            </CustomTextField>
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
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={onClose} fullWidth>
          Cancelar
        </Button>
        <Button variant='contained' color='error' onClick={handleSubmit} disabled={saving} fullWidth>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default CreateExpenseDrawer
