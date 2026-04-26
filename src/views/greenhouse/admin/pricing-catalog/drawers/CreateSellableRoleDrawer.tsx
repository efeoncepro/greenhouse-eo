'use client'

import { useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import {
  PRICING_TIER_CODES,
  PRICING_TIER_LABELS,
  type PricingTierCode
} from '@/lib/commercial/pricing-governance-types'

type Category = 'creativo' | 'pr' | 'performance' | 'consultoria' | 'tech'

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'creativo', label: 'Creativo' },
  { value: 'pr', label: 'PR' },
  { value: 'performance', label: 'Performance' },
  { value: 'consultoria', label: 'Consultoría' },
  { value: 'tech', label: 'Tech' }
]

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const CreateSellableRoleDrawer = ({ open, onClose, onSuccess }: Props) => {
  const [roleLabelEs, setRoleLabelEs] = useState('')
  const [roleLabelEn, setRoleLabelEn] = useState('')
  const [category, setCategory] = useState<Category>('creativo')
  const [tier, setTier] = useState<PricingTierCode>('2')
  const [canSellAsStaff, setCanSellAsStaff] = useState(false)
  const [canSellAsServiceComponent, setCanSellAsServiceComponent] = useState(true)
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setRoleLabelEs('')
    setRoleLabelEn('')
    setCategory('creativo')
    setTier('2')
    setCanSellAsStaff(false)
    setCanSellAsServiceComponent(true)
    setNotes('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    if (!roleLabelEs.trim()) {
      setError('Ingresa un nombre para el rol en español.')

      return
    }

    if (!canSellAsStaff && !canSellAsServiceComponent) {
      setError('Selecciona al menos una forma de venta (staff o componente de servicio).')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/pricing-catalog/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleLabelEs: roleLabelEs.trim(),
          roleLabelEn: roleLabelEn.trim() || null,
          category,
          tier,
          tierLabel: PRICING_TIER_LABELS[tier],
          canSellAsStaff,
          canSellAsServiceComponent,
          notes: notes.trim() || null
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        setError(
          payload.error ||
            'No pudimos crear el rol. Revisa que todos los campos requeridos estén completos.'
        )
        setSaving(false)

        return
      }

      const created = (await res.json()) as { roleSku?: string }

      toast.success(created.roleSku ? `Rol creado — SKU ${created.roleSku} asignado` : 'Rol creado')
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
      PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Typography variant='h6'>Nuevo rol vendible</Typography>
        <IconButton onClick={handleClose} size='small' aria-label='Cerrar'>
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
          El SKU se asigna automáticamente al guardar (prefijo ECG).
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Nombre del rol (español)'
              value={roleLabelEs}
              onChange={e => setRoleLabelEs(e.target.value)}
              required
              placeholder='ej. Creative Director Senior'
              helperText='Como aparecerá en cotizaciones y catálogos'
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Nombre del rol (inglés, opcional)'
              value={roleLabelEn}
              onChange={e => setRoleLabelEn(e.target.value)}
              placeholder='ej. Senior Creative Director'
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Categoría'
              value={category}
              onChange={e => setCategory(e.target.value as Category)}
              required
            >
              {CATEGORY_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Tier'
              value={tier}
              onChange={e => setTier(e.target.value as PricingTierCode)}
              required
              helperText='Define rango de margen'
            >
              {PRICING_TIER_CODES.map(t => (
                <MenuItem key={t} value={t}>
                  T{t} · {PRICING_TIER_LABELS[t]}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>
              Formas de venta
            </Typography>
            <Stack direction='column' spacing={0}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={canSellAsStaff}
                    onChange={e => setCanSellAsStaff(e.target.checked)}
                  />
                }
                label='Vendible como staff (dedicación mensual)'
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={canSellAsServiceComponent}
                    onChange={e => setCanSellAsServiceComponent(e.target.checked)}
                  />
                }
                label='Vendible como componente de servicio'
              />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Notas (opcional)'
              multiline
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder='Contexto o restricciones de uso'
            />
          </Grid>
        </Grid>
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={handleClose} fullWidth>
          Cancelar
        </Button>
        <Button
          variant='contained'
          color='primary'
          onClick={handleSubmit}
          disabled={saving}
          fullWidth
          startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}
        >
          {saving ? 'Creando...' : 'Crear rol'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default CreateSellableRoleDrawer
