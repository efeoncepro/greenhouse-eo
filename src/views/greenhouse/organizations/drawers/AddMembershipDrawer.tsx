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

import type { OrganizationSpace } from '../types'

const MEMBERSHIP_TYPES = [
  { value: 'team_member', label: 'Equipo' },
  { value: 'client_user', label: 'Usuario' },
  { value: 'contact', label: 'Contacto' },
  { value: 'billing', label: 'Facturación' }
]

interface SearchResult {
  profileId: string
  fullName: string | null
  canonicalEmail: string | null
}

type Props = {
  open: boolean
  organizationId: string
  spaces: OrganizationSpace[] | null
  onClose: () => void
  onSuccess: () => void
}

const AddMembershipDrawer = ({ open, organizationId, spaces, onClose, onSuccess }: Props) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<SearchResult | null>(null)
  const [membershipType, setMembershipType] = useState('contact')
  const [roleLabel, setRoleLabel] = useState('')
  const [department, setDepartment] = useState('')
  const [spaceId, setSpaceId] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetForm = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedProfile(null)
    setMembershipType('contact')
    setRoleLabel('')
    setDepartment('')
    setSpaceId('')
    setIsPrimary(false)
    setError(null)
  }, [])

  useEffect(() => {
    if (open) resetForm()
  }, [open, resetForm])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setSelectedProfile(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setSearchResults([])

      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)

      try {
        const res = await fetch(`/api/organizations/people-search?q=${encodeURIComponent(query.trim())}`)

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

  const handleSelectProfile = (profile: SearchResult) => {
    setSelectedProfile(profile)
    setSearchQuery(profile.fullName ?? profile.canonicalEmail ?? profile.profileId)
    setSearchResults([])
  }

  const handleSubmit = async () => {
    if (!selectedProfile) {
      setError('Selecciona una persona de la lista.')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/organizations/${organizationId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfile.profileId,
          membershipType,
          roleLabel: roleLabel.trim() || undefined,
          department: department.trim() || undefined,
          spaceId: spaceId || undefined,
          isPrimary
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al agregar membresía')
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
        <Typography variant='h6'>Agregar persona</Typography>
        <IconButton onClick={onClose} size='small' aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

        {/* Person search */}
        <Box sx={{ position: 'relative' }}>
          <CustomTextField
            fullWidth
            size='small'
            label='Buscar persona'
            placeholder='Nombre o email...'
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            InputProps={{
              endAdornment: searching ? <CircularProgress size={16} /> : undefined
            }}
          />
          {searchResults.length > 0 && !selectedProfile && (
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
                <ListItemButton key={r.profileId} onClick={() => handleSelectProfile(r)}>
                  <ListItemText
                    primary={r.fullName ?? 'Sin nombre'}
                    secondary={r.canonicalEmail}
                    slotProps={{
                      primary: { variant: 'body2', fontWeight: 600 },
                      secondary: { variant: 'caption' }
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>

        {selectedProfile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <i className='tabler-user-check' style={{ fontSize: 18, color: 'var(--mui-palette-success-main)' }} />
            <Typography variant='body2' fontWeight={600}>
              {selectedProfile.fullName ?? selectedProfile.canonicalEmail}
            </Typography>
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
          placeholder='ej. CEO, Gerente de marketing...'
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

        {spaces && spaces.length > 0 && (
          <CustomTextField
            select
            fullWidth
            size='small'
            label='Space (opcional)'
            value={spaceId}
            onChange={e => setSpaceId(e.target.value)}
          >
            <MenuItem value=''>Sin asignar</MenuItem>
            {spaces.map(s => (
              <MenuItem key={s.spaceId} value={s.spaceId}>{s.spaceName}</MenuItem>
            ))}
          </CustomTextField>
        )}

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
        <Button variant='contained' onClick={handleSubmit} disabled={saving || !selectedProfile} fullWidth>
          {saving ? 'Guardando...' : 'Agregar persona'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default AddMembershipDrawer
