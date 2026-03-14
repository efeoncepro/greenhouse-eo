'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import type { PersonDetailMember } from '@/types/people'
import type { TeamContactChannel, TeamRoleCategory } from '@/types/team'

const ROLE_CATEGORIES: TeamRoleCategory[] = ['account', 'operations', 'strategy', 'design', 'development', 'media']

const COUNTRIES: { code: string; flag: string; name: string }[] = [
  { code: 'CL', flag: '🇨🇱', name: 'Chile' },
  { code: 'CO', flag: '🇨🇴', name: 'Colombia' },
  { code: 'VE', flag: '🇻🇪', name: 'Venezuela' },
  { code: 'MX', flag: '🇲🇽', name: 'México' },
  { code: 'PE', flag: '🇵🇪', name: 'Perú' },
  { code: 'US', flag: '🇺🇸', name: 'Estados Unidos' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina' },
  { code: 'BR', flag: '🇧🇷', name: 'Brasil' },
  { code: 'EC', flag: '🇪🇨', name: 'Ecuador' }
]

const CONTACT_CHANNELS: TeamContactChannel[] = ['teams', 'slack', 'email']

const normalizeRoleCategory = (value: string): TeamRoleCategory =>
  ROLE_CATEGORIES.includes(value as TeamRoleCategory) ? (value as TeamRoleCategory) : 'unknown'

type Props = {
  open: boolean
  member: PersonDetailMember | null
  onClose: () => void
  onSuccess: () => void
}

const EditProfileDrawer = ({ open, member, onClose, onSuccess }: Props) => {
  const [displayName, setDisplayName] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [roleCategory, setRoleCategory] = useState<TeamRoleCategory>('operations')
  const [locationCountry, setLocationCountry] = useState('')
  const [locationCity, setLocationCity] = useState('')
  const [contactChannel, setContactChannel] = useState<TeamContactChannel | ''>('')
  const [contactHandle, setContactHandle] = useState('')
  const [relevanceNote, setRelevanceNote] = useState('')
  const [azureOid, setAzureOid] = useState('')
  const [notionUserId, setNotionUserId] = useState('')
  const [hubspotOwnerId, setHubspotOwnerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (member && open) {
      setDisplayName(member.displayName)
      setRoleTitle(member.roleTitle)
      setRoleCategory(normalizeRoleCategory(member.roleCategory))
      setLocationCountry(member.profile.locationCountry ?? '')
      setLocationCity(member.profile.locationCity ?? '')
      setContactChannel((member.contactChannel as TeamContactChannel) ?? '')
      setContactHandle(member.contactHandle ?? '')
      setRelevanceNote('')
      setAzureOid(member.azureOid ?? '')
      setNotionUserId(member.notionUserId ?? '')
      setHubspotOwnerId(member.hubspotOwnerId ?? '')
      setError(null)
    }
  }, [member, open])

  const handleSubmit = async () => {
    if (!member) return

    if (!displayName.trim() || !roleTitle.trim()) {
      setError('Nombre y cargo son obligatorios.')

      return
    }

    setSaving(true)
    setError(null)

    const body: Record<string, unknown> = {
      displayName: displayName.trim(),
      roleTitle: roleTitle.trim(),
      roleCategory
    }

    if (locationCountry !== (member.profile.locationCountry ?? '')) {
      body.locationCountry = locationCountry || null
    }

    if (locationCity !== (member.profile.locationCity ?? '')) {
      body.locationCity = locationCity || null
    }

    if (contactChannel !== ((member.contactChannel as string) ?? '')) {
      body.contactChannel = contactChannel || null
    }

    if (relevanceNote) {
      body.relevanceNote = relevanceNote
    }

    if (azureOid !== (member.azureOid ?? '')) {
      body.azureOid = azureOid || null
    }

    try {
      const res = await fetch(`/api/admin/team/members/${member.memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.detail ? `${data.error}: ${data.detail}` : data.error || 'Error al actualizar perfil')
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
        <Typography variant='h6'>Editar perfil</Typography>
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
          label='Nombre completo'
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          required
        />
        <CustomTextField
          fullWidth
          size='small'
          label='Email público'
          value={member?.publicEmail ?? ''}
          disabled
          helperText='No editable'
        />
        <CustomTextField
          fullWidth
          size='small'
          label='Cargo'
          value={roleTitle}
          onChange={e => setRoleTitle(e.target.value)}
          required
        />
        <CustomTextField
          select
          fullWidth
          size='small'
          label='Categoría de rol'
          value={roleCategory}
          onChange={e => setRoleCategory(e.target.value as TeamRoleCategory)}
        >
          {ROLE_CATEGORIES.map(rc => (
            <MenuItem key={rc} value={rc}>{rc}</MenuItem>
          ))}
        </CustomTextField>

        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='País'
              value={locationCountry}
              onChange={e => setLocationCountry(e.target.value)}
            >
              <MenuItem value=''>Sin especificar</MenuItem>
              {COUNTRIES.map(c => (
                <MenuItem key={c.code} value={c.code}>{c.flag} {c.name}</MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Ciudad'
              value={locationCity}
              onChange={e => setLocationCity(e.target.value)}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Canal de contacto'
              value={contactChannel}
              onChange={e => setContactChannel(e.target.value as TeamContactChannel)}
            >
              <MenuItem value=''>—</MenuItem>
              {CONTACT_CHANNELS.map(ch => (
                <MenuItem key={ch} value={ch}>{ch}</MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Handle'
              value={contactHandle}
              disabled
              InputProps={{
                readOnly: true,
                sx: { fontFamily: 'monospace', fontSize: '0.85rem', bgcolor: 'action.hover' }
              }}
            />
          </Grid>
        </Grid>

        <CustomTextField
          fullWidth
          size='small'
          label='Nota de relevancia'
          multiline
          rows={2}
          value={relevanceNote}
          onChange={e => setRelevanceNote(e.target.value)}
        />

        <Divider />
        <Typography variant='subtitle2' color='text.secondary'>Integraciones (opcional)</Typography>
        <CustomTextField fullWidth size='small' label='Azure OID' value={azureOid} onChange={e => setAzureOid(e.target.value)} />
        <CustomTextField
          fullWidth
          size='small'
          label='Notion User ID'
          value={notionUserId}
          disabled
          InputProps={{
            readOnly: true,
            sx: { fontFamily: 'monospace', fontSize: '0.85rem', bgcolor: 'action.hover' }
          }}
        />
        <CustomTextField
          fullWidth
          size='small'
          label='HubSpot Owner ID'
          value={hubspotOwnerId}
          disabled
          InputProps={{
            readOnly: true,
            sx: { fontFamily: 'monospace', fontSize: '0.85rem', bgcolor: 'action.hover' }
          }}
        />
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} fullWidth>
          Cancelar
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={saving} fullWidth>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default EditProfileDrawer
