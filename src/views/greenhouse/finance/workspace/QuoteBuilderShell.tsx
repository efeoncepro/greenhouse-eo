'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import type { CommercialModelCode } from '@/lib/commercial/pricing-governance-types'
import type {
  PricingEngineInputV2,
  PricingLineInputV2,
  PricingOutputCurrency,
  PricingV2LineType
} from '@/lib/finance/pricing/contracts'
import usePricingSimulation from '@/hooks/usePricingSimulation'
import { GH_PRICING } from '@/config/greenhouse-nomenclature'

import SellableItemPickerDrawer, {
  type SellableItemPickerTab,
  type SellableSelection
} from '@/components/greenhouse/pricing/SellableItemPickerDrawer'

import AddonSuggestionsPanel from './AddonSuggestionsPanel'
import QuotePricingWarningsPanel from './QuotePricingWarningsPanel'
import QuoteBuilderActions, {
  type QuoteBuilderActionsOptions,
  type QuoteBuilderState
} from './QuoteBuilderActions'
import QuoteLineItemsEditor, {
  mapSelectionToLine,
  makeBlankManualLine,
  type QuoteLineItem,
  type QuoteLineItemsEditorHandle
} from './QuoteLineItemsEditor'
import QuoteSourceSelector from './QuoteSourceSelector'
import QuoteTemplatePickerDrawer from './QuoteTemplatePickerDrawer'
import QuoteTotalsFooter from './QuoteTotalsFooter'
import type {
  QuoteBuilderBillingFrequency,
  QuoteBuilderPricingModel,
  QuoteCreateOrganization,
  QuoteCreateTemplate
} from './quote-builder-types'

export type QuoteBuilderMode = 'create' | 'edit'

export interface QuoteBuilderShellQuote {
  quotationId: string
  quotationNumber: string | null
  clientId: string | null
  organizationId: string | null
  description: string | null
  currency: string
  status: string
  businessLineCode?: string | null
  commercialModel?: CommercialModelCode | null
  countryFactorCode?: string | null
  outputCurrency?: PricingOutputCurrency | null
  contractDurationMonths?: number | null
  validUntil?: string | null
  pricingModel?: QuoteBuilderPricingModel | null
  billingFrequency?: QuoteBuilderBillingFrequency | null
}

export interface QuoteBuilderShellSubmitPayload {
  mode: QuoteBuilderMode
  quotationId: string | null
  templateId: string | null
  organizationId: string | null
  description: string
  pricingModel: QuoteBuilderPricingModel
  currency: PricingOutputCurrency
  billingFrequency: QuoteBuilderBillingFrequency
  contractDurationMonths: number | null
  validUntil: string | null
  businessLineCode: string | null
  commercialModel: CommercialModelCode
  countryFactorCode: string
  lineItems: QuoteLineItem[]
}

export interface QuoteBuilderShellProps {
  mode: QuoteBuilderMode
  quote?: QuoteBuilderShellQuote
  initialLines?: QuoteLineItem[]
  templates: QuoteCreateTemplate[]
  organizations: QuoteCreateOrganization[]
  canSeeCostStack: boolean
  onSubmit?: (payload: QuoteBuilderShellSubmitPayload) => Promise<{ quotationId: string } | void>
}

const DEFAULT_COMMERCIAL_MODELS: QuoteBuilderActionsOptions['commercialModels'] = [
  { code: 'on_going', label: 'On-Going', multiplierPct: 0 },
  { code: 'on_demand', label: 'On-Demand', multiplierPct: 15 },
  { code: 'hybrid', label: 'Híbrido', multiplierPct: 10 },
  { code: 'license_consulting', label: 'Licencia / Consultoría', multiplierPct: 5 }
]

const DEFAULT_COUNTRY_FACTORS: QuoteBuilderActionsOptions['countryFactors'] = [
  { code: 'chile_corporate', label: 'Chile Corporate', factor: 1.0 },
  { code: 'chile_pyme', label: 'Chile PYME', factor: 0.85 },
  { code: 'colombia_latam', label: 'Colombia / PYME LATAM', factor: 0.7 },
  { code: 'international_usd', label: 'Internacional USD', factor: 1.15 },
  { code: 'licitacion_publica', label: 'Licitación Pública', factor: 0.9 },
  { code: 'cliente_estrategico', label: 'Cliente Estratégico', factor: 1.0 }
]

