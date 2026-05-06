'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'
import CustomChip from '@core/components/mui/Chip'

const GREENHOUSE_COPY = getMicrocopy()

interface EmailDelivery {
  effectiveStatus: string
  deliveryId: string
  batchId: string
  emailType: string
  domain: string
  recipientEmail: string
  recipientName: string | null
  subject: string
  resendId: string | null
  status: string
  hasAttachments: boolean
  sourceEventId: string | null
  sourceEntity: string | null
  actorEmail: string | null
  errorMessage: string | null
  attemptNumber: number
  deliveredAt: string | null
  bouncedAt: string | null
  complainedAt: string | null
  createdAt: string
  updatedAt: string
}

const EMAIL_STATUS_MAP: Record<string, { label: string; color: 'success' | 'error' | 'warning' | 'secondary' }> = {
  sent: { label: 'Enviado', color: 'success' },
  delivered: { label: 'Entregado', color: 'success' },
  bounced: { label: 'Rebotado', color: 'error' },
  complained: { label: 'Spam', color: 'warning' },
  failed: { label: 'Fallido', color: 'error' },
  pending: { label: GREENHOUSE_COPY.states.pending, color: 'warning' },
  skipped: { label: 'Omitido', color: 'secondary' }
}

const EMAIL_TYPE_MAP: Record<string, string> = {
  password_reset: 'Contraseña',
  invitation: 'Invitación',
  verify_email: 'Verificación',
  payroll_export: 'Cierre nómina',
  payroll_receipt: 'Recibo nómina',
  notification: 'Notificación'
}

const EMAIL_DOMAIN_MAP: Record<string, string> = {
  identity: 'Identidad',
  payroll: 'Nómina',
  finance: 'Finanzas',
  hr: 'Personas',
  delivery: 'Delivery',
  system: 'Sistema'
}

const formatAbsoluteTime = (dateString: string) =>
  new Date(dateString).toLocaleString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

const DetailRow = ({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', py: 1.5 }}>
    <Typography variant='body2' color='text.secondary' sx={{ minWidth: 120, flexShrink: 0 }}>
      {label}
    </Typography>
    <Typography
      variant='body2'
      sx={{
        textAlign: 'right',
        wordBreak: 'break-all',
        ...(mono ? { fontSize: '0.8rem' } : {})
      }}
    >
      {value || '—'}
    </Typography>
  </Box>
)

interface Props {
  open: boolean
  delivery: EmailDelivery | null
  onClose: () => void
  onRetry: (delivery: EmailDelivery) => void
}

const EmailDeliveryDetailDrawer = ({ open, delivery, onClose, onRetry }: Props) => {
  if (!delivery) return null

  const statusInfo = EMAIL_STATUS_MAP[delivery.effectiveStatus] ?? { label: delivery.effectiveStatus, color: 'secondary' as const }
  const canRetry = delivery.status === 'failed' && delivery.attemptNumber < 3

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 420 } } }}
    >
      <Box sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant='h6'>Detalle del envío</Typography>
          <IconButton onClick={onClose} size='small'>
            <i className='tabler-x' />
          </IconButton>
        </Box>

        <Box sx={{ mb: 4 }}>
          <CustomChip round='true' variant='tonal' label={statusInfo.label} color={statusInfo.color} />
        </Box>

        <DetailRow label='Tipo' value={EMAIL_TYPE_MAP[delivery.emailType] ?? delivery.emailType} />
        <DetailRow label='Dominio' value={EMAIL_DOMAIN_MAP[delivery.domain] ?? delivery.domain} />
        <DetailRow label='Destinatario' value={delivery.recipientEmail} />
        <DetailRow label='Asunto' value={delivery.subject} />
        <DetailRow label='Adjuntos' value={delivery.hasAttachments ? 'Sí' : 'No'} />

        <Divider sx={{ my: 2 }} />

        <DetailRow label='ID de entrega' value={delivery.resendId} mono />
        <DetailRow label='Intentos' value={String(delivery.attemptNumber)} />
        <DetailRow label='Evento origen' value={delivery.sourceEventId} mono />
        <DetailRow label='Entidad origen' value={delivery.sourceEntity} mono />
        <DetailRow label='Enviado por' value={delivery.actorEmail} />
        <DetailRow label='Creado' value={formatAbsoluteTime(delivery.createdAt)} />
        <DetailRow label='Último cambio' value={formatAbsoluteTime(delivery.updatedAt)} />
        <DetailRow label='Entregado' value={delivery.deliveredAt ? formatAbsoluteTime(delivery.deliveredAt) : null} />
        <DetailRow label='Rebote' value={delivery.bouncedAt ? formatAbsoluteTime(delivery.bouncedAt) : null} />
        <DetailRow label='Spam' value={delivery.complainedAt ? formatAbsoluteTime(delivery.complainedAt) : null} />

        {delivery.errorMessage && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>Error</Typography>
            <Card
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: theme => theme.palette.error.lighterOpacity,
                borderLeft: theme => `4px solid ${theme.palette.error.main}`
              }}
            >
              <Typography variant='body2' sx={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
                {delivery.errorMessage}
              </Typography>
            </Card>
          </>
        )}

        {canRetry && (
          <Box sx={{ mt: 4 }}>
            <Button variant='contained' fullWidth onClick={() => onRetry(delivery)}>
              Reintentar envío
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  )
}

export default EmailDeliveryDetailDrawer
