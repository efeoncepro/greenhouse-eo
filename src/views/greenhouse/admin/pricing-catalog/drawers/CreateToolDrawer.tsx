'use client'

import { useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'

const GREENHOUSE_COPY = getMicrocopy()

const COST_MODELS = [
  { value: 'subscription', label: 'Suscripción' },
  { value: 'one_time', label: 'Pago único' },
  { value: 'usage_based', label: 'Por uso' },
  { value: 'free', label: 'Gratis' }
]

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
  { value: 'quarterly', label: 'Trimestral' }
]

const CURRENCIES = ['USD', 'CLP', 'EUR', 'MXN', 'COP', 'ARS']

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const CreateToolDrawer = ({ open, onClose, onSuccess }: Props) => {
  const [toolName, setToolName] = useState('')
  const [toolCategory, setToolCategory] = useState('')
  const [toolSubcategory, setToolSubcategory] = useState('')
  const [vendor, setVendor] = useState('')
  const [providerId, setProviderId] = useState('')
  const [costModel, setCostModel] = useState('subscription')
  const [subscriptionAmount, setSubscriptionAmount] = useState('')
  const [subscriptionCurrency, setSubscriptionCurrency] = useState('USD')
  const [subscriptionBillingCycle, setSubscriptionBillingCycle] = useState('monthly')
  const [subscriptionSeats, setSubscriptionSeats] = useState('')
  const [description, setDescription] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setToolName('')
    setToolCategory('')
    setToolSubcategory('')
    setVendor('')
    setProviderId('')
    setCostModel('subscription')
    setSubscriptionAmount('')
    setSubscriptionCurrency('USD')
    setSubscriptionBillingCycle('monthly')
    setSubscriptionSeats('')
    setDescription('')
    setWebsiteUrl('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    if (!toolName.trim()) {
      setError('Ingresa un nombre para la herramienta.')

      return
    }

    if (!toolCategory.trim()) {
      setError('Ingresa una categoría para la herramienta.')

      return
    }

    if (!providerId.trim()) {
      setError('Ingresa el provider_id (debe existir en greenhouse_core.providers).')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/pricing-catalog/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: toolName.trim(),
          toolCategory: toolCategory.trim(),
          toolSubcategory: toolSubcategory.trim() || null,
          vendor: vendor.trim() || null,
          providerId: providerId.trim(),
          costModel,
          ...(costModel === 'subscription' && {
            ...(subscriptionAmount && { subscriptionAmount: Number(subscriptionAmount) }),
            subscriptionCurrency,
            subscriptionBillingCycle,
            ...(subscriptionSeats && { subscriptionSeats: Number(subscriptionSeats) })
          }),
          description: description.trim() || null,
          websiteUrl: websiteUrl.trim() || null
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        setError(
          payload.error ||
            'No pudimos crear la herramienta. Revisa que todos los campos requeridos estén completos.'
        )
        setSaving(false)

        return
      }

      const created = (await res.json()) as { toolSku?: string | null; toolName?: string }

      toast.success(
        created.toolSku
          ? `Herramienta creada — SKU ${created.toolSku} asignado`
          : `${created.toolName ?? 'Herramienta'} creada`
      )
      resetForm()
      onClose()
      onSuccess()
    } catch {
      setError('No se pudo conectar al servidor. Verifica tu conexión.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={handleClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Typography variant='h6'>Nueva herramienta</Typography>
        <IconButton onClick={handleClose} size='small' aria-label={GREENHOUSE_COPY.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && (
          <Alert severity='error' onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography variant='body2' color='text.secondary'>
          El SKU se asigna automáticamente al guardar.
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Nombre de la herramienta'
              value={toolName}
              onChange={e => setToolName(e.target.value)}
              required
              placeholder='ej. Figma Professional'
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Categoría'
              value={toolCategory}
              onChange={e => setToolCategory(e.target.value)}
              required
              placeholder='ej. diseño, analytics, productividad'
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Subcategoría (opcional)'
              value={toolSubcategory}
              onChange={e => setToolSubcategory(e.target.value)}
              placeholder='ej. UI/UX'
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Vendor (opcional)'
              value={vendor}
              onChange={e => setVendor(e.target.value)}
              placeholder='ej. Figma Inc.'
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Provider ID'
              value={providerId}
              onChange={e => setProviderId(e.target.value)}
              required
              helperText='ID registrado en greenhouse_core.providers'
              placeholder='ej. figma'
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Modelo de costo'
              value={costModel}
              onChange={e => setCostModel(e.target.value)}
              required
            >
              {COST_MODELS.map(m => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          {costModel === 'subscription' && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Monto'
                  type='number'
                  value={subscriptionAmount}
                  onChange={e => setSubscriptionAmount(e.target.value)}
                  placeholder='ej. 15'
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label='Moneda'
                  value={subscriptionCurrency}
                  onChange={e => setSubscriptionCurrency(e.target.value)}
                >
                  {CURRENCIES.map(c => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label='Ciclo de facturación'
                  value={subscriptionBillingCycle}
                  onChange={e => setSubscriptionBillingCycle(e.target.value)}
                >
                  {BILLING_CYCLES.map(c => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Asientos (opcional)'
                  type='number'
                  value={subscriptionSeats}
                  onChange={e => setSubscriptionSeats(e.target.value)}
                  placeholder='ej. 5'
                />
              </Grid>
            </>
          )}

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Descripción (opcional)'
              multiline
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Sitio web (opcional)'
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder='ej. https://figma.com'
            />
          </Grid>
        </Grid>
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={handleClose} fullWidth>{GREENHOUSE_COPY.actions.cancel}</Button>
        <Button
          variant='contained'
          color='primary'
          onClick={handleSubmit}
          disabled={saving}
          fullWidth
          startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}
        >
          {saving ? 'Creando...' : 'Crear herramienta'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default CreateToolDrawer
