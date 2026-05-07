'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { GH_PRICING } from '@/lib/copy/pricing'
import { formatCurrency } from '@/lib/format'

const GREENHOUSE_COPY = getMicrocopy()

// ── Types ──────────────────────────────────────────────────────────────

type ServiceUnit = 'project' | 'monthly'
type CommercialModel = 'on_going' | 'on_demand' | 'hybrid' | 'license_consulting'
type ServiceTier = '1' | '2' | '3' | '4'

interface ServiceRoleRecipeEntry {
  moduleId: string
  lineOrder: number
  roleId: string
  roleSku: string
  roleLabelEs: string
  hoursPerPeriod: number
  quantity: number
  isOptional: boolean
  notes: string | null
}

interface ServiceToolRecipeEntry {
  moduleId: string
  lineOrder: number
  toolId: string
  toolSku: string
  toolName: string | null
  quantity: number
  isOptional: boolean
  passThrough: boolean
  notes: string | null
}

interface ServiceCatalogDetail {
  moduleId: string
  moduleCode: string
  moduleName: string
  serviceSku: string
  serviceCategory: string | null
  displayName: string | null
  serviceUnit: ServiceUnit
  serviceType: string | null
  commercialModel: CommercialModel
  tier: ServiceTier
  defaultDurationMonths: number | null
  defaultDescription: string | null
  businessLineCode: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  roleRecipeCount: number
  toolRecipeCount: number
  roleRecipe: ServiceRoleRecipeEntry[]
  toolRecipe: ServiceToolRecipeEntry[]
}

interface LookupItem {
  sku: string
  label: string
  description?: string | null
  category?: string | null
  metadata?: Record<string, unknown>
}

interface RoleLookupOption extends LookupItem {
  roleId: string
}

interface ToolLookupOption extends LookupItem {
  toolId: string
}

interface RoleRowDraft {
  key: string
  roleId: string
  roleSku: string
  roleLabelEs: string
  hoursPerPeriod: string
  quantity: string
  isOptional: boolean
  notes: string
}

interface ToolRowDraft {
  key: string
  toolId: string
  toolSku: string
  toolName: string
  quantity: string
  isOptional: boolean
  passThrough: boolean
  notes: string
}

interface PricingSimulationResponse {
  service: {
    serviceSku: string
    displayName: string | null
    moduleName: string
    tier: string
    commercialModel: string
  }
  lines: Array<{
    lineOrder: number
    lineType: 'role' | 'tool'
    label: string
  }>
  pricing: {
    totals: {
      subtotalUsd: number
      overheadUsd: number
      totalUsd: number
      totalOutputCurrency: number
      commercialMultiplierApplied: number
      countryFactorApplied: number
      exchangeRateUsed: number
    }
    aggregateMargin: {
      marginPct: number
      classification: 'healthy' | 'warning' | 'critical'
    }
    warnings: string[]
  }
}

interface ConstraintIssue {
  code?: string
  field?: string
  message?: string
  severity?: string
}

interface EditServiceDrawerProps {
  open: boolean
  moduleId: string | null
  onClose: () => void
  onSuccess?: () => void
}

const COPY = GH_PRICING.adminServices

const fmtUsd = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'

  return `${formatCurrency(value, 'USD', {}, 'en-US')} USD`
}

const fmtPct = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'

  return `${(value * 100).toFixed(1)}%`
}

const makeKey = (): string => `row-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`

// ── Component ──────────────────────────────────────────────────────────