const coerceCurrency = (value: string | null | undefined): PricingOutputCurrency => {
  if (value === 'USD' || value === 'CLF' || value === 'COP' || value === 'MXN' || value === 'PEN' || value === 'CLP') {
    return value
  }

  return 'CLP'
}

const coerceBillingFrequency = (value: string | null | undefined): QuoteBuilderBillingFrequency => {
  if (value === 'milestone' || value === 'one_time') return value

  return 'monthly'
}

const coercePricingModel = (value: string | null | undefined): QuoteBuilderPricingModel => {
  if (value === 'staff_aug' || value === 'retainer') return value

  return 'project'
}

const todayIso = (): string => new Date().toISOString().slice(0, 10)

const mapLineTypeFromV2 = (lineType: PricingV2LineType): QuoteLineItem['lineType'] => {
  switch (lineType) {
    case 'role':
      return 'role'
    case 'person':
      return 'person'
    case 'tool':
    case 'overhead_addon':
    case 'direct_cost':
    default:
      return 'direct_cost'
  }
}

interface ServiceExpansionLine {
  lineOrder?: number
  label: string
  lineType?: PricingV2LineType
  quantity?: number
  unit?: string
  unitPrice?: number | null
  pricingV2Line?: { lineType?: PricingV2LineType; roleSku?: string; toolSku?: string; addonSku?: string }
  metadata?: Record<string, unknown>
}

const mapServiceLineToQuoteLine = (
  raw: ServiceExpansionLine,
  serviceSku: string
): QuoteLineItem => {
  const pricingV2LineType = raw.pricingV2Line?.lineType ?? raw.lineType ?? 'direct_cost'
  const lineType = mapLineTypeFromV2(pricingV2LineType)
  const sku = raw.pricingV2Line?.roleSku ?? raw.pricingV2Line?.toolSku ?? raw.pricingV2Line?.addonSku ?? null

  return {
    label: raw.label,
    description: null,
    lineType,
    unit: (raw.unit as QuoteLineItem['unit']) ?? (lineType === 'role' ? 'month' : 'unit'),
    quantity: Number.isFinite(raw.quantity) ? Number(raw.quantity) : 1,
    unitPrice: raw.unitPrice ?? null,
    subtotalPrice: null,
    subtotalAfterDiscount: null,
    productId: null,
    roleCode: lineType === 'role' ? sku : null,
    memberId: null,
    discountType: null,
    discountValue: null,
    source: 'service',
    serviceSku,
    serviceLineOrder: typeof raw.lineOrder === 'number' ? raw.lineOrder : null,
    metadata: {
      pricingV2LineType,
      sku: sku ?? undefined,
      serviceSku,
      serviceLineOrder: typeof raw.lineOrder === 'number' ? raw.lineOrder : null
    }
  }
}

const buildPricingInput = (
  builderState: QuoteBuilderState,
  currency: PricingOutputCurrency,
  lines: QuoteLineItem[]
): PricingEngineInputV2 | null => {
  const pricingLines: PricingLineInputV2[] = lines
    .filter(line => line.label.trim().length > 0 && line.quantity > 0)
    .map(line => {
      const v2Type = line.metadata?.pricingV2LineType
      const sku = line.metadata?.sku ?? line.roleCode ?? line.memberId ?? null

      if (v2Type === 'role' && sku) {
        return {
          lineType: 'role',
          roleSku: sku,
          hours: null,
          fteFraction: line.metadata?.fteFraction ?? 1,
          periods: line.metadata?.periods ?? 1,
          quantity: line.quantity,
          employmentTypeCode: line.metadata?.employmentTypeCode ?? null
        }
      }

      if (v2Type === 'person' && line.memberId) {
        return {
          lineType: 'person',
          memberId: line.memberId,
          hours: null,
          fteFraction: line.metadata?.fteFraction ?? 1,
          periods: line.metadata?.periods ?? 1,
          quantity: line.quantity
        }
      }

      if (v2Type === 'tool' && sku) {
        return {
          lineType: 'tool',
          toolSku: sku,
          quantity: line.quantity,
          periods: line.metadata?.periods ?? 1
        }
      }

      if (v2Type === 'overhead_addon' && sku) {
        return {
          lineType: 'overhead_addon',
          addonSku: sku,
          quantity: line.quantity
        }
      }

      return {
        lineType: 'direct_cost',
        label: line.label.trim(),
        amount: line.unitPrice ?? 0,
        currency,
        quantity: line.quantity
      }
    })

  if (pricingLines.length === 0) return null

  return {
    businessLineCode: builderState.businessLineCode,
    commercialModel: builderState.commercialModel,
    countryFactorCode: builderState.countryFactorCode,
    outputCurrency: currency,
    quoteDate: todayIso(),
    lines: pricingLines,
    autoResolveAddons: true
  }
}

