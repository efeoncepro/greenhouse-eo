'use client'

import { useEffect, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
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

import { GH_PRICING } from '@/config/greenhouse-nomenclature'

type ServiceUnit = 'project' | 'monthly'
type CommercialModel = 'on_going' | 'on_demand' | 'hybrid' | 'license_consulting'
type ServiceTier = '1' | '2' | '3' | '4'

const COPY = GH_PRICING.adminServices

const slugifyModuleCode = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')

interface ConstraintIssue {
  code?: string
  field?: string
  message?: string
  severity?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const CreateServiceDrawer = ({ open, onClose, onSuccess }: Props) => {
  const [moduleName, setModuleName] = useState('')
  const [moduleCode, setModuleCode] = useState('')
  const [moduleCodeDirty, setModuleCodeDirty] = useState(false)
  const [serviceCategory, setServiceCategory] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [serviceUnit, setServiceUnit] = useState<ServiceUnit>('monthly')
  const [serviceType, setServiceType] = useState('')
  const [commercialModel, setCommercialModel] = useState<CommercialModel>('on_going')
  const [tier, setTier] = useState<ServiceTier>('2')
  const [defaultDurationMonths, setDefaultDurationMonths] = useState('12')
  const [defaultDescription, setDefaultDescription] = useState('')
  const [businessLineCode, setBusinessLineCode] = useState('')
  const [active, setActive] = useState(true)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<ConstraintIssue[]>([])

  // Auto-suggest moduleCode from moduleName (until user edits it manually)
  useEffect(() => {
    if (!moduleCodeDirty) {
      setModuleCode(slugifyModuleCode(moduleName))
    }
  }, [moduleName, moduleCodeDirty])

  const resetForm = () => {
    setModuleName('')
    setModuleCode('')
    setModuleCodeDirty(false)
    setServiceCategory('')
    setDisplayName('')
    setServiceUnit('monthly')
    setServiceType('')
    setCommercialModel('on_going')
    setTier('2')
    setDefaultDurationMonths('12')
    setDefaultDescription('')
    setBusinessLineCode('')
    setActive(true)
    setError(null)
    setIssues([])
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    setError(null)
    setIssues([])

    if (!moduleName.trim()) {
      setError(COPY.validation.moduleNameRequired)

      return
    }

    if (serviceUnit === 'monthly') {
      if (!defaultDurationMonths.trim()) {
        setError(COPY.validation.durationRequiredForMonthly)

        return
      }

      const parsed = Number(defaultDurationMonths)

      if (!Number.isFinite(parsed) || parsed < 0) {
        setError(COPY.validation.durationMustBePositive)

        return
      }
    }

    setSaving(true)

    try {
      const res = await fetch('/api/admin/pricing-catalog/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleName: moduleName.trim(),
          moduleCode: moduleCode.trim() || null,
          serviceCategory: serviceCategory.trim() || null,
          displayName: displayName.trim() || null,
          serviceUnit,
          serviceType: serviceType.trim() || null,
          commercialModel,
          tier,
          defaultDurationMonths:
            serviceUnit === 'monthly' && defaultDurationMonths.trim()
              ? Number(defaultDurationMonths)
              : null,
          defaultDescription: defaultDescription.trim() || null,
          businessLineCode: businessLineCode.trim() || null,
          active
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        if (res.status === 409) {
          setError(COPY.errorSkuConflict)
        } else if (res.status === 422 && Array.isArray(payload.issues)) {
          setIssues(payload.issues as ConstraintIssue[])
          setError(COPY.errorSave)
        } else {
          setError(payload.error || COPY.errorSave)
        }

        setSaving(false)

        return
      }

      const created = (await res.json()) as { serviceSku?: string }

      toast.success(created.serviceSku ? COPY.toastCreated(created.serviceSku) : COPY.toastUpdated)
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
        <Typography variant='h6'>{COPY.createCta}</Typography>
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

        {issues.length > 0 && (
          <Alert severity='warning'>
            <Typography variant='body2' sx={{ fontWeight: 600, mb: 1 }}>
              Revisa los siguientes campos:
            </Typography>
            <Box component='ul' sx={{ m: 0, pl: 2 }}>
              {issues.map((issue, i) => (
                <li key={i}>
                  <Typography variant='body2'>
                    {issue.field ? <strong>{issue.field}: </strong> : null}
                    {issue.message}
                  </Typography>
                </li>
              ))}
            </Box>
          </Alert>
        )}

        <Typography variant='body2' color='text.secondary'>
          {COPY.skuHint}
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Nombre del servicio'
              value={moduleName}
              onChange={e => setModuleName(e.target.value)}
              required
              placeholder='ej. Servicio de Diseño Digital Full Funnel'
              helperText='Como aparecerá en cotizaciones y catálogos'
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Identificador interno (moduleCode)'
              value={moduleCode}
              onChange={e => {
                setModuleCode(e.target.value)
                setModuleCodeDirty(true)
              }}
              placeholder='ej. diseno-digital-full-funnel'
              helperText={COPY.moduleCodeHint}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Categoría'
              value={serviceCategory}
              onChange={e => setServiceCategory(e.target.value)}
              placeholder='ej. Creatividad y Contenido'
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Nombre comercial (opcional)'
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder='Alias para mostrar al cliente'
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Unidad'
              value={serviceUnit}
              onChange={e => setServiceUnit(e.target.value as ServiceUnit)}
              required
            >
              {Object.entries(COPY.serviceUnits).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Tipo de servicio'
              value={serviceType}
              onChange={e => setServiceType(e.target.value)}
              placeholder='ej. Retainer, Proyecto, Consultoría'
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Modelo comercial'
              value={commercialModel}
              onChange={e => setCommercialModel(e.target.value as CommercialModel)}
              required
            >
              {Object.entries(COPY.commercialModels).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
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
              onChange={e => setTier(e.target.value as ServiceTier)}
              required
            >
              {Object.entries(COPY.tierOptions).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          {serviceUnit === 'monthly' && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                size='small'
                type='number'
                label='Duración (meses)'
                value={defaultDurationMonths}
                onChange={e => setDefaultDurationMonths(e.target.value)}
                inputProps={{ min: 0, step: 1 }}
                helperText={COPY.durationHint}
              />
            </Grid>
          )}

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Unidad de negocio (BL)'
              value={businessLineCode}
              onChange={e => setBusinessLineCode(e.target.value)}
              placeholder='ej. performance, creative'
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Descripción por defecto'
              multiline
              rows={3}
              value={defaultDescription}
              onChange={e => setDefaultDescription(e.target.value)}
              placeholder='Qué incluye el servicio, alcance y entregables'
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={<Switch checked={active} onChange={e => setActive(e.target.checked)} />}
              label={active ? 'Servicio activo (disponible en picker)' : 'Servicio inactivo'}
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
          {saving ? 'Creando...' : COPY.createCta}
        </Button>
      </Box>
    </Drawer>
  )
}

export default CreateServiceDrawer
