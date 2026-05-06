'use client'

import { useCallback, useEffect, useState } from 'react'

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

import { getMicrocopy } from '@/lib/copy'

import ImpactPreviewPanel from '@/components/greenhouse/pricing/ImpactPreviewPanel'

import CustomTextField from '@core/components/mui/TextField'

const GREENHOUSE_COPY = getMicrocopy()

type AddonType = 'overhead_fixed' | 'fee_percentage' | 'fee_fixed' | 'resource_month' | 'adjustment_pct'

const ADDON_TYPE_OPTIONS: { value: AddonType; label: string; description: string }[] = [
  { value: 'overhead_fixed', label: 'Overhead fijo', description: 'Monto USD fijo que se agrega al costo' },
  { value: 'fee_percentage', label: 'Fee porcentual', description: 'Porcentaje del total (ej. 10%)' },
  { value: 'fee_fixed', label: 'Fee fijo', description: 'Monto USD fijo como fee' },
  { value: 'resource_month', label: 'Recurso por mes', description: 'Costo mensual por recurso adicional' },
  { value: 'adjustment_pct', label: 'Ajuste porcentual', description: 'Ajuste como % (puede ser rango)' }
]

interface OverheadItem {
  addonId: string
  addonSku: string
  category: string
  addonName: string
  addonType: string
  unit: string | null
  costInternalUsd: number
  marginPct: number | null
  finalPriceUsd: number | null
  finalPricePct: number | null
  pctMin: number | null
  pctMax: number | null
  minimumAmountUsd: number | null
  applicableTo: string[]
  description: string | null
  conditions: string | null
  visibleToClient: boolean
  active: boolean
  notes: string | null
}

interface Props {
  open: boolean
  overheadId: string | null
  onClose: () => void
  onSuccess?: () => void
}

const joinList = (value: string[] | null | undefined): string =>
  Array.isArray(value) ? value.join(', ') : ''

const parseList = (value: string): string[] =>
  value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

