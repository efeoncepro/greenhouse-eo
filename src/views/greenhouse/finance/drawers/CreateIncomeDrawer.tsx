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

const CURRENCIES = ['CLP', 'USD']

const SERVICE_LINE_LABELS: Record<string, string> = {
  globe: 'Globe',
  efeonce_digital: 'Efeonce Digital',
  reach: 'Reach',
  wave: 'Wave',
  crm_solutions: 'CRM Solutions'
}

const SERVICE_LINES = Object.keys(SERVICE_LINE_LABELS)

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const CreateIncomeDrawer = ({ open, onClose, onSuccess }: Props) => {
  const [description, setDescription] = useState('')
  const [clientName, setClientName] = useState('')
  const [currency, setCurrency] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [serviceLine, setServiceLine] = useState('')
  const [hubspotCompanyId, setHubspotCompanyId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setDescription('')
    setClientName('')
    setCurrency('')
    setTotalAmount('')
    setInvoiceDate('')
    setDueDate('')
    setInvoiceNumber('')
    setServiceLine('')
    setHubspotCompanyId('')
    setNotes('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    if (!description.trim() || !clientName.trim() || !currency || !totalAmount.trim() || !invoiceDate || !dueDate) {
      setError('Todos los campos obligatorios deben completarse.')

      return
    }

    if (isNaN(Number(totalAmount)) || Number(totalAmount) <= 0) {
      setError('El monto total debe ser un número mayor a 0.')

      return
    }

    setSaving(true)
    setError(null)

    const amount = Number(totalAmount)

    const body = {
      description: description.trim(),
      clientName: clientName.trim(),
      currency,
      subtotal: amount,
      totalAmount: amount,
      invoiceDate,
      dueDate,
      ...(invoiceNumber.trim() && { invoiceNumber: invoiceNumber.trim() }),
      ...(serviceLine && { serviceLine }),
      ...(hubspotCompanyId.trim() && { hubspotCompanyId: hubspotCompanyId.trim() }),
      ...(notes.trim() && { notes: notes.trim() })
    }

    try {
      const res = await fetch('/api/finance/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al registrar ingreso')
        setSaving(false)

        return
      }

      toast.success('Ingreso registrado exitosamente')
      resetForm()
      onClose()
      onSuccess()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={handleClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 400 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Typography variant='h6'>Registrar ingreso</Typography>
        <IconButton onClick={handleClose} size='small' aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

        <CustomTextField
          fullWidth
          size='small'
          label='Descripción del servicio'
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
        />
        <CustomTextField
          fullWidth
          size='small'
          label='Nombre del cliente'
          value={clientName}
          onChange={e => setClientName(e.target.value)}
          required
        />

        <Grid container spacing={2}>
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
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Fecha factura'
              type='date'
              value={invoiceDate}
              onChange={e => setInvoiceDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Fecha vencimiento'
              type='date'
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
        </Grid>

        <Divider />
        <Typography variant='subtitle2' color='text.secondary'>Campos opcionales</Typography>

        <CustomTextField
          fullWidth
          size='small'
          label='N° Factura'
          value={invoiceNumber}
          onChange={e => setInvoiceNumber(e.target.value)}
        />
        <CustomTextField
          select
          fullWidth
          size='small'
          label='Línea de servicio'
          value={serviceLine}
          onChange={e => setServiceLine(e.target.value)}
        >
          <MenuItem value=''>—</MenuItem>
          {SERVICE_LINES.map(sl => (
            <MenuItem key={sl} value={sl}>{SERVICE_LINE_LABELS[sl]}</MenuItem>
          ))}
        </CustomTextField>
        <CustomTextField
          fullWidth
          size='small'
          label='HubSpot Company ID'
          value={hubspotCompanyId}
          onChange={e => setHubspotCompanyId(e.target.value)}
        />
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
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default CreateIncomeDrawer
