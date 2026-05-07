'use client'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { formatDateTime as formatGreenhouseDateTime } from '@/lib/format'

export interface AuditEntry {
  logId: string
  quotationId: string
  versionNumber: number | null
  action: string
  actorUserId: string
  actorName: string
  details: Record<string, unknown>
  createdAt: string
}

interface Props {
  loading: boolean
  error: string | null
  entries: AuditEntry[]
}

const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  created: { label: 'Cotización creada', icon: 'tabler-plus', color: 'primary.main' },
  updated: { label: 'Actualización', icon: 'tabler-edit', color: 'text.secondary' },
  status_changed: { label: 'Cambio de estado', icon: 'tabler-flag', color: 'info.main' },
  line_item_added: { label: 'Línea agregada', icon: 'tabler-row-insert-bottom', color: 'success.main' },
  line_item_updated: { label: 'Línea editada', icon: 'tabler-pencil', color: 'warning.main' },
  line_item_removed: { label: 'Línea eliminada', icon: 'tabler-trash', color: 'error.main' },
  discount_changed: { label: 'Descuento cambiado', icon: 'tabler-discount-2', color: 'warning.main' },
  terms_changed: { label: 'Términos actualizados', icon: 'tabler-file-text', color: 'info.main' },
  version_created: { label: 'Nueva versión', icon: 'tabler-git-branch', color: 'primary.main' },
  pdf_generated: { label: 'PDF generado', icon: 'tabler-file-download', color: 'info.main' },
  issue_requested: { label: 'Emisión solicitada', icon: 'tabler-file-check', color: 'warning.main' },
  issued: { label: 'Cotización emitida', icon: 'tabler-rosette-discount-check', color: 'info.main' },
  sent: { label: 'Enviada', icon: 'tabler-send', color: 'info.main' },
  approval_requested: { label: 'Aprobación solicitada', icon: 'tabler-shield-check', color: 'warning.main' },
  approval_decided: { label: 'Aprobación resuelta', icon: 'tabler-shield', color: 'success.main' },
  approval_rejected: { label: 'Aprobación rechazada', icon: 'tabler-shield-x', color: 'error.main' },
  po_received: { label: 'OC recibida', icon: 'tabler-receipt', color: 'success.main' },
  hes_received: { label: 'HES recibida', icon: 'tabler-clipboard-check', color: 'success.main' },
  invoice_triggered: { label: 'Facturación', icon: 'tabler-cash', color: 'success.main' },
  renewal_generated: { label: 'Renovación generada', icon: 'tabler-refresh', color: 'info.main' },
  expired: { label: 'Vencida', icon: 'tabler-clock-off', color: 'error.main' },
  template_used: { label: 'Template aplicado', icon: 'tabler-template', color: 'primary.main' },
  template_saved: { label: 'Template guardado', icon: 'tabler-device-floppy', color: 'primary.main' }
}

const formatDate = (iso: string) => {
  const d = new Date(iso)

  if (Number.isNaN(d.getTime())) return iso

  return formatGreenhouseDateTime(d, {
  dateStyle: 'medium',
  timeStyle: 'short'
}, 'es-CL')
}

const summarizeDetails = (action: string, details: Record<string, unknown>): string | null => {
  if (!details || Object.keys(details).length === 0) return null

  switch (action) {
    case 'version_created': {
      const from = details.fromVersion
      const to = details.toVersion

      return typeof from === 'number' && typeof to === 'number' ? `v${from} → v${to}` : null
    }

    case 'approval_requested': {
      const steps = Array.isArray(details.steps) ? details.steps : []

      return `${steps.length} paso(s) pendientes`
    }

    case 'issue_requested': {
      const approvalRequired = details.approvalRequired === true

      return approvalRequired ? 'La emisión activó aprobación por excepción' : 'Solicitud de emisión registrada'
    }

    case 'issued': {
      const postApproval = details.postApproval === true

      return postApproval ? 'Emitida después de aprobar la excepción' : 'Emitida sin aprobación previa'
    }

    case 'approval_decided': {
      const decision = typeof details.decision === 'string' ? details.decision : null
      const label = typeof details.conditionLabel === 'string' ? details.conditionLabel : null

      if (!decision) return label

      return `${decision === 'approved' ? 'Aprobado' : 'Rechazado'}${label ? ` — ${label}` : ''}`
    }

    case 'terms_changed': {
      const termCount = typeof details.termCount === 'number' ? details.termCount : null

      return termCount !== null ? `${termCount} término(s) aplicados` : null
    }

    case 'template_used': {
      const code = typeof details.templateCode === 'string' ? details.templateCode : null

      return code ? `Template ${code}` : null
    }

    case 'approval_rejected': {
      const reason = typeof details.notes === 'string' ? details.notes : null

      return reason ? `Se requiere nueva revisión — ${reason}` : 'Se requiere una nueva revisión antes de emitir'
    }

    default:
      return null
  }
}

const QuoteAuditTrail = ({ loading, error, entries }: Props) => {
  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant='rounded' height={60} />
        <Skeleton variant='rounded' height={300} />
      </Stack>
    )
  }

  if (error) return <Alert severity='error'>{error}</Alert>

  if (entries.length === 0) {
    return (
      <Card variant='outlined'>
        <CardContent>
          <Typography variant='body2' color='text.secondary' align='center'>
            Aún no hay eventos registrados en la auditoría.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant='outlined'>
      <CardHeader
        title='Auditoría'
        subheader={`${entries.length} evento${entries.length === 1 ? '' : 's'} — orden cronológico inverso`}
      />
      <Divider />
      <CardContent>
        <Stack spacing={2}>
          {entries.map(entry => {
            const meta = ACTION_LABELS[entry.action] || {
              label: entry.action,
              icon: 'tabler-circle',
              color: 'text.secondary'
            }

            const summary = summarizeDetails(entry.action, entry.details)

            return (
              <Box key={entry.logId} sx={{ display: 'flex', gap: 2 }}>
                <Avatar
                  variant='rounded'
                  sx={{
                    bgcolor: 'background.default',
                    width: 32,
                    height: 32,
                    flexShrink: 0
                  }}
                >
                  <i className={meta.icon} style={{ fontSize: 18, color: `var(--mui-palette-${meta.color.includes('.') ? meta.color.replace('.', '-') : meta.color})` }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                      {meta.label}
                    </Typography>
                    {entry.versionNumber !== null && (
                      <Chip size='small' label={`v${entry.versionNumber}`} variant='outlined' />
                    )}
                  </Stack>
                  {summary && (
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                      {summary}
                    </Typography>
                  )}
                  <Typography variant='caption' color='text.secondary'>
                    {entry.actorName} · {formatDate(entry.createdAt)}
                  </Typography>
                </Box>
              </Box>
            )
          })}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default QuoteAuditTrail