const EditOverheadDrawer = ({ open, overheadId, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [impactBlocking, setImpactBlocking] = useState(false)

  const [category, setCategory] = useState('')
  const [addonName, setAddonName] = useState('')
  const [addonType, setAddonType] = useState<AddonType>('overhead_fixed')
  const [unit, setUnit] = useState('')
  const [costInternalUsd, setCostInternalUsd] = useState('')
  const [marginPct, setMarginPct] = useState('')
  const [finalPriceUsd, setFinalPriceUsd] = useState('')
  const [finalPricePct, setFinalPricePct] = useState('')
  const [pctMin, setPctMin] = useState('')
  const [pctMax, setPctMax] = useState('')
  const [minimumAmountUsd, setMinimumAmountUsd] = useState('')
  const [applicableTo, setApplicableTo] = useState('')
  const [description, setDescription] = useState('')
  const [conditions, setConditions] = useState('')
  const [visibleToClient, setVisibleToClient] = useState(true)
  const [notes, setNotes] = useState('')
  const [active, setActive] = useState(true)

  const [loadedSku, setLoadedSku] = useState<string | null>(null)

  const isPercentage = addonType === 'fee_percentage' || addonType === 'adjustment_pct'
  const isCostBased = addonType === 'overhead_fixed' || addonType === 'fee_fixed' || addonType === 'resource_month'

  const loadOverhead = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/pricing-catalog/overheads')

      if (!res.ok) {
        setError('No pudimos cargar la información del overhead.')

        return
      }

      const data = (await res.json()) as { items: OverheadItem[] }
      const row = data.items.find(item => item.addonId === id)

      if (!row) {
        setError('El overhead no existe o fue eliminado.')

        return
      }

      setLoadedSku(row.addonSku)
      setCategory(row.category ?? '')
      setAddonName(row.addonName ?? '')

      const type = (row.addonType as AddonType) || 'overhead_fixed'

      setAddonType(type)
      setUnit(row.unit ?? '')
      setCostInternalUsd(row.costInternalUsd != null ? String(row.costInternalUsd) : '')
      setMarginPct(row.marginPct != null ? String(row.marginPct) : '')
      setFinalPriceUsd(row.finalPriceUsd != null ? String(row.finalPriceUsd) : '')
      setFinalPricePct(row.finalPricePct != null ? String(row.finalPricePct) : '')
      setPctMin(row.pctMin != null ? String(row.pctMin) : '')
      setPctMax(row.pctMax != null ? String(row.pctMax) : '')
      setMinimumAmountUsd(row.minimumAmountUsd != null ? String(row.minimumAmountUsd) : '')
      setApplicableTo(joinList(row.applicableTo))
      setDescription(row.description ?? '')
      setConditions(row.conditions ?? '')
      setVisibleToClient(Boolean(row.visibleToClient))
      setNotes(row.notes ?? '')
      setActive(Boolean(row.active))
    } catch {
      setError('No se pudo conectar al servidor. Verifica tu conexión.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && overheadId) {
      void loadOverhead(overheadId)
    }

    if (!open) {
      setError(null)
      setLoadedSku(null)
    }
  }, [open, overheadId, loadOverhead])

  const handleClose = () => {
    if (saving) return
    onClose()
  }

  const handleSubmit = async () => {
    if (!overheadId) return

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

    const body: Record<string, unknown> = {
      category: category.trim(),
      addonName: addonName.trim(),
      addonType,
      unit: unit.trim() || null,
      costInternalUsd: isCostBased && costInternalUsd ? Number(costInternalUsd) : isCostBased ? 0 : null,
      marginPct: isCostBased && marginPct ? Number(marginPct) : null,
      finalPriceUsd: isCostBased && finalPriceUsd ? Number(finalPriceUsd) : null,
      finalPricePct: isPercentage && finalPricePct ? Number(finalPricePct) : null,
      pctMin: isPercentage && pctMin ? Number(pctMin) : null,
      pctMax: isPercentage && pctMax ? Number(pctMax) : null,
      minimumAmountUsd: minimumAmountUsd ? Number(minimumAmountUsd) : null,
      applicableTo: parseList(applicableTo),
      description: description.trim() || null,
      conditions: conditions.trim() || null,
      visibleToClient,
      notes: notes.trim() || null,
      active
    }

    try {
      const res = await fetch(`/api/admin/pricing-catalog/overheads/${overheadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        setError(payload.error || 'No pudimos guardar los cambios. Intenta nuevamente.')
        setSaving(false)

        return
      }

      toast.success('Overhead actualizado')
      onClose()
      onSuccess?.()
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
        <Box>
          <Typography variant='h6'>Editar overhead</Typography>
          {loadedSku ? (
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              SKU {loadedSku}
            </Typography>
          ) : null}
        </Box>
        <IconButton onClick={handleClose} size='small' aria-label={GREENHOUSE_COPY.actions.close} disabled={saving}>
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

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Categoría'
                value={category}
                onChange={e => setCategory(e.target.value)}
                required
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
                label='Aplicable a'
                value={applicableTo}
                onChange={e => setApplicableTo(e.target.value)}
                helperText='Separa los valores con comas. Ej: production, media_ads, influencers'
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

            <Grid size={{ xs: 12, sm: 6 }}>
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

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={active}
                    onChange={e => setActive(e.target.checked)}
                  />
                }
                label='Overhead activo'
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
        )}
      </Stack>

      <Divider />
      {overheadId ? (
        <Box sx={{ px: 4, py: 2 }}>
          <ImpactPreviewPanel
            entityType='overhead_addon'
            entityId={overheadId}
            onBlockingStateChange={setImpactBlocking}
          />
        </Box>
      ) : null}
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={handleClose} fullWidth disabled={saving}>{GREENHOUSE_COPY.actions.cancel}</Button>
        <Button
          variant='contained'
          color='primary'
          onClick={handleSubmit}
          disabled={saving || loading || impactBlocking}
          fullWidth
          startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}
        >
          {saving ? 'Guardando...' : impactBlocking ? 'Confirmar impacto alto' : 'Guardar cambios'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default EditOverheadDrawer
