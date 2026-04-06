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

import type { CreateLeaveRequestInput, HrLeaveType, LeaveDayPeriod } from '@/types/hr-core'
import GreenhouseFileUploader, { type UploadedFileValue } from './GreenhouseFileUploader'

type LeaveRequestDialogProps = {
  open: boolean
  saving: boolean
  leaveTypes: HrLeaveType[]
  ownerMemberId?: string | null
  title?: string
  onClose: () => void
  onSubmit: (input: CreateLeaveRequestInput) => Promise<void> | void
}

const LeaveRequestDialog = ({
  open,
  saving,
  leaveTypes,
  ownerMemberId = null,
  title = 'Solicitar permiso',
  onClose,
  onSubmit
}: LeaveRequestDialogProps) => {
  const activeLeaveTypes = leaveTypes.filter(leaveType => leaveType.active)
  const [leaveTypeCode, setLeaveTypeCode] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startPeriod, setStartPeriod] = useState<LeaveDayPeriod>('full_day')
  const [endPeriod, setEndPeriod] = useState<LeaveDayPeriod>('full_day')
  const [reason, setReason] = useState('')
  const [attachmentAsset, setAttachmentAsset] = useState<UploadedFileValue | null>(null)
  const [notes, setNotes] = useState('')
  const selectedLeaveType = activeLeaveTypes.find(leaveType => leaveType.leaveTypeCode === leaveTypeCode) || null

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
    setStartPeriod('full_day')
    setEndPeriod('full_day')
    setReason('')
    setAttachmentAsset(null)
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
      memberId: ownerMemberId || undefined,
      leaveTypeCode,
      startDate,
      endDate,
      startPeriod,
      endPeriod,
      reason: reason || null,
      attachmentAssetId: attachmentAsset?.assetId || null,
      attachmentUrl: null,
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
                onChange={event => {
                  setStartDate(event.target.value)
                  setStartPeriod('full_day')
                  setEndPeriod('full_day')
                }}
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
                onChange={event => {
                  setEndDate(event.target.value)
                  setStartPeriod('full_day')
                  setEndPeriod('full_day')
                }}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>

          {startDate && endDate && startDate === endDate && (
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Jornada'
              value={startPeriod === 'full_day' && endPeriod === 'full_day' ? 'full_day' : startPeriod}
              onChange={event => {
                const value = event.target.value as LeaveDayPeriod

                setStartPeriod(value)
                setEndPeriod(value)
              }}
            >
              <MenuItem value='full_day'>Dia completo</MenuItem>
              <MenuItem value='morning'>Solo mañana</MenuItem>
              <MenuItem value='afternoon'>Solo tarde</MenuItem>
            </CustomTextField>
          )}

          {startDate && endDate && startDate !== endDate && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label='Primer dia'
                  value={startPeriod}
                  onChange={event => setStartPeriod(event.target.value as LeaveDayPeriod)}
                >
                  <MenuItem value='full_day'>Dia completo</MenuItem>
                  <MenuItem value='afternoon'>Desde la tarde</MenuItem>
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label='Ultimo dia'
                  value={endPeriod}
                  onChange={event => setEndPeriod(event.target.value as LeaveDayPeriod)}
                >
                  <MenuItem value='full_day'>Dia completo</MenuItem>
                  <MenuItem value='morning'>Solo la mañana</MenuItem>
                </CustomTextField>
              </Grid>
            </Grid>
          )}

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

          <GreenhouseFileUploader
            contextType='leave_request_draft'
            title={selectedLeaveType?.requiresAttachment ? 'Respaldo obligatorio' : 'Adjunto opcional'}
            helperText={
              selectedLeaveType?.requiresAttachment
                ? 'Este tipo de permiso exige un respaldo en PDF o imagen antes de enviarlo.'
                : 'Puedes adjuntar un respaldo en PDF o imagen si ayuda a la revisión.'
            }
            emptyTitle='Arrastra tu respaldo aquí'
            emptyDescription='Acepta PDF, JPG, PNG y WEBP hasta 10 MB.'
            browseCta='Seleccionar archivo'
            replaceCta='Reemplazar archivo'
            value={attachmentAsset}
            onChange={setAttachmentAsset}
            ownerMemberId={ownerMemberId}
            metadataLabel={selectedLeaveType?.leaveTypeName || 'leave-request'}
            disabled={saving}
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
          disabled={saving || !leaveTypeCode || !startDate || !endDate || Boolean(selectedLeaveType?.requiresAttachment && !attachmentAsset)}
        >
          {saving ? 'Enviando...' : 'Solicitar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default LeaveRequestDialog