const QuoteBuilderShell = ({
  mode,
  quote,
  initialLines = [],
  templates,
  organizations,
  canSeeCostStack,
  onSubmit
}: QuoteBuilderShellProps) => {
  const router = useRouter()
  const editorRef = useRef<QuoteLineItemsEditorHandle>(null)

  const initialBuilderState = useMemo<QuoteBuilderState>(
    () => ({
      businessLineCode: quote?.businessLineCode ?? null,
      commercialModel: (quote?.commercialModel as CommercialModelCode | null) ?? 'on_going',
      countryFactorCode: quote?.countryFactorCode ?? 'chile_corporate',
      outputCurrency: coerceCurrency(quote?.outputCurrency ?? quote?.currency ?? null),
      contractDurationMonths: quote?.contractDurationMonths ?? null,
      validUntil: quote?.validUntil ?? null,
      description: quote?.description ?? ''
    }),
    [quote]
  )

  const [builderState, setBuilderState] = useState<QuoteBuilderState>(initialBuilderState)
  const [organizationId, setOrganizationId] = useState<string | null>(quote?.organizationId ?? null)

  const [pricingModel, setPricingModel] = useState<QuoteBuilderPricingModel>(
    coercePricingModel(quote?.pricingModel ?? null)
  )

  const [billingFrequency, setBillingFrequency] = useState<QuoteBuilderBillingFrequency>(
    coerceBillingFrequency(quote?.billingFrequency ?? null)
  )

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [excludedAddons, setExcludedAddons] = useState<Set<string>>(new Set())
  const [linesSnapshot, setLinesSnapshot] = useState<QuoteLineItem[]>(initialLines)
  const [submitting, setSubmitting] = useState(false)
  const [serviceExpanding, setServiceExpanding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerInitialTab, setPickerInitialTab] = useState<SellableItemPickerTab>('roles')
  const [pickerMode, setPickerMode] = useState<'catalog' | 'service'>('catalog')
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)

  const [builderOptions, setBuilderOptions] = useState<QuoteBuilderActionsOptions>({
    businessLines: [],
    commercialModels: DEFAULT_COMMERCIAL_MODELS,
    countryFactors: DEFAULT_COUNTRY_FACTORS
  })

  useEffect(() => {
    const controller = new AbortController()

    ;(async () => {
      try {
        const res = await fetch('/api/finance/quotes/pricing/config', { signal: controller.signal })

        if (!res.ok) return

        const payload = (await res.json()) as {
          catalog?: {
            commercialModelMultipliers?: Array<{ modelCode: CommercialModelCode; modelLabel: string; multiplierPct: number }>
            countryPricingFactors?: Array<{ factorCode: string; factorLabel: string; factorOpt: number }>
            businessLines?: Array<{ moduleCode: string; label: string; isActive?: boolean; sortOrder?: number }>
          }
        }

        const commercialModels = payload.catalog?.commercialModelMultipliers?.map(m => ({
          code: m.modelCode,
          label: m.modelLabel,
          multiplierPct: Number(m.multiplierPct)
        }))

        const countryFactors = payload.catalog?.countryPricingFactors?.map(f => ({
          code: f.factorCode,
          label: f.factorLabel,
          factor: Number(f.factorOpt)
        }))

        const businessLines = payload.catalog?.businessLines
          ?.filter(bl => bl.isActive !== false)
          .map(bl => ({ code: bl.moduleCode, label: bl.label }))

        setBuilderOptions(prev => ({
          businessLines: businessLines && businessLines.length > 0 ? businessLines : prev.businessLines,
          commercialModels: commercialModels && commercialModels.length > 0 ? commercialModels : prev.commercialModels,
          countryFactors: countryFactors && countryFactors.length > 0 ? countryFactors : prev.countryFactors
        }))
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    })()

    return () => controller.abort()
  }, [])

  const refreshLinesSnapshot = useCallback(() => {
    const draft = editorRef.current?.getDraft()

    if (draft) setLinesSnapshot(draft)
  }, [])

  const handleBuilderChange = useCallback((patch: Partial<QuoteBuilderState>) => {
    setBuilderState(prev => ({ ...prev, ...patch }))
  }, [])

  const currency = builderState.outputCurrency

  const pricingInput = useMemo(
    () => buildPricingInput(builderState, currency, linesSnapshot),
    [builderState, currency, linesSnapshot]
  )

  const {
    output: simulation,
    loading: simulating,
    error: simulationError
  } = usePricingSimulation(pricingInput, { enabled: true })

  const includedAddonSkus = useMemo(
    () => (simulation?.addons ?? []).map(a => a.sku).filter(sku => !excludedAddons.has(sku)),
    [simulation?.addons, excludedAddons]
  )

  const handleAddonToggle = useCallback((sku: string, include: boolean) => {
    setExcludedAddons(prev => {
      const next = new Set(prev)

      if (include) next.delete(sku)
      else next.add(sku)

      return next
    })
  }, [])

  const openCatalogPicker = useCallback(() => {
    setPickerMode('catalog')
    setPickerInitialTab('roles')
    setPickerOpen(true)
  }, [])

  const openServicePicker = useCallback(() => {
    setPickerMode('service')
    setPickerInitialTab('services')
    setPickerOpen(true)
  }, [])

  const handleManualLine = useCallback(() => {
    editorRef.current?.appendLines([makeBlankManualLine()])
    refreshLinesSnapshot()
  }, [refreshLinesSnapshot])

  const handleTemplateSelect = useCallback((template: QuoteCreateTemplate) => {
    setSelectedTemplateId(template.templateId)
    setPricingModel(template.pricingModel)
    setBillingFrequency(coerceBillingFrequency(template.defaults.billingFrequency))
    setBuilderState(prev => ({
      ...prev,
      outputCurrency: coerceCurrency(template.defaults.currency),
      contractDurationMonths: template.defaults.contractDurationMonths ?? prev.contractDurationMonths,
      businessLineCode: template.businessLineCode ?? prev.businessLineCode
    }))
  }, [])

  const expandServiceSelections = useCallback(
    async (selections: SellableSelection[]) => {
      if (selections.length === 0) return

      setServiceExpanding(true)
      setError(null)

      try {
        const allLines: QuoteLineItem[] = []

        for (const selection of selections) {
          const res = await fetch('/api/finance/quotes/from-service', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serviceSku: selection.sku,
              outputCurrency: currency,
              commercialModelOverride: builderState.commercialModel
            })
          })

          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as { error?: string }

            throw new Error(body.error ?? `No pudimos expandir ${selection.sku}.`)
          }

          const payload = (await res.json()) as { lines?: ServiceExpansionLine[] }

          ;(payload.lines ?? []).forEach(line => {
            allLines.push(mapServiceLineToQuoteLine(line, selection.sku))
          })
        }

        if (allLines.length > 0) {
          editorRef.current?.appendLines(allLines)
          refreshLinesSnapshot()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error expandiendo el servicio.')
      } finally {
        setServiceExpanding(false)
      }
    },
    [builderState.commercialModel, currency, refreshLinesSnapshot]
  )

  const handlePickerSelect = useCallback(
    (selections: SellableSelection[]) => {
      if (selections.length === 0) return

      if (pickerMode === 'service') {
        void expandServiceSelections(selections)

        return
      }

      const mapped = selections.map(mapSelectionToLine)

      editorRef.current?.appendLines(mapped)
      refreshLinesSnapshot()
    },
    [pickerMode, expandServiceSelections, refreshLinesSnapshot]
  )

  const handleEditorSave = useCallback(
    async (lines: QuoteLineItem[]) => {
      setLinesSnapshot(lines)
    },
    []
  )

  const validate = useCallback((): string | null => {
    if (builderState.description.trim().length === 0) {
      return GH_PRICING.builderValidationDescription
    }

    if (!organizationId && !selectedTemplateId) {
      return GH_PRICING.builderValidationOrganization
    }

    const draft = editorRef.current?.getDraft() ?? linesSnapshot

    if (!selectedTemplateId && draft.length === 0) {
      return GH_PRICING.builderValidationLines
    }

    return null
  }, [builderState.description, organizationId, selectedTemplateId, linesSnapshot])

  const handleSubmit = useCallback(async () => {
    const validation = validate()

    if (validation) {
      setError(validation)

      return
    }

    setError(null)
    setSubmitting(true)

    try {
      const draftLines = editorRef.current?.getDraft() ?? linesSnapshot

      if (onSubmit) {
        const result = await onSubmit({
          mode,
          quotationId: quote?.quotationId ?? null,
          templateId: selectedTemplateId,
          organizationId,
          description: builderState.description.trim(),
          pricingModel,
          currency,
          billingFrequency,
          contractDurationMonths: builderState.contractDurationMonths,
          validUntil: builderState.validUntil,
          businessLineCode: builderState.businessLineCode,
          commercialModel: builderState.commercialModel,
          countryFactorCode: builderState.countryFactorCode,
          lineItems: draftLines
        })

        const targetId = result?.quotationId ?? quote?.quotationId ?? null

        if (targetId) {
          router.push(`/finance/quotes/${targetId}`)
        }

        return
      }

      // Fallback interno: create mode => POST /api/finance/quotes; edit => PUT + lines
      if (mode === 'create') {
        const res = await fetch('/api/finance/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: selectedTemplateId,
            organizationId,
            description: builderState.description.trim(),
            pricingModel,
            currency,
            billingFrequency,
            contractDurationMonths: builderState.contractDurationMonths,
            validUntil: builderState.validUntil,
            businessLineCode: builderState.businessLineCode,
            commercialModel: builderState.commercialModel,
            lineItems: selectedTemplateId
              ? []
              : draftLines.map(line => ({
                  label: line.label,
                  lineType: line.lineType,
                  unit: line.unit,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice ?? 0,
                  roleCode: line.roleCode ?? null,
                  memberId: line.memberId ?? null,
                  source: line.source ?? null,
                  serviceSku: line.serviceSku ?? null,
                  metadata: line.metadata ?? null
                }))
          })
        })

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }

          throw new Error(body.error ?? GH_PRICING.builderSubmitErrorGeneric)
        }

        const created = (await res.json()) as { quotationId?: string }

        if (created.quotationId) router.push(`/finance/quotes/${created.quotationId}`)

        return
      }

      if (mode === 'edit' && quote?.quotationId) {
        const putRes = await fetch(`/api/finance/quotes/${quote.quotationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: builderState.description.trim(),
            currency,
            billingFrequency,
            contractDurationMonths: builderState.contractDurationMonths,
            validUntil: builderState.validUntil,
            businessLineCode: builderState.businessLineCode,
            pricingModel,
            commercialModel: builderState.commercialModel
          })
        })

        if (!putRes.ok) {
          const body = (await putRes.json().catch(() => ({}))) as { error?: string }

          throw new Error(body.error ?? GH_PRICING.builderSubmitErrorGeneric)
        }

        const linesRes = await fetch(`/api/finance/quotes/${quote.quotationId}/lines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineItems: draftLines.map(line => ({
              label: line.label,
              lineType: line.lineType,
              unit: line.unit,
              quantity: line.quantity,
              unitPrice: line.unitPrice ?? 0,
              roleCode: line.roleCode ?? null,
              memberId: line.memberId ?? null,
              source: line.source ?? null,
              serviceSku: line.serviceSku ?? null,
              metadata: line.metadata ?? null
            }))
          })
        })

        if (!linesRes.ok) {
          const body = (await linesRes.json().catch(() => ({}))) as { error?: string }

          throw new Error(body.error ?? GH_PRICING.builderSubmitErrorGeneric)
        }

        router.push(`/finance/quotes/${quote.quotationId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : GH_PRICING.builderSubmitErrorGeneric)
    } finally {
      setSubmitting(false)
    }
  }, [
    validate,
    onSubmit,
    mode,
    quote?.quotationId,
    selectedTemplateId,
    organizationId,
    builderState.description,
    builderState.contractDurationMonths,
    builderState.validUntil,
    builderState.businessLineCode,
    builderState.commercialModel,
    builderState.countryFactorCode,
    pricingModel,
    currency,
    billingFrequency,
    linesSnapshot,
    router
  ])

  const handleCancel = useCallback(() => {
    router.push('/finance/quotes')
  }, [router])

  const breadcrumbLast =
    mode === 'edit' && quote?.quotationNumber
      ? `Editar ${quote.quotationNumber}`
      : GH_PRICING.builderTitleNew

  const subtitle = mode === 'edit' ? GH_PRICING.builderSubtitleEdit : GH_PRICING.builderSubtitleCreate

  const selectedOrganization = useMemo(
    () => organizations.find(o => o.organizationId === organizationId) ?? null,
    [organizations, organizationId]
  )

  return (
    <Stack spacing={4}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='caption' color='text.secondary'>
            {GH_PRICING.builderBreadcrumbRoot} › {GH_PRICING.builderBreadcrumbList} › {breadcrumbLast}
          </Typography>
          <Typography variant='h5' sx={{ fontWeight: 600, mt: 0.5 }}>
            {breadcrumbLast}
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Box>
        <Stack direction='row' spacing={1}>
          <Button variant='tonal' color='secondary' onClick={handleCancel} disabled={submitting}>
            {GH_PRICING.builderCancel}
          </Button>
          <Button
            variant='contained'
            startIcon={<i className='tabler-device-floppy' aria-hidden='true' />}
            onClick={handleSubmit}
            disabled={submitting || serviceExpanding}
          >
            {submitting ? GH_PRICING.builderSaving : GH_PRICING.builderSaveAndClose}
          </Button>
        </Stack>
      </Box>

      {error ? (
        <Alert severity='error' role='alert' onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Grid container spacing={4}>
        {/* Columna izquierda: selector + editor */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={4}>
            <QuoteSourceSelector
              onCatalog={openCatalogPicker}
              onService={openServicePicker}
              onTemplate={() => setTemplatePickerOpen(true)}
              onManual={handleManualLine}
              disabled={submitting || serviceExpanding}
            />

            {selectedTemplateId ? (
              <Alert severity='info' role='status'>
                Template seleccionado. Los ítems del template se crearán al guardar.
              </Alert>
            ) : null}

            <QuoteLineItemsEditor
              ref={editorRef}
              quotationId={quote?.quotationId ?? ''}
              currency={currency}
              editable
              lineItems={linesSnapshot}
              onSave={handleEditorSave}
              saving={submitting || serviceExpanding}
              businessLineCode={builderState.businessLineCode}
              canViewCostStack={canSeeCostStack}
              simulationLines={simulation?.lines ?? null}
              outputCurrency={currency}
              onDraftChange={setLinesSnapshot}
            />
          </Stack>
        </Grid>

        {/* Columna derecha: contexto + addons + totales */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box
            sx={theme => ({
              position: { md: 'sticky' },
              top: { md: theme.spacing(10) },
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            })}
          >
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Espacio destinatario'
              value={organizationId ?? ''}
              onChange={event => setOrganizationId(event.target.value || null)}
              disabled={submitting || mode === 'edit'}
              aria-label='Espacio de la cotización'
              helperText={
                mode === 'edit' && selectedOrganization
                  ? selectedOrganization.organizationName
                  : 'El espacio no se puede cambiar después de crear la cotización'
              }
            >
              <MenuItem value=''>Selecciona un espacio…</MenuItem>
              {organizations.map(org => (
                <MenuItem key={org.organizationId} value={org.organizationId}>
                  {org.organizationName}
                </MenuItem>
              ))}
            </CustomTextField>

            <QuoteBuilderActions
              state={builderState}
              onChange={handleBuilderChange}
              options={builderOptions}
              disabled={submitting}
            />

            {canSeeCostStack ? (
              <AddonSuggestionsPanel
                suggestions={simulation?.addons ?? []}
                includedSkus={includedAddonSkus}
                onToggle={handleAddonToggle}
                outputCurrency={currency}
                loading={simulating}
              />
            ) : null}

            <QuotePricingWarningsPanel warnings={simulation?.structuredWarnings ?? null} />

            <QuoteTotalsFooter
              output={simulation}
              outputCurrency={currency}
              loading={simulating}
              error={simulationError}
            />
          </Box>
        </Grid>
      </Grid>

      <SellableItemPickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
        initialTab={pickerInitialTab}
        businessLineCode={builderState.businessLineCode}
      />

      <QuoteTemplatePickerDrawer
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onSelect={handleTemplateSelect}
        templates={templates}
      />
    </Stack>
  )
}

export default QuoteBuilderShell
