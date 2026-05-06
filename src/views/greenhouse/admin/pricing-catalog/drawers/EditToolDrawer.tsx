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

interface ToolItem {
  toolId: string
  toolSku: string | null
  toolName: string
  providerId: string
  vendor: string | null
  toolCategory: string
  toolSubcategory: string | null
  costModel: string
  subscriptionAmount: number | null
  subscriptionCurrency: string | null
  subscriptionBillingCycle: string | null
  subscriptionSeats?: number | null
  proratingQty?: number | null
  proratingUnit?: string | null
  proratedCostUsd?: number | null
  proratedPriceUsd?: number | null
  applicableBusinessLines?: string[] | null
  applicabilityTags?: string[] | null
  includesInAddon?: boolean
  notesForQuoting?: string | null
  description?: string | null
  websiteUrl?: string | null
  iconUrl?: string | null
  isActive: boolean
}

interface Props {
  open: boolean
  toolId: string | null
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

const EditToolDrawer = ({ open, toolId, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [impactBlocking, setImpactBlocking] = useState(false)

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
  const [proratingQty, setProratingQty] = useState('')
  const [proratingUnit, setProratingUnit] = useState('')
  const [proratedCostUsd, setProratedCostUsd] = useState('')
  const [proratedPriceUsd, setProratedPriceUsd] = useState('')
  const [applicableBusinessLines, setApplicableBusinessLines] = useState('')
  const [applicabilityTags, setApplicabilityTags] = useState('')
  const [includesInAddon, setIncludesInAddon] = useState(false)
  const [notesForQuoting, setNotesForQuoting] = useState('')
  const [description, setDescription] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [iconUrl, setIconUrl] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [loadedSku, setLoadedSku] = useState<string | null>(null)

  const loadTool = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/pricing-catalog/tools')

      if (!res.ok) {
        setError('No pudimos cargar la información de la herramienta.')

        return
      }

      const data = (await res.json()) as { items: ToolItem[] }
      const row = data.items.find(item => item.toolId === id)

      if (!row) {
        setError('La herramienta no existe o fue eliminada.')

        return
      }

      setLoadedSku(row.toolSku)
      setToolName(row.toolName ?? '')
      setToolCategory(row.toolCategory ?? '')
      setToolSubcategory(row.toolSubcategory ?? '')
      setVendor(row.vendor ?? '')
      setProviderId(row.providerId ?? '')
      setCostModel(row.costModel || 'subscription')
      setSubscriptionAmount(row.subscriptionAmount != null ? String(row.subscriptionAmount) : '')
      setSubscriptionCurrency(row.subscriptionCurrency ?? 'USD')
      setSubscriptionBillingCycle(row.subscriptionBillingCycle ?? 'monthly')
      setSubscriptionSeats(row.subscriptionSeats != null ? String(row.subscriptionSeats) : '')
      setProratingQty(row.proratingQty != null ? String(row.proratingQty) : '')
      setProratingUnit(row.proratingUnit ?? '')
      setProratedCostUsd(row.proratedCostUsd != null ? String(row.proratedCostUsd) : '')
      setProratedPriceUsd(row.proratedPriceUsd != null ? String(row.proratedPriceUsd) : '')
      setApplicableBusinessLines(joinList(row.applicableBusinessLines))
      setApplicabilityTags(joinList(row.applicabilityTags))
      setIncludesInAddon(Boolean(row.includesInAddon))
      setNotesForQuoting(row.notesForQuoting ?? '')
      setDescription(row.description ?? '')
      setWebsiteUrl(row.websiteUrl ?? '')
      setIconUrl(row.iconUrl ?? '')
      setIsActive(Boolean(row.isActive))
    } catch {
      setError('No se pudo conectar al servidor. Verifica tu conexión.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && toolId) {
      void loadTool(toolId)
    }

    if (!open) {
      setError(null)
      setLoadedSku(null)
    }
  }, [open, toolId, loadTool])

