'use client'

import { useState } from 'react'

import { toast } from 'react-toastify'

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

import CustomTextField from '@core/components/mui/TextField'

const CATEGORIES = [
  { value: 'software', label: 'Software' },
  { value: 'infrastructure', label: 'Infraestructura' },
  { value: 'professional_services', label: 'Servicios profesionales' },
  { value: 'media', label: 'Medios' },
  { value: 'creative', label: 'Creativo' },
  { value: 'hr_services', label: 'RRHH' },
  { value: 'office', label: 'Oficina' },
  { value: 'legal_accounting', label: 'Legal y contable' },
  { value: 'other', label: 'Otro' }
]

const TAX_ID_TYPES = [
  { value: 'RUT', label: 'RUT' },
  { value: 'NIT', label: 'NIT' },
  { value: 'RFC', label: 'RFC' },
  { value: 'RUC', label: 'RUC' },
  { value: 'EIN', label: 'EIN' },
  { value: 'OTHER', label: 'Otro' }
]

const COUNTRIES = [
  { value: 'CL', label: 'Chile' },
  { value: 'AR', label: 'Argentina' },
  { value: 'BR', label: 'Brasil' },
  { value: 'CO', label: 'Colombia' },
  { value: 'MX', label: 'México' },
  { value: 'PE', label: 'Perú' },
  { value: 'UY', label: 'Uruguay' },
  { value: 'EC', label: 'Ecuador' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'ES', label: 'España' },
  { value: 'GB', label: 'Reino Unido' },
  { value: 'OTHER', label: 'Otro' }
]

const SERVICE_TYPES = [
  { value: 'consulting', label: 'Consultoría' },
  { value: 'development', label: 'Desarrollo' },
  { value: 'design', label: 'Diseño' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'media_buying', label: 'Compra de medios' },
  { value: 'hosting', label: 'Hosting / Cloud' },
  { value: 'saas', label: 'SaaS / Licencias' },
  { value: 'legal', label: 'Legal' },
  { value: 'accounting', label: 'Contabilidad' },
  { value: 'hr', label: 'Recursos Humanos' },
  { value: 'office_supplies', label: 'Suministros de oficina' },
  { value: 'other', label: 'Otro' }
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

const CreateSupplierDrawer = ({ open, onClose, onSuccess }: Props) => {
  // Required fields
  const [legalName, setLegalName] = useState('')
  const [category, setCategory] = useState('')
  const [country, setCountry] = useState('CL')

  // Optional fields
  const [tradeName, setTradeName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [taxIdType, setTaxIdType] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [isInternational, setIsInternational] = useState(false)
  const [paymentCurrency, setPaymentCurrency] = useState('')
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState<number | ''>(30)
  const [primaryContactName, setPrimaryContactName] = useState('')
  const [primaryContactEmail, setPrimaryContactEmail] = useState('')
  const [primaryContactPhone, setPrimaryContactPhone] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCountryChange = (value: string) => {
    setCountry(value)
    setIsInternational(value !== 'CL')

    if (value !== 'CL' && !paymentCurrency) {
      setPaymentCurrency('USD')
    } else if (value === 'CL' && paymentCurrency === 'USD') {
      setPaymentCurrency('CLP')
    }
  }

  const resetForm = () => {
    setLegalName('')
    setCategory('')
    setCountry('CL')
    setTradeName('')
    setTaxId('')
    setTaxIdType('')
    setServiceType('')
    setIsInternational(false)
    setPaymentCurrency('')
    setDefaultPaymentTerms(30)
    setPrimaryContactName('')
    setPrimaryContactEmail('')
    setPrimaryContactPhone('')
    setError(null)
  }

  const handleSubmit = async () => {
    if (!legalName.trim() || !category || !country.trim()) {
      setError('Razón social, categoría y país son obligatorios.')

      return
    }

    setSaving(true)
    setError(null)

    const body = {
      legalName: legalName.trim(),
      category,
      country: country.trim(),
      ...(tradeName.trim() && { tradeName: tradeName.trim() }),
      ...(taxId.trim() && { taxId: taxId.trim() }),
      ...(taxIdType && { taxIdType }),
      ...(serviceType.trim() && { serviceType: serviceType.trim() }),
      ...(isInternational && { isInternational }),
      ...(paymentCurrency && { paymentCurrency }),
      ...(defaultPaymentTerms !== '' && { defaultPaymentTerms: Number(defaultPaymentTerms) }),
      ...(primaryContactName.trim() && { primaryContactName: primaryContactName.trim() }),
      ...(primaryContactEmail.trim() && { primaryContactEmail: primaryContactEmail.trim() }),
      ...(primaryContactPhone.trim() && { primaryContactPhone: primaryContactPhone.trim() })
    }

    try {
      const res = await fetch('/api/finance/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al crear proveedor')
        setSaving(false)

        return
      }

      toast.success('Proveedor creado exitosamente')
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
        <Typography variant='h6'>Nuevo proveedor</Typography>
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
          label='Razón social'
          value={legalName}
          onChange={e => setLegalName(e.target.value)}
          required
        />

        <CustomTextField
          fullWidth
          size='small'
          label='Nombre comercial'
          value={tradeName}
          onChange={e => setTradeName(e.target.value)}
        />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Categoría'
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
            >
              <MenuItem value=''>—</MenuItem>
              {CATEGORIES.map(c => (
                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='País'
              value={country}
              onChange={e => handleCountryChange(e.target.value)}
              required
            >
              {COUNTRIES.map(c => (
                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
              ))}
            </CustomTextField>
          </Grid>
        </Grid>

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
              <MenuItem value=''>—</MenuItem>
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
          select
          fullWidth
          size='small'
          label='Tipo de servicio'
          value={serviceType}
          onChange={e => setServiceType(e.target.value)}
        >
          <MenuItem value=''>—</MenuItem>
          {SERVICE_TYPES.map(t => (
            <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
          ))}
        </CustomTextField>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
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
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Plazo de pago (días)'
              type='number'
              value={defaultPaymentTerms}
              onChange={e => setDefaultPaymentTerms(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </Grid>
        </Grid>

        <FormControlLabel
          control={
            <Switch
              checked={isInternational}
              onChange={e => setIsInternational(e.target.checked)}
            />
          }
          label='Proveedor internacional'
        />

        <Divider />
        <Typography variant='subtitle2' color='text.secondary'>Contacto principal (opcional)</Typography>

        <CustomTextField
          fullWidth
          size='small'
          label='Nombre contacto'
          value={primaryContactName}
          onChange={e => setPrimaryContactName(e.target.value)}
        />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Email contacto'
              type='email'
              value={primaryContactEmail}
              onChange={e => setPrimaryContactEmail(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Teléfono contacto'
              value={primaryContactPhone}
              onChange={e => setPrimaryContactPhone(e.target.value)}
            />
          </Grid>
        </Grid>
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} fullWidth>
          Cancelar
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={saving} fullWidth>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default CreateSupplierDrawer
