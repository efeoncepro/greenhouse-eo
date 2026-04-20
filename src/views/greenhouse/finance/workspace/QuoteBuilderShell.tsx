'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import CustomTextField from '@core/components/mui/TextField'

import type { CommercialModelCode } from '@/lib/commercial/pricing-governance-types'
import type {
  PricingEngineInputV2,
  PricingLineOutputV2,
  PricingOutputCurrency,
  PricingV2LineType,
  PricingWarning
} from '@/lib/finance/pricing/contracts'
import { UNPRICED_QUOTATION_LINE_ITEMS_MESSAGE } from '@/lib/finance/pricing/quotation-line-input-validation'
import { isIssueableFinanceQuotationStatus } from '@/lib/finance/quotation-access'
import usePricingSimulation from '@/hooks/usePricingSimulation'
import { GH_PRICING } from '@/config/greenhouse-nomenclature'

import AddLineSplitButton from '@/components/greenhouse/pricing/AddLineSplitButton'
import QuoteContextStrip from '@/components/greenhouse/pricing/QuoteContextStrip'
import QuoteIdentityStrip, {
  type QuoteStatus
} from '@/components/greenhouse/pricing/QuoteIdentityStrip'
import QuoteShortcutPalette from '@/components/greenhouse/pricing/QuoteShortcutPalette'
import QuoteSummaryDock from '@/components/greenhouse/pricing/QuoteSummaryDock'
import SellableItemPickerDrawer, {
  type SellableItemPickerTab,
  type SellableSelection
} from '@/components/greenhouse/pricing/SellableItemPickerDrawer'

import AddonSuggestionsPanel from './AddonSuggestionsPanel'
import QuoteLineItemsEditor, {
  mapSelectionToLine,
  makeBlankManualLine,
  type QuoteLineItem,
  type QuoteLineItemsEditorHandle
} from './QuoteLineItemsEditor'
import QuoteTemplatePickerDrawer from './QuoteTemplatePickerDrawer'
import type {
  QuoteBuilderBillingFrequency,
  QuoteBuilderPricingModel,
  QuoteCreateOrganization,
  QuoteCreateTemplate
} from './quote-builder-types'
import {
  buildPersistedQuoteLineItems,
  buildQuotePricingInput,
  type PersistedQuoteLineItem,
  type QuoteBuilderPricingContext
} from './quote-builder-pricing'

export type QuoteBuilderMode = 'create' | 'edit'

export interface QuoteBuilderShellQuote {
  quotationId: string
  quotationNumber: string | null
  quoteDate?: string | null
  clientId: string | null
  organizationId: string | null
  contactIdentityProfileId?: string | null
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
  contactIdentityProfileId: string | null
  description: string
  pricingModel: QuoteBuilderPricingModel
  currency: PricingOutputCurrency
  billingFrequency: QuoteBuilderBillingFrequency
  contractDurationMonths: number | null
  validUntil: string | null
  businessLineCode: string | null
  commercialModel: CommercialModelCode
  countryFactorCode: string
  lineItems: PersistedQuoteLineItem[]
}

