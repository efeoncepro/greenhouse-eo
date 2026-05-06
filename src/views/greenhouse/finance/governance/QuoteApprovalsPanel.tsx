'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomChip from '@core/components/mui/Chip'

const GREENHOUSE_COPY = getMicrocopy()

export interface ApprovalStep {
  stepId: string
  quotationId: string
  versionNumber: number
  policyId: string | null
  stepOrder: number
  requiredRole: string
  assignedTo: string | null
  conditionLabel: string
  status: 'pending' | 'approved' | 'rejected' | 'skipped'
  decidedBy: string | null
  decidedAt: string | null
  notes: string | null
  createdAt: string
}

interface Props {
  loading: boolean
  error: string | null
  steps: ApprovalStep[]
  quotationStatus: string
  canRequestApproval: boolean
  canDecide: boolean
  approverRoleCodes: string[]
  onRequestApproval: () => void
  onDecide: (stepId: string, decision: 'approved' | 'rejected', notes: string | null) => Promise<void>
  requesting: boolean
}

const STATUS_CHIP: Record<string, { label: string; color: 'warning' | 'success' | 'error' | 'secondary' }> = {
  pending: { label: GREENHOUSE_COPY.states.pending, color: 'warning' },
  approved: { label: GREENHOUSE_COPY.states.approved, color: 'success' },
  rejected: { label: GREENHOUSE_COPY.states.rejected, color: 'error' },
  skipped: { label: 'Omitido', color: 'secondary' }
}

const formatDate = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)

  if (Number.isNaN(d.getTime())) return iso

  return d.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
}

