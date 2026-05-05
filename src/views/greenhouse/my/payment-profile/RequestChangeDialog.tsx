'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

const PROVIDER_OPTIONS = [
  { value: '', label: '—' },
  { value: 'bank_internal', label: 'Banco interno (Chile)' },
  { value: 'santander_chile', label: 'Santander Chile' },
  { value: 'bci', label: 'BCI' },
  { value: 'banco_estado', label: 'BancoEstado' },
  { value: 'banco_chile', label: 'Banco de Chile' },
  { value: 'scotiabank', label: 'Scotiabank' },
  { value: 'itau', label: 'Itaú' },
  { value: 'global66', label: 'Global66' },
  { value: 'wise', label: 'Wise' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'deel', label: 'Deel' }
]

const PAYMENT_METHODS = [
  { value: '', label: '—' },
  { value: 'bank_transfer', label: 'Transferencia bancaria' },
  { value: 'wire', label: 'Wire (SWIFT)' },
  { value: 'wise', label: 'Wise' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'global66', label: 'Global66' },
  { value: 'deel', label: 'Deel' },
  { value: 'check', label: 'Cheque' },
  { value: 'manual_cash', label: 'Efectivo manual' },
  { value: 'other', label: 'Otro' }
]

interface FormState {
  currency: 'CLP' | 'USD'
  beneficiaryName: string
  countryCode: string
  providerSlug: string
  paymentMethod: string
  bankName: string
  accountHolderName: string
  accountNumberFull: string
  routingReference: string
  notes: string
}

const initialState: FormState = {
  currency: 'CLP',
  beneficiaryName: '',
  countryCode: 'CL',
  providerSlug: '',
  paymentMethod: 'bank_transfer',
  bankName: '',
  accountHolderName: '',
  accountNumberFull: '',
  routingReference: '',
  notes: ''
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}

const RequestChangeDialog = ({ open, onClose, onSubmit }: Props) => {
  const [form, setForm] = useState<FormState>(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setForm(initialState)
    setError(null)
  }

  const handleClose = () => {
    if (submitting) return
    reset()
    onClose()
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    if (!form.accountNumberFull.trim()) {
      setError('Ingresa el número de cuenta.')

      return
    }

    if (!form.accountHolderName.trim()) {
      setError('Ingresa el nombre del titular.')

      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await onSubmit({
        currency: form.currency,
        beneficiaryName: form.beneficiaryName.trim() || null,
        countryCode: form.countryCode.trim() || null,
        providerSlug: form.providerSlug || null,
        paymentMethod: form.paymentMethod || null,
        bankName: form.bankName.trim() || null,
        accountHolderName: form.accountHolderName.trim() || null,
        accountNumberFull: form.accountNumberFull.trim(),
        routingReference: form.routingReference.trim() || null,
        notes: form.notes.trim() || null
      })
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos registrar tu solicitud.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>Solicitar cambio de cuenta de pago</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Box>
            <Typography variant='body2' color='text.secondary'>
              Esta solicitud entra como <strong>pendiente de revisión</strong>.
              Finance la aprueba; nunca puedes auto-aprobar tu propio cambio. Te
              avisamos por email cuando quede activa.
            </Typography>
          </Box>

          <Stack direction='row' spacing={2}>
            <TextField
              select
              fullWidth
              size='small'
              label='Moneda'
              value={form.currency}
              onChange={e => set('currency', e.target.value as 'CLP' | 'USD')}
              disabled={submitting}
            >
              <MenuItem value='CLP'>CLP</MenuItem>
              <MenuItem value='USD'>USD</MenuItem>
            </TextField>
            <TextField
              fullWidth
              size='small'
              label='País (ISO 2)'
              value={form.countryCode}
              onChange={e => set('countryCode', e.target.value.toUpperCase().slice(0, 2))}
              disabled={submitting}
              placeholder='CL'
            />
          </Stack>

          <Stack direction='row' spacing={2}>
            <TextField
              select
              fullWidth
              size='small'
              label='Proveedor'
              value={form.providerSlug}
              onChange={e => set('providerSlug', e.target.value)}
              disabled={submitting}
            >
              {PROVIDER_OPTIONS.map(opt => (
                <MenuItem key={opt.value || 'none'} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              size='small'
              label='Método'
              value={form.paymentMethod}
              onChange={e => set('paymentMethod', e.target.value)}
              disabled={submitting}
            >
              {PAYMENT_METHODS.map(opt => (
                <MenuItem key={opt.value || 'none'} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            fullWidth
            size='small'
            label='Nombre del banco'
            value={form.bankName}
            onChange={e => set('bankName', e.target.value)}
            disabled={submitting}
            placeholder='Ej. Banco de Chile'
          />

          <TextField
            fullWidth
            size='small'
            label='Titular de la cuenta'
            value={form.accountHolderName}
            onChange={e => set('accountHolderName', e.target.value)}
            disabled={submitting}
            required
          />

          <TextField
            fullWidth
            size='small'
            label='Número de cuenta'
            value={form.accountNumberFull}
            onChange={e => set('accountNumberFull', e.target.value)}
            disabled={submitting}
            required
            helperText='Solo se mostrarán los últimos 4 dígitos en la UI.'
          />

          <TextField
            fullWidth
            size='small'
            label='Referencia / SWIFT (opcional)'
            value={form.routingReference}
            onChange={e => set('routingReference', e.target.value)}
            disabled={submitting}
            placeholder='ej. BCHICLRM'
          />

          <TextField
            fullWidth
            size='small'
            multiline
            rows={2}
            label='Comentario (opcional)'
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            disabled={submitting}
            placeholder='¿Algo que finance debería saber?'
          />

          {error && <Alert severity='error'>{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant='tonal' color='secondary' onClick={handleClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button variant='contained' onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Enviando…' : 'Enviar solicitud'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RequestChangeDialog
