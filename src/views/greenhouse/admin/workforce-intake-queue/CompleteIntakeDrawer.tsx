'use client'

import { useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import { GH_WORKFORCE_INTAKE } from '@/lib/copy/workforce'

import type { WorkforceIntakeStatus } from '@/types/people'

/**
 * TASK-873 Slice 3 — Drawer compartido para completar ficha laboral.
 * Consumido por:
 *  - PersonView (botón "Completar ficha" en header del detalle)
 *  - Admin queue page `/admin/workforce/intake-queue` (Slice 4)
 *
 * Convención canonical: invoca el endpoint backend canonical existente
 * (POST /api/admin/workforce/members/[memberId]/complete-intake) shipped por
 * TASK-872 Slice 5. NO duplica logic de transición — sola surface UI.
 *
 * V1.0 NO valida readiness pre-flight (operador asume contrato/compensación/
 * legal profile/payment están al día). V1.1 ship readiness guard via TASK-874.
 * El banner del drawer body es explicit sobre esa responsibility.
 */

export interface CompleteIntakeDrawerMember {
  readonly memberId: string
  readonly displayName: string
  readonly primaryEmail: string | null
  readonly workforceIntakeStatus: WorkforceIntakeStatus
  readonly identityProfileId: string | null
  readonly createdAt: string | null
  readonly ageDays: number | null
}

interface CompleteIntakeDrawerProps {
  readonly open: boolean
  readonly member: CompleteIntakeDrawerMember | null
  readonly onClose: () => void
  readonly onCompleted?: () => void
}

const statusLabel = (status: WorkforceIntakeStatus): string => {
  switch (status) {
    case 'pending_intake':
      return GH_WORKFORCE_INTAKE.status_pending_intake
    case 'in_review':
      return GH_WORKFORCE_INTAKE.status_in_review
    case 'completed':
      return GH_WORKFORCE_INTAKE.status_completed
  }
}

const statusColor = (status: WorkforceIntakeStatus): 'warning' | 'info' | 'success' =>
  status === 'pending_intake' ? 'warning' : status === 'in_review' ? 'info' : 'success'

const formatCreatedAt = (iso: string | null): string => {
  if (!iso) return '—'

  try {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      timeZone: 'America/Santiago'
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

const CompleteIntakeDrawer = ({
  open,
  member,
  onClose,
  onCompleted
}: CompleteIntakeDrawerProps) => {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleClose = () => {
    if (submitting) return // No cerrar mientras submit en vuelo
    setReason('')
    onClose()
  }

  const handleSubmit = async () => {
    if (!member || submitting) return

    setSubmitting(true)

    try {
      const res = await fetch(
        `/api/admin/workforce/members/${encodeURIComponent(member.memberId)}/complete-intake`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() || undefined })
        }
      )

      if (res.ok) {
        toast.success(GH_WORKFORCE_INTAKE.toast_submit_success)
        onCompleted?.()
        setReason('')
        onClose()

        return
      }

      // Sanitized error path — el endpoint canonical ya devuelve { error } redacted.
      switch (res.status) {
        case 403:
          toast.error(GH_WORKFORCE_INTAKE.toast_submit_forbidden)
          break
        case 404:
          toast.error(GH_WORKFORCE_INTAKE.toast_submit_not_found)
          break
        case 409:
          toast.error(GH_WORKFORCE_INTAKE.toast_submit_conflict)
          break
        default:
          toast.error(GH_WORKFORCE_INTAKE.toast_submit_error)
      }
    } catch {
      // Network failure — generic fallback.
      toast.error(GH_WORKFORCE_INTAKE.toast_submit_error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={handleClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
      aria-labelledby='complete-intake-drawer-title'
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            px: 6,
            py: 4
          }}
        >
          <Stack spacing={1}>
            <Typography id='complete-intake-drawer-title' variant='h5'>
              {GH_WORKFORCE_INTAKE.drawer_title}
            </Typography>
            {member ? (
              <Typography variant='body2' color='text.secondary'>
                {GH_WORKFORCE_INTAKE.drawer_subtitle_template(member.displayName)}
              </Typography>
            ) : null}
          </Stack>
          <IconButton onClick={handleClose} aria-label={GH_WORKFORCE_INTAKE.drawer_close_aria}>
            <i className='tabler-x' />
          </IconButton>
        </Box>
        <Divider />

        {/* Body */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 6, py: 5 }}>
          {!member ? (
            <Typography color='text.secondary'>No hay colaborador seleccionado.</Typography>
          ) : (
            <Stack spacing={5}>
              {/* Member section */}
              <Stack spacing={2}>
                <Typography variant='overline' color='text.secondary'>
                  {GH_WORKFORCE_INTAKE.drawer_section_member}
                </Typography>
                <Stack spacing={1}>
                  <Stack direction='row' justifyContent='space-between' alignItems='baseline'>
                    <Typography variant='body2' color='text.secondary'>
                      {GH_WORKFORCE_INTAKE.drawer_field_display_name}
                    </Typography>
                    <Typography variant='body2'>{member.displayName}</Typography>
                  </Stack>
                  <Stack direction='row' justifyContent='space-between' alignItems='baseline'>
                    <Typography variant='body2' color='text.secondary'>
                      {GH_WORKFORCE_INTAKE.drawer_field_email}
                    </Typography>
                    <Typography variant='body2'>{member.primaryEmail ?? '—'}</Typography>
                  </Stack>
                  <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Typography variant='body2' color='text.secondary'>
                      {GH_WORKFORCE_INTAKE.drawer_field_status}
                    </Typography>
                    <Chip
                      size='small'
                      variant='tonal'
                      color={statusColor(member.workforceIntakeStatus)}
                      label={statusLabel(member.workforceIntakeStatus)}
                    />
                  </Stack>
                  {member.ageDays !== null ? (
                    <Stack direction='row' justifyContent='space-between' alignItems='baseline'>
                      <Typography variant='body2' color='text.secondary'>
                        {GH_WORKFORCE_INTAKE.drawer_field_age_days}
                      </Typography>
                      <Typography variant='body2'>
                        {GH_WORKFORCE_INTAKE.drawer_age_days_template(member.ageDays)}
                      </Typography>
                    </Stack>
                  ) : null}
                  {member.createdAt ? (
                    <Stack direction='row' justifyContent='space-between' alignItems='baseline'>
                      <Typography variant='body2' color='text.secondary'>
                        {GH_WORKFORCE_INTAKE.queue_column_created}
                      </Typography>
                      <Typography variant='body2'>{formatCreatedAt(member.createdAt)}</Typography>
                    </Stack>
                  ) : null}
                  {member.identityProfileId ? (
                    <Stack direction='row' justifyContent='space-between' alignItems='baseline'>
                      <Typography variant='body2' color='text.secondary'>
                        {GH_WORKFORCE_INTAKE.drawer_field_identity_profile}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{
                          fontVariantNumeric: 'tabular-nums',
                          letterSpacing: '0.02em',
                          color: 'text.secondary',
                          maxWidth: 280,
                          textAlign: 'right',
                          wordBreak: 'break-all'
                        }}
                      >
                        {member.identityProfileId}
                      </Typography>
                    </Stack>
                  ) : null}
                </Stack>
              </Stack>

              {/* Action section */}
              <Stack spacing={3}>
                <Typography variant='overline' color='text.secondary'>
                  {GH_WORKFORCE_INTAKE.drawer_section_action}
                </Typography>
                <Alert severity='warning' icon={<i className='tabler-alert-triangle' />}>
                  <AlertTitle>{GH_WORKFORCE_INTAKE.drawer_warning_title}</AlertTitle>
                  {GH_WORKFORCE_INTAKE.drawer_warning_body}
                </Alert>
                <CustomTextField
                  label={GH_WORKFORCE_INTAKE.drawer_reason_label}
                  placeholder={GH_WORKFORCE_INTAKE.drawer_reason_placeholder}
                  helperText={GH_WORKFORCE_INTAKE.drawer_reason_helper}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  multiline
                  rows={3}
                  fullWidth
                  disabled={submitting}
                  inputProps={{ maxLength: 500 }}
                />
              </Stack>
            </Stack>
          )}
        </Box>

        {/* Footer actions */}
        <Divider />
        <Box sx={{ px: 6, py: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant='tonal' color='secondary' onClick={handleClose} disabled={submitting}>
            {GH_WORKFORCE_INTAKE.drawer_cancel}
          </Button>
          <Button
            variant='contained'
            color='warning'
            onClick={handleSubmit}
            disabled={!member || submitting}
            startIcon={
              submitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-check' />
            }
          >
            {submitting
              ? GH_WORKFORCE_INTAKE.drawer_submit_loading
              : GH_WORKFORCE_INTAKE.drawer_submit}
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}

export default CompleteIntakeDrawer
