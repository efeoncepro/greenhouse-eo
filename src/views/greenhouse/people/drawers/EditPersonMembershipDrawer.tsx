'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'

import type { PersonDetailAssignment } from '@/types/people'
import { formatFte } from '../helpers'

const TASK407_ARIA_AGREGAR_ASIGNACION_OPERATIVA = "Agregar asignación operativa"


const GREENHOUSE_COPY = getMicrocopy()

const MEMBERSHIP_TYPES = [
  { value: 'team_member', label: 'Equipo Efeonce' },
  { value: 'contact', label: 'Contacto' },
  { value: 'client_user', label: 'Usuario' },
  { value: 'billing', label: 'Facturación' }
]

const FTE_MARKS = [
  { value: 0.1, label: '0.1' },
  { value: 0.25, label: '0.25' },
  { value: 0.5, label: '0.5' },
  { value: 0.75, label: '0.75' },
  { value: 1.0, label: '1.0' }
]

export interface MembershipRowData {
  membershipId: string
  organizationId: string
  organizationName: string
  clientId: string | null
  membershipType: string
  roleLabel: string | null
  department: string | null
  isPrimary: boolean
}

type Props = {
  open: boolean
  memberId: string
  membership: MembershipRowData | null
  assignment: PersonDetailAssignment | undefined
  onClose: () => void
  onSuccess: () => void
}

