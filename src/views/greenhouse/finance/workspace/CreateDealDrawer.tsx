'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { toast } from 'react-toastify'

import useCreateDeal, { type CreateDealResponse } from '@/hooks/useCreateDeal'
import useDealCreationContext, {
  type DealCreationContextOption,
  type DealCreationContextPipeline,
  type DealCreationContextStage
} from '@/hooks/useDealCreationContext'

// TASK-539 (initial drawer) + TASK-571 (pipeline/stage governance).
//
// The drawer now resolves Pipeline + Stage defaults from
// `GET /api/commercial/organizations/:id/deal-creation-context` and requires
// the caller to pick a concrete selection — the backend rejects invalid
// combinations. The caller wires the success path into the Quote Builder
// optimistic update using `pipelineUsed` / `stageUsed` / `pipelineLabelUsed`
// / `stageLabelUsed` so the selector never falls back to a hardcoded stage.

export interface CreateDealDrawerProps {
  open: boolean
  onClose: () => void
  organizationId: string
  organizationName?: string | null
  quotationId?: string | null
  contactIdentityProfileId?: string | null
  defaultCurrency?: 'CLP' | 'USD' | 'CLF' | 'COP' | 'MXN' | 'PEN' | null
  defaultBusinessLineCode?: string | null
  selectedContact?: {
    identityProfileId: string
    fullName: string | null
    canonicalEmail: string | null
    jobTitle: string | null
    roleLabel: string | null
    isPrimary: boolean
  } | null
  onSuccess: (response: CreateDealResponse, meta: { dealName: string }) => void
}

const CURRENCY_OPTIONS = ['CLP', 'USD', 'CLF', 'COP', 'MXN', 'PEN'] as const

type CurrencyOption = (typeof CURRENCY_OPTIONS)[number]

