'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

interface QuoteSendHealthAlert {
  level: 'error' | 'warning' | 'info'
  message: string
}

export interface QuoteSendDialogProps {
  open: boolean
  quotationStatus: string
  healthSummary: {
    marginPct: number | null
    requiresApproval: boolean
    alerts: QuoteSendHealthAlert[]
  } | null
  pendingApprovalSteps: number
  submitting: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => Promise<void>
}

type DialogScenario =
  | { kind: 'needs_approval'; canConfirm: boolean }
  | { kind: 'approval_in_progress'; canConfirm: boolean }
  | { kind: 'ready'; canConfirm: boolean }
  | { kind: 'blocked'; canConfirm: boolean }

const resolveScenario = (
  quotationStatus: string,
  healthSummary: QuoteSendDialogProps['healthSummary'],
  pendingApprovalSteps: number
): DialogScenario => {
  if (quotationStatus === 'pending_approval' && pendingApprovalSteps > 0) {
    return { kind: 'approval_in_progress', canConfirm: false }
  }

  if ((quotationStatus === 'draft' || quotationStatus === 'approval_rejected') && healthSummary?.requiresApproval) {
    return { kind: 'needs_approval', canConfirm: true }
  }

  if (quotationStatus === 'draft' || quotationStatus === 'approval_rejected') {
    return { kind: 'ready', canConfirm: true }
  }

  return { kind: 'blocked', canConfirm: false }
}

const formatPercent = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) return '—'

  return `${value.toFixed(1)}%`
}

const QuoteSendDialog = ({
  open,
  quotationStatus,
  healthSummary,
  pendingApprovalSteps,
  submitting,
  error,
  onClose,
  onConfirm
}: QuoteSendDialogProps) => {
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const scenario = resolveScenario(quotationStatus, healthSummary, pendingApprovalSteps)

  const handleConfirm = async () => {
    setConfirmError(null)

    try {
      await onConfirm()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo emitir la cotización.'

      setConfirmError(message)
    }
  }

  const handleClose = () => {
    if (submitting) return
    setConfirmError(null)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth='sm'
        aria-labelledby='quote-send-dialog-title'
    >
      <DialogTitle id='quote-send-dialog-title'>Emitir cotización</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {scenario.kind === 'needs_approval' && (
            <>
              <Alert severity='warning' role='status'>
                Esta cotización requiere aprobación. Al solicitar la emisión se crearán los pasos necesarios y quedará en estado «En aprobación».
              </Alert>
              {healthSummary && (
                <Box>
                  <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Margen efectivo
                  </Typography>
                  <Typography variant='body1' sx={{ fontWeight: 500 }}>
                    {formatPercent(healthSummary.marginPct)}
                  </Typography>
                </Box>
              )}
              {healthSummary && healthSummary.alerts.length > 0 && (
                <Stack spacing={1.5}>
                  {healthSummary.alerts.map((alert, idx) => (
                    <Alert key={`${alert.level}-${idx}`} severity={alert.level}>
                      {alert.message}
                    </Alert>
                  ))}
                </Stack>
              )}
            </>
          )}

          {scenario.kind === 'approval_in_progress' && (
            <>
              <Alert severity='warning' role='alert'>
                {pendingApprovalSteps === 1
                  ? 'Hay 1 paso pendiente de aprobación. Resuélvelo antes de emitir.'
                  : `Hay ${pendingApprovalSteps} pasos pendientes de aprobación. Resuélvelos antes de emitir.`}
              </Alert>
              <Typography variant='body2' color='text.secondary'>
                Revisa la pestaña «Aprobaciones» para registrar las decisiones requeridas.
              </Typography>
            </>
          )}

          {scenario.kind === 'ready' && (
            <>
              <Alert severity='info' role='status'>
                La cotización pasará a estado «Emitida» y se registrará en auditoría.
              </Alert>
              {healthSummary && healthSummary.marginPct !== null && (
                <Box>
                  <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Margen efectivo
                  </Typography>
                  <Typography variant='body1' sx={{ fontWeight: 500 }}>
                    {formatPercent(healthSummary.marginPct)}
                  </Typography>
                </Box>
              )}
              {healthSummary && healthSummary.alerts.length > 0 && (
                <Stack spacing={1.5}>
                  {healthSummary.alerts.map((alert, idx) => (
                    <Alert key={`${alert.level}-${idx}`} severity={alert.level}>
                      {alert.message}
                    </Alert>
                  ))}
                </Stack>
              )}
            </>
          )}

          {scenario.kind === 'blocked' && (
            <Alert severity='error' role='alert'>
              La cotización está en un estado que no permite emisión. Verifica su ciclo de vida antes de continuar.
            </Alert>
          )}

          {(error || confirmError) && (
            <Alert severity='error' role='alert'>
              {confirmError ?? error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          variant='contained'
          startIcon={<i className='tabler-file-check' />}
          disabled={submitting || !scenario.canConfirm}
        >
          {submitting ? 'Emitiendo…' : 'Emitir cotización'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default QuoteSendDialog