// TASK-486: contactos canónicos anclables a la cotización.
interface QuoteOrganizationContact {
  identityProfileId: string
  fullName: string | null
  canonicalEmail: string | null
  jobTitle: string | null
  roleLabel: string | null
  membershipType: string
  isPrimary: boolean
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

interface CommercialModelOption {
  code: CommercialModelCode
  label: string
  multiplierPct: number
}

interface CountryFactorOption {
  code: string
  label: string
  factor: number
}

const DEFAULT_COMMERCIAL_MODELS: CommercialModelOption[] = [
  { code: 'on_going', label: 'On-Going', multiplierPct: 0 },
  { code: 'on_demand', label: 'On-Demand', multiplierPct: 15 },
  { code: 'hybrid', label: 'Híbrido', multiplierPct: 10 },
  { code: 'license_consulting', label: 'Licencia / Consultoría', multiplierPct: 5 }
]

const DEFAULT_COUNTRY_FACTORS: CountryFactorOption[] = [
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

interface QuoteBuilderSubmitOptions {
  closeAfter?: boolean
  issueAfterSave?: boolean
}

interface BuilderContextState extends QuoteBuilderPricingContext {
  quoteDate: string
  businessLineCode: string | null
  commercialModel: CommercialModelCode
  countryFactorCode: string
  outputCurrency: PricingOutputCurrency
  contractDurationMonths: number | null
  validUntil: string | null
  description: string
}

const resolveQuoteStatus = (status: string | undefined): QuoteStatus => {
  switch (status) {
    case 'pending_approval':
      return 'pending_approval'
    case 'approval_rejected':
      return 'approval_rejected'
    case 'issued':
      return 'issued'
    case 'sent':
      return 'sent'
    case 'approved':
      return 'approved'
    case 'converted':
      return 'converted'
    case 'expired':
      return 'expired'
    default:
      return 'draft'
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

  const initialBuilderState = useMemo<BuilderContextState>(
    () => ({
      quoteDate: quote?.quoteDate ?? new Date().toISOString().slice(0, 10),
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

  const [builderState, setBuilderState] = useState<BuilderContextState>(initialBuilderState)
  const [organizationId, setOrganizationId] = useState<string | null>(quote?.organizationId ?? null)

  const [contactIdentityProfileId, setContactIdentityProfileId] = useState<string | null>(
    quote?.contactIdentityProfileId ?? null
  )

  const [orgContacts, setOrgContacts] = useState<QuoteOrganizationContact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)

  const [pricingModel, setPricingModel] = useState<QuoteBuilderPricingModel>(
    coercePricingModel(quote?.pricingModel ?? null)
  )

  const [billingFrequency, setBillingFrequency] = useState<QuoteBuilderBillingFrequency>(
    coerceBillingFrequency(quote?.billingFrequency ?? null)
  )

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [linesSnapshot, setLinesSnapshot] = useState<QuoteLineItem[]>(initialLines)
  const [submitting, setSubmitting] = useState(false)
  const [serviceExpanding, setServiceExpanding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerInitialTab, setPickerInitialTab] = useState<SellableItemPickerTab>('roles')
  const [pickerMode, setPickerMode] = useState<'catalog' | 'service'>('catalog')
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)

  const [builderOptions, setBuilderOptions] = useState<{
    businessLines: Array<{ code: string; label: string }>
    commercialModels: CommercialModelOption[]
    countryFactors: CountryFactorOption[]
    employmentTypes: Array<{ value: string; label: string }>
  }>({
    businessLines: [],
    commercialModels: DEFAULT_COMMERCIAL_MODELS,
    countryFactors: DEFAULT_COUNTRY_FACTORS,
    employmentTypes: []
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
            employmentTypes?: Array<{ employmentTypeCode: string; labelEs: string; active?: boolean }>
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

        const employmentTypes = payload.catalog?.employmentTypes
          ?.filter(et => et.active !== false)
          .map(et => ({ value: et.employmentTypeCode, label: et.labelEs }))

        setBuilderOptions(prev => ({
          businessLines: businessLines && businessLines.length > 0 ? businessLines : prev.businessLines,
          commercialModels: commercialModels && commercialModels.length > 0 ? commercialModels : prev.commercialModels,
          countryFactors: countryFactors && countryFactors.length > 0 ? countryFactors : prev.countryFactors,
          employmentTypes: employmentTypes && employmentTypes.length > 0 ? employmentTypes : prev.employmentTypes
        }))
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    })()

    return () => controller.abort()
  }, [])

  // TASK-486: al cambiar de organización recargar la lista de contactos anclables.
  useEffect(() => {
    if (!organizationId) {
      setOrgContacts([])
      setContactsLoading(false)

      return
    }

    const controller = new AbortController()

    setContactsLoading(true)

    ;(async () => {
      try {
        const res = await fetch(`/api/commercial/organizations/${organizationId}/contacts`, {
          signal: controller.signal
        })

        if (!res.ok) {
          console.warn(`[QuoteBuilderShell] contacts fetch failed: ${res.status}`)
          setOrgContacts([])

          return
        }

        const payload = (await res.json()) as { items?: QuoteOrganizationContact[] }

        setOrgContacts(payload.items ?? [])
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.warn('[QuoteBuilderShell] contacts fetch error', err)
        setOrgContacts([])
      } finally {
        setContactsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [organizationId])

  const currency = builderState.outputCurrency

  const pricingInput = useMemo(
    () => buildQuotePricingInput(builderState, currency, linesSnapshot),
    [builderState, currency, linesSnapshot]
  )

  const {
    output: simulation,
    loading: simulating,
    error: simulationError
  } = usePricingSimulation(pricingInput, { enabled: true })

  // Cuando el engine v2 falla por un SKU especifico (ej. "Missing cost
  // components for role ECG-004", "Unknown tool SKU: TOOL-X"), sinteticamos un
  // PricingWarning con lineIndex para que el editor lo renderice inline debajo
  // de la fila que lo causo, en vez de dejarlo huerfano en el dock.
  const lineAnchoredError = useMemo<{ lineIndex: number; message: string } | null>(() => {
    if (!simulationError) return null

    // Matches 'role ECG-001', 'tool TOOL-FIGMA', 'person MEM-...', 'addon EFO-003', etc.
    const skuPattern = /\b([A-Z]{2,}[-_][A-Z0-9][A-Z0-9-]+)\b/
    const match = simulationError.match(skuPattern)

    if (!match) return null

    const sku = match[1]

    const rowIdx = linesSnapshot.findIndex(line =>
      line.metadata?.sku === sku ||
      line.roleCode === sku ||
      line.memberId === sku ||
      line.serviceSku === sku
    )

    if (rowIdx === -1) return null

    return { lineIndex: rowIdx, message: simulationError }
  }, [simulationError, linesSnapshot])

  const syntheticWarnings = useMemo<PricingWarning[]>(() => {
    if (!lineAnchoredError) return []

    return [{
      code: 'engine_error',
      severity: 'critical',
      message: lineAnchoredError.message,
      lineIndex: lineAnchoredError.lineIndex
    }]
  }, [lineAnchoredError])

  const mergedStructuredWarnings = useMemo<PricingWarning[]>(
    () => [...(simulation?.structuredWarnings ?? []), ...syntheticWarnings],
    [simulation?.structuredWarnings, syntheticWarnings]
  )

  // Solo mostrar simulationError en el dock si NO pudo anclarse a una fila
  const dockSimulationError = lineAnchoredError ? null : simulationError

  // includedSkus deriva del snapshot: un addon está "incluido" si hay una
  // línea overhead_addon con ese sku. Una única fuente de verdad — ver un
  // checkbox tildado equivale a ver una fila en la tabla.
  const includedAddonSkus = useMemo(
    () =>
      linesSnapshot
        .filter(line => line.metadata?.pricingV2LineType === 'overhead_addon')
        .map(line => line.metadata?.sku ?? '')
        .filter(sku => sku.length > 0),
    [linesSnapshot]
  )

  // Sugerencias que aún NO están como línea. El engine solo llena
  // suggestedVisibleAddons cuando autoResolveAddons === 'internal_only', y
  // devuelve los visibles que aplicarían al contexto + que no están ya como
  // línea explícita.
  const addonSuggestions = useMemo(
    () => simulation?.suggestedVisibleAddons ?? [],
    [simulation?.suggestedVisibleAddons]
  )

  // Entries del panel: mezcla las sugerencias no aplicadas con los addons que
  // ya son línea explícita (para poder destildarlos). Cada entry incluye
  // la info necesaria (nombre + monto) para renderizar el checkbox.
  // Dedupe por sku con applied como prioridad: durante la ventana de debounce
  // del engine, un mismo sku puede aparecer simultáneamente como applied
  // (linesSnapshot) y como suggestion (simulation cacheada del run anterior).
  // Sin dedupe, el panel renderizaba dos filas y un click accidental sobre la
  // "suggestion" disparaba otro appendLines duplicando la línea.
  const addonPanelEntries = useMemo(() => {
    const seen = new Set<string>()

    const entries: Array<{
      sku: string
      addonName: string
      appliedReason: string
      amountOutputCurrency: number
      amountUsd: number
      visibleToClient: boolean
    }> = []

    linesSnapshot.forEach((line, idx) => {
      if (line.metadata?.pricingV2LineType !== 'overhead_addon') return
      const sku = line.metadata?.sku ?? ''

      if (sku.length === 0 || seen.has(sku)) return

      seen.add(sku)

      const simLine = simulation?.lines?.[idx] ?? null

      entries.push({
        sku,
        addonName: line.label,
        appliedReason: '',
        amountOutputCurrency: simLine?.suggestedBillRate?.totalBillOutputCurrency ?? 0,
        amountUsd: simLine?.suggestedBillRate?.totalBillUsd ?? 0,
        visibleToClient: true
      })
    })

    addonSuggestions.forEach(suggestion => {
      if (seen.has(suggestion.sku)) return
      seen.add(suggestion.sku)
      entries.push(suggestion)
    })

    return entries
  }, [linesSnapshot, simulation?.lines, addonSuggestions])

  const handleAddonToggle = useCallback(
    (sku: string, include: boolean) => {
      if (include) {
        // Guard idempotente: si el sku ya está como línea no-op. Protege de
        // dobles clicks durante la ventana de debounce del engine (cuando un
        // addon aparece simultáneamente como applied + suggestion).
        const alreadyApplied = linesSnapshot.some(
          line =>
            line.metadata?.pricingV2LineType === 'overhead_addon' &&
            line.metadata?.sku === sku
        )

        if (alreadyApplied) return

        // Promote suggestion → explicit overhead_addon line. El engine v2 la
        // trata como línea normal: bill suma al total, persiste como line item,
        // aparece en el PDF del cliente.
        const suggestion = addonSuggestions.find(a => a.sku === sku)

        if (!suggestion) return

        editorRef.current?.appendLines([
          {
            label: suggestion.addonName,
            description: null,
            lineType: 'direct_cost',
            unit: 'unit',
            quantity: 1,
            unitPrice: null,
            subtotalPrice: null,
            subtotalAfterDiscount: null,
            roleCode: null,
            memberId: null,
            productId: null,
            discountType: null,
            discountValue: null,
            source: 'catalog',
            metadata: {
              pricingV2LineType: 'overhead_addon',
              sku
            }
          }
        ])

        return
      }

      // Destildar → remover la línea overhead_addon con ese sku del snapshot.
      setLinesSnapshot(prev =>
        prev.filter(
          line =>
            !(
              line.metadata?.pricingV2LineType === 'overhead_addon' &&
              line.metadata?.sku === sku
            )
        )
      )
    },
    [addonSuggestions, linesSnapshot]
  )

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
  }, [])

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
              countryFactorCode: builderState.countryFactorCode,
              quoteDate: builderState.quoteDate,
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
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error expandiendo el servicio.')
      } finally {
        setServiceExpanding(false)
      }
    },
    [builderState.commercialModel, builderState.countryFactorCode, builderState.quoteDate, currency]
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
    },
    [pickerMode, expandServiceSelections]
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

  const handleSubmit = useCallback(async ({ closeAfter = true, issueAfterSave = false }: QuoteBuilderSubmitOptions = {}) => {
    const validation = validate()

    if (validation) {
      setError(validation)

      return
    }

    setError(null)
    setSubmitting(true)

    try {
      const draftLines = editorRef.current?.getDraft() ?? linesSnapshot

      const resolveSavedRedirect = (id: string | null) => {
        if (!id) return

        toast.success(mode === 'create' ? GH_PRICING.builderCreated : GH_PRICING.builderSaved, {
          autoClose: 2400,
          position: 'bottom-right'
        })

        router.push(closeAfter ? `/finance/quotes/${id}` : `/finance/quotes/${id}/edit`)
      }

      const resolveIssuedRedirect = async (quotationId: string | null) => {
        if (!quotationId) return

        const issueRes = await fetch(`/api/finance/quotes/${quotationId}/issue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })

        const issueBody = (await issueRes.json().catch(() => ({}))) as {
          approvalRequired?: boolean
          error?: string
        }

        if (!issueRes.ok) {
          toast.error(issueBody.error ?? GH_PRICING.builderIssueErrorFallback, {
            autoClose: 4200,
            position: 'bottom-right'
          })
          router.push(`/finance/quotes/${quotationId}`)

          return
        }

        toast.success(
          issueBody.approvalRequired
            ? GH_PRICING.builderIssueRequested
            : GH_PRICING.builderIssued,
          {
            autoClose: 2600,
            position: 'bottom-right'
          }
        )
        router.push(`/finance/quotes/${quotationId}`)
      }

      // Fresh-simulate on submit: el hook usePricingSimulation debouncea,
      // así que el `simulation` cacheado puede estar desfasado vs el draft
      // que el usuario acaba de tocar. Antes de persistir pedimos al engine
      // un output fresco sobre la SNAPSHOT ACTUAL. Cero race condition.
      let freshSimulationLines: PricingLineOutputV2[] | null = null
      let freshSimulationError: string | null = null

      if (!selectedTemplateId) {
        const freshInput = buildQuotePricingInput(builderState, currency, draftLines)

        if (freshInput) {
          try {
            const simRes = await fetch('/api/finance/quotes/pricing/simulate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(freshInput satisfies PricingEngineInputV2)
            })

            if (!simRes.ok) {
              const simBody = (await simRes.json().catch(() => ({}))) as { error?: string }

              freshSimulationError = simBody.error ?? 'No pudimos recalcular el pricing antes de guardar.'
            } else {
              const simBody = (await simRes.json()) as { lines?: PricingLineOutputV2[] }

              freshSimulationLines = simBody.lines ?? null
            }
          } catch {
            freshSimulationError = 'No pudimos conectar con el motor de pricing. Revisa tu conexión.'
          }
        }
      }

      const persistedLineItems = selectedTemplateId
        ? []
        : buildPersistedQuoteLineItems({
            lines: draftLines,
            currency,
            simulationLines: freshSimulationLines,
            missingPriceMessage: freshSimulationError ?? UNPRICED_QUOTATION_LINE_ITEMS_MESSAGE
          })

      if (onSubmit) {
        const result = await onSubmit({
          mode,
          quotationId: quote?.quotationId ?? null,
          templateId: selectedTemplateId,
          organizationId,
          contactIdentityProfileId,
          description: builderState.description.trim(),
          pricingModel,
          currency,
          billingFrequency,
          contractDurationMonths: builderState.contractDurationMonths,
          validUntil: builderState.validUntil,
          businessLineCode: builderState.businessLineCode,
          commercialModel: builderState.commercialModel,
          countryFactorCode: builderState.countryFactorCode,
          lineItems: persistedLineItems
        })

        const targetId = result?.quotationId ?? quote?.quotationId ?? null

        if (issueAfterSave) {
          await resolveIssuedRedirect(targetId)
        } else {
          resolveSavedRedirect(targetId)
        }

        return
      }

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
            contactIdentityProfileId,
            lineItems: persistedLineItems
          })
        })

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }

          throw new Error(body.error ?? GH_PRICING.builderSubmitErrorGeneric)
        }

        const created = (await res.json()) as { quotationId?: string }

        const createdQuotationId = created.quotationId ?? null

        if (issueAfterSave) {
          await resolveIssuedRedirect(createdQuotationId)
        } else {
          resolveSavedRedirect(createdQuotationId)
        }

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
            commercialModel: builderState.commercialModel,
            contactIdentityProfileId
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
            lineItems: persistedLineItems
          })
        })

        if (!linesRes.ok) {
          const body = (await linesRes.json().catch(() => ({}))) as { error?: string }

          throw new Error(body.error ?? GH_PRICING.builderSubmitErrorGeneric)
        }

        if (issueAfterSave) {
          await resolveIssuedRedirect(quote.quotationId)
        } else {
          resolveSavedRedirect(quote.quotationId)
        }
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
    contactIdentityProfileId,
    builderState,
    pricingModel,
    currency,
    billingFrequency,
    linesSnapshot,
    router
  ])

  const handleCancel = useCallback(() => {
    router.push('/finance/quotes')
  }, [router])

  const [shortcutPaletteOpen, setShortcutPaletteOpen] = useState(false)

  // Keyboard shortcuts globales para el builder (macOS ⌘ + Windows/Linux Ctrl)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const modifier = e.metaKey || e.ctrlKey

      // Ignorar cuando focus está en input/textarea/contenteditable (excepto Esc)
      const target = e.target as HTMLElement | null

      const inInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true

      if (modifier && e.shiftKey && e.key === 'Enter') {
        e.preventDefault()
        void handleSubmit({ issueAfterSave: true })

        return
      }

      if (modifier && e.key === 's') {
        e.preventDefault()
        void handleSubmit({ closeAfter: false })

        return
      }

      if (modifier && e.key === 'Enter') {
        e.preventDefault()
        void handleSubmit()

        return
      }

      if (modifier && (e.key === 'n' || e.key === 'N')) {
        if (inInput) return
        e.preventDefault()
        openCatalogPicker()

        return
      }

      if (modifier && e.key === '/') {
        e.preventDefault()
        setShortcutPaletteOpen(prev => !prev)

        return
      }
    }

    window.addEventListener('keydown', handler)

    return () => window.removeEventListener('keydown', handler)
  }, [handleSubmit, openCatalogPicker])

  const selectedOrgName = useMemo(
    () => organizations.find(o => o.organizationId === organizationId)?.organizationName ?? null,
    [organizations, organizationId]
  )

  const baseTitle = mode === 'edit' && quote?.quotationNumber
    ? `Editar ${quote.quotationNumber}`
    : GH_PRICING.builderTitleNew

  const title = selectedOrgName ? `${baseTitle} · ${selectedOrgName}` : baseTitle

  const subtitle = mode === 'edit' ? GH_PRICING.builderSubtitleEdit : GH_PRICING.builderSubtitleCreate
  const quoteStatus = resolveQuoteStatus(quote?.status)
  const canIssueFromBuilder = mode === 'create' || isIssueableFinanceQuotationStatus(quote?.status ?? 'draft')

  const contextValues = useMemo(
    () => ({
      organizationId,
      contactIdentityProfileId,
      businessLineCode: builderState.businessLineCode,
      commercialModel: builderState.commercialModel,
      countryFactorCode: builderState.countryFactorCode,
      outputCurrency: builderState.outputCurrency,
      contractDurationMonths: builderState.contractDurationMonths,
      validUntil: builderState.validUntil
    }),
    [
      organizationId,
      contactIdentityProfileId,
      builderState.businessLineCode,
      builderState.commercialModel,
      builderState.countryFactorCode,
      builderState.outputCurrency,
      builderState.contractDurationMonths,
      builderState.validUntil
    ]
  )

  const totalOutputCurrency = simulation?.totals.totalOutputCurrency ?? null
  const subtotalOutputCurrency = simulation?.totals.totalOutputCurrency ?? null // same for now — engine returns consolidated totalOutputCurrency
  const factorApplied = simulation?.totals.countryFactorApplied ?? null
  const marginPct = simulation?.aggregateMargin.marginPct ?? null
  const marginClass = simulation?.aggregateMargin.classification ?? null

  // Tier range para tooltip del margen (derivado de la primera línea con tier definido)
  const marginTierRange = useMemo(() => {
    const line = simulation?.lines?.find(
      l => l.tierCompliance && l.tierCompliance.marginMin !== null && l.tierCompliance.marginMax !== null
    )

    if (!line || !line.tierCompliance) return null
    const tc = line.tierCompliance

    if (tc.marginMin === null || tc.marginOpt === null || tc.marginMax === null) return null

    return {
      min: Number(tc.marginMin),
      opt: Number(tc.marginOpt),
      max: Number(tc.marginMax),
      tierLabel: tc.tier ? `Tier ${tc.tier}` : undefined
    }
  }, [simulation?.lines])

  // Suma de los addons ya aplicados como línea overhead_addon. El chip del
  // dock muestra este monto para dar contexto cuantitativo: "1 addon ·
  // $44.316" cuando hay addons aplicados, en vez de solo "1 addon".
  const appliedAddonsTotal = useMemo(() => {
    const simLines = simulation?.lines ?? []
    let total = 0
    let hasApplied = false

    linesSnapshot.forEach((line, idx) => {
      if (line.metadata?.pricingV2LineType !== 'overhead_addon') return
      hasApplied = true
      const simLine = simLines[idx] ?? null

      total += simLine?.suggestedBillRate?.totalBillOutputCurrency ?? 0
    })

    return hasApplied ? total : null
  }, [linesSnapshot, simulation?.lines])

  // Save state indicator: dirty si lines diff vs initial, clean cuando submitted.
  // changeCount = diferencia en cantidad de líneas (mínimo confiable sin diff
  // semántico deep); cuando es 0 pero sigue dirty (edit de campos existentes)
  // cae a undefined y el SaveStateIndicator muestra solo "Sin guardar".
  const initialFingerprint = useMemo(() => JSON.stringify(initialLines), [initialLines])
  const currentFingerprint = useMemo(() => JSON.stringify(linesSnapshot), [linesSnapshot])
  const isDirty = initialFingerprint !== currentFingerprint

  const changeCount = useMemo(() => {
    if (!isDirty) return undefined
    const delta = Math.abs(linesSnapshot.length - initialLines.length)

    return delta > 0 ? delta : undefined
  }, [isDirty, linesSnapshot.length, initialLines.length])

  const saveState: { kind: 'clean' | 'dirty' | 'saving' | 'saved'; changeCount?: number } | null = submitting
    ? { kind: 'saving' }
    : isDirty
      ? { kind: 'dirty', changeCount }
      : mode === 'edit'
        ? { kind: 'clean' }
        : null

  const hasSubmittableContent = selectedTemplateId !== null || linesSnapshot.length > 0
  const saveDraftDisabled = submitting || serviceExpanding || simulating

  const issueActionDisabled =
    saveDraftDisabled ||
    !hasSubmittableContent ||
    !organizationId ||
    !canIssueFromBuilder

  return (
    <Box>
      <QuoteIdentityStrip
        breadcrumbs={[
          { label: GH_PRICING.builderBreadcrumbRoot, href: '/finance' },
          { label: GH_PRICING.builderBreadcrumbList, href: '/finance/quotes' },
          { label: title }
        ]}
        title={title}
        subtitle={subtitle}
        quoteNumber={quote?.quotationNumber ?? null}
        status={quoteStatus}
        actions={
          <>
            <Button variant='tonal' color='secondary' onClick={handleCancel} disabled={submitting}>
              {GH_PRICING.builderCancel}
            </Button>
            <Button
              variant='tonal'
              color='primary'
              startIcon={<i className='tabler-device-floppy' aria-hidden='true' />}
              onClick={() => handleSubmit({ closeAfter: false })}
              disabled={saveDraftDisabled}
              sx={{ minHeight: 44 }}
            >
              {submitting ? GH_PRICING.builderSaving : simulating ? 'Calculando pricing…' : GH_PRICING.builderSaveDraft}
            </Button>
            {canIssueFromBuilder ? (
              <Button
                variant='contained'
                color='primary'
                startIcon={<i className='tabler-file-check' aria-hidden='true' />}
                onClick={() => handleSubmit({ issueAfterSave: true })}
                disabled={issueActionDisabled}
                sx={{ minHeight: 44 }}
              >
                {submitting ? GH_PRICING.builderSaving : GH_PRICING.builderSaveAndIssue}
              </Button>
            ) : null}
          </>
        }
      />

      <QuoteContextStrip
        values={contextValues}
        options={{
          organizations,
          contacts: orgContacts,
          contactsLoading,
          businessLines: builderOptions.businessLines,
          commercialModels: builderOptions.commercialModels,
          countryFactors: builderOptions.countryFactors
        }}
        disabled={submitting}
        organizationLocked={mode === 'edit'}
        onOrganizationChange={nextId => {
          setOrganizationId(nextId)
          setContactIdentityProfileId(null)
        }}
        onContactChange={setContactIdentityProfileId}
        onBusinessLineChange={code => setBuilderState(prev => ({ ...prev, businessLineCode: code }))}
        onCommercialModelChange={code => setBuilderState(prev => ({ ...prev, commercialModel: code }))}
        onCountryFactorChange={code => setBuilderState(prev => ({ ...prev, countryFactorCode: code }))}
        onCurrencyChange={value => setBuilderState(prev => ({ ...prev, outputCurrency: value }))}
        onDurationChange={months => setBuilderState(prev => ({ ...prev, contractDurationMonths: months }))}
        onValidUntilChange={iso => setBuilderState(prev => ({ ...prev, validUntil: iso }))}
      />

      <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          {error ? (
            <Alert severity='error' role='alert' onClose={() => setError(null)}>
              {error}
            </Alert>
          ) : null}

          {selectedTemplateId ? (
            <Alert severity='info' role='status' variant='outlined'>
              Template seleccionado. Los ítems del template se crearán al guardar.
            </Alert>
          ) : null}

          <QuoteLineItemsEditor
            ref={editorRef}
            quotationId={quote?.quotationId ?? ''}
            currency={currency}
            editable
            lineItems={linesSnapshot}
            saving={submitting || serviceExpanding}
            businessLineCode={builderState.businessLineCode}
            canViewCostStack={canSeeCostStack}
            simulationLines={simulation?.lines ?? null}
            outputCurrency={currency}
            structuredWarnings={mergedStructuredWarnings.length > 0 ? mergedStructuredWarnings : null}
            simulating={simulating}
            employmentTypeOptions={builderOptions.employmentTypes}
            onDraftChange={setLinesSnapshot}
            headerAction={
              <AddLineSplitButton
                onCatalog={openCatalogPicker}
                onService={openServicePicker}
                onTemplate={() => setTemplatePickerOpen(true)}
                onManual={handleManualLine}
                disabled={submitting || serviceExpanding}
              />
            }
            onAddFromCatalog={openCatalogPicker}
            onAddFromService={openServicePicker}
            onAddFromTemplate={() => setTemplatePickerOpen(true)}
          />

          <Accordion
            elevation={0}
            defaultExpanded={builderState.description.length > 0}
            sx={theme => ({
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              '&:before': { display: 'none' },
              '&.Mui-expanded': { margin: 0 },
              '&:first-of-type': { borderRadius: `${theme.shape.customBorderRadius.lg}px` },
              '&:last-of-type': { borderRadius: `${theme.shape.customBorderRadius.lg}px` }
            })}
          >
            <AccordionSummary
              expandIcon={<i className='tabler-chevron-down' aria-hidden='true' />}
              aria-controls='quote-detail-content'
              id='quote-detail-header'
            >
              <Stack direction='row' spacing={1.5} alignItems='center'>
                <i className='tabler-notes' aria-hidden='true' style={{ fontSize: 20 }} />
                <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                  {GH_PRICING.detailAccordion.title}
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails id='quote-detail-content'>
              <CustomTextField
                fullWidth
                multiline
                minRows={3}
                size='small'
                label={GH_PRICING.detailAccordion.descriptionLabel}
                value={builderState.description}
                disabled={submitting}
                onChange={event =>
                  setBuilderState(prev => ({ ...prev, description: event.target.value }))
                }
                placeholder={GH_PRICING.detailAccordion.descriptionPlaceholder}
              />
            </AccordionDetails>
          </Accordion>
        </Stack>

        <QuoteSummaryDock
          subtotal={subtotalOutputCurrency}
          factor={factorApplied}
          total={totalOutputCurrency}
          currency={currency}
          loading={simulating}
          addonCount={addonPanelEntries.length}
          addonContent={
            <AddonSuggestionsPanel
              suggestions={addonPanelEntries}
              includedSkus={includedAddonSkus}
              onToggle={handleAddonToggle}
              outputCurrency={currency}
              loading={simulating}
            />
          }
          primaryCtaLabel={GH_PRICING.summaryDock.primaryCta}
          primaryCtaIcon='tabler-file-check'
          primaryCtaLoading={submitting}
          primaryCtaDisabled={issueActionDisabled}
          onPrimaryClick={() => handleSubmit({ issueAfterSave: true })}
          marginClassification={marginClass}
          marginPct={marginPct}
          marginTierRange={marginTierRange}
          appliedAddonsTotal={appliedAddonsTotal}
          saveState={saveState}
          simulationError={dockSimulationError}
          emptyStateMessage={
            linesSnapshot.length === 0
              ? !organizationId
                ? 'Selecciona una organización y agrega ítems para calcular el total.'
                : 'Agrega al menos un ítem para calcular el total.'
              : null
          }
        />

      </Box>

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

      <QuoteShortcutPalette
        open={shortcutPaletteOpen}
        onClose={() => setShortcutPaletteOpen(false)}
      />
    </Box>
  )
}

export default QuoteBuilderShell
