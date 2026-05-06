'use client'

import { useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'

const GREENHOUSE_COPY = getMicrocopy()

const TAX_ID_TYPES = [
  { value: 'RUT', label: 'RUT' },
  { value: 'NIT', label: 'NIT' },
  { value: 'RFC', label: 'RFC' },
  { value: 'RUC', label: 'RUC' },
  { value: 'EIN', label: 'EIN' },
  { value: 'OTHER', label: 'Otro' }
]

const CURRENCIES = [
  { value: 'CLP', label: 'CLP' },
  { value: 'USD', label: 'USD' }
]

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const CreateClientDrawer = ({ open, onClose, onSuccess }: Props) => {
  // Required fields
  const [clientProfileId, setClientProfileId] = useState('')
  const [legalName, setLegalName] = useState('')

  // Optional fields
  const [hubspotCompanyId, setHubspotCompanyId] = useState('')
  const [taxId, setTaxId] = useState('')
  const [taxIdType, setTaxIdType] = useState('RUT')
  const [billingAddress, setBillingAddress] = useState('')
  const [billingCountry, setBillingCountry] = useState('CL')
  const [paymentTermsDays, setPaymentTermsDays] = useState<number | ''>(30)
  const [paymentCurrency, setPaymentCurrency] = useState('')
  const [requiresPo, setRequiresPo] = useState(false)
  const [requiresHes, setRequiresHes] = useState(false)
  const [currentPoNumber, setCurrentPoNumber] = useState('')
  const [currentHesNumber, setCurrentHesNumber] = useState('')
  const [specialConditions, setSpecialConditions] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setClientProfileId('')
    setLegalName('')
    setHubspotCompanyId('')
    setTaxId('')
    setTaxIdType('RUT')
    setBillingAddress('')
    setBillingCountry('CL')
    setPaymentTermsDays(30)
    setPaymentCurrency('')
    setRequiresPo(false)
    setRequiresHes(false)
    setCurrentPoNumber('')
    setCurrentHesNumber('')
    setSpecialConditions('')
    setError(null)
  }

  const handleSubmit = async () => {
    if (!legalName.trim()) {
      setError('La razón social es obligatoria.')

      return
    }

    setSaving(true)
    setError(null)

    const body = {
      legalName: legalName.trim(),
      ...(clientProfileId.trim() && { clientProfileId: clientProfileId.trim() }),
      ...(hubspotCompanyId.trim() && { hubspotCompanyId: hubspotCompanyId.trim() }),
      ...(taxId.trim() && { taxId: taxId.trim() }),
      ...(taxIdType && { taxIdType }),
      ...(billingAddress.trim() && { billingAddress: billingAddress.trim() }),
      ...(billingCountry.trim() && { billingCountry: billingCountry.trim() }),
      ...(paymentTermsDays !== '' && { paymentTermsDays: Number(paymentTermsDays) }),
      ...(paymentCurrency && { paymentCurrency }),
      ...(requiresPo && { requiresPo }),
      ...(requiresHes && { requiresHes }),
      ...(currentPoNumber.trim() && { currentPoNumber: currentPoNumber.trim() }),
      ...(currentHesNumber.trim() && { currentHesNumber: currentHesNumber.trim() }),
      ...(specialConditions.trim() && { specialConditions: specialConditions.trim() })
    }

    try {
      const res = await fetch('/api/finance/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al crear perfil de cliente')
        setSaving(false)

        return
      }

      toast.success('Perfil de cliente creado exitosamente')
      resetForm()
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
      PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Typography variant='h6'>Nuevo perfil de cliente</Typography>
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
          label='ID del perfil'
          helperText='Opcional. Si lo dejas vacío, el sistema usará el identificador canónico disponible.'
          value={clientProfileId}
          onChange={e => setClientProfileId(e.target.value)}
        />

        <CustomTextField
          fullWidth
          size='small'
          label='Razón social'
          value={legalName}
          onChange={e => setLegalName(e.target.value)}
          required
        />

        <CustomTextField
          fullWidth
          size='small'
          label='HubSpot Company ID'
          value={hubspotCompanyId}
          onChange={e => setHubspotCompanyId(e.target.value)}
        />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Tipo ID tributario'
              value={taxIdType}
              onChange={e => setTaxIdType(e.target.value)}
            >
              {TAX_ID_TYPES.map(t => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='RUT / Tax ID'
              value={taxId}
              onChange={e => setTaxId(e.target.value)}
            />
          </Grid>
        </Grid>

        <CustomTextField
          fullWidth
          size='small'
          label='Dirección de facturación'
          value={billingAddress}
          onChange={e => setBillingAddress(e.target.value)}
        />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='País'
              value={billingCountry}
              onChange={e => setBillingCountry(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Plazo de pago (días)'
              type='number'
              value={paymentTermsDays}
              onChange={e => setPaymentTermsDays(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Moneda de pago'
              value={paymentCurrency}
              onChange={e => setPaymentCurrency(e.target.value)}
            >
              <MenuItem value=''>—</MenuItem>
              {CURRENCIES.map(c => (
                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
              ))}
            </CustomTextField>
          </Grid>
        </Grid>

        <FormControlLabel
          control={
            <Switch
              checked={requiresPo}
              onChange={e => setRequiresPo(e.target.checked)}
            />
          }
          label='Requiere OC'
        />

        <FormControlLabel
          control={
            <Switch
              checked={requiresHes}
              onChange={e => setRequiresHes(e.target.checked)}
            />
          }
          label='Requiere HES'
        />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='N° OC vigente'
              value={currentPoNumber}
              onChange={e => setCurrentPoNumber(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='N° HES vigente'
              value={currentHesNumber}
              onChange={e => setCurrentHesNumber(e.target.value)}
            />
          </Grid>
        </Grid>

        <CustomTextField
          fullWidth
          size='small'
          label='Condiciones especiales'
          value={specialConditions}
          onChange={e => setSpecialConditions(e.target.value)}
          multiline
          rows={3}
        />
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} fullWidth>{GREENHOUSE_COPY.actions.cancel}</Button>
        <Button variant='contained' onClick={handleSubmit} disabled={saving} fullWidth>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default CreateClientDrawer
