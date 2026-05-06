'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import { getMicrocopy } from '@/lib/copy'

const GREENHOUSE_COPY = getMicrocopy()
const MONTHS = ['', ...GREENHOUSE_COPY.months.short]

const PROCESSOR_LABELS: Record<string, string> = {
  deel: 'Deel',
  bank_internal: 'Banco',
  global66: 'Global66',
  wise: 'Wise',
  paypal: 'PayPal',
  manual_cash: 'Manual',
  sii_pec: 'SII PEC'
}

const DELIVERY_KIND_LABELS: Record<string, string> = {
  period_exported: 'Recibo enviado al cerrar el período',
  payment_committed: 'Aviso de pago programado',
  payment_paid: 'Aviso de pago ejecutado',
  payment_cancelled: 'Aviso de pago cancelado',
  payment_revised: 'Aviso de pago revisado',
  manual_resend: 'Reenvío del recibo'
}

const PAYMENT_STATUS_META: Record<string, { label: string; color: 'primary' | 'info' | 'warning' | 'success' | 'error' | 'secondary' }> = {
  awaiting_order: { label: 'Por programar', color: 'warning' },
  order_pending: { label: 'En aprobación', color: 'warning' },
  order_approved: { label: GREENHOUSE_COPY.states.scheduled, color: 'info' },
  order_paid: { label: GREENHOUSE_COPY.states.paid, color: 'success' },
  cancelled: { label: GREENHOUSE_COPY.states.cancelled, color: 'error' }
}

interface PayslipDeliveryEvent {
  deliveryKind: string
  status: string
  sentAt: string | null
  failedAt: string | null
  errorMessage: string | null
  emailProviderId: string | null
  superseded: boolean
  createdAt: string
}

interface PaymentOrderInfo {
  orderId: string
  title: string | null
  state: string | null
  processorSlug: string | null
  scheduledFor: string | null
  paidAt: string | null
  externalReference: string | null
}

export interface MyPayrollEntryDrawerInput {
  entryId: string
  periodId: string
  year: number
  month: number
  currency: string
  grossTotal: number
  netTotal: number
  paymentStatus?: string
  paymentOrder?: PaymentOrderInfo | null
  payslipDeliveryTimeline?: PayslipDeliveryEvent[]
}

interface Props {
  open: boolean
  onClose: () => void
  entry: MyPayrollEntryDrawerInput | null
  canResend: boolean
}

const fmt = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'CLP',
    maximumFractionDigits: 0
  }).format(amount)