const EditServiceDrawer = ({ open, moduleId, onClose, onSuccess }: EditServiceDrawerProps) => {
  // Service load
  const [loading, setLoading] = useState(false)
  const [service, setService] = useState<ServiceCatalogDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // General form
  const [moduleName, setModuleName] = useState('')
  const [serviceCategory, setServiceCategory] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [serviceUnit, setServiceUnit] = useState<ServiceUnit>('monthly')
  const [serviceType, setServiceType] = useState('')
  const [commercialModel, setCommercialModel] = useState<CommercialModel>('on_going')
  const [tier, setTier] = useState<ServiceTier>('2')
  const [defaultDurationMonths, setDefaultDurationMonths] = useState('')
  const [defaultDescription, setDefaultDescription] = useState('')
  const [businessLineCode, setBusinessLineCode] = useState('')
  const [active, setActive] = useState(true)

  const [savingGeneral, setSavingGeneral] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [generalIssues, setGeneralIssues] = useState<ConstraintIssue[]>([])

  // Recipe state
  const [roleRows, setRoleRows] = useState<RoleRowDraft[]>([])
  const [toolRows, setToolRows] = useState<ToolRowDraft[]>([])
  const [savingRecipe, setSavingRecipe] = useState(false)
  const [recipeError, setRecipeError] = useState<string | null>(null)
  const [recipeIssues, setRecipeIssues] = useState<ConstraintIssue[]>([])

  // Lookup options
  const [roleOptions, setRoleOptions] = useState<RoleLookupOption[]>([])
  const [toolOptions, setToolOptions] = useState<ToolLookupOption[]>([])
  const [loadingLookups, setLoadingLookups] = useState(false)

  // Simulation
  const [simulating, setSimulating] = useState(false)
  const [simulation, setSimulation] = useState<PricingSimulationResponse | null>(null)
  const [simulationError, setSimulationError] = useState<string | null>(null)

  // ── Reset ────────────────────────────────────────────────────────────

  const resetAll = useCallback(() => {
    setService(null)
    setLoadError(null)
    setGeneralError(null)
    setGeneralIssues([])
    setRecipeError(null)
    setRecipeIssues([])
    setRoleRows([])
    setToolRows([])
    setSimulation(null)
    setSimulationError(null)
  }, [])

  const handleClose = useCallback(() => {
    resetAll()
    onClose()
  }, [onClose, resetAll])

  // ── Load service ─────────────────────────────────────────────────────

  const loadService = useCallback(async () => {
    if (!moduleId) return

    setLoading(true)
    setLoadError(null)

    try {
      const res = await fetch(`/api/admin/pricing-catalog/services/${moduleId}`)

      if (!res.ok) {
        setLoadError(`${COPY.errorLoad} (HTTP ${res.status}).`)

        return
      }

      const payload = (await res.json()) as ServiceCatalogDetail

      setService(payload)
      setModuleName(payload.moduleName)
      setServiceCategory(payload.serviceCategory ?? '')
      setDisplayName(payload.displayName ?? '')
      setServiceUnit(payload.serviceUnit)
      setServiceType(payload.serviceType ?? '')
      setCommercialModel(payload.commercialModel)
      setTier(payload.tier)
      setDefaultDurationMonths(
        payload.defaultDurationMonths !== null && payload.defaultDurationMonths !== undefined
          ? String(payload.defaultDurationMonths)
          : ''
      )
      setDefaultDescription(payload.defaultDescription ?? '')
      setBusinessLineCode(payload.businessLineCode ?? '')
      setActive(payload.active)

      setRoleRows(
        payload.roleRecipe.map(row => ({
          key: makeKey(),
          roleId: row.roleId,
          roleSku: row.roleSku,
          roleLabelEs: row.roleLabelEs,
          hoursPerPeriod: String(row.hoursPerPeriod),
          quantity: String(row.quantity),
          isOptional: row.isOptional,
          notes: row.notes ?? ''
        }))
      )

      setToolRows(
        payload.toolRecipe.map(row => ({
          key: makeKey(),
          toolId: row.toolId,
          toolSku: row.toolSku,
          toolName: row.toolName ?? '',
          quantity: String(row.quantity),
          isOptional: row.isOptional,
          passThrough: row.passThrough,
          notes: row.notes ?? ''
        }))
      )
    } catch {
      setLoadError('No se pudo conectar al servidor. Verifica tu conexión.')
    } finally {
      setLoading(false)
    }
  }, [moduleId])

  useEffect(() => {
    if (open && moduleId) void loadService()
  }, [open, moduleId, loadService])

  // ── Load lookups ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return

    let cancelled = false

    const loadLookups = async () => {
      setLoadingLookups(true)

      try {
        const [rolesRes, toolsRes] = await Promise.all([
          fetch('/api/finance/quotes/pricing/lookup?type=role&limit=50'),
          fetch('/api/finance/quotes/pricing/lookup?type=tool&limit=50')
        ])

        if (rolesRes.ok) {
          const payload = (await rolesRes.json()) as { items: LookupItem[] }

          if (!cancelled) {
            setRoleOptions(
              payload.items.map(item => ({
                ...item,
                roleId: String((item.metadata as { roleId?: string } | undefined)?.roleId ?? item.sku)
              }))
            )
          }
        }

        if (toolsRes.ok) {
          const payload = (await toolsRes.json()) as { items: LookupItem[] }

          if (!cancelled) {
            setToolOptions(
              payload.items.map(item => ({
                ...item,
                toolId: String((item.metadata as { toolId?: string } | undefined)?.toolId ?? item.sku)
              }))
            )
          }
        }
      } catch {
        // silent — UI shows empty lookup
      } finally {
        if (!cancelled) setLoadingLookups(false)
      }
    }

    void loadLookups()

    return () => {
      cancelled = true
    }
  }, [open])

  // ── General save ─────────────────────────────────────────────────────

  const handleSaveGeneral = async () => {
    if (!service) return

    setGeneralError(null)
    setGeneralIssues([])

    if (!moduleName.trim()) {
      setGeneralError(COPY.validation.moduleNameRequired)

      return
    }

    if (serviceUnit === 'monthly' && defaultDurationMonths.trim()) {
      const parsed = Number(defaultDurationMonths)

      if (!Number.isFinite(parsed) || parsed < 0) {
        setGeneralError(COPY.validation.durationMustBePositive)

        return
      }
    }

    setSavingGeneral(true)

    try {
      const res = await fetch(`/api/admin/pricing-catalog/services/${service.moduleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': `"${service.updatedAt}"`
        },
        body: JSON.stringify({
          moduleName: moduleName.trim(),
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
          setGeneralError(COPY.errorConflict)
        } else if (res.status === 422 && Array.isArray(payload.issues)) {
          setGeneralIssues(payload.issues as ConstraintIssue[])
          setGeneralError(COPY.errorSave)
        } else {
          setGeneralError(payload.error || COPY.errorSave)
        }

        return
      }

      const updated = (await res.json()) as ServiceCatalogDetail

      setService(updated)
      toast.success(COPY.toastUpdated)
      onSuccess?.()
    } catch {
      setGeneralError('No se pudo conectar al servidor. Verifica tu conexión.')
    } finally {
      setSavingGeneral(false)
    }
  }

  // ── Recipe row helpers ───────────────────────────────────────────────

  const addRoleRow = () => {
    setRoleRows(prev => [
      ...prev,
      {
        key: makeKey(),
        roleId: '',
        roleSku: '',
        roleLabelEs: '',
        hoursPerPeriod: '',
        quantity: '1',
        isOptional: false,
        notes: ''
      }
    ])
  }

  const addToolRow = () => {
    setToolRows(prev => [
      ...prev,
      {
        key: makeKey(),
        toolId: '',
        toolSku: '',
        toolName: '',
        quantity: '1',
        isOptional: false,
        passThrough: false,
        notes: ''
      }
    ])
  }

  const removeRoleRow = (key: string) => {
    setRoleRows(prev => prev.filter(r => r.key !== key))
  }

  const removeToolRow = (key: string) => {
    setToolRows(prev => prev.filter(r => r.key !== key))
  }

  const moveRoleRow = (key: string, direction: 'up' | 'down') => {
    setRoleRows(prev => {
      const idx = prev.findIndex(r => r.key === key)

      if (idx < 0) return prev

      const nextIdx = direction === 'up' ? idx - 1 : idx + 1

      if (nextIdx < 0 || nextIdx >= prev.length) return prev

      const copy = [...prev]
      const [item] = copy.splice(idx, 1)

      copy.splice(nextIdx, 0, item)

      return copy
    })
  }

  const moveToolRow = (key: string, direction: 'up' | 'down') => {
    setToolRows(prev => {
      const idx = prev.findIndex(r => r.key === key)

      if (idx < 0) return prev

      const nextIdx = direction === 'up' ? idx - 1 : idx + 1

      if (nextIdx < 0 || nextIdx >= prev.length) return prev

      const copy = [...prev]
      const [item] = copy.splice(idx, 1)

      copy.splice(nextIdx, 0, item)

      return copy
    })
  }

  const updateRoleRow = (key: string, patch: Partial<RoleRowDraft>) => {
    setRoleRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)))
  }

  const updateToolRow = (key: string, patch: Partial<ToolRowDraft>) => {
    setToolRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)))
  }

  // ── Recipe save ──────────────────────────────────────────────────────

  const handleSaveRecipe = async () => {
    if (!service) return

    setRecipeError(null)
    setRecipeIssues([])

    // Client-side validation
    for (const row of roleRows) {
      if (!row.roleId) {
        setRecipeError(COPY.validation.roleRequired)

        return
      }

      const hours = Number(row.hoursPerPeriod)

      if (!Number.isFinite(hours) || hours <= 0) {
        setRecipeError(COPY.validation.hoursMustBePositive)

        return
      }

      const qty = Number(row.quantity)

      if (!Number.isFinite(qty) || qty < 1) {
        setRecipeError(COPY.validation.quantityMustBePositive)

        return
      }
    }

    for (const row of toolRows) {
      if (!row.toolId || !row.toolSku) {
        setRecipeError(COPY.validation.toolRequired)

        return
      }

      const qty = Number(row.quantity)

      if (!Number.isFinite(qty) || qty < 1) {
        setRecipeError(COPY.validation.quantityMustBePositive)

        return
      }
    }

    setSavingRecipe(true)

    try {
      const res = await fetch(`/api/admin/pricing-catalog/services/${service.moduleId}/recipe`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': `"${service.updatedAt}"`
        },
        body: JSON.stringify({
          roleRecipe: roleRows.map(r => ({
            roleId: r.roleId,
            hoursPerPeriod: Number(r.hoursPerPeriod),
            quantity: Number(r.quantity) || 1,
            isOptional: r.isOptional,
            notes: r.notes.trim() || null
          })),
          toolRecipe: toolRows.map(r => ({
            toolId: r.toolId,
            toolSku: r.toolSku,
            quantity: Number(r.quantity) || 1,
            isOptional: r.isOptional,
            passThrough: r.passThrough,
            notes: r.notes.trim() || null
          }))
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        if (res.status === 409) {
          setRecipeError(COPY.errorConflict)
        } else if (res.status === 422 && Array.isArray(payload.issues)) {
          setRecipeIssues(payload.issues as ConstraintIssue[])
          setRecipeError(COPY.errorSaveRecipe)
        } else {
          setRecipeError(payload.error || COPY.errorSaveRecipe)
        }

        return
      }

      const updated = (await res.json()) as ServiceCatalogDetail

      setService(updated)
      toast.success(COPY.toastRecipeUpdated)
      onSuccess?.()
    } catch {
      setRecipeError('No se pudo conectar al servidor. Verifica tu conexión.')
    } finally {
      setSavingRecipe(false)
    }
  }

  // ── Simulation ───────────────────────────────────────────────────────

  const handleSimulate = async () => {
    if (!service) return

    setSimulationError(null)
    setSimulating(true)

    try {
      const res = await fetch('/api/finance/quotes/from-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceSku: service.serviceSku })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        setSimulationError(payload.error || COPY.errorSimulate)

        return
      }

      const payload = (await res.json()) as PricingSimulationResponse

      setSimulation(payload)
    } catch {
      setSimulationError(COPY.errorSimulate)
    } finally {
      setSimulating(false)
    }
  }

  // ── Render helpers ───────────────────────────────────────────────────

  const selectedRoleOption = useCallback(
    (row: RoleRowDraft): RoleLookupOption | null => {
      if (!row.roleId && !row.roleSku) return null

      return (
        roleOptions.find(opt => opt.sku === row.roleSku) ??
        ({
          sku: row.roleSku,
          label: row.roleLabelEs || row.roleSku,
          roleId: row.roleId
        } as RoleLookupOption)
      )
    },
    [roleOptions]
  )

  const selectedToolOption = useCallback(
    (row: ToolRowDraft): ToolLookupOption | null => {
      if (!row.toolId && !row.toolSku) return null

      return (
        toolOptions.find(opt => opt.sku === row.toolSku) ??
        ({
          sku: row.toolSku,
          label: row.toolName || row.toolSku,
          toolId: row.toolId
        } as ToolLookupOption)
      )
    },
    [toolOptions]
  )

  const marginColor = useMemo((): 'success' | 'warning' | 'error' | 'secondary' => {
    if (!simulation) return 'secondary'

    switch (simulation.pricing.aggregateMargin.classification) {
      case 'healthy':
        return 'success'
      case 'warning':
        return 'warning'
      case 'critical':
        return 'error'
      default:
        return 'secondary'
    }
  }, [simulation])

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={handleClose}
      PaperProps={{ sx: { width: { xs: '100%', md: 760 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Box>
          <Typography variant='h6'>{COPY.editCta}</Typography>
          {service ? (
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ fontSize: '0.75rem' }}
            >
              {service.serviceSku} · {service.moduleCode}
            </Typography>
          ) : null}
        </Box>
        <IconButton onClick={handleClose} size='small' aria-label={GREENHOUSE_COPY.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {loading && !service ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : loadError ? (
          <Alert severity='error'>{loadError}</Alert>
        ) : !service ? null : (
          <Stack spacing={4}>
            {/* ── Section: General ─────────────────────────────────── */}
            <Box>
              <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 2 }}>
                {COPY.sectionGeneral}
              </Typography>

              {generalError && (
                <Alert severity='error' sx={{ mb: 2 }} onClose={() => setGeneralError(null)}>
                  {generalError}
                </Alert>
              )}

              {generalIssues.length > 0 && (
                <Alert severity='warning' sx={{ mb: 2 }}>
                  <Box component='ul' sx={{ m: 0, pl: 2 }}>
                    {generalIssues.map((issue, i) => (
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

              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Nombre del servicio'
                    value={moduleName}
                    onChange={e => setModuleName(e.target.value)}
                    required
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Categoría'
                    value={serviceCategory}
                    onChange={e => setServiceCategory(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Nombre comercial (opcional)'
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
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
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <FormControlLabel
                    control={<Switch checked={active} onChange={e => setActive(e.target.checked)} />}
                    label={active ? 'Servicio activo' : 'Servicio inactivo'}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Stack direction='row' spacing={2} justifyContent='flex-end'>
                    <Button
                      variant='contained'
                      color='primary'
                      onClick={handleSaveGeneral}
                      disabled={savingGeneral}
                      startIcon={
                        savingGeneral ? <CircularProgress size={16} color='inherit' /> : undefined
                      }
                    >
                      {savingGeneral ? 'Guardando...' : 'Guardar detalle'}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* ── Section: Recipe ──────────────────────────────────── */}
            <Box>
              <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 1 }}>
                {COPY.sectionRecipe}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                Roles y herramientas que se expanden al seleccionar este servicio en una cotización.
              </Typography>

              {recipeError && (
                <Alert severity='error' sx={{ mb: 2 }} onClose={() => setRecipeError(null)}>
                  {recipeError}
                </Alert>
              )}

              {recipeIssues.length > 0 && (
                <Alert severity='warning' sx={{ mb: 2 }}>
                  <Box component='ul' sx={{ m: 0, pl: 2 }}>
                    {recipeIssues.map((issue, i) => (
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

              {/* Roles table */}
              <Card
                elevation={0}
                sx={{ border: t => `1px solid ${t.palette.divider}`, mb: 3 }}
              >
                <CardContent>
                  <Stack
                    direction='row'
                    justifyContent='space-between'
                    alignItems='center'
                    sx={{ mb: 2 }}
                  >
                    <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                      {COPY.sectionRecipeRoles} ({roleRows.length})
                    </Typography>
                    <Button
                      size='small'
                      startIcon={<i className='tabler-plus' />}
                      onClick={addRoleRow}
                      disabled={loadingLookups}
                    >
                      {COPY.addRoleCta}
                    </Button>
                  </Stack>

                  {roleRows.length === 0 ? (
                    <Typography variant='body2' color='text.secondary' sx={{ py: 3, textAlign: 'center' }}>
                      {COPY.emptyRecipeRoles}
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      {roleRows.map((row, index) => {
                        const selected = selectedRoleOption(row)

                        return (
                          <Box
                            key={row.key}
                            sx={{
                              p: 2,
                              border: t => `1px solid ${t.palette.divider}`,
                              borderRadius: 1
                            }}
                          >
                            <Grid container spacing={2} alignItems='center'>
                              <Grid size={{ xs: 12, sm: 5 }}>
                                <Autocomplete
                                  size='small'
                                  options={roleOptions}
                                  value={selected}
                                  onChange={(_, value) => {
                                    if (value) {
                                      updateRoleRow(row.key, {
                                        roleId: value.roleId,
                                        roleSku: value.sku,
                                        roleLabelEs: value.label
                                      })
                                    } else {
                                      updateRoleRow(row.key, { roleId: '', roleSku: '', roleLabelEs: '' })
                                    }
                                  }}
                                  getOptionLabel={option => option.label || option.sku}
                                  isOptionEqualToValue={(option, value) => option.sku === value.sku}
                                  renderInput={params => (
                                    <TextField
                                      {...params}
                                      label={COPY.recipeRoleColumns.role}
                                      placeholder='Buscar rol...'
                                    />
                                  )}
                                />
                              </Grid>
                              <Grid size={{ xs: 6, sm: 2 }}>
                                <TextField
                                  size='small'
                                  type='number'
                                  label={COPY.recipeRoleColumns.hours}
                                  value={row.hoursPerPeriod}
                                  onChange={e => updateRoleRow(row.key, { hoursPerPeriod: e.target.value })}
                                  inputProps={{ min: 0, step: 0.5 }}
                                  fullWidth
                                />
                              </Grid>
                              <Grid size={{ xs: 6, sm: 2 }}>
                                <TextField
                                  size='small'
                                  type='number'
                                  label={COPY.recipeRoleColumns.quantity}
                                  value={row.quantity}
                                  onChange={e => updateRoleRow(row.key, { quantity: e.target.value })}
                                  inputProps={{ min: 1, step: 1 }}
                                  fullWidth
                                />
                              </Grid>
                              <Grid size={{ xs: 6, sm: 2 }}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      size='small'
                                      checked={row.isOptional}
                                      onChange={e => updateRoleRow(row.key, { isOptional: e.target.checked })}
                                    />
                                  }
                                  label={COPY.recipeRoleColumns.optional}
                                />
                              </Grid>
                              <Grid size={{ xs: 6, sm: 1 }}>
                                <Stack direction='row' spacing={0}>
                                  <Tooltip title={COPY.moveUpLabel}>
                                    <span>
                                      <IconButton
                                        size='small'
                                        onClick={() => moveRoleRow(row.key, 'up')}
                                        disabled={index === 0}
                                        aria-label={COPY.moveUpLabel}
                                      >
                                        <i className='tabler-chevron-up' style={{ fontSize: 16 }} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  <Tooltip title={COPY.moveDownLabel}>
                                    <span>
                                      <IconButton
                                        size='small'
                                        onClick={() => moveRoleRow(row.key, 'down')}
                                        disabled={index === roleRows.length - 1}
                                        aria-label={COPY.moveDownLabel}
                                      >
                                        <i className='tabler-chevron-down' style={{ fontSize: 16 }} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  <Tooltip title={COPY.removeRowLabel}>
                                    <IconButton
                                      size='small'
                                      onClick={() => removeRoleRow(row.key)}
                                      aria-label={COPY.removeRowLabel}
                                      color='error'
                                    >
                                      <i className='tabler-trash' style={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </Grid>
                              <Grid size={{ xs: 12 }}>
                                <TextField
                                  size='small'
                                  fullWidth
                                  label={COPY.recipeRoleColumns.notes}
                                  value={row.notes}
                                  onChange={e => updateRoleRow(row.key, { notes: e.target.value })}
                                  placeholder='Contexto u observaciones (opcional)'
                                />
                              </Grid>
                            </Grid>
                          </Box>
                        )
                      })}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              {/* Tools table */}
              <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                <CardContent>
                  <Stack
                    direction='row'
                    justifyContent='space-between'
                    alignItems='center'
                    sx={{ mb: 2 }}
                  >
                    <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                      {COPY.sectionRecipeTools} ({toolRows.length})
                    </Typography>
                    <Button
                      size='small'
                      startIcon={<i className='tabler-plus' />}
                      onClick={addToolRow}
                      disabled={loadingLookups}
                    >
                      {COPY.addToolCta}
                    </Button>
                  </Stack>

                  {toolRows.length === 0 ? (
                    <Typography variant='body2' color='text.secondary' sx={{ py: 3, textAlign: 'center' }}>
                      {COPY.emptyRecipeTools}
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      {toolRows.map((row, index) => {
                        const selected = selectedToolOption(row)

                        return (
                          <Box
                            key={row.key}
                            sx={{
                              p: 2,
                              border: t => `1px solid ${t.palette.divider}`,
                              borderRadius: 1
                            }}
                          >
                            <Grid container spacing={2} alignItems='center'>
                              <Grid size={{ xs: 12, sm: 5 }}>
                                <Autocomplete
                                  size='small'
                                  options={toolOptions}
                                  value={selected}
                                  onChange={(_, value) => {
                                    if (value) {
                                      updateToolRow(row.key, {
                                        toolId: value.toolId,
                                        toolSku: value.sku,
                                        toolName: value.label
                                      })
                                    } else {
                                      updateToolRow(row.key, { toolId: '', toolSku: '', toolName: '' })
                                    }
                                  }}
                                  getOptionLabel={option => option.label || option.sku}
                                  isOptionEqualToValue={(option, value) => option.sku === value.sku}
                                  renderInput={params => (
                                    <TextField
                                      {...params}
                                      label={COPY.recipeToolColumns.tool}
                                      placeholder='Buscar herramienta...'
                                    />
                                  )}
                                />
                              </Grid>
                              <Grid size={{ xs: 6, sm: 2 }}>
                                <TextField
                                  size='small'
                                  type='number'
                                  label={COPY.recipeToolColumns.quantity}
                                  value={row.quantity}
                                  onChange={e => updateToolRow(row.key, { quantity: e.target.value })}
                                  inputProps={{ min: 1, step: 1 }}
                                  fullWidth
                                />
                              </Grid>
                              <Grid size={{ xs: 6, sm: 2 }}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      size='small'
                                      checked={row.isOptional}
                                      onChange={e => updateToolRow(row.key, { isOptional: e.target.checked })}
                                    />
                                  }
                                  label={COPY.recipeToolColumns.optional}
                                />
                              </Grid>
                              <Grid size={{ xs: 6, sm: 2 }}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      size='small'
                                      checked={row.passThrough}
                                      onChange={e => updateToolRow(row.key, { passThrough: e.target.checked })}
                                    />
                                  }
                                  label={COPY.recipeToolColumns.passThrough}
                                />
                              </Grid>
                              <Grid size={{ xs: 6, sm: 1 }}>
                                <Stack direction='row' spacing={0}>
                                  <Tooltip title={COPY.moveUpLabel}>
                                    <span>
                                      <IconButton
                                        size='small'
                                        onClick={() => moveToolRow(row.key, 'up')}
                                        disabled={index === 0}
                                        aria-label={COPY.moveUpLabel}
                                      >
                                        <i className='tabler-chevron-up' style={{ fontSize: 16 }} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  <Tooltip title={COPY.moveDownLabel}>
                                    <span>
                                      <IconButton
                                        size='small'
                                        onClick={() => moveToolRow(row.key, 'down')}
                                        disabled={index === toolRows.length - 1}
                                        aria-label={COPY.moveDownLabel}
                                      >
                                        <i className='tabler-chevron-down' style={{ fontSize: 16 }} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  <Tooltip title={COPY.removeRowLabel}>
                                    <IconButton
                                      size='small'
                                      onClick={() => removeToolRow(row.key)}
                                      aria-label={COPY.removeRowLabel}
                                      color='error'
                                    >
                                      <i className='tabler-trash' style={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </Grid>
                              <Grid size={{ xs: 12 }}>
                                <TextField
                                  size='small'
                                  fullWidth
                                  label={COPY.recipeToolColumns.notes}
                                  value={row.notes}
                                  onChange={e => updateToolRow(row.key, { notes: e.target.value })}
                                  placeholder='Contexto u observaciones (opcional)'
                                />
                              </Grid>
                            </Grid>
                          </Box>
                        )
                      })}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              <Stack direction='row' spacing={2} justifyContent='flex-end' sx={{ mt: 3 }}>
                <Button
                  variant='contained'
                  color='primary'
                  onClick={handleSaveRecipe}
                  disabled={savingRecipe}
                  startIcon={
                    savingRecipe ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />
                  }
                >
                  {savingRecipe ? 'Guardando...' : COPY.saveRecipeCta}
                </Button>
              </Stack>
            </Box>

            <Divider />

            {/* ── Section: Simulate ────────────────────────────────── */}
            <Box>
              <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 1 }}>
                {COPY.sectionSimulate}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                {COPY.simulateHint}
              </Typography>

              {simulationError && (
                <Alert severity='error' sx={{ mb: 2 }} onClose={() => setSimulationError(null)}>
                  {simulationError}
                </Alert>
              )}

              <Stack direction='row' spacing={2} sx={{ mb: 3 }}>
                <Button
                  variant='outlined'
                  color='primary'
                  onClick={handleSimulate}
                  disabled={simulating}
                  startIcon={
                    simulating ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-calculator' />
                  }
                >
                  {simulating ? 'Simulando...' : COPY.simulateCta}
                </Button>
              </Stack>

              {simulation && (
                <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant='body2' color='text.secondary'>
                          Líneas expandidas
                        </Typography>
                        <Typography variant='body2' sx={{ fontWeight: 500 }}>
                          {simulation.lines.length}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant='body2' color='text.secondary'>
                          Subtotal
                        </Typography>
                        <Typography variant='body2'>{fmtUsd(simulation.pricing.totals.subtotalUsd)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant='body2' color='text.secondary'>
                          Overhead
                        </Typography>
                        <Typography variant='body2'>{fmtUsd(simulation.pricing.totals.overheadUsd)}</Typography>
                      </Box>
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant='body1' sx={{ fontWeight: 600 }}>
                          Total
                        </Typography>
                        <Typography variant='body1' sx={{ fontWeight: 600 }}>
                          {fmtUsd(simulation.pricing.totals.totalUsd)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant='body2' color='text.secondary'>
                          Margen agregado
                        </Typography>
                        <CustomChip
                          round='true'
                          size='small'
                          variant='tonal'
                          color={marginColor}
                          label={fmtPct(simulation.pricing.aggregateMargin.marginPct)}
                        />
                      </Box>
                      {simulation.pricing.warnings.length > 0 && (
                        <Alert severity='info' sx={{ mt: 2 }}>
                          <Typography variant='body2' sx={{ fontWeight: 600, mb: 1 }}>
                            Advertencias del motor:
                          </Typography>
                          <Box component='ul' sx={{ m: 0, pl: 2 }}>
                            {simulation.pricing.warnings.map((warn, i) => (
                              <li key={i}>
                                <Typography variant='body2'>{warn}</Typography>
                              </li>
                            ))}
                          </Box>
                        </Alert>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Stack>
        )}
      </Box>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={handleClose} fullWidth>{GREENHOUSE_COPY.actions.close}</Button>
      </Box>
    </Drawer>
  )
}

export default EditServiceDrawer
