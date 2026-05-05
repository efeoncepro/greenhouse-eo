'use client'

import { useState } from 'react'

import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import { HR_LEGAL_COPY } from './copy'

interface HrRejectDialogProps {
  open: boolean
  collaboratorName: string
  kind: 'document' | 'address'
  submitting: boolean
  onSubmit: (reason: string) => Promise<void>
  onClose: () => void
}

const HrRejectDialog = ({
  open,
  collaboratorName,
  kind,
  submitting,
  onSubmit,
  onClose
}: HrRejectDialogProps) => {
  const [reason, setReason] = useState('')

  const canSubmit = reason.trim().length >= 10

  const handleSubmit = async () => {
    if (!canSubmit) return

    await onSubmit(reason.trim())
    setReason('')
  }

  const title =
    kind === 'document'
      ? HR_LEGAL_COPY.rejectDialog.title(collaboratorName)
      : HR_LEGAL_COPY.rejectDialog.titleAddr(collaboratorName)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          {HR_LEGAL_COPY.rejectDialog.lead}
        </Typography>
        <CustomTextField
          fullWidth
          multiline
          minRows={3}
          label={HR_LEGAL_COPY.rejectDialog.reasonLabel}
          placeholder='Ej. Falta el digito verificador'
          value={reason}
          onChange={e => setReason(e.target.value)}
          helperText={HR_LEGAL_COPY.rejectDialog.reasonHint}
          disabled={submitting}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting} color='secondary'>
          {HR_LEGAL_COPY.rejectDialog.cancel}
        </Button>
        <Button
          variant='contained'
          color='error'
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          startIcon={submitting ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : null}
        >
          {HR_LEGAL_COPY.rejectDialog.confirm}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default HrRejectDialog