  const handleClose = () => {
    if (saving) return
    onClose()
  }

  const handleSubmit = async () => {
    if (!toolId) return

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

    const body: Record<string, unknown> = {
      toolName: toolName.trim(),
      toolCategory: toolCategory.trim(),
      toolSubcategory: toolSubcategory.trim() || null,
      vendor: vendor.trim() || null,
      providerId: providerId.trim(),
      costModel,
      subscriptionAmount: subscriptionAmount ? Number(subscriptionAmount) : null,
      subscriptionCurrency: subscriptionCurrency || null,
      subscriptionBillingCycle: subscriptionBillingCycle || null,
      subscriptionSeats: subscriptionSeats ? Number(subscriptionSeats) : null,
      proratingQty: proratingQty ? Number(proratingQty) : null,
      proratingUnit: proratingUnit.trim() || null,
      proratedCostUsd: proratedCostUsd ? Number(proratedCostUsd) : null,
      proratedPriceUsd: proratedPriceUsd ? Number(proratedPriceUsd) : null,
      applicableBusinessLines: parseList(applicableBusinessLines),
      applicabilityTags: parseList(applicabilityTags),
      includesInAddon,
      notesForQuoting: notesForQuoting.trim() || null,
      description: description.trim() || null,
      websiteUrl: websiteUrl.trim() || null,
      iconUrl: iconUrl.trim() || null,
      isActive
    }

    try {
      const res = await fetch(`/api/admin/pricing-catalog/tools/${toolId}`, {
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

      toast.success('Herramienta actualizada')
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
          <Typography variant='h6'>Editar herramienta</Typography>
          {loadedSku ? (
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              SKU {loadedSku}
            </Typography>
          ) : null}
        </Box>
        <IconButton onClick={handleClose} size='small' aria-label='Cerrar' disabled={saving}>
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
            <Grid size={{ xs: 12 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Nombre de la herramienta'
                value={toolName}
                onChange={e => setToolName(e.target.value)}
                required
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
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Subcategoría (opcional)'
                value={toolSubcategory}
                onChange={e => setToolSubcategory(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Vendor (opcional)'
                value={vendor}
                onChange={e => setVendor(e.target.value)}
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
                  />
                </Grid>
              </>
            )}

            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Cantidad a prorratear'
                type='number'
                value={proratingQty}
                onChange={e => setProratingQty(e.target.value)}
                helperText='Base para prorrateo'
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Unidad de prorrateo'
                value={proratingUnit}
                onChange={e => setProratingUnit(e.target.value)}
                placeholder='ej. seat, mes'
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Costo prorrateado USD'
                type='number'
                value={proratedCostUsd}
                onChange={e => setProratedCostUsd(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Precio prorrateado USD'
                type='number'
                value={proratedPriceUsd}
                onChange={e => setProratedPriceUsd(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includesInAddon}
                    onChange={e => setIncludesInAddon(e.target.checked)}
                  />
                }
                label='Incluye en addon'
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Líneas de negocio aplicables'
                value={applicableBusinessLines}
                onChange={e => setApplicableBusinessLines(e.target.value)}
                helperText='Separa los valores con comas. Ej: performance, branding, development'
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Tags de aplicabilidad'
                value={applicabilityTags}
                onChange={e => setApplicabilityTags(e.target.value)}
                helperText='Separa los tags con comas'
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Notas para cotizaciones (opcional)'
                multiline
                rows={2}
                value={notesForQuoting}
                onChange={e => setNotesForQuoting(e.target.value)}
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

            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Sitio web (opcional)'
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='URL del ícono (opcional)'
                value={iconUrl}
                onChange={e => setIconUrl(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                  />
                }
                label='Herramienta activa'
              />
            </Grid>
          </Grid>
        )}
      </Stack>

      <Divider />
      {toolId ? (
        <Box sx={{ px: 4, py: 2 }}>
          <ImpactPreviewPanel
            entityType='tool_catalog'
            entityId={toolId}
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

export default EditToolDrawer
