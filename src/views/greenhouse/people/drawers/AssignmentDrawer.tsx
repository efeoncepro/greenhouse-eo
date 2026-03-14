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

import type { TeamAdminClientOption, TeamContactChannel } from '@/types/team'

const CONTACT_CHANNELS: TeamContactChannel[] = ['teams', 'slack', 'email']

type Props = {
  open: boolean
  memberId: string | null
  memberName: string | null
  onClose: () => void
  onSuccess: () => void
}

const AssignmentDrawer = ({ open, memberId, memberName, onClose, onSuccess }: Props) => {
  const [clients, setClients] = useState<TeamAdminClientOption[]>([])
  const [clientId, setClientId] = useState('')
  const [fteAllocation, setFteAllocation] = useState(0.5)
  const [hoursPerMonth, setHoursPerMonth] = useState('')
  const [roleTitleOverride, setRoleTitleOverride] = useState('')
  const [relevanceNoteOverride, setRelevanceNoteOverride] = useState('')
  const [contactChannelOverride, setContactChannelOverride] = useState<TeamContactChannel | ''>('')
  const [contactHandleOverride, setContactHandleOverride] = useState('')
  const [startDate, setStartDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setClientId('')
      setFteAllocation(0.5)
      setHoursPerMonth('')
      setRoleTitleOverride('')
      setRelevanceNoteOverride('')
      setContactChannelOverride('')
      setContactHandleOverride('')
      setStartDate('')
      setError(null)

      fetch('/api/admin/team/members')
        .then(r => r.json())
        .then((meta: { activeClients?: TeamAdminClientOption[] }) => {
          setClients(meta.activeClients ?? [])
        })
        .catch(() => setClients([]))
    }
  }, [open])

  const handleSubmit = async () => {
    if (!memberId || !clientId) {
      setError('Debes seleccionar una cuenta.')

      return
    }

    const hours = hoursPerMonth ? Number(hoursPerMonth) : undefined

    if (hours !== undefined && (hours <= 0 || hours > 320)) {
      setError('Las horas deben estar entre 1 y 320.')

      return
    }

    setSaving(true)
    setError(null)

    const body = {
      clientId,
      memberId,
      fteAllocation,
      ...(hours !== undefined && { hoursPerMonth: hours }),
      ...(roleTitleOverride && { roleTitleOverride }),
      ...(relevanceNoteOverride && { relevanceNoteOverride }),
      ...(contactChannelOverride && { contactChannelOverride }),
      ...(contactHandleOverride && { contactHandleOverride }),
      ...(startDate && { startDate })
    }

    try {
      const res = await fetch('/api/admin/team/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al crear asignación')
        setSaving(false)

        return
      }

      const clientName = clients.find(c => c.clientId === clientId)?.clientName ?? 'la cuenta'

      toast.success(`Asignado a ${clientName}`)
      onClose()
      onSuccess()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Box>
          <Typography variant='h6'>Nueva asignación</Typography>
          {memberName && <Typography variant='body2' color='text.secondary'>{memberName}</Typography>}
        </Box>
        <IconButton onClick={onClose} size='small' aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

        <CustomTextField
          select
          fullWidth
          size='small'
          label='Cuenta / Space'
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          required
        >
          <MenuItem value=''>Seleccionar cuenta</MenuItem>
          {clients.map(c => (
            <MenuItem key={c.clientId} value={c.clientId}>{c.clientName}</MenuItem>
          ))}
        </CustomTextField>

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

        <CustomTextField
          fullWidth
          size='small'
          label='Fecha de inicio'
          type='date'
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} fullWidth>
          Cancelar
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={saving || !clientId} fullWidth>
          {saving ? 'Asignando...' : 'Crear asignación'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default AssignmentDrawer
