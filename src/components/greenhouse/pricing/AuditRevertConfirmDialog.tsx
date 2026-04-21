'use client'

import { useCallback, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import AuditDiffViewer from './AuditDiffViewer'
import { GH_PRICING_GOVERNANCE } from '@/config/greenhouse-nomenclature'

const REASON_MIN = 15
const REASON_MAX = 500

export interface AuditRevertConfirmDialogProps {
  open: boolean
  auditId: string
  action: string
  entityType: string
  entityLabel: string
  changeSummary: Record<string, unknown> | null
  onClose: () => void
  onSuccess: (result: { newAuditId: string; entityType: string; entityId: string }) => void
}

interface RevertResponse {
  reverted: boolean
  newAuditId: string
  entityType: string
  entityId: string
}

/**
 * AuditRevertConfirmDialog — confirm modal for one-click revert of an audit entry
 * (TASK-471 slice 2). Shows an inverse preview of the change + mandatory reason
 * textarea + delegates POST to `/audit-log/[auditId]/revert`.
 *
 * The "inverse" preview: we swap previous_values ↔ new_values so the user sees
 * the state that will be restored vs the state that will be lost.
 */
const AuditRevertConfirmDialog = ({
  open,
  auditId,
  action,
  entityType,
  entityLabel,
  changeSummary,
  onClose,
  onSuccess
}: AuditRevertConfirmDialogProps) => {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reasonTrimmed = reason.trim()
  const reasonTooShort = reasonTrimmed.length > 0 && reasonTrimmed.length < REASON_MIN
  const reasonTooLong = reasonTrimmed.length > REASON_MAX
  const canSubmit = !submitting && reasonTrimmed.length >= REASON_MIN && !reasonTooLong

  // Inverse preview: swap previous_values ↔ new_values.
  const invertedSummary = useMemo(() => {
    if (!changeSummary) return null

    const prev = (changeSummary.previous_values ?? changeSummary.previousValues) as
      | Record<string, unknown>
      | null
      | undefined

    const next = (changeSummary.new_values ?? changeSummary.newValues) as
      | Record<string, unknown>
      | null
      | undefined

    const fields = (changeSummary.fields_changed ?? changeSummary.fieldsChanged) as
      | string[]
      | undefined

    return {
      previous_values: next ?? null,
      new_values: prev ?? null,
      fields_changed: Array.isArray(fields) ? fields : []
    }
  }, [changeSummary])

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/admin/pricing-catalog/audit-log/${encodeURIComponent(auditId)}/revert`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reasonTrimmed })
        }
      )

      if (response.status === 403) {
        setError(GH_PRICING_GOVERNANCE.auditRevert.errorToastForbidden)

        return
      }

      if (response.status === 404) {
        setError(GH_PRICING_GOVERNANCE.auditRevert.errorToastEntityGone)

        return
      }

      if (response.status === 409) {
        setError(GH_PRICING_GOVERNANCE.auditRevert.errorToastConflict)

        return
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }

        setError(payload.error || GH_PRICING_GOVERNANCE.auditRevert.errorToastGeneric)

        return
      }

      const data = (await response.json()) as RevertResponse

      onSuccess({
        newAuditId: data.newAuditId,
        entityType: data.entityType,
        entityId: data.entityId
      })
      onClose()
    } catch {
      setError(GH_PRICING_GOVERNANCE.auditRevert.errorToastGeneric)
    } finally {
      setSubmitting(false)
    }
  }, [canSubmit, auditId, reasonTrimmed, onSuccess, onClose])

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth='md'
      fullWidth
      aria-label={GH_PRICING_GOVERNANCE.auditRevert.dialogTitle}
    >
      <DialogTitle>
        <Stack spacing={0.5}>
          <Typography variant='h6' sx={{ fontWeight: 700 }}>
            {GH_PRICING_GOVERNANCE.auditRevert.dialogTitle}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {GH_PRICING_GOVERNANCE.auditRevert.dialogSubtitle}
          </Typography>
          <Typography variant='caption' color='text.secondary' sx={{ fontStyle: 'italic' }}>
            {entityType} · {entityLabel}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Box>
            <Typography
              variant='caption'
              sx={{
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'text.secondary',
                display: 'block',
                mb: 1
              }}
            >
              {GH_PRICING_GOVERNANCE.auditRevert.previousStateLabel}
            </Typography>
            <AuditDiffViewer action={action} changeSummary={invertedSummary} />
          </Box>

          <TextField
            label={GH_PRICING_GOVERNANCE.auditRevert.reasonLabel}
            placeholder={GH_PRICING_GOVERNANCE.auditRevert.reasonPlaceholder}
            value={reason}
            onChange={event => setReason(event.target.value.slice(0, REASON_MAX))}
            multiline
            minRows={3}
            maxRows={6}
            size='small'
            fullWidth
            disabled={submitting}
            error={reasonTooShort || reasonTooLong}
            helperText={
              reasonTooShort
                ? GH_PRICING_GOVERNANCE.auditRevert.reasonTooShortError(REASON_MIN, reasonTrimmed.length)
                : reasonTooLong
                  ? GH_PRICING_GOVERNANCE.auditRevert.reasonTooLongError
                  : `${GH_PRICING_GOVERNANCE.auditRevert.reasonHelper} · ${reasonTrimmed.length} / ${REASON_MAX}`
            }
          />

          {error ? <Alert severity='error'>{error}</Alert> : null}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={submitting} variant='text'>
          {GH_PRICING_GOVERNANCE.auditRevert.cancelCta}
        </Button>
        <Button
          onClick={() => {
            void handleSubmit()
          }}
          disabled={!canSubmit}
          variant='contained'
          color='warning'
          startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-arrow-back-up' />}
        >
          {submitting
            ? GH_PRICING_GOVERNANCE.auditRevert.submittingCta
            : GH_PRICING_GOVERNANCE.auditRevert.submitCta}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AuditRevertConfirmDialog
