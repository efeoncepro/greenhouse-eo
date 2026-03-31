'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import type { CreateLeaveRequestInput, HrLeaveType } from '@/types/hr-core'

type LeaveRequestDialogProps = {
  open: boolean
  saving: boolean
  leaveTypes: HrLeaveType[]
  title?: string
  onClose: () => void
  onSubmit: (input: CreateLeaveRequestInput) => Promise<void> | void
}

const LeaveRequestDialog = ({
  open,
  saving,
  leaveTypes,
  title = 'Solicitar permiso',
  onClose,
  onSubmit
}: LeaveRequestDialogProps) => {
  const activeLeaveTypes = leaveTypes.filter(leaveType => leaveType.active)
  const [leaveTypeCode, setLeaveTypeCode] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) {
      return
    }

    setLeaveTypeCode(current => current || activeLeaveTypes[0]?.leaveTypeCode || '')
  }, [activeLeaveTypes, open])

  const reset = () => {
    setLeaveTypeCode(activeLeaveTypes[0]?.leaveTypeCode || '')
    setStartDate('')
    setEndDate('')
    setReason('')
    setAttachmentUrl('')
    setNotes('')
  }

  const handleClose = () => {
    if (saving) {
      return
    }

    reset()
    onClose()
  }

  const handleSubmit = async () => {
    await onSubmit({
      leaveTypeCode,
      startDate,
      endDate,
      reason: reason || null,
      attachmentUrl: attachmentUrl || null,
      notes: notes || null
    })

    reset()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth closeAfterTransition={false}>
      <DialogTitle>{title}</DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <CustomTextField
            select
            fullWidth
            size='small'
            label='Tipo de permiso'
            value={leaveTypeCode}
            onChange={event => setLeaveTypeCode(event.target.value)}
            helperText={activeLeaveTypes.length === 0 ? 'No hay tipos de permiso activos disponibles.' : undefined}
            required
          >
            {activeLeaveTypes.length === 0 ? (
              <MenuItem disabled value=''>
                No hay tipos disponibles
              </MenuItem>
            ) : (
              activeLeaveTypes.map(leaveType => (
                <MenuItem key={leaveType.leaveTypeCode} value={leaveType.leaveTypeCode}>
                  {leaveType.leaveTypeName}
                </MenuItem>
              ))
            )}
          </CustomTextField>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Desde'
                type='date'
                value={startDate}
                onChange={event => setStartDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Hasta'
                type='date'
                value={endDate}
                onChange={event => setEndDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>

          <Typography variant='caption' color='text.secondary'>
            Los días hábiles se calculan automáticamente desde el calendario operativo y feriados Chile.
          </Typography>

          <CustomTextField
            fullWidth
            size='small'
            label='Motivo'
            multiline
            rows={2}
            value={reason}
            onChange={event => setReason(event.target.value)}
          />

          <CustomTextField
            fullWidth
            size='small'
            label='Adjunto URL'
            value={attachmentUrl}
            onChange={event => setAttachmentUrl(event.target.value)}
            placeholder='https://...'
          />

          <CustomTextField
            fullWidth
            size='small'
            label='Notas internas'
            multiline
            rows={2}
            value={notes}
            onChange={event => setNotes(event.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant='tonal' color='secondary' onClick={handleClose} disabled={saving}>
          Cancelar
        </Button>
        <Button
          variant='contained'
          onClick={handleSubmit}
          disabled={saving || !leaveTypeCode || !startDate || !endDate}
        >
          {saving ? 'Enviando...' : 'Solicitar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default LeaveRequestDialog
