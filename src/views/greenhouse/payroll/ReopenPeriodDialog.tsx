'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'

import type { PeriodStatus } from '@/types/payroll'

const GREENHOUSE_COPY = getMicrocopy()

// TASK-412 — "Reabrir nómina" dialog
//
// Collects the reopen reason + detail and confirms the transition with
// the operator. Before showing the form it GETs the preview endpoint to
// surface blocking reasons (status, window, etc). Success returns the
// reopen result to the parent for UI refresh.

type ReopenReason = 'error_calculo' | 'bono_retroactivo' | 'correccion_contractual' | 'otro'

type ReasonOption = {
  value: ReopenReason
  label: string
  description: string
}

const REASON_OPTIONS: ReasonOption[] = [
  {
    value: 'error_calculo',
    label: 'Error de cálculo',
    description: 'Revertir una liquidación con un cálculo incorrecto.'
  },
  {
    value: 'bono_retroactivo',
    label: 'Bono retroactivo',
    description: 'Incorporar un bono o ajuste que no estaba disponible al cerrar.'
  },
  {
    value: 'correccion_contractual',
    label: 'Corrección contractual',
    description: 'Ajustar una variable del contrato aplicable al período.'
  },
  {
    value: 'otro',
    label: 'Otro motivo',
    description: 'Requiere detallar la justificación.'
  }
]

interface PreviewReason {
  code: string
  blocking: boolean
  message: string
}

interface ReopenPreviewResponse {
  canReopen: boolean
  reasons: PreviewReason[]
  currentStatus: PeriodStatus
  operationalYear: number
  operationalMonth: number
  inWindow: boolean
  entriesCount: number
  alreadyReopened: boolean
}

interface ReopenSuccessPayload {
  ok: true
  auditId: string
  periodId: string
  periodStatus: 'reopened'
  operationalMonth: string
  previousStatus: PeriodStatus
  reason: ReopenReason
  reopenedAt: string
}

interface Props {
  open: boolean
  onClose: () => void
  periodId: string
  periodLabel: string
  onSuccess: (result: ReopenSuccessPayload) => void
}

