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

import { getMicrocopy } from '@/lib/copy'

import { isIssueableFinanceQuotationStatus } from '@/lib/finance/quotation-access'
import type { FxReadiness } from '@/lib/finance/currency-domain'
import { evaluateQuotationFxReadinessGate } from '@/lib/finance/quotation-fx-readiness-gate'

const GREENHOUSE_COPY = getMicrocopy()

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

  /**
   * TASK-466 — Optional FX readiness resolved against the quote output
   * currency. When present, the dialog surfaces the client-facing policy
   * decision (block or warn) before allowing the issue request.
   */
  fxReadiness?: FxReadiness | null
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

  if (isIssueableFinanceQuotationStatus(quotationStatus) && healthSummary?.requiresApproval) {
    return { kind: 'needs_approval', canConfirm: true }
  }

  if (isIssueableFinanceQuotationStatus(quotationStatus)) {
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
  fxReadiness,
  onClose,
  onConfirm
}: QuoteSendDialogProps) => {
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const scenario = resolveScenario(quotationStatus, healthSummary, pendingApprovalSteps)

  // TASK-466 — FX readiness policy. The gate is evaluated against the
  // client-facing stricter threshold so the user sees the same decision the
  // API boundary will apply. When `fxReadiness` is null we simply skip the
  // alert (backward-compatible with callers that haven't wired FX yet).
  const fxGate = fxReadiness
    ? evaluateQuotationFxReadinessGate({ readiness: fxReadiness })
    : null

  const fxBlocks = fxGate?.blocking ?? false

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
          {fxGate && (
            <Alert
              severity={
                fxGate.severity === 'critical'
                  ? 'error'
                  : fxGate.severity === 'warning'
                    ? 'warning'
                    : 'info'
              }
              role={fxGate.severity === 'critical' ? 'alert' : 'status'}
            >
              <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 0.5 }}>
                Tipo de cambio {fxReadiness?.fromCurrency.toUpperCase()}→{fxReadiness?.toCurrency.toUpperCase()}
              </Typography>
              <Typography variant='body2'>{fxGate.message}</Typography>
              {fxReadiness?.composedViaUsd ? (
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
                  Tasa derivada por composición vía USD — no hay cotización directa disponible.
                </Typography>
              ) : null}
            </Alert>
          )}

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
        <Button onClick={handleClose} disabled={submitting}>{GREENHOUSE_COPY.actions.cancel}</Button>
        <Button
          onClick={handleConfirm}
          variant='contained'
          startIcon={<i className='tabler-file-check' />}
          disabled={submitting || !scenario.canConfirm || fxBlocks}
        >
          {submitting ? 'Emitiendo…' : 'Emitir cotización'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default QuoteSendDialog
