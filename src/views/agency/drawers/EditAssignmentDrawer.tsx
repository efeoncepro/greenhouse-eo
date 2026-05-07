'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'

const GREENHOUSE_COPY = getMicrocopy()

// ── Types ──

export interface AssignmentToEdit {
  assignmentId: string
  clientId: string | null
  clientName: string | null
  fteAllocation: number
  hoursPerMonth: number
  startDate: string | null
}

type Props = {
  open: boolean
  memberName: string
  assignment: AssignmentToEdit | null
  onClose: () => void
  onSuccess: () => void
}

const FTE_MARKS = [
  { value: 0.25, label: '0.25' },
  { value: 0.5, label: '0.5' },
  { value: 0.75, label: '0.75' },
  { value: 1.0, label: '1.0' }
]

// ── Component ──

const EditAssignmentDrawer = ({ open, memberName, assignment, onClose, onSuccess }: Props) => {
  const [fteAllocation, setFteAllocation] = useState(0.5)
  const [hoursOverride, setHoursOverride] = useState('')
  const [roleOverride, setRoleOverride] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculatedHours = Math.round(fteAllocation * 160)

  const resetForm = useCallback(() => {
    if (assignment) {
      setFteAllocation(assignment.fteAllocation)
      setHoursOverride(assignment.hoursPerMonth !== Math.round(assignment.fteAllocation * 160)
        ? String(assignment.hoursPerMonth)
        : '')
    } else {
      setFteAllocation(0.5)
      setHoursOverride('')
    }

    setRoleOverride('')
    setError(null)
  }, [assignment])

  useEffect(() => {
    if (open) resetForm()
  }, [open, resetForm])

  const handleSave = async () => {
    if (!assignment) return

    setSaving(true)
    setError(null)

    try {
      const body: Record<string, unknown> = { fteAllocation }

      if (hoursOverride.trim()) {
        body.hoursPerMonth = Number(hoursOverride)
      }

      if (roleOverride.trim()) {
        body.roleTitleOverride = roleOverride
      }

      const res = await fetch(`/api/admin/team/assignments/${assignment.assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Error al guardar' }))

        throw new Error(data.error || `HTTP ${res.status}`)
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 400 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4, pb: 2 }}>
        <Box>
          <Typography variant='h6'>Editar asignación</Typography>
          <Typography variant='caption' color='text.secondary'>
            {memberName} → {assignment?.clientName || 'Cliente'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size='small'>
          <i className='tabler-x' style={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <Box>
          <Typography variant='body2' fontWeight={600} sx={{ mb: 2 }}>
            FTE: {fteAllocation.toFixed(2)} ({calculatedHours}h/mes)
          </Typography>
          <Slider
            value={fteAllocation}
            onChange={(_, v) => setFteAllocation(v as number)}
            min={0.05}
            max={1.0}
            step={0.05}
            marks={FTE_MARKS}
            valueLabelDisplay='auto'
            valueLabelFormat={v => v.toFixed(2)}
          />
        </Box>

        <CustomTextField
          label='Horas/mes (override)'
          type='number'
          value={hoursOverride}
          onChange={e => setHoursOverride(e.target.value)}
          placeholder={String(calculatedHours)}
          slotProps={{ htmlInput: { min: 1, max: 320 } }}
          helperText={`Auto: ${calculatedHours}h. Solo editar si difiere del cálculo FTE × 160.`}
        />

        <CustomTextField
          label='Rol override'
          value={roleOverride}
          onChange={e => setRoleOverride(e.target.value)}
          placeholder='Ej: Lead Developer'
          helperText='Sobrescribe el rol por defecto solo para esta asignación.'
        />

        {error && <Alert severity='error'>{error}</Alert>}
      </Box>

      <Divider />

      <Box sx={{ p: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={saving}>{GREENHOUSE_COPY.actions.cancel}</Button>
        <Button variant='contained' onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default EditAssignmentDrawer