const ReopenPeriodDialog = ({ open, onClose, periodId, periodLabel, onSuccess }: Props) => {
  const [preview, setPreview] = useState<ReopenPreviewResponse | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [reason, setReason] = useState<ReopenReason | ''>('')
  const [reasonDetail, setReasonDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reset and preload preview on open
  useEffect(() => {
    if (!open) return

    let active = true

    setReason('')
    setReasonDetail('')
    setSubmitError(null)
    setPreview(null)
    setPreviewError(null)
    setPreviewLoading(true)

    const loadPreview = async () => {
      try {
        const res = await fetch(`/api/hr/payroll/periods/${periodId}/reopen-preview`)

        if (!res.ok) {
          const data = await res.json().catch(() => null)

          throw new Error(data?.error || 'No se pudo cargar el preview de reapertura.')
        }

        const data = (await res.json()) as ReopenPreviewResponse

        if (active) {
          setPreview(data)
        }
      } catch (error) {
        if (active) {
          setPreviewError(
            error instanceof Error ? error.message : 'No se pudo cargar el preview de reapertura.'
          )
        }
      } finally {
        if (active) {
          setPreviewLoading(false)
        }
      }
    }

    void loadPreview()

    return () => {
      active = false
    }
  }, [open, periodId])

  const canReopen = preview?.canReopen ?? false
  const needsDetail = reason === 'otro'
  const detailTrimmed = reasonDetail.trim()

  const isFormValid =
    canReopen && reason !== '' && (!needsDetail || detailTrimmed.length > 0)

  const handleConfirm = useCallback(async () => {
    if (!isFormValid) return

    const submittingReason = reason as ReopenReason

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch(`/api/hr/payroll/periods/${periodId}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: submittingReason,
          reasonDetail: needsDetail ? detailTrimmed : null
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)

        throw new Error(data?.error || 'No se pudo reabrir la nómina.')
      }

      const data = (await res.json()) as ReopenSuccessPayload

      onSuccess(data)
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo reabrir la nómina.')
    } finally {
      setSubmitting(false)
    }
  }, [isFormValid, reason, needsDetail, detailTrimmed, periodId, onSuccess, onClose])

  const handleClose = useCallback(() => {
    if (submitting) return
    onClose()
  }, [submitting, onClose])

  const blockingReasons = preview?.reasons.filter(r => r.blocking) ?? []
  const infoReasons = preview?.reasons.filter(r => !r.blocking) ?? []

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='sm'
      fullWidth
      closeAfterTransition={false}
      aria-labelledby='reopen-period-dialog-title'
    >
      <DialogTitle id='reopen-period-dialog-title'>
        ¿Reabrir la nómina de {periodLabel}?
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            Al reabrir la nómina podrás recalcular entries para corregirlas. Los valores originales
            quedan archivados como versión 1 y las nuevas entries se guardan como versión 2, con un
            registro de auditoría asociado.
          </Typography>

          {previewLoading && (
            <Stack direction='row' spacing={2} alignItems='center'>
              <CircularProgress size={18} />
              <Typography variant='body2' color='text.secondary'>
                Verificando elegibilidad…
              </Typography>
            </Stack>
          )}

          {previewError && (
            <Alert severity='error'>
              {previewError}
            </Alert>
          )}

          {!previewLoading && preview && blockingReasons.length > 0 && (
            <Stack spacing={1.5}>
              {blockingReasons.map(r => (
                <Alert key={r.code} severity='error'>
                  {r.message}
                </Alert>
              ))}
            </Stack>
          )}

          {!previewLoading && preview && canReopen && (
            <>
              <Alert severity='warning'>
                Al confirmar, el período pasará a estado{' '}
                <strong>reabierta</strong>. Finance recibirá los ajustes como delta y el colaborador
                será notificado automáticamente cuando la nueva versión se exporte.
              </Alert>

              {infoReasons.length > 0 && (
                <Stack spacing={1}>
                  {infoReasons.map(r => (
                    <Alert key={r.code} severity='info' sx={{ py: 0.5 }}>
                      {r.message}
                    </Alert>
                  ))}
                </Stack>
              )}

              <CustomTextField
                select
                fullWidth
                required
                label='Motivo de la reapertura'
                value={reason}
                onChange={event => setReason(event.target.value as ReopenReason)}
                helperText='Este motivo queda registrado en el audit trail.'
                disabled={submitting}
              >
                <MenuItem value='' disabled>
                  Selecciona un motivo
                </MenuItem>
                {REASON_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    <Stack>
                      <Typography variant='body2'>{option.label}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {option.description}
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </CustomTextField>

              <CustomTextField
                fullWidth
                multiline
                minRows={3}
                label={needsDetail ? 'Detalle del motivo (obligatorio)' : 'Detalle del motivo (opcional)'}
                value={reasonDetail}
                onChange={event => setReasonDetail(event.target.value)}
                helperText={
                  needsDetail
                    ? 'Describe brevemente la razón — este detalle queda en el audit trail.'
                    : 'Puedes agregar contexto adicional si lo necesitas.'
                }
                required={needsDetail}
                disabled={submitting}
              />
            </>
          )}

          {submitError && (
            <Alert severity='error' onClose={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant='tonal' color='secondary' onClick={handleClose} disabled={submitting}>{GREENHOUSE_COPY.actions.cancel}</Button>
        <Button
          variant='contained'
          color='warning'
          onClick={handleConfirm}
          disabled={!isFormValid || submitting || previewLoading}
          startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-arrow-back-up' />}
        >
          {submitting ? 'Reabriendo…' : 'Reabrir nómina'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ReopenPeriodDialog
