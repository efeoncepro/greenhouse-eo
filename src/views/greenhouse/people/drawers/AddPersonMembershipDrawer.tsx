'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

const MEMBERSHIP_TYPES = [
  { value: 'team_member', label: 'Equipo Efeonce' },
  { value: 'contact', label: 'Contacto' },
  { value: 'client_user', label: 'Usuario' },
  { value: 'billing', label: 'Facturación' }
]

interface OrgSearchResult {
  organizationId: string
  organizationName: string
  publicId: string
}

type Props = {
  open: boolean
  memberId: string
  memberName: string
  onClose: () => void
  onSuccess: () => void
}

const AddPersonMembershipDrawer = ({ open, memberId, memberName, onClose, onSuccess }: Props) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OrgSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<OrgSearchResult | null>(null)
  const [membershipType, setMembershipType] = useState('team_member')
  const [roleLabel, setRoleLabel] = useState('')
  const [department, setDepartment] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetForm = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedOrg(null)
    setMembershipType('team_member')
    setRoleLabel('')
    setDepartment('')
    setIsPrimary(false)
    setError(null)
  }, [])

  useEffect(() => {
    if (open) resetForm()
  }, [open, resetForm])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setSelectedOrg(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setSearchResults([])

      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)

      try {
        const res = await fetch(`/api/organizations/org-search?q=${encodeURIComponent(query.trim())}`)

        if (res.ok) {
          const data = await res.json()

          setSearchResults(data.items ?? [])
        }
      } catch {
        // Non-blocking
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  const handleSelectOrg = (org: OrgSearchResult) => {
    setSelectedOrg(org)
    setSearchQuery(org.organizationName)
    setSearchResults([])
  }

  const handleSubmit = async () => {
    if (!selectedOrg) {
      setError('Selecciona una organización de la lista.')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/people/${memberId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: selectedOrg.organizationId,
          membershipType,
          roleLabel: roleLabel.trim() || undefined,
          department: department.trim() || undefined,
          isPrimary
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al crear membresía')
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

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Box>
          <Typography variant='h6'>Vincular a organización</Typography>
          <Typography variant='caption' color='text.secondary'>{memberName}</Typography>
        </Box>
        <IconButton onClick={onClose} size='small' aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

        {/* Organization search */}
        <Box sx={{ position: 'relative' }}>
          <CustomTextField
            fullWidth
            size='small'
            label='Buscar organización'
            placeholder='Nombre de la organización...'
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            InputProps={{
              endAdornment: searching ? <CircularProgress size={16} /> : undefined
            }}
          />
          {searchResults.length > 0 && !selectedOrg && (
            <List
              dense
              sx={{
                position: 'absolute',
                zIndex: 10,
                width: '100%',
                bgcolor: 'background.paper',
                border: t => `1px solid ${t.palette.divider}`,
                borderRadius: 1,
                maxHeight: 200,
                overflowY: 'auto',
                mt: 0.5,
                boxShadow: 4
              }}
            >
              {searchResults.map(r => (
                <ListItemButton key={r.organizationId} onClick={() => handleSelectOrg(r)}>
                  <ListItemText
                    primary={r.organizationName}
                    secondary={r.publicId}
                    slotProps={{
                      primary: { variant: 'body2', fontWeight: 600 },
                      secondary: { variant: 'caption', sx: { fontSize: '0.75rem' } }
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>

        {selectedOrg && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <i className='tabler-building-check' style={{ fontSize: 18, color: 'var(--mui-palette-success-main)' }} />
            <Box>
              <Typography variant='body2' fontWeight={600}>{selectedOrg.organizationName}</Typography>
              <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.7rem' }}>
                {selectedOrg.publicId}
              </Typography>
            </Box>
          </Box>
        )}

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
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} fullWidth>
          Cancelar
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={saving || !selectedOrg} fullWidth>
          {saving ? 'Guardando...' : 'Vincular'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default AddPersonMembershipDrawer
