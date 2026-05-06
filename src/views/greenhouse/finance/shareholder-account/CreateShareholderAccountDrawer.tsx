'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'
import { formatPercent } from './utils'

const GREENHOUSE_COPY = getMicrocopy()

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type ShareholderPersonOption = {
  profileId: string
  memberId: string | null
  displayName: string
  email: string | null
  sourceLabel: string
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activa' },
  { value: 'frozen', label: 'Bloqueada' },
  { value: 'closed', label: 'Cerrada' }
]

const CURRENCY_OPTIONS = ['CLP', 'USD']

const CreateShareholderAccountDrawer = ({ open, onClose, onSuccess }: Props) => {
  const [accountName, setAccountName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ShareholderPersonOption[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<ShareholderPersonOption | null>(null)
  const [profileId, setProfileId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [ownershipPercentage, setOwnershipPercentage] = useState('')
  const [currency, setCurrency] = useState('CLP')
  const [status, setStatus] = useState('active')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetForm = useCallback(() => {
    setAccountName('')
    setSearchQuery('')
    setSearchResults([])
    setSearching(false)
    setSelectedPerson(null)
    setProfileId('')
    setMemberId('')
    setOwnershipPercentage('')
    setCurrency('CLP')
    setStatus('active')
    setNotes('')
    setSaving(false)
    setError(null)
  }, [])

  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open, resetForm])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setSelectedPerson(null)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (value.trim().length < 2) {
      setSearchResults([])
      setSearching(false)

      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)

      try {
        const res = await fetch(`/api/finance/shareholder-account/people?q=${encodeURIComponent(value.trim())}`)

        if (!res.ok) {
          setSearchResults([])

          return
        }

        const data = await res.json()

        setSearchResults(Array.isArray(data.items) ? data.items : [])
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  const handleSelectPerson = (person: ShareholderPersonOption) => {
    setSelectedPerson(person)
    setSearchQuery(person.email ? `${person.displayName} · ${person.email}` : person.displayName)
    setSearchResults([])
    setProfileId(person.profileId)
    setMemberId(person.memberId || '')
    setAccountName(current => current || `CCA — ${person.displayName}`)
  }

  const handleSubmit = async () => {
    if (!accountName.trim()) {
      setError('Escribe un nombre para la cuenta corriente.')

      return
    }

    if (!profileId.trim()) {
      setError('Ingresa el profile_id canónico del accionista.')

      return
    }

    if (ownershipPercentage.trim() && (!Number.isFinite(Number(ownershipPercentage)) || Number(ownershipPercentage) < 0 || Number(ownershipPercentage) > 100)) {
      setError('La participación debe estar entre 0 y 100.')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/finance/shareholder-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: accountName.trim(),
          profileId: profileId.trim(),
          memberId: memberId.trim() || null,
          ownershipPercentage: ownershipPercentage.trim() ? Number(ownershipPercentage) : null,
          currency,
          status,
          notes: notes.trim() || null
        })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        setError(body.error || 'No pudimos crear la cuenta corriente.')

        return
      }

      toast.success('Cuenta corriente creada.')
      onSuccess()
      onClose()
    } catch {
      setError('No pudimos conectar con Finance. Intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 460 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Box>
          <Typography variant='h6'>Nueva cuenta corriente accionista</Typography>
          <Typography variant='body2' color='text.secondary'>
            Registra la cuenta bilateral con la persona canónica del accionista y deja listo el saldo para operar.
          </Typography>
        </Box>
        <IconButton size='small' onClick={onClose} aria-label={GREENHOUSE_COPY.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}

        <CustomTextField
          fullWidth
          label='Nombre de la cuenta'
          value={accountName}
          onChange={event => setAccountName(event.target.value)}
          placeholder='Cuenta corriente Juan Pérez'
          helperText='Usa un nombre operativo que el equipo pueda leer rápido.'
        />

        <Box sx={{ position: 'relative' }}>
          <CustomTextField
            fullWidth
            label='Buscar accionista'
            value={searchQuery}
            onChange={event => handleSearch(event.target.value)}
            placeholder='Nombre o email del accionista'
            helperText='Busca primero en Identity. Si ya seleccionaste a la persona, abajo verás sus IDs canónicos.'
            InputProps={{
              endAdornment: searching ? <CircularProgress size={16} /> : undefined
            }}
          />

          {searchResults.length > 0 && !selectedPerson ? (
            <List
              dense
              sx={{
                position: 'absolute',
                zIndex: 10,
                width: '100%',
                bgcolor: 'background.paper',
                border: theme => `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                maxHeight: 220,
                overflowY: 'auto',
                mt: 0.5,
                boxShadow: 4
              }}
            >
              {searchResults.map(person => (
                <ListItemButton key={person.profileId} onClick={() => handleSelectPerson(person)}>
                  <ListItemText
                    primary={person.displayName}
                    secondary={person.email ? `${person.email} · ${person.sourceLabel}` : person.sourceLabel}
                    slotProps={{
                      primary: { variant: 'body2', fontWeight: 600 },
                      secondary: { variant: 'caption' }
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          ) : null}
        </Box>

        {selectedPerson ? (
          <Alert severity='info'>
            Persona seleccionada: <strong>{selectedPerson.displayName}</strong>
            {selectedPerson.email ? ` · ${selectedPerson.email}` : ''}
          </Alert>
        ) : null}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              label='Profile ID del accionista'
              value={profileId}
              onChange={event => setProfileId(event.target.value)}
              placeholder='profile_id canónico'
              helperText='Obligatorio. Debe apuntar a la persona canónica.'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              label='Member ID opcional'
              value={memberId}
              onChange={event => setMemberId(event.target.value)}
              placeholder='member_id'
              helperText='Úsalo si la misma persona también existe como colaborador interno.'
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              label='Participación %'
              value={ownershipPercentage}
              onChange={event => setOwnershipPercentage(event.target.value)}
              placeholder='51.00'
              helperText={`Referencia: ${formatPercent(ownershipPercentage.trim() ? Number(ownershipPercentage) : null)}`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              label='Moneda base'
              value={currency}
              onChange={event => setCurrency(event.target.value)}
            >
              {CURRENCY_OPTIONS.map(option => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
        </Grid>

        <CustomTextField
          select
          fullWidth
          label='Estado'
          value={status}
          onChange={event => setStatus(event.target.value)}
        >
          {STATUS_OPTIONS.map(option => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          fullWidth
          multiline
          minRows={3}
          label='Notas'
          value={notes}
          onChange={event => setNotes(event.target.value)}
          placeholder='Contexto operativo, observaciones, acuerdos internos'
        />

        <Stack direction='row' spacing={3} justifyContent='flex-end'>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={saving}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creando...' : 'Crear cuenta'}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}

export default CreateShareholderAccountDrawer