const QuoteApprovalsPanel = ({
  loading,
  error,
  steps,
  quotationStatus,
  canRequestApproval,
  canDecide,
  approverRoleCodes,
  onRequestApproval,
  onDecide,
  requesting
}: Props) => {
  const [dialog, setDialog] = useState<null | {
    stepId: string
    decision: 'approved' | 'rejected'
    label: string
  }>(null)

  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const closeDialog = () => {
    setDialog(null)
    setNotes('')
    setDialogError(null)
    setSubmitting(false)
  }

  const handleConfirm = async () => {
    if (!dialog) return

    setSubmitting(true)
    setDialogError(null)

    try {
      await onDecide(dialog.stepId, dialog.decision, notes.trim() ? notes.trim() : null)
      closeDialog()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo registrar la decisión.'

      setDialogError(message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant='rounded' height={60} />
        <Skeleton variant='rounded' height={120} />
      </Stack>
    )
  }

  if (error) {
    return <Alert severity='error'>{error}</Alert>
  }

  const pending = steps.filter(step => step.status === 'pending')
  const decided = steps.filter(step => step.status !== 'pending')

  return (
    <Stack spacing={3}>
      <Card variant='outlined'>
        <CardHeader
          title='Aprobaciones'
          subheader={
            quotationStatus === 'pending_approval'
              ? `Esperando decisión en ${pending.length} paso${pending.length === 1 ? '' : 's'}`
              : quotationStatus === 'issued' && steps.length === 0
                ? 'Esta cotización fue emitida sin requerir aprobación por excepción.'
              : steps.length === 0
                ? 'Esta cotización no requiere aprobación por excepción.'
                : 'Historial de decisiones registradas.'
          }
          action={
            canRequestApproval && steps.length === 0 ? (
              <Button
                variant='outlined'
                size='small'
                startIcon={<i className='tabler-shield-check' />}
                disabled={requesting}
                onClick={onRequestApproval}
              >
                {requesting ? 'Evaluando…' : 'Evaluar excepción'}
              </Button>
            ) : null
          }
        />
      </Card>

      {pending.length > 0 && (
        <Card variant='outlined'>
          <CardHeader
            title={`Pendientes (${pending.length})`}
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                <i className='tabler-hourglass' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          <CardContent>
            <Stack spacing={2}>
              {pending.map(step => {
                const canDecideThisStep =
                  canDecide &&
                  (approverRoleCodes.includes(step.requiredRole) || approverRoleCodes.includes('efeonce_admin'))

                return (
                  <Box key={step.stepId} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={2}
                      alignItems={{ md: 'center' }}
                      justifyContent='space-between'
                    >
                      <Box sx={{ flex: 1 }}>
                        <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.5 }}>
                          <Chip
                            size='small'
                            label={`Paso ${step.stepOrder}`}
                            variant='outlined'
                          />
                          <CustomChip
                            round='true'
                            size='small'
                            variant='tonal'
                            color='warning'
                            label={step.requiredRole}
                          />
                        </Stack>
                        <Typography variant='body2' sx={{ fontWeight: 500 }}>
                          {step.conditionLabel}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          Solicitada el {formatDate(step.createdAt)}
                        </Typography>
                      </Box>
                      {canDecideThisStep ? (
                        <Stack direction='row' spacing={1}>
                          <Button
                            size='small'
                            variant='contained'
                            color='success'
                            startIcon={<i className='tabler-check' />}
                            onClick={() =>
                              setDialog({
                                stepId: step.stepId,
                                decision: 'approved',
                                label: step.conditionLabel
                              })
                            }
                          >
                            Aprobar
                          </Button>
                          <Button
                            size='small'
                            variant='outlined'
                            color='error'
                            startIcon={<i className='tabler-x' />}
                            onClick={() =>
                              setDialog({
                                stepId: step.stepId,
                                decision: 'rejected',
                                label: step.conditionLabel
                              })
                            }
                          >
                            Rechazar
                          </Button>
                        </Stack>
                      ) : (
                        <Typography variant='caption' color='text.secondary'>
                          Requiere rol {step.requiredRole} para decidir
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                )
              })}
            </Stack>
          </CardContent>
        </Card>
      )}

      {decided.length > 0 && (
        <Card variant='outlined'>
          <CardHeader title={`Historial (${decided.length})`} />
          <Divider />
          <CardContent>
            <Stack spacing={2}>
              {decided.map(step => {
                const chip = STATUS_CHIP[step.status]

                return (
                  <Box key={step.stepId}>
                    <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.5 }}>
                      <Chip size='small' label={`v${step.versionNumber}`} variant='outlined' />
                      <CustomChip
                        round='true'
                        size='small'
                        variant='tonal'
                        color={chip?.color ?? 'secondary'}
                        label={chip?.label ?? step.status}
                      />
                      <Typography variant='caption' color='text.secondary'>
                        {step.requiredRole}
                      </Typography>
                    </Stack>
                    <Typography variant='body2'>{step.conditionLabel}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {step.decidedBy || '—'} · {formatDate(step.decidedAt)}
                    </Typography>
                    {step.notes && (
                      <Typography variant='body2' sx={{ mt: 0.5, fontStyle: 'italic' }}>
                        {`“${step.notes}”`}
                      </Typography>
                    )}
                  </Box>
                )
              })}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialog !== null} onClose={submitting ? undefined : closeDialog} fullWidth maxWidth='sm'>
        <DialogTitle>
          {dialog?.decision === 'approved' ? 'Aprobar paso' : 'Rechazar paso'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant='body2'>
              {dialog?.label}
            </Typography>
            <TextField
              label='Notas (opcional)'
              placeholder='Contexto de la decisión…'
              multiline
              rows={3}
              fullWidth
              value={notes}
              onChange={event => setNotes(event.target.value)}
              disabled={submitting}
            />
            {dialogError && <Alert severity='error'>{dialogError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={submitting}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button
            onClick={handleConfirm}
            variant='contained'
            color={dialog?.decision === 'approved' ? 'success' : 'error'}
            disabled={submitting}
          >
            {submitting ? 'Guardando…' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default QuoteApprovalsPanel
