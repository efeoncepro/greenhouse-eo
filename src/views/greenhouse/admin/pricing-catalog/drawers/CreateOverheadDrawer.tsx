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

type AddonType = 'overhead_fixed' | 'fee_percentage' | 'fee_fixed' | 'resource_month' | 'adjustment_pct'

const ADDON_TYPE_OPTIONS: { value: AddonType; label: string; description: string }[] = [
  { value: 'overhead_fixed', label: 'Overhead fijo', description: 'Monto USD fijo que se agrega al costo' },
  { value: 'fee_percentage', label: 'Fee porcentual', description: 'Porcentaje del total (ej. 10%)' },
  { value: 'fee_fixed', label: 'Fee fijo', description: 'Monto USD fijo como fee' },
  { value: 'resource_month', label: 'Recurso por mes', description: 'Costo mensual por recurso adicional' },
  { value: 'adjustment_pct', label: 'Ajuste porcentual', description: 'Ajuste como % (puede ser rango)' }
]

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const CreateOverheadDrawer = ({ open, onClose, onSuccess }: Props) => {
  const [category, setCategory] = useState('')
  const [addonName, setAddonName] = useState('')
  const [addonType, setAddonType] = useState<AddonType>('overhead_fixed')
  const [unit, setUnit] = useState('')

  // Cost-based fields
  const [costInternalUsd, setCostInternalUsd] = useState('')
  const [marginPct, setMarginPct] = useState('')
  const [finalPriceUsd, setFinalPriceUsd] = useState('')

  // Percentage-based fields
  const [finalPricePct, setFinalPricePct] = useState('')
  const [pctMin, setPctMin] = useState('')
  const [pctMax, setPctMax] = useState('')

  // Common
  const [minimumAmountUsd, setMinimumAmountUsd] = useState('')
  const [description, setDescription] = useState('')
  const [conditions, setConditions] = useState('')
  const [visibleToClient, setVisibleToClient] = useState(true)
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setCategory('')
    setAddonName('')
    setAddonType('overhead_fixed')
    setUnit('')
    setCostInternalUsd('')
    setMarginPct('')
    setFinalPriceUsd('')
    setFinalPricePct('')
    setPctMin('')
    setPctMax('')
    setMinimumAmountUsd('')
    setDescription('')
    setConditions('')
    setVisibleToClient(true)
    setNotes('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const isPercentage = addonType === 'fee_percentage' || addonType === 'adjustment_pct'
  const isCostBased = addonType === 'overhead_fixed' || addonType === 'fee_fixed' || addonType === 'resource_month'

  const handleSubmit = async () => {
    if (!category.trim()) {
      setError('Ingresa una categoría.')

      return
    }

    if (!addonName.trim()) {
      setError('Ingresa un nombre para el overhead.')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/pricing-catalog/overheads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category.trim(),
          addonName: addonName.trim(),
          addonType,
          unit: unit.trim() || null,
          ...(isCostBased && {
            ...(costInternalUsd && { costInternalUsd: Number(costInternalUsd) }),
            ...(marginPct && { marginPct: Number(marginPct) }),
            ...(finalPriceUsd && { finalPriceUsd: Number(finalPriceUsd) })
          }),
          ...(isPercentage && {
            ...(finalPricePct && { finalPricePct: Number(finalPricePct) }),
            ...(pctMin && { pctMin: Number(pctMin) }),
            ...(pctMax && { pctMax: Number(pctMax) })
          }),
          ...(minimumAmountUsd && { minimumAmountUsd: Number(minimumAmountUsd) }),
          description: description.trim() || null,
          conditions: conditions.trim() || null,
          visibleToClient,
          notes: notes.trim() || null
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        setError(
          payload.error ||
            'No pudimos crear el overhead. Revisa que todos los campos requeridos estén completos.'
        )
        setSaving(false)

        return
      }

      const created = (await res.json()) as { addonSku?: string; addonName?: string }

      toast.success(
        created.addonSku
          ? `Overhead creado — SKU ${created.addonSku} asignado`
          : `${created.addonName ?? 'Overhead'} creado`
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
        <Typography variant='h6'>Nuevo overhead o fee</Typography>
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
          El SKU se asigna automáticamente al guardar.
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Categoría'
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
              placeholder='ej. production_fund, agency_fee'
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Unidad (opcional)'
              value={unit}
              onChange={e => setUnit(e.target.value)}
              placeholder='ej. mes, proyecto'
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Nombre'
              value={addonName}
              onChange={e => setAddonName(e.target.value)}
              required
              placeholder='ej. Fondo de producción estándar'
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Tipo'
              value={addonType}
              onChange={e => setAddonType(e.target.value as AddonType)}
              required
              helperText={ADDON_TYPE_OPTIONS.find(o => o.value === addonType)?.description}
            >
              {ADDON_TYPE_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          {isCostBased && (
            <>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Costo interno USD'
                  type='number'
                  value={costInternalUsd}
                  onChange={e => setCostInternalUsd(e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Margen %'
                  type='number'
                  value={marginPct}
                  onChange={e => setMarginPct(e.target.value)}
                  placeholder='ej. 30'
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Precio final USD'
                  type='number'
                  value={finalPriceUsd}
                  onChange={e => setFinalPriceUsd(e.target.value)}
                />
              </Grid>
            </>
          )}

          {isPercentage && (
            <>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='% objetivo'
                  type='number'
                  value={finalPricePct}
                  onChange={e => setFinalPricePct(e.target.value)}
                  placeholder='ej. 10'
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='% mínimo'
                  type='number'
                  value={pctMin}
                  onChange={e => setPctMin(e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='% máximo'
                  type='number'
                  value={pctMax}
                  onChange={e => setPctMax(e.target.value)}
                />
              </Grid>
            </>
          )}

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Monto mínimo USD (opcional)'
              type='number'
              value={minimumAmountUsd}
              onChange={e => setMinimumAmountUsd(e.target.value)}
              helperText='Piso por debajo del cual no aplica'
            />
          </Grid>

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
              label='Condiciones de uso (opcional)'
              multiline
              rows={2}
              value={conditions}
              onChange={e => setConditions(e.target.value)}
              placeholder='Cuándo aplica este overhead'
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={visibleToClient}
                  onChange={e => setVisibleToClient(e.target.checked)}
                />
              }
              label='Visible al cliente en cotizaciones'
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Notas internas (opcional)'
              multiline
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
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
          {saving ? 'Creando...' : 'Crear overhead'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default CreateOverheadDrawer
