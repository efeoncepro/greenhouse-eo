'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'
import CustomChip from '@core/components/mui/Chip'

// ── Types ──

interface MemberOption {
  memberId: string
  displayName: string
  roleTitle: string | null
  contractedHours: number
  assignedHours: number
  availableHours: number
}

interface ClientOption {
  clientId: string
  clientName: string
}

type Props = {
  open: boolean
  existingMembers: MemberOption[]
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

const AssignMemberDrawer = ({ open, existingMembers, onClose, onSuccess }: Props) => {
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null)
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)
  const [fteAllocation, setFteAllocation] = useState(0.5)
  const [hoursOverride, setHoursOverride] = useState('')
  const [clients, setClients] = useState<ClientOption[]>([])
  const [allMembers, setAllMembers] = useState<MemberOption[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculatedHours = Math.round(fteAllocation * 160)

  const availableAfter = selectedMember
    ? selectedMember.availableHours - (hoursOverride ? Number(hoursOverride) : calculatedHours)
    : null

  const loadClients = useCallback(async () => {
    setLoadingClients(true)

    try {
      const res = await fetch('/api/admin/team/assignments?activeOnly=true', { signal: AbortSignal.timeout(5000) })

      if (res.ok) {
        const payload = await res.json()
        const seen = new Set<string>()
        const list: ClientOption[] = []

        for (const a of (payload.assignments ?? [])) {
          const cId = a.clientId as string

          if (cId && !seen.has(cId)) {
            seen.add(cId)
            list.push({ clientId: cId, clientName: (a.clientName as string) || cId })
          }
        }

        setClients(list)
      }
    } catch {
      // silent — user can type manually
    } finally {
      setLoadingClients(false)
    }
  }, [])

  const loadAllMembers = useCallback(async () => {
    setLoadingMembers(true)

    try {
      const res = await fetch('/api/agency/team', { signal: AbortSignal.timeout(5000) })

      if (res.ok) {
        const data = await res.json()

        const members: MemberOption[] = (data.members ?? []).map((m: Record<string, unknown>) => ({
          memberId: m.memberId as string,
          displayName: m.displayName as string,
          roleTitle: m.roleTitle as string | null,
          contractedHours: (m.capacity as Record<string, number>)?.contractedHoursMonth ?? 160,
          assignedHours: (m.capacity as Record<string, number>)?.assignedHoursMonth ?? 0,
          availableHours: (m.capacity as Record<string, number>)?.availableHoursMonth ?? 160
        }))

        setAllMembers(members)
      }
    } catch {
      setAllMembers(existingMembers)
    } finally {
      setLoadingMembers(false)
    }
  }, [existingMembers])

  useEffect(() => {
    if (open) {
      setSelectedMember(null)
      setSelectedClient(null)
      setFteAllocation(0.5)
      setHoursOverride('')
      setError(null)
      void loadClients()
      void loadAllMembers()
    }
  }, [open, loadClients, loadAllMembers])

  const handleSave = async () => {
    if (!selectedMember || !selectedClient) return

    setSaving(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        memberId: selectedMember.memberId,
        clientId: selectedClient.clientId,
        fteAllocation
      }

      if (hoursOverride.trim()) {
        body.hoursPerMonth = Number(hoursOverride)
      }

      const res = await fetch('/api/admin/team/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Error al crear' }))

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
      PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4, pb: 2 }}>
        <Typography variant='h6'>Asignar miembro</Typography>
        <IconButton onClick={onClose} size='small'>
          <i className='tabler-x' style={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
        <Autocomplete
          options={allMembers}
          getOptionLabel={o => o.displayName}
          value={selectedMember}
          onChange={(_, v) => setSelectedMember(v)}
          loading={loadingMembers}
          renderOption={(props, option) => (
            <li {...props} key={option.memberId}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Box>
                  <Typography variant='body2' fontWeight={600}>{option.displayName}</Typography>
                  <Typography variant='caption' color='text.secondary'>{option.roleTitle || '—'}</Typography>
                </Box>
                <Typography variant='caption' color={option.availableHours <= 0 ? 'error.main' : 'success.main'}>
                  {option.availableHours}h disp.
                </Typography>
              </Box>
            </li>
          )}
          renderInput={params => <CustomTextField {...params} label='Miembro' placeholder='Buscar por nombre…' />}
        />

        <Autocomplete
          options={clients}
          getOptionLabel={o => o.clientName}
          value={selectedClient}
          onChange={(_, v) => setSelectedClient(v)}
          loading={loadingClients}
          renderInput={params => <CustomTextField {...params} label='Cliente' placeholder='Buscar o escribir…' />}
        />

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
        />

        {selectedMember && (
          <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Preview de capacidad
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant='body2'>Disponible actual</Typography>
              <Typography variant='body2' fontWeight={600}>{selectedMember.availableHours}h</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant='body2'>Después de asignar</Typography>
              <Typography variant='body2' fontWeight={600} color={availableAfter !== null && availableAfter < 0 ? 'error.main' : 'success.main'}>
                {availableAfter !== null ? `${availableAfter}h` : '—'}
              </Typography>
            </Box>
            {availableAfter !== null && availableAfter < 0 && (
              <CustomChip round='true' size='small' variant='tonal' color='error' label='Sobrecomprometido' sx={{ mt: 1 }} />
            )}
          </Box>
        )}

        {error && <Alert severity='error'>{error}</Alert>}
      </Box>

      <Divider />

      <Box sx={{ p: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant='contained' onClick={handleSave} disabled={saving || !selectedMember || !selectedClient}>
          {saving ? 'Creando…' : 'Asignar'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default AssignMemberDrawer
