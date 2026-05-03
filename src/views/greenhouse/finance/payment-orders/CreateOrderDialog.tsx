'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'

import type { PaymentObligation } from '@/types/payment-obligations'
import type {
  PaymentOrder,
  PaymentOrderBatchKind,
  PaymentOrderPaymentMethod
} from '@/types/payment-orders'

interface CreateOrderDialogProps {
  open: boolean
  onClose: () => void
  obligations: PaymentObligation[]
  onCreated: (order: PaymentOrder) => void
}

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0
  }).format(amount)

const PAYMENT_METHODS: Array<{ value: PaymentOrderPaymentMethod; label: string }> = [
  { value: 'bank_transfer', label: 'Transferencia bancaria' },
  { value: 'wire', label: 'Wire transfer' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'wise', label: 'Wise' },
  { value: 'deel', label: 'Deel' },
  { value: 'manual_cash', label: 'Efectivo manual' },
  { value: 'check', label: 'Cheque' },
  { value: 'sii_pec', label: 'SII / PEC' },
  { value: 'other', label: 'Otro' }
]

const inferBatchKind = (obligations: PaymentObligation[]): PaymentOrderBatchKind => {
  const sources = new Set(obligations.map(o => o.sourceKind))

  if (sources.size === 1) {
    const source = [...sources][0]

    if (source === 'payroll') return 'payroll'
    if (source === 'supplier_invoice') return 'supplier'
    if (source === 'tax_obligation') return 'tax'
    if (source === 'manual') return 'manual'
  }

  return 'mixed'
}

const inferTitle = (obligations: PaymentObligation[]): string => {
  const periods = new Set(obligations.map(o => o.periodId).filter(Boolean))
  const sources = new Set(obligations.map(o => o.sourceKind))

  if (sources.size === 1 && [...sources][0] === 'payroll' && periods.size === 1) {
    return `Nomina ${[...periods][0]} — ${obligations.length} obligaciones`
  }

  return `Orden de pago — ${obligations.length} obligaciones`
}

const CreateOrderDialog = ({ open, onClose, obligations, onCreated }: CreateOrderDialogProps) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentOrderPaymentMethod>('bank_transfer')
  const [scheduledFor, setScheduledFor] = useState('')
  const [requireApproval, setRequireApproval] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const batchKind = useMemo(() => inferBatchKind(obligations), [obligations])
  const inferredTitle = useMemo(() => inferTitle(obligations), [obligations])

  useEffect(() => {
    if (open) {
      setTitle(inferredTitle)
      setDescription('')
      setPaymentMethod('bank_transfer')
      setScheduledFor('')
      setRequireApproval(true)
    }
  }, [open, inferredTitle])

  const currencies = useMemo(() => [...new Set(obligations.map(o => o.currency))], [obligations])
  const isMixed = currencies.length > 1

  const totals = useMemo(() => {
    const map = new Map<string, number>()

    obligations.forEach(o => {
      map.set(o.currency, (map.get(o.currency) ?? 0) + o.amount)
    })

    return [...map.entries()]
  }, [obligations])

  const handleSubmit = async () => {
    if (isMixed) {
      toast.error('No se pueden mezclar monedas en una sola orden. Crea una orden por moneda.')

      return
    }

    if (!title.trim()) {
      toast.error('Indica un titulo')

      return
    }

    setSubmitting(true)

    try {
      const r = await fetch('/api/admin/finance/payment-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchKind,
          title: title.trim(),
          description: description.trim() || undefined,
          paymentMethod,
          scheduledFor: scheduledFor || undefined,
          obligationIds: obligations.map(o => o.obligationId),
          requireApproval
        })
      })

      const json = await r.json()

      if (!r.ok) {
        toast.error(json.error ?? 'No fue posible crear la orden')

        return
      }

      onCreated(json.order as PaymentOrder)
    } catch (e) {
      console.error(e)
      toast.error('Error de red al crear la orden')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Crear orden de pago</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={4}>
          <Stack spacing={2}>
            <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
              <Chip size='small' variant='tonal' color='primary' label={`${obligations.length} obligaciones`} />
              <Chip size='small' variant='outlined' label={`Batch: ${batchKind}`} />
              {totals.map(([currency, total]) => (
                <Chip
                  key={currency}
                  size='small'
                  variant='tonal'
                  color='info'
                  label={`Total ${currency}: ${formatAmount(total, currency)}`}
                />
              ))}
            </Stack>
            {isMixed ? (
              <Alert severity='error'>
                Las obligaciones tienen monedas mixtas ({currencies.join(', ')}). Crea una orden por
                cada moneda.
              </Alert>
            ) : null}
          </Stack>

          <CustomTextField
            label='Titulo'
            fullWidth
            value={title}
            onChange={e => setTitle(e.target.value)}
            helperText='Descriptivo para que un humano identifique la orden'
            required
          />

          <CustomTextField
            label='Descripcion (opcional)'
            fullWidth
            multiline
            minRows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            <CustomTextField
              select
              label='Metodo de pago'
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as PaymentOrderPaymentMethod)}
              fullWidth
            >
              {PAYMENT_METHODS.map(m => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </CustomTextField>

            <CustomTextField
              type='date'
              label='Fecha programada (opcional)'
              value={scheduledFor}
              onChange={e => setScheduledFor(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

          <FormControlLabel
            control={<Switch checked={requireApproval} onChange={e => setRequireApproval(e.target.checked)} />}
            label={
              <Stack spacing={0.25}>
                <Typography variant='body2'>Requiere aprobacion (maker-checker)</Typography>
                <Typography variant='caption' color='text.secondary'>
                  Quien crea la orden NO puede aprobarla. Dejalo activo salvo casos puntuales.
                </Typography>
              </Stack>
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={submitting || isMixed}>
          {submitting ? 'Creando…' : 'Crear orden'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CreateOrderDialog
