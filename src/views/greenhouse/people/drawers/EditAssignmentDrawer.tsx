'use client'

import { useEffect, useState } from 'react'

import { toast } from 'react-toastify'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import ConfirmDialog from '@/components/dialogs/ConfirmDialog'
import type { PersonDetailAssignment } from '@/types/people'
import type { TeamContactChannel } from '@/types/team'

const CONTACT_CHANNELS: TeamContactChannel[] = ['teams', 'slack', 'email']

type Props = {
  open: boolean
  assignment: PersonDetailAssignment | null
  onClose: () => void
  onSuccess: () => void
}

const EditAssignmentDrawer = ({ open, assignment, onClose, onSuccess }: Props) => {
  const [fteAllocation, setFteAllocation] = useState(0.5)
  const [hoursPerMonth, setHoursPerMonth] = useState('')
  const [roleTitleOverride, setRoleTitleOverride] = useState('')
  const [relevanceNoteOverride, setRelevanceNoteOverride] = useState('')
  const [contactChannelOverride, setContactChannelOverride] = useState<TeamContactChannel | ''>('')
  const [contactHandleOverride, setContactHandleOverride] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (assignment && open) {
      setFteAllocation(assignment.fteAllocation)
      setHoursPerMonth(assignment.hoursPerMonth?.toString() ?? '')
      setRoleTitleOverride(assignment.roleTitleOverride ?? '')
      setRelevanceNoteOverride('')
      setContactChannelOverride('')
      setContactHandleOverride('')
      setError(null)
      setDeleteConfirmOpen(false)
    }
  }, [assignment, open])

  const handleSubmit = async () => {
    if (!assignment) return

    setSaving(true)
    setError(null)

    const hours = hoursPerMonth ? Number(hoursPerMonth) : undefined

    if (hours !== undefined && (hours <= 0 || hours > 320)) {
      setError('Las horas deben estar entre 1 y 320.')
      setSaving(false)

      return
    }

    const body = {
      fteAllocation,
      ...(hours !== undefined && { hoursPerMonth: hours }),
      ...(roleTitleOverride !== (assignment.roleTitleOverride ?? '') && { roleTitleOverride: roleTitleOverride || undefined }),
      ...(relevanceNoteOverride && { relevanceNoteOverride }),
      ...(contactChannelOverride && { contactChannelOverride }),
      ...(contactHandleOverride && { contactHandleOverride })
    }

    try {
      const res = await fetch(`/api/admin/team/assignments/${assignment.assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al actualizar asignación')
        setSaving(false)

        return
      }

      onClose()
      onSuccess()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!assignment) return

    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/team/assignments/${assignment.assignmentId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al desasignar')
        setDeleting(false)

        return
      }

      toast.success(`Asignación a ${assignment.clientName} eliminada`)
      onClose()
      onSuccess()
    } catch {
      setError('Error de conexión')
    } finally {
      setDeleting(false)
    }
  }

  const busy = saving || deleting

  return (
    <>
      <Drawer
        anchor='right'
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
          <Box>
            <Typography variant='h6'>Editar asignación</Typography>
            {assignment && <Typography variant='body2' color='text.secondary'>{assignment.clientName}</Typography>}
          </Box>
          <IconButton onClick={onClose} size='small' aria-label='Cerrar'>
            <i className='tabler-x' />
          </IconButton>
        </Box>

        <Divider />

        <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
          {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

          <CustomTextField
            fullWidth
            size='small'
            label='Cuenta / Space'
            value={assignment?.clientName ?? ''}
            disabled
          />

          <Box>
            <Typography variant='body2' sx={{ mb: 1 }}>FTE: {fteAllocation.toFixed(2)}</Typography>
            <Slider
              value={fteAllocation}
              onChange={(_, v) => setFteAllocation(v as number)}
              min={0.05}
              max={2}
              step={0.05}
              valueLabelDisplay='auto'
              valueLabelFormat={v => v.toFixed(2)}
              aria-label='FTE allocation'
            />
          </Box>

          <CustomTextField
            fullWidth
            size='small'
            label='Horas por mes (opcional)'
            type='number'
            value={hoursPerMonth}
            onChange={e => setHoursPerMonth(e.target.value)}
            helperText={`Estimado: ${Math.round(fteAllocation * 160)} hrs · Rango válido: 1–320`}
            slotProps={{ htmlInput: { min: 1, max: 320 } }}
          />

          <CustomTextField
            fullWidth
            size='small'
            label='Cargo en cuenta (override)'
            value={roleTitleOverride}
            onChange={e => setRoleTitleOverride(e.target.value)}
            helperText='Dejar vacío para usar el cargo principal'
          />

          <CustomTextField
            fullWidth
            size='small'
            label='Nota de relevancia (override)'
            multiline
            rows={2}
            value={relevanceNoteOverride}
            onChange={e => setRelevanceNoteOverride(e.target.value)}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Canal override'
              value={contactChannelOverride}
              onChange={e => setContactChannelOverride(e.target.value as TeamContactChannel)}
            >
              <MenuItem value=''>—</MenuItem>
              {CONTACT_CHANNELS.map(ch => (
                <MenuItem key={ch} value={ch}>{ch}</MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              fullWidth
              size='small'
              label='Handle override'
              value={contactHandleOverride}
              onChange={e => setContactHandleOverride(e.target.value)}
            />
          </Box>
        </Stack>

        <Divider />
        <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
          <Button variant='tonal' color='error' onClick={() => setDeleteConfirmOpen(true)} disabled={busy} sx={{ minWidth: 120 }}>
            Desasignar
          </Button>
          <Button variant='tonal' color='secondary' onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button variant='contained' onClick={handleSubmit} disabled={busy} fullWidth>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </Box>
      </Drawer>

      <ConfirmDialog
        open={deleteConfirmOpen}
        setOpen={setDeleteConfirmOpen}
        title={`¿Desasignar de ${assignment?.clientName ?? 'esta cuenta'}?`}
        description='Esta acción eliminará la asignación del colaborador a esta cuenta. Se puede reasignar después.'
        confirmLabel='Desasignar'
        confirmColor='error'
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  )
}

export default EditAssignmentDrawer