const EditPersonMembershipDrawer = ({ open, memberId, membership, assignment, onClose, onSuccess }: Props) => {
  const [membershipType, setMembershipType] = useState('')
  const [roleLabel, setRoleLabel] = useState('')
  const [department, setDepartment] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [fteAllocation, setFteAllocation] = useState(0.5)
  const [hoursPerMonth, setHoursPerMonth] = useState('')
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasAssignment = !!assignment
  const [showAssignmentForm, setShowAssignmentForm] = useState(false)

  const resetForm = useCallback(() => {
    if (membership) {
      setMembershipType(membership.membershipType)
      setRoleLabel(membership.roleLabel ?? '')
      setDepartment(membership.department ?? '')
      setIsPrimary(membership.isPrimary)
    }

    if (assignment) {
      setFteAllocation(assignment.fteAllocation)
      setHoursPerMonth(assignment.hoursPerMonth?.toString() ?? '')
    } else {
      setFteAllocation(0.5)
      setHoursPerMonth('')
    }

    setShowAssignmentForm(false)
    setError(null)
  }, [membership, assignment])

  useEffect(() => {
    if (open) resetForm()
  }, [open, resetForm])

  const handleSave = async () => {
    if (!membership) return

    setSaving(true)
    setError(null)

    try {
      // 1. Update membership
      const membershipRes = await fetch(`/api/people/${memberId}/memberships`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipId: membership.membershipId,
          membershipType,
          roleLabel: roleLabel.trim() || null,
          department: department.trim() || null,
          isPrimary
        })
      })

      if (!membershipRes.ok) {
        const data = await membershipRes.json().catch(() => ({}))

        setError(data.error || 'Error al actualizar membresía')
        setSaving(false)

        return
      }

      // 2. Update or create assignment if applicable
      if (hasAssignment && assignment) {
        // Update existing assignment
        await fetch(`/api/admin/team/assignments/${assignment.assignmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fteAllocation,
            hoursPerMonth: hoursPerMonth ? Number(hoursPerMonth) : undefined
          })
        })
      } else if (showAssignmentForm && membership.clientId) {
        // Create new assignment
        await fetch('/api/admin/team/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: membership.clientId,
            memberId,
            fteAllocation,
            hoursPerMonth: hoursPerMonth ? Number(hoursPerMonth) : undefined
          })
        })
      }

      onClose()
      onSuccess()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!membership) return

    setDeactivating(true)
    setError(null)

    try {
      // Deactivate membership
      const res = await fetch(`/api/people/${memberId}/memberships`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId: membership.membershipId })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al desactivar membresía')
        setDeactivating(false)

        return
      }

      // Also deactivate assignment if it exists
      if (assignment?.active) {
        await fetch(`/api/admin/team/assignments/${assignment.assignmentId}`, {
          method: 'DELETE'
        })
      }

      onClose()
      onSuccess()
    } catch {
      setError('Error de conexión')
    } finally {
      setDeactivating(false)
    }
  }

  if (!membership) return null

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Box>
          <Typography variant='h6'>Editar membresía</Typography>
          <Typography variant='caption' color='text.secondary'>{membership.organizationName}</Typography>
        </Box>
        <IconButton onClick={onClose} size='small' aria-label={GREENHOUSE_COPY.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

        {/* Membership fields */}
        <Typography variant='overline' color='text.secondary'>Membresía</Typography>

        <CustomTextField
          select
          fullWidth
          size='small'
          label='Tipo de membresía'
          value={membershipType}
          onChange={e => setMembershipType(e.target.value)}
        >
          {MEMBERSHIP_TYPES.map(t => (
            <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          fullWidth
          size='small'
          label='Rol'
          placeholder='ej. Account Manager, Director creativo...'
          value={roleLabel}
          onChange={e => setRoleLabel(e.target.value)}
        />

        <CustomTextField
          fullWidth
          size='small'
          label='Departamento'
          value={department}
          onChange={e => setDepartment(e.target.value)}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant='body2'>Contacto principal</Typography>
          <Switch checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} />
        </Box>

        <Divider />

        {/* Assignment (FTE) section */}
        <Typography variant='overline' color='text.secondary'>Asignación operativa</Typography>

        {hasAssignment || showAssignmentForm ? (
          <>
            <Box>
              <Typography variant='body2' sx={{ mb: 1 }}>
                Dedicación (FTE): <strong>{formatFte(fteAllocation)}</strong> — {Math.round(fteAllocation * 160)} hrs/mes
              </Typography>
              <Slider
                value={fteAllocation}
                onChange={(_, v) => setFteAllocation(v as number)}
                min={0.1}
                max={1.0}
                step={0.05}
                marks={FTE_MARKS}
                valueLabelDisplay='auto'
                valueLabelFormat={v => formatFte(v)}
                size='small'
              />
            </Box>

            <CustomTextField
              fullWidth
              size='small'
              type='number'
              label='Horas/mes (opcional, override)'
              placeholder={`Auto: ${Math.round(fteAllocation * 160)}`}
              value={hoursPerMonth}
              onChange={e => setHoursPerMonth(e.target.value)}
              slotProps={{ htmlInput: { min: 1, max: 320 } }}
            />

            {hasAssignment && assignment && (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant='caption' color='text.secondary'>
                  <i className='tabler-calendar' style={{ fontSize: 14, verticalAlign: 'middle' }} /> Desde: {assignment.startDate ?? '—'}
                </Typography>
                {!assignment.active && assignment.endDate && (
                  <Typography variant='caption' color='text.secondary'>
                    <i className='tabler-calendar-off' style={{ fontSize: 14, verticalAlign: 'middle' }} /> Cerrado: {assignment.endDate}
                  </Typography>
                )}
              </Box>
            )}
          </>
        ) : membership.clientId ? (
          <Box
            onClick={() => setShowAssignmentForm(true)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowAssignmentForm(true) } }}
            tabIndex={0}
            role='button'
            aria-label={TASK407_ARIA_AGREGAR_ASIGNACION_OPERATIVA}
            sx={{
              p: 2,
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              textAlign: 'center',
              color: 'text.secondary',
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.main', color: 'primary.main' }
            }}
          >
            <i className='tabler-plus' style={{ fontSize: 16, marginRight: 6 }} />
            Agregar asignación operativa (FTE)
          </Box>
        ) : (
          <Typography variant='body2' color='text.secondary'>
            Esta organización no tiene un Space vinculado. No se puede crear asignación operativa.
          </Typography>
        )}
      </Stack>

      <Divider />
      <Box sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button variant='tonal' color='secondary' onClick={onClose} fullWidth>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' onClick={handleSave} disabled={saving} fullWidth>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </Box>
        <Button
          variant='tonal'
          color='error'
          size='small'
          fullWidth
          onClick={handleDeactivate}
          disabled={deactivating}
          startIcon={<i className='tabler-unlink' />}
        >
          {deactivating ? 'Desactivando...' : 'Desactivar membresía'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default EditPersonMembershipDrawer
