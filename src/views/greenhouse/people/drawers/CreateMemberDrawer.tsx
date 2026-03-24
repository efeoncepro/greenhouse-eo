'use client'

import { useState } from 'react'

import { toast } from 'react-toastify'

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

import type { CreateMemberInput , TeamContactChannel, TeamRoleCategory } from '@/types/team'

const ROLE_CATEGORIES: TeamRoleCategory[] = ['account', 'operations', 'strategy', 'design', 'development', 'media']
const COUNTRIES = ['CL', 'CO', 'VE', 'MX', 'PE', 'US', 'AR', 'BR', 'EC']
const CONTACT_CHANNELS: TeamContactChannel[] = ['teams', 'slack', 'email']

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: (memberId: string) => void
}

const CreateMemberDrawer = ({ open, onClose, onSuccess }: Props) => {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
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
  const [emailTouched, setEmailTouched] = useState(false)

  const emailError = emailTouched && email.trim() && !EMAIL_REGEX.test(email.trim())
    ? 'Formato de email inválido'
    : emailTouched && email.trim() && !email.trim().endsWith('@efeoncepro.com')
      ? 'El email debe ser @efeoncepro.com'
      : null

  const resetForm = () => {
    setDisplayName('')
    setEmail('')
    setRoleTitle('')
    setRoleCategory('operations')
    setLocationCountry('')
    setLocationCity('')
    setContactChannel('')
    setContactHandle('')
    setRelevanceNote('')
    setAzureOid('')
    setNotionUserId('')
    setHubspotOwnerId('')
    setError(null)
    setEmailTouched(false)
  }

  const handleSubmit = async () => {
    if (!displayName.trim() || !email.trim() || !roleTitle.trim()) {
      setError('Nombre, email y cargo son obligatorios.')

      return
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setError('El formato de email no es válido.')

      return
    }

    if (!email.trim().endsWith('@efeoncepro.com')) {
      setError('El email debe ser del dominio @efeoncepro.com.')

      return
    }

    setSaving(true)
    setError(null)

    const input: CreateMemberInput = {
      displayName: displayName.trim(),
      email: email.trim(),
      roleTitle: roleTitle.trim(),
      roleCategory,
      ...(locationCountry && { locationCountry }),
      ...(locationCity && { locationCity }),
      ...(contactChannel && { contactChannel }),
      ...(contactHandle && { contactHandle }),
      ...(relevanceNote && { relevanceNote }),
      ...(azureOid && { azureOid }),
      ...(notionUserId && { notionUserId }),
      ...(hubspotOwnerId && { hubspotOwnerId })
    }

    try {
      const res = await fetch('/api/admin/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al crear colaborador')
        setSaving(false)

        return
      }

      const created = await res.json()

      toast.success(`${displayName.trim()} fue creado exitosamente`)
      resetForm()
      onClose()
      onSuccess(created.memberId)
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
        <Typography variant='h6'>Nuevo colaborador</Typography>
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
          type='email'
          value={email}
          onChange={e => setEmail(e.target.value)}
          onBlur={() => setEmailTouched(true)}
          error={!!emailError}
          helperText={emailError || 'nombre@efeoncepro.com'}
          required
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
                <MenuItem key={c} value={c}>{c}</MenuItem>
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
              onChange={e => setContactHandle(e.target.value)}
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
        <CustomTextField fullWidth size='small' label='Notion User ID' value={notionUserId} onChange={e => setNotionUserId(e.target.value)} />
        <CustomTextField fullWidth size='small' label='HubSpot Owner ID' value={hubspotOwnerId} onChange={e => setHubspotOwnerId(e.target.value)} />
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} fullWidth>
          Cancelar
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={saving} fullWidth>
          {saving ? 'Creando...' : 'Crear colaborador'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default CreateMemberDrawer