const formatDateTime = (iso: string | null): string => {
  if (!iso) return '—'

  try {
    return new Date(iso).toLocaleString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

const formatDate = (iso: string | null): string => {
  if (!iso) return '—'

  try {
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

const cardSx = { border: (t: Theme) => `1px solid ${t.palette.divider}`, borderRadius: 2, p: 2.5 }

const MyPayrollEntryDrawer = ({ open, onClose, entry, canResend }: Props) => {
  const [resending, setResending] = useState(false)
  const [snack, setSnack] = useState<{ severity: 'success' | 'error' | 'info' | 'warning'; message: string } | null>(null)

  if (!entry) return null

  const paymentStatusKey = entry.paymentStatus ?? 'awaiting_order'
  const statusMeta = PAYMENT_STATUS_META[paymentStatusKey] ?? { label: 'Por programar', color: 'warning' as const }

  const processorLabel = entry.paymentOrder?.processorSlug
    ? (PROCESSOR_LABELS[entry.paymentOrder.processorSlug] ?? entry.paymentOrder.processorSlug)
    : null

  const timeline = (entry.payslipDeliveryTimeline ?? []).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const handleResend = async () => {
    setResending(true)
    setSnack(null)

    try {
      const res = await fetch(`/api/my/payroll/entries/${entry.entryId}/resend-receipt`, { method: 'POST' })

      const payload = await res.json().catch(() => null)

      if (res.status === 429) {
        const retry = payload?.retryAfterSeconds ? ` Intenta de nuevo en ~${Math.ceil(Number(payload.retryAfterSeconds) / 60)} min.` : ''

        setSnack({ severity: 'warning', message: `${payload?.error ?? 'Reenvío reciente.'}${retry}` })

        return
      }

      if (!res.ok) {
        setSnack({ severity: 'error', message: payload?.error ?? 'No pudimos reenviar tu recibo.' })

        return
      }

      setSnack({ severity: 'success', message: 'Recibo enviado a tu email. Revisa tu bandeja.' })
    } catch {
      setSnack({ severity: 'error', message: 'No pudimos reenviar tu recibo. Revisa tu conexión.' })
    } finally {
      setResending(false)
    }
  }

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setSnack({ severity: 'info', message: `${label} copiado al portapapeles.` })
    } catch {
      setSnack({ severity: 'error', message: 'No pudimos copiar al portapapeles.' })
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 0 } }}
    >
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant='caption' color='text.secondary'>Detalle de liquidación</Typography>
          <Typography variant='h6'>{MONTHS[entry.month]} {entry.year}</Typography>
        </Box>
        <CustomChip round='true' size='small' variant='tonal' color={statusMeta.color} label={statusMeta.label} />
        <IconButton onClick={onClose} aria-label='Cerrar detalle'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
        {/* Montos */}
        <Box sx={cardSx}>
          <Typography variant='overline' color='text.secondary'>Liquidación</Typography>
          <Stack direction='row' spacing={4} sx={{ mt: 1 }}>
            <Box>
              <Typography variant='caption' color='text.secondary'>Bruto</Typography>
              <Typography variant='h6'>{fmt(entry.grossTotal, entry.currency)}</Typography>
            </Box>
            <Box>
              <Typography variant='caption' color='text.secondary'>Neto</Typography>
              <Typography variant='h6' color='success.main'>{fmt(entry.netTotal, entry.currency)}</Typography>
            </Box>
            <Box>
              <Typography variant='caption' color='text.secondary'>Moneda</Typography>
              <Typography variant='h6'>{entry.currency}</Typography>
            </Box>
          </Stack>
        </Box>

        {/* Pago */}
        <Box sx={cardSx}>
          <Typography variant='overline' color='text.secondary'>Pago</Typography>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <DetailRow label='Procesador' value={processorLabel ?? '—'} />
            <DetailRow label='Fecha programada' value={formatDate(entry.paymentOrder?.scheduledFor ?? null)} />
            <DetailRow label='Fecha de pago' value={formatDateTime(entry.paymentOrder?.paidAt ?? null)} />
            {entry.paymentOrder?.externalReference ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant='body2' color='text.secondary'>Referencia externa</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant='monoId'>
                    {entry.paymentOrder.externalReference}
                  </Typography>
                  <Tooltip title='Copiar referencia'>
                    <IconButton
                      size='small'
                      onClick={() => void handleCopy('Referencia', entry.paymentOrder!.externalReference!)}
                      aria-label='Copiar referencia externa'
                    >
                      <i className='tabler-copy' style={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ) : (
              <DetailRow label='Referencia externa' value='—' />
            )}
          </Stack>
        </Box>

        {/* Comunicaciones */}
        <Box sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant='overline' color='text.secondary'>Comunicaciones</Typography>
            <Typography variant='caption' color='text.disabled'>{timeline.length} eventos</Typography>
          </Box>
          {timeline.length === 0 ? (
            <Typography variant='body2' color='text.disabled' sx={{ py: 1 }}>
              Sin comunicaciones registradas para este período.
            </Typography>
          ) : (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {timeline.map((event, idx) => (
                <TimelineRow key={`${event.createdAt}-${idx}`} event={event} />
              ))}
            </Stack>
          )}
        </Box>

        {/* Resend */}
        {canResend && (
          <Box sx={cardSx}>
            <Typography variant='overline' color='text.secondary'>¿No te llegó tu recibo?</Typography>
            <Typography variant='body2' sx={{ mt: 0.5, mb: 2 }}>
              Podemos reenviarte el recibo a tu email registrado. Está limitado a una vez por hora.
            </Typography>
            <Button
              variant='tonal'
              color='primary'
              startIcon={<i className='tabler-mail-forward' />}
              onClick={() => void handleResend()}
              disabled={resending}
              fullWidth
            >
              {resending ? 'Reenviando…' : 'Reenviar recibo a mi email'}
            </Button>
          </Box>
        )}
      </Box>

      <Snackbar
        open={snack !== null}
        autoHideDuration={5000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert> : <span />}
      </Snackbar>
    </Drawer>
  )
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
    <Typography variant='body2' color='text.secondary'>{label}</Typography>
    <Typography variant='body2' fontWeight={500} sx={{ textAlign: 'right' }}>{value}</Typography>
  </Box>
)

const TimelineRow = ({ event }: { event: PayslipDeliveryEvent }) => {
  const label = DELIVERY_KIND_LABELS[event.deliveryKind] ?? event.deliveryKind
  const sentLabel = event.sentAt ? formatDateTime(event.sentAt) : event.failedAt ? formatDateTime(event.failedAt) : formatDateTime(event.createdAt)

  const statusColor: 'success' | 'error' | 'warning' | 'secondary' =
    event.superseded ? 'secondary'
    : event.status === 'sent' ? 'success'
    : event.status === 'failed' ? 'error'
    : 'warning'

  const statusLabel: string =
    event.superseded ? 'Superseded'
    : event.status === 'sent' ? 'Enviado'
    : event.status === 'failed' ? 'Falló'
    : event.status === 'queued' ? 'En cola'
    : event.status === 'skipped' ? 'Omitido'
    : event.status

  const dotColorVar =
    statusColor === 'secondary'
      ? 'var(--mui-palette-text-disabled)'
      : statusColor === 'success'
        ? 'var(--mui-palette-success-main)'
        : statusColor === 'error'
          ? 'var(--mui-palette-error-main)'
          : 'var(--mui-palette-warning-main)'

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', mt: 1, bgcolor: dotColorVar }} />
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant='body2' fontWeight={500}>{label}</Typography>
        <Typography variant='caption' color='text.secondary'>{sentLabel}</Typography>
        {event.errorMessage && (
          <Typography variant='caption' color='error.main' sx={{ display: 'block', mt: 0.5 }}>
            {event.errorMessage}
          </Typography>
        )}
      </Box>
      <CustomChip round='true' size='small' variant='tonal' color={statusColor === 'secondary' ? 'secondary' : statusColor} label={statusLabel} />
    </Box>
  )
}

export default MyPayrollEntryDrawer
