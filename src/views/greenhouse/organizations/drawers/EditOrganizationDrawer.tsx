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

import type { OrganizationDetailData } from '../types'

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

const TAX_ID_TYPES = ['RUT', 'NIT', 'CUIT', 'RFC', 'EIN', 'OTHER'] as const
const STATUSES = ['active', 'inactive', 'prospect', 'churned'] as const

const STATUS_LABEL: Record<string, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  prospect: 'Prospecto',
  churned: 'Churned'
}

type Props = {
  open: boolean
  detail: OrganizationDetailData | null
  onClose: () => void
  onSuccess: () => void
}

const EditOrganizationDrawer = ({ open, detail, onClose, onSuccess }: Props) => {
  const [organizationName, setOrganizationName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [taxIdType, setTaxIdType] = useState('')
  const [taxId, setTaxId] = useState('')
  const [industry, setIndustry] = useState('')
  const [country, setCountry] = useState('')
  const [status, setStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (detail && open) {
      setOrganizationName(detail.organizationName)
      setLegalName(detail.legalName ?? '')
      setTaxIdType(detail.taxIdType ?? '')
      setTaxId(detail.taxId ?? '')
      setIndustry(detail.industry ?? '')
      setCountry(detail.country ?? '')
      setStatus(detail.status)
      setNotes(detail.notes ?? '')
      setError(null)
    }
  }, [detail, open])

  const handleSubmit = async () => {
    if (!detail) return

    if (!organizationName.trim()) {
      setError('El nombre de la organización es obligatorio.')

      return
    }

    setSaving(true)
    setError(null)

    const body: Record<string, unknown> = {
      organizationName: organizationName.trim()
    }

    if (legalName !== (detail.legalName ?? '')) body.legalName = legalName || null
    if (taxIdType !== (detail.taxIdType ?? '')) body.taxIdType = taxIdType || null
    if (taxId !== (detail.taxId ?? '')) body.taxId = taxId || null
    if (industry !== (detail.industry ?? '')) body.industry = industry || null
    if (country !== (detail.country ?? '')) body.country = country || null
    if (status !== detail.status) body.status = status
    if (notes !== (detail.notes ?? '')) body.notes = notes || null

    try {
      const res = await fetch(`/api/organizations/${detail.organizationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al actualizar la organización')
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
        <Typography variant='h6'>Editar organización</Typography>
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
          label='Nombre de la organización'
          value={organizationName}
          onChange={e => setOrganizationName(e.target.value)}
          required
        />
        <CustomTextField
          fullWidth
          size='small'
          label='Razón social'
          value={legalName}
          onChange={e => setLegalName(e.target.value)}
        />

        <Grid container spacing={2}>
          <Grid size={{ xs: 5 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Tipo ID fiscal'
              value={taxIdType}
              onChange={e => setTaxIdType(e.target.value)}
            >
              <MenuItem value=''>—</MenuItem>
              {TAX_ID_TYPES.map(t => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 7 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='ID fiscal'
              value={taxId}
              onChange={e => setTaxId(e.target.value)}
            />
          </Grid>
        </Grid>

        <CustomTextField
          fullWidth
          size='small'
          label='Industria'
          value={industry}
          onChange={e => setIndustry(e.target.value)}
        />

        <CustomTextField
          select
          fullWidth
          size='small'
          label='País'
          value={country}
          onChange={e => setCountry(e.target.value)}
        >
          <MenuItem value=''>Sin especificar</MenuItem>
          {COUNTRIES.map(c => (
            <MenuItem key={c.code} value={c.code}>{c.flag} {c.name}</MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          select
          fullWidth
          size='small'
          label='Estado'
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          {STATUSES.map(s => (
            <MenuItem key={s} value={s}>{STATUS_LABEL[s]}</MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          fullWidth
          size='small'
          label='Notas'
          multiline
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
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

export default EditOrganizationDrawer