const parseAmountInput = (raw: string): number | null => {
  if (!raw.trim()) return null
  const normalized = raw.replace(/\./g, '').replace(',', '.').trim()
  const parsed = Number(normalized)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

const estimateAmountClp = (amount: number | null, currency: CurrencyOption): number | null => {
  if (amount === null) return null
  if (currency === 'CLP') return Math.round(amount)

  const approxRates: Record<Exclude<CurrencyOption, 'CLP'>, number> = {
    USD: 950,
    CLF: 38_000,
    COP: 0.22,
    MXN: 55,
    PEN: 250
  }

  const rate = approxRates[currency as Exclude<CurrencyOption, 'CLP'>]

  return rate ? Math.round(amount * rate) : null
}

const sortPipelines = (pipelines: DealCreationContextPipeline[]): DealCreationContextPipeline[] =>
  [...pipelines].sort((a, b) => {
    const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER
    const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER

    return orderA - orderB || a.label.localeCompare(b.label, 'es')
  })

const selectableStages = (pipeline: DealCreationContextPipeline | undefined): DealCreationContextStage[] => {
  if (!pipeline) return []

  return [...pipeline.stages]
    .filter(stage => stage.isSelectableForCreate)
    .sort((a, b) => {
      const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER
      const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER

      return orderA - orderB || a.label.localeCompare(b.label, 'es')
    })
}

const sortOptions = (options: DealCreationContextOption[]): DealCreationContextOption[] =>
  [...options]
    .filter(option => !option.hidden)
    .sort((a, b) => {
      const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER
      const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER

      return orderA - orderB || a.label.localeCompare(b.label, 'es')
    })

const formatBlockingIssue = (issue: string): string => {
  switch (issue) {
    case 'multiple_active_pipelines_without_policy':
      return 'Hay más de un pipeline activo y no existe una política que defina cuál usar para crear.'
    case 'deal_type_default_missing':
      return 'Falta definir el tipo de negocio por defecto para esta política comercial.'
    case 'priority_default_missing':
      return 'Falta definir la prioridad por defecto para esta política comercial.'
    case 'no_active_pipeline':
      return 'No hay pipelines activos habilitados para crear negocios.'
    default:
      if (issue.startsWith('pipeline:') && issue.endsWith(':multiple_selectable_stages_without_default')) {
        return 'El pipeline seleccionado tiene varias etapas válidas, pero ninguna está marcada como etapa inicial.'
      }

      if (issue.startsWith('pipeline:') && issue.endsWith(':no_selectable_stage')) {
        return 'El pipeline seleccionado no tiene una etapa inicial disponible para crear el negocio.'
      }

      return 'La gobernanza comercial aún no está completa para crear este negocio.'
  }
}

const defaultSourceHelper = (
  source: 'tenant_policy' | 'business_line_policy' | 'global_policy' | 'single_option' | 'none',
  fallback: string
): string => {
  switch (source) {
    case 'tenant_policy':
      return 'Valor sugerido por política del tenant.'
    case 'business_line_policy':
      return 'Valor sugerido por política de la línea de negocio.'
    case 'global_policy':
      return 'Valor sugerido por política global.'
    case 'single_option':
      return 'Solo existe una opción disponible hoy.'
    case 'none':
    default:
      return fallback
  }
}

const CreateDealDrawer = ({
  open,
  onClose,
  organizationId,
  organizationName,
  quotationId,
  contactIdentityProfileId,
  defaultCurrency,
  defaultBusinessLineCode,
  selectedContact,
  onSuccess
}: CreateDealDrawerProps) => {
  const { create, loading: creating, error, reset } = useCreateDeal()

  const {
    data: context,
    loading: loadingContext,
    error: contextError,
    reload: reloadContext
  } = useDealCreationContext({
    organizationId: open ? organizationId : null,
    businessLineCode: defaultBusinessLineCode,
    enabled: open
  })

  const [dealName, setDealName] = useState('')
  const [amount, setAmount] = useState('')

  const [currency, setCurrency] = useState<CurrencyOption>(
    (defaultCurrency as CurrencyOption | undefined) ?? 'CLP'
  )

  const [pipelineId, setPipelineId] = useState<string | null>(null)
  const [stageId, setStageId] = useState<string | null>(null)
  const [dealType, setDealType] = useState<string | null>(null)
  const [priority, setPriority] = useState<string | null>(null)
  const [pipelineTouched, setPipelineTouched] = useState(false)
  const [stageTouched, setStageTouched] = useState(false)
  const [dealTypeTouched, setDealTypeTouched] = useState(false)
  const [priorityTouched, setPriorityTouched] = useState(false)

  // Rehydrate defaults when the drawer opens.
  useEffect(() => {
    if (open) {
      setDealName(organizationName ? `${organizationName} — Nuevo deal` : '')
      setAmount('')
      setCurrency((defaultCurrency as CurrencyOption | undefined) ?? 'CLP')
      setPipelineTouched(false)
      setStageTouched(false)
      setDealTypeTouched(false)
      setPriorityTouched(false)
      setDealType(null)
      setPriority(null)
      reset()
    }
  }, [open, organizationName, defaultCurrency, reset])

  // Preload pipeline/stage from the backend defaults once the context lands.
  useEffect(() => {
    if (!context) return

    if (!pipelineTouched) {
      setPipelineId(context.defaultPipelineId)
    }

    if (!stageTouched) {
      setStageId(context.defaultStageId)
    }

    if (!dealTypeTouched) {
      setDealType(context.defaultDealType)
    }

    if (!priorityTouched) {
      setPriority(context.defaultPriority)
    }
  }, [context, dealTypeTouched, pipelineTouched, priorityTouched, stageTouched])

  const parsedAmount = useMemo(() => parseAmountInput(amount), [amount])
  const parsedAmountClp = useMemo(() => estimateAmountClp(parsedAmount, currency), [parsedAmount, currency])
  const exceedsApprovalThreshold = parsedAmountClp !== null && parsedAmountClp > 50_000_000

  const sortedPipelines = useMemo(
    () => sortPipelines(context?.pipelines.filter(p => p.active) ?? []),
    [context]
  )

  const dealTypeOptions = useMemo(
    () => sortOptions(context?.dealTypeOptions ?? []),
    [context]
  )

  const priorityOptions = useMemo(
    () => sortOptions(context?.priorityOptions ?? []),
    [context]
  )

  const currentPipeline = useMemo(
    () => sortedPipelines.find(p => p.pipelineId === pipelineId) ?? null,
    [sortedPipelines, pipelineId]
  )

  const availableStages = useMemo(
    () => selectableStages(currentPipeline ?? undefined),
    [currentPipeline]
  )

  const contextEmpty = !loadingContext && sortedPipelines.length === 0
  const governanceBlocked = !!context && !context.readyToCreate
  const missingHubSpotCompany = !!context && !context.hubspotCompanyId
  const missingSelection = !pipelineId || !stageId

  const stageSuggestedByPolicy =
    !!context && !stageTouched && !!stageId && context.defaultsSource.stage !== 'none'

  const disableSubmit =
    creating
    || loadingContext
    || contextEmpty
    || governanceBlocked
    || missingHubSpotCompany
    || missingSelection
    || dealName.trim().length === 0
    || !!contextError

  const handlePipelineChange = (value: string) => {
    setPipelineTouched(true)
    setPipelineId(value)

    // When the user switches pipeline, reset stage to that pipeline's default
    // (or first open selectable) and mark stage as "not touched" so the
    // stage suggestion copy can recover when defaults are available.
    const pipeline = sortedPipelines.find(p => p.pipelineId === value)
    const nextStages = selectableStages(pipeline)
    const nextDefault = nextStages.find(s => s.isDefault) ?? nextStages[0] ?? null

    setStageTouched(false)
    setStageId(nextDefault?.stageId ?? null)
  }

  const handleStageChange = (value: string) => {
    setStageTouched(true)
    setStageId(value)
  }

  const handleDealTypeChange = (value: string) => {
    setDealTypeTouched(true)
    setDealType(value || null)
  }

  const handlePriorityChange = (value: string) => {
    setPriorityTouched(true)
    setPriority(value || null)
  }

  const handleSubmit = async () => {
    if (disableSubmit) return

    const response = await create({
      organizationId,
      dealName: dealName.trim(),
      amount: parsedAmount,
      amountClp: parsedAmountClp,
      currency,
      businessLineCode: defaultBusinessLineCode ?? null,
      pipelineId,
      stageId,
      dealType,
      priority,
      quotationId: quotationId ?? null,
      contactIdentityProfileId: contactIdentityProfileId ?? selectedContact?.identityProfileId ?? null
    })

    if (!response) {
      toast.error(error?.message ?? 'No se pudo crear el deal.')

      return
    }

    if (response.status === 'completed') {
      toast.success(
        response.organizationPromoted
          ? 'Deal creado. Organización promovida a oportunidad.'
          : 'Deal creado en HubSpot.'
      )
      onSuccess(response, { dealName: dealName.trim() })
      onClose()

      return
    }

    if (response.status === 'pending_approval') {
      toast.info('Deal sobre umbral: solicitud de aprobación creada.')
      onSuccess(response, { dealName: dealName.trim() })
      onClose()

      return
    }

    if (response.status === 'endpoint_not_deployed') {
      toast.warning(
        'La integración HubSpot /deals aún no está disponible. El intento quedó registrado.'
      )
      onSuccess(response, { dealName: dealName.trim() })
      onClose()

      return
    }

    toast.info(`Intento registrado (${response.status}). Ver consola de soporte.`)
    onSuccess(response, { dealName: dealName.trim() })
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={() => (creating ? undefined : onClose())}
      PaperProps={{ sx: { width: { xs: '100%', sm: 440 } } }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ px: 4, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant='h6'>Crear deal nuevo</Typography>
            <Typography variant='caption' color='text.secondary'>
              Vincúlalo a {organizationName ?? 'esta organización'} sin salir del cotizador.
            </Typography>
          </Box>
          <IconButton
            onClick={() => (creating ? undefined : onClose())}
            aria-label='Cerrar'
            size='small'
          >
            <i className='tabler-x' />
          </IconButton>
        </Box>

        <Divider />

        <Box sx={{ p: 4, flex: 1, overflowY: 'auto' }}>
          <Stack spacing={3}>
            <TextField
              label='Nombre del deal'
              placeholder='Ej: Campaña Q3 2026'
              value={dealName}
              onChange={event => setDealName(event.target.value)}
              required
              fullWidth
              autoFocus
              helperText='El nombre aparece en HubSpot y en el pipeline comercial.'
            />

            {missingHubSpotCompany ? (
              <Alert severity='warning'>
                <AlertTitle>Esta organización aún no está vinculada a una empresa de HubSpot</AlertTitle>
                Antes de crear el deal debes completar la vinculación comercial para poder asociarlo a la empresa correcta.
              </Alert>
            ) : null}

            {governanceBlocked && context?.blockingIssues.length ? (
              <Alert severity='warning'>
                <AlertTitle>La gobernanza del deal todavía está incompleta</AlertTitle>
                <Box component='ul' sx={{ pl: 4, mb: 0, mt: 1 }}>
                  {context.blockingIssues.map(issue => (
                    <li key={issue}>
                      <Typography variant='body2'>{formatBlockingIssue(issue)}</Typography>
                    </li>
                  ))}
                </Box>
              </Alert>
            ) : null}

            <Alert severity='info' variant='outlined'>
              <AlertTitle>Asociaciones esperadas al crear</AlertTitle>
              <Stack spacing={1}>
                <Typography variant='body2'>
                  {selectedContact
                    ? `Contacto: ${selectedContact.fullName ?? selectedContact.canonicalEmail ?? selectedContact.identityProfileId}${selectedContact.canonicalEmail ? ` · ${selectedContact.canonicalEmail}` : ''}`
                    : 'Contacto: si esta cotización tiene un contacto canónico vinculado, el backend lo asociará automáticamente al negocio.'}
                </Typography>
                <Typography variant='body2'>
                  {context?.defaultOwnerHubspotUserId
                    ? `Propietario: la política actual resuelve el owner ${context.defaultOwnerHubspotUserId}.`
                    : 'Propietario: el backend intentará resolver al owner del usuario Greenhouse actual y, si no existe mapeo, aplicará la política comercial disponible.'}
                </Typography>
              </Stack>
            </Alert>

            {loadingContext ? (
              <Stack spacing={1.5}>
                <Skeleton variant='rounded' height={56} />
                <Skeleton variant='rounded' height={56} />
              </Stack>
            ) : contextError ? (
              <Alert
                severity='error'
                action={
                  <Button color='inherit' size='small' onClick={() => void reloadContext()}>
                    Reintentar
                  </Button>
                }
              >
                <AlertTitle>No pudimos cargar los pipelines</AlertTitle>
                {contextError}
              </Alert>
            ) : contextEmpty ? (
              <Alert severity='warning'>
                <AlertTitle>No hay pipelines configurados</AlertTitle>
                Aún no existe un registry local de pipelines/stages HubSpot. Solicita al equipo
                de plataforma que siembre
                {' '}<code>greenhouse_commercial.hubspot_deal_pipeline_config</code>.
              </Alert>
            ) : (
              <Stack spacing={2}>
                <TextField
                  select
                  label='Pipeline'
                  value={pipelineId ?? ''}
                  onChange={event => handlePipelineChange(event.target.value)}
                  required
                  fullWidth
                  helperText={
                    context?.defaultsSource.pipeline && context.defaultsSource.pipeline !== 'none' && !pipelineTouched
                      ? 'Pipeline sugerido por política'
                      : 'Elige el pipeline donde nacerá el deal'
                  }
                >
                  {sortedPipelines.map(pipeline => (
                    <MenuItem key={pipeline.pipelineId} value={pipeline.pipelineId}>
                      {pipeline.label}
                      {pipeline.isDefault ? ' · default' : ''}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label='Etapa inicial'
                  value={stageId ?? ''}
                  onChange={event => handleStageChange(event.target.value)}
                  required
                  fullWidth
                  disabled={!currentPipeline || availableStages.length === 0}
                  helperText={
                    !currentPipeline
                      ? 'Selecciona un pipeline primero'
                      : availableStages.length === 0
                        ? 'El pipeline no tiene etapas seleccionables para creación'
                        : stageSuggestedByPolicy
                          ? 'Etapa inicial sugerida por política'
                          : 'Etapa donde nacerá el deal en HubSpot'
                  }
                >
                  {availableStages.map(stage => (
                    <MenuItem key={stage.stageId} value={stage.stageId}>
                      {stage.label}
                      {stage.isDefault ? ' · default' : ''}
                    </MenuItem>
                  ))}
                </TextField>

                {dealTypeOptions.length > 0 ? (
                  <TextField
                    select
                    label='Tipo de negocio'
                    value={dealType ?? ''}
                    onChange={event => handleDealTypeChange(event.target.value)}
                    fullWidth
                    helperText={defaultSourceHelper(
                      context?.defaultsSource.dealType ?? 'none',
                      'Opcional. Si existe una política, se aplicará al crear.'
                    )}
                  >
                    <MenuItem value=''>
                      <em>Sin definir</em>
                    </MenuItem>
                    {dealTypeOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : null}

                {priorityOptions.length > 0 ? (
                  <TextField
                    select
                    label='Prioridad'
                    value={priority ?? ''}
                    onChange={event => handlePriorityChange(event.target.value)}
                    fullWidth
                    helperText={defaultSourceHelper(
                      context?.defaultsSource.priority ?? 'none',
                      'Opcional. Si existe una política, se aplicará al crear.'
                    )}
                  >
                    <MenuItem value=''>
                      <em>Sin definir</em>
                    </MenuItem>
                    {priorityOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : null}
              </Stack>
            )}

            <Stack direction='row' spacing={2}>
              <TextField
                label='Monto estimado'
                placeholder='0'
                value={amount}
                onChange={event => setAmount(event.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position='start'>$</InputAdornment>
                }}
                helperText={
                  parsedAmountClp !== null && currency !== 'CLP'
                    ? `≈ CLP ${parsedAmountClp.toLocaleString('es-CL')}`
                    : 'Opcional. Ajustable luego en HubSpot.'
                }
              />
              <FormControl sx={{ minWidth: 110 }}>
                <TextField
                  select
                  label='Moneda'
                  value={currency}
                  onChange={event => setCurrency(event.target.value as CurrencyOption)}
                >
                  {CURRENCY_OPTIONS.map(option => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </FormControl>
            </Stack>

            {exceedsApprovalThreshold ? (
              <Box
                sx={{
                  borderRadius: 1,
                  border: theme => `1px solid ${theme.palette.warning.main}`,
                  bgcolor: 'warning.lighter',
                  color: 'warning.darker',
                  px: 2.5,
                  py: 1.5
                }}
              >
                <Typography variant='subtitle2' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <i className='tabler-alert-triangle' />
                  Este deal requiere aprobación
                </Typography>
                <Typography variant='caption'>
                  Supera los CLP 50.000.000. Al enviar se crea una solicitud de aprobación en vez
                  del deal directo.
                </Typography>
              </Box>
            ) : null}

            {error ? (
              <Box
                sx={{
                  borderRadius: 1,
                  border: theme => `1px solid ${theme.palette.error.main}`,
                  bgcolor: 'error.lighter',
                  color: 'error.darker',
                  px: 2.5,
                  py: 1.5
                }}
              >
                <Typography variant='subtitle2'>{error.message}</Typography>
                {error.retryAfterSeconds ? (
                  <Typography variant='caption'>
                    Reintenta en {error.retryAfterSeconds} segundos.
                  </Typography>
                ) : null}
              </Box>
            ) : null}
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ px: 4, py: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant='outlined' color='secondary' disabled={creating} onClick={() => onClose()}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            color='primary'
            disabled={disableSubmit}
            onClick={handleSubmit}
            startIcon={creating ? <i className='tabler-loader-2 tabler-spin' /> : <i className='tabler-briefcase-2' />}
          >
            {creating ? 'Creando…' : exceedsApprovalThreshold ? 'Solicitar aprobación' : 'Crear deal y asociar'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}

export default CreateDealDrawer
