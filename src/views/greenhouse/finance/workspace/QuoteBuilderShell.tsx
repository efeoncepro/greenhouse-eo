'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import { toast } from 'sonner'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import {
  CompositionShell,
  FieldsProgressChip,
  FormSectionAccordion
} from '@/components/greenhouse/primitives'
import ContextChip, {
  type ContextChipOption,
  type ContextChipStatus
} from '@/components/greenhouse/primitives/ContextChip'

import type { CommercialModelCode } from '@/lib/commercial/pricing-governance-types'
import { requiresHubSpotQuoteCommercialContext } from '@/lib/commercial/quote-hubspot-sync-context'
import type {
  PricingEngineInputV2,
  PricingLineOutputV2,
  PricingOutputCurrency,
  PricingV2LineType,
  PricingWarning
} from '@/lib/finance/pricing/contracts'
import { UNPRICED_QUOTATION_LINE_ITEMS_MESSAGE } from '@/lib/finance/pricing/quotation-line-input-validation'
import { isIssueableFinanceQuotationStatus } from '@/lib/finance/quotation-access'
import useParties, { type PartySearchError, type PartySearchItem } from '@/hooks/useParties'
import usePricingConfig from '@/hooks/usePricingConfig'
import usePricingSimulation from '@/hooks/usePricingSimulation'
import useReducedMotion from '@/hooks/useReducedMotion'
import { GH_PRICING } from '@/lib/copy/pricing'
import { previewChileTaxAmounts } from '@/lib/finance/pricing/quotation-tax-constants'
import {
  formatCurrency as formatGreenhouseCurrency,
  formatDate as formatGreenhouseDate,
  formatNumber as formatGreenhouseNumber
} from '@/lib/format'

import AddLineSplitButton from '@/components/greenhouse/pricing/AddLineSplitButton'
import type { QuoteContextPartySelectorOption } from '@/components/greenhouse/pricing/QuoteContextStrip'
import QuoteIdentityStrip, {
  type QuoteStatus
} from '@/components/greenhouse/pricing/QuoteIdentityStrip'
import QuoteShortcutPalette from '@/components/greenhouse/pricing/QuoteShortcutPalette'
import QuoteSummaryDock from '@/components/greenhouse/pricing/QuoteSummaryDock'
import SellableItemPickerDrawer, {
  type SellableItemPickerTab,
  type SellableSelection
} from '@/components/greenhouse/pricing/SellableItemPickerDrawer'
import { AnimatePresence, motion } from '@/libs/FramerMotion'

import AddonSuggestionsPanel from './AddonSuggestionsPanel'
import CreateDealDrawer from './CreateDealDrawer'
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
  hubspotDealId?: string | null
  hubspotQuoteId?: string | null
  description: string | null
  currency: string
  status: string
  source?: string | null
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
  hubspotDealId: string | null
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

interface QuoteOrganizationDeal {
  hubspotDealId: string
  dealName: string
  dealstage: string
  dealstageLabel: string | null
  pipelineName: string | null
  isClosed: boolean
  isWon: boolean
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

const QUOTE_CURRENCY_OPTIONS: ContextChipOption[] = [
  { value: 'CLP', label: 'CLP', secondary: 'Peso chileno' },
  { value: 'USD', label: 'USD', secondary: 'Dólar estadounidense' },
  { value: 'CLF', label: 'CLF', secondary: 'Unidad de fomento' },
  { value: 'COP', label: 'COP', secondary: 'Peso colombiano' },
  { value: 'MXN', label: 'MXN', secondary: 'Peso mexicano' },
  { value: 'PEN', label: 'PEN', secondary: 'Sol peruano' }
]

const PARTY_STAGE_LABEL: Record<NonNullable<QuoteContextPartySelectorOption['lifecycleStage']>, string> = {
  prospect: 'Prospecto',
  opportunity: 'Oportunidad',
  active_client: 'Cliente activo',
  inactive: 'Inactivo'
}

const PARTY_STAGE_COLOR: Record<
  NonNullable<QuoteContextPartySelectorOption['lifecycleStage']>,
  'primary' | 'success' | 'info' | 'warning' | 'secondary'
> = {
  prospect: 'info',
  opportunity: 'primary',
  active_client: 'primary',
  inactive: 'secondary'
}

const formatMultiplier = (pct: number): string => {
  const signed = pct >= 0 ? `+${pct}` : `${pct}`

  return `${signed}%`
}

const formatCountryFactor = (factor: number): string => factor.toFixed(2)

interface QuoteReadinessItem {
  key: keyof typeof GH_PRICING.dealDesk.checklistItems
  complete: boolean
}

type QuoteWizardStepId = 'context' | 'scope' | 'economics'

interface QuoteWizardFrameProps {
  activeStep: QuoteWizardStepId
  canOpenScope: boolean
  canOpenEconomics: boolean
  onStepChange: (step: QuoteWizardStepId) => void
  children: ReactNode
}

interface QuoteReadinessAsideProps {
  subtotal: number | null
  ivaAmount: number | null
  total: number | null
  currency: PricingOutputCurrency
  loading: boolean
  simulationError: string | null
  marginPct: number | null
  marginClassification: string | null
  addonCount: number
  appliedAddonsTotal: number | null
  primaryCtaLabel: string
  primaryCtaLoading: boolean
  primaryCtaDisabled: boolean
  disabledReason: string | null
  saveState: { kind: 'clean' | 'dirty' | 'saving' | 'saved'; changeCount?: number } | null
  onPrimaryClick: () => void
}

const QuoteWizardFrame = ({
  activeStep,
  canOpenScope,
  canOpenEconomics,
  onStepChange,
  children
}: QuoteWizardFrameProps) => {
  const prefersReducedMotion = useReducedMotion()

  const steps: Array<{
    id: QuoteWizardStepId
    icon: string
    disabled: boolean
  }> = [
    { id: 'context', icon: 'tabler-building-bank', disabled: false },
    { id: 'scope', icon: 'tabler-list-details', disabled: !canOpenScope },
    { id: 'economics', icon: 'tabler-chart-donut-3', disabled: !canOpenEconomics }
  ]

  const activeStepIndex = steps.findIndex(item => item.id === activeStep)
  const previousStepIndexRef = useRef(activeStepIndex)
  const transitionDirection = activeStepIndex >= previousStepIndexRef.current ? 1 : -1

  useEffect(() => {
    previousStepIndexRef.current = activeStepIndex
  }, [activeStepIndex])

  return (
    <Box data-capture='quote-builder-wizard'>
      <Box
        component='nav'
        aria-label={GH_PRICING.builderWizard.tabsAriaLabel}
        data-capture='quote-wizard-stepper'
        sx={theme => ({
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
          gap: { xs: 0.5, md: 0.75 },
          mb: { xs: 1.25, md: 2 },
          p: { xs: 0.35, md: 0.5 },
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          border: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
          backgroundColor: alpha(theme.palette.background.paper, 0.72)
        })}
      >
        {steps.map((step, index) => {
          const selected = activeStep === step.id
          const completed = index < activeStepIndex
          const copy = GH_PRICING.builderWizard.steps[step.id]

          const positionLabel = selected
            ? GH_PRICING.builderWizard.contextSetup.currentStepLabel
            : completed
              ? GH_PRICING.builderWizard.contextSetup.completedStepLabel
              : step.disabled
                ? GH_PRICING.builderWizard.contextSetup.lockedStepLabel
                : GH_PRICING.builderWizard.contextSetup.nextStepLabel

          return (
            <ButtonBase
              key={step.id}
              disabled={step.disabled}
              onClick={() => onStepChange(step.id)}
              aria-current={selected ? 'step' : undefined}
              sx={theme => ({
                minWidth: 0,
                minHeight: { xs: 46, md: 54 },
                justifyContent: { xs: 'center', md: 'flex-start' },
                gap: { xs: 0.5, md: 1.25 },
                px: { xs: 0.5, md: 1 },
                py: { xs: 0.65, md: 0.75 },
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                border: `1px solid ${
                  selected
                    ? alpha(theme.palette.primary.main, 0.3)
                    : completed
                      ? alpha(theme.palette.primary.main, 0.1)
                      : 'transparent'
                }`,
                backgroundColor: selected
                  ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.045)
                  : completed
                    ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.022)
                    : 'transparent',
                color: 'text.primary',
                textAlign: 'left',
                boxShadow: selected
                  ? `0 10px 26px -28px ${alpha(theme.palette.primary.main, 0.72)}`
                  : 'none',
                transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'transform'], {
                  duration: theme.transitions.duration.shortest
                }),
                '&:hover': !step.disabled
                  ? {
                      borderColor: selected ? alpha(theme.palette.primary.main, 0.4) : alpha(theme.palette.primary.main, 0.2),
                      backgroundColor: selected
                        ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.075)
                        : alpha(theme.palette.primary.main, 0.028),
                      transform: 'translateY(-1px)'
                    }
                  : undefined,
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                '&.Mui-focusVisible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2
                },
                '&.Mui-disabled': {
                  color: theme.palette.text.secondary,
                  backgroundColor: 'transparent',
                  borderColor: 'transparent',
                  opacity: 0.68
                }
              })}
            >
              <Box
                component='i'
                className={completed ? 'tabler-check' : step.icon}
                aria-hidden='true'
                sx={theme => ({
                  width: { xs: 26, md: 32 },
                  height: { xs: 26, md: 32 },
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: { xs: selected ? 16 : 15, md: selected ? 18 : 17 },
                  color: selected || completed ? 'primary.main' : 'text.secondary',
                  backgroundColor: selected
                    ? alpha(theme.palette.primary.main, 0.12)
                    : completed
                      ? alpha(theme.palette.primary.main, 0.075)
                      : alpha(theme.palette.text.primary, 0.035),
                  border: `1px solid ${
                    selected
                      ? alpha(theme.palette.primary.main, 0.32)
                      : completed
                        ? alpha(theme.palette.primary.main, 0.22)
                        : alpha(theme.palette.divider, 0.72)
                  }`,
                  boxShadow: selected ? `0 8px 18px -16px ${alpha(theme.palette.primary.main, 0.82)}` : 'none'
                })}
              />
              <Stack spacing={0.1} alignItems={{ xs: 'center', md: 'flex-start' }} sx={{ minWidth: 0 }}>
                <Typography
                  variant='caption'
                  sx={{
                    display: { xs: 'none', sm: 'block' },
                    color: selected ? 'primary.main' : 'text.secondary',
                    fontWeight: 600
                  }}
                >
                  {positionLabel}
                </Typography>
                <Typography
                  variant='subtitle1'
                  sx={{
                    color: selected ? 'primary.main' : 'text.primary',
                    fontWeight: 600,
                    lineHeight: { xs: 1.2, md: undefined },
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {`${index + 1}. ${copy.title}`}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{
                    display: { xs: 'none', xl: 'block' },
                    color: 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {copy.description}
                </Typography>
              </Stack>
            </ButtonBase>
          )
        })}
      </Box>
      <AnimatePresence initial={false} mode='wait'>
        <Box
          component={motion.div}
          key={activeStep}
          role='tabpanel'
          initial={prefersReducedMotion ? false : { opacity: 0, x: transitionDirection * 12 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, x: transitionDirection * -8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          sx={{
            minWidth: 0,
            overflow: 'visible'
          }}
        >
          <Card
            elevation={0}
            data-capture='quote-builder-active-step-card'
            sx={theme => ({
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              border: `1px solid ${alpha(theme.palette.divider, 0.92)}`,
              backgroundColor: theme.palette.background.paper,
              boxShadow: theme.greenhouseElevation.raised.boxShadow,
              overflow: 'visible'
            })}
          >
            {children}
          </Card>
        </Box>
      </AnimatePresence>
    </Box>
  )
}

const formatQuoteMoney = (amount: number | null, currency: PricingOutputCurrency): string => {
  if (amount === null || Number.isNaN(amount)) return GH_PRICING.dealDesk.totalUnavailable

  try {
    return formatGreenhouseCurrency(amount, currency, { maximumFractionDigits: 0 }, 'es-CL')
  } catch {
    return `${currency} ${formatGreenhouseNumber(Math.round(amount), 'es-CL')}`
  }
}

const formatQuoteMargin = (marginPct: number | null): string => {
  if (marginPct === null || Number.isNaN(marginPct)) return GH_PRICING.dealDesk.marginUnavailable

  return `${Math.round(marginPct)}%`
}

const resolveMarginChipColor = (
  marginClassification: string | null
): 'success' | 'warning' | 'error' | 'primary' => {
  if (!marginClassification) return 'primary'
  if (marginClassification.includes('below') || marginClassification.includes('critical')) return 'error'
  if (marginClassification.includes('above') || marginClassification.includes('warning')) return 'warning'

  return 'success'
}

const QuoteReadinessAside = ({
  subtotal,
  ivaAmount,
  total,
  currency,
  loading,
  simulationError,
  marginPct,
  marginClassification,
  addonCount,
  appliedAddonsTotal,
  primaryCtaLabel,
  primaryCtaLoading,
  primaryCtaDisabled,
  disabledReason,
  saveState,
  onPrimaryClick
}: QuoteReadinessAsideProps) => {
  const pricingStatus = simulationError
    ? GH_PRICING.dealDesk.pricingError
    : loading
      ? GH_PRICING.dealDesk.pricingCalculating
      : GH_PRICING.dealDesk.pricingReady

  const saveStateLabel =
    saveState?.kind === 'saving'
      ? GH_PRICING.builderSaving
      : saveState?.kind === 'dirty'
        ? GH_PRICING.dealDesk.saveStateDirty
        : saveState?.kind === 'clean'
          ? GH_PRICING.dealDesk.saveStateClean
          : null

  return (
    <Card
      elevation={0}
      data-capture='quote-builder-readiness-economics'
      sx={theme => ({
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        overflow: 'hidden',
        position: { sm: 'sticky' },
        top: { sm: theme.spacing(3) },
        maxHeight: { sm: `calc(100dvh - ${theme.spacing(6)})` },
        overflowY: { sm: 'auto' }
      })}
    >
      <Stack spacing={0}>
        <Box sx={{ p: 3 }}>
          <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant='overline' color='text.secondary'>
                {GH_PRICING.dealDesk.asideEyebrow}
              </Typography>
              <Typography variant='h6'>{GH_PRICING.dealDesk.asideTitle}</Typography>
            </Stack>
          </Stack>

          <Stack spacing={1} sx={{ mt: 3 }}>
            <Typography variant='caption' color='text.secondary'>
              {GH_PRICING.summaryDock.totalLabel}
            </Typography>
            <Typography
              variant='kpiValue'
              sx={{
                wordBreak: 'break-word'
              }}
            >
              {loading && total === null ? GH_PRICING.summaryDock.loadingLabel : formatQuoteMoney(total, currency)}
            </Typography>
            {saveStateLabel ? (
            <Typography variant='body2' color='text.secondary'>
                {saveStateLabel}
              </Typography>
            ) : null}
          </Stack>
        </Box>

        <Divider />

        <Stack spacing={1.5} sx={{ p: 3 }}>
          {[
            [GH_PRICING.summaryDock.subtotalLabel, formatQuoteMoney(subtotal, currency)],
            [GH_PRICING.summaryDock.ivaLabel, formatQuoteMoney(ivaAmount, currency)],
            [GH_PRICING.summaryDock.addonsChip(addonCount), formatQuoteMoney(appliedAddonsTotal, currency)]
          ].map(([label, value]) => (
            <Stack key={label} direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
              <Typography variant='body2' color='text.secondary'>
                {label}
              </Typography>
              <Typography variant='monoAmount' sx={{ color: 'text.primary' }}>
                {value}
              </Typography>
            </Stack>
          ))}
          <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
            <Typography variant='body2' color='text.secondary'>
              {GH_PRICING.dealDesk.marginLabel}
            </Typography>
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={resolveMarginChipColor(marginClassification)}
              label={formatQuoteMargin(marginPct)}
            />
          </Stack>
        </Stack>

        <Divider />

        <Stack spacing={1.75} sx={{ p: 3 }}>
          <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
            <Typography variant='h6'>{GH_PRICING.dealDesk.pricingTitle}</Typography>
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={simulationError ? 'error' : loading ? 'warning' : 'primary'}
              label={pricingStatus}
            />
          </Stack>
        </Stack>

        <Divider />

        <Stack
          spacing={1.25}
          sx={{
            p: 3,
            backgroundColor: 'background.default',
            position: { sm: 'sticky' },
            bottom: 0,
            zIndex: 1
          }}
        >
          <Typography variant='h6'>{GH_PRICING.dealDesk.closureTitle}</Typography>
          <Tooltip title={disabledReason ?? ''} disableHoverListener={!disabledReason} disableInteractive>
            <span>
              <Button
                fullWidth
                variant='contained'
                startIcon={<i className='tabler-file-check' aria-hidden='true' />}
                disabled={primaryCtaDisabled}
                onClick={onPrimaryClick}
                sx={theme => ({
                  '&.Mui-disabled': {
                    backgroundColor: theme.palette.action.disabledBackground,
                    color: theme.palette.text.disabled,
                    boxShadow: 'none'
                  }
                })}
              >
                {primaryCtaLoading ? GH_PRICING.builderSaving : primaryCtaLabel}
              </Button>
            </span>
          </Tooltip>
          {disabledReason ? (
            <Typography variant='body2' color='text.secondary' role='status' sx={{ textAlign: 'center' }}>
              {disabledReason}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </Card>
  )
}

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

const upsertOrganization = (
  organizations: QuoteCreateOrganization[],
  nextOrganization: QuoteCreateOrganization
): QuoteCreateOrganization[] => {
  const existingIndex = organizations.findIndex(org => org.organizationId === nextOrganization.organizationId)

  if (existingIndex === -1) {
    return [nextOrganization, ...organizations]
  }

  const next = [...organizations]

  next[existingIndex] = nextOrganization

  return next
}

const formatPartySelectorError = (error: PartySearchError): string => {
  if (error.retryAfterSeconds && error.retryAfterSeconds > 0) {
    return `${error.message} Intenta de nuevo en ${error.retryAfterSeconds}s.`
  }

  return error.message
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
  const [localOrganizations, setLocalOrganizations] = useState<QuoteCreateOrganization[]>(() => organizations)
  const [organizationId, setOrganizationId] = useState<string | null>(quote?.organizationId ?? null)
  const [pendingOrganizationLabel, setPendingOrganizationLabel] = useState<string | null>(null)

  const [contactIdentityProfileId, setContactIdentityProfileId] = useState<string | null>(
    quote?.contactIdentityProfileId ?? null
  )

  const [hubspotDealId, setHubspotDealId] = useState<string | null>(quote?.hubspotDealId ?? null)

  const [orgContacts, setOrgContacts] = useState<QuoteOrganizationContact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [orgDeals, setOrgDeals] = useState<QuoteOrganizationDeal[]>([])
  const [dealsLoading, setDealsLoading] = useState(false)

  // TASK-539: inline deal creation from the Quote Builder
  const [createDealDrawerOpen, setCreateDealDrawerOpen] = useState(false)

  const [pricingModel, setPricingModel] = useState<QuoteBuilderPricingModel>(
    coercePricingModel(quote?.pricingModel ?? null)
  )

  const [billingFrequency, setBillingFrequency] = useState<QuoteBuilderBillingFrequency>(
    coerceBillingFrequency(quote?.billingFrequency ?? null)
  )

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [linesSnapshot, setLinesSnapshot] = useState<QuoteLineItem[]>(initialLines)

  const [activeWizardStep, setActiveWizardStep] = useState<QuoteWizardStepId>(
    quote?.organizationId ? (initialLines.length > 0 ? 'economics' : 'scope') : 'context'
  )

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

  const unifiedPartySelectorEnabled = mode === 'create'

  const {
    query: partySearchQuery,
    setQuery: setPartySearchQuery,
    parties: partySearchResults,
    hasMore: partySearchHasMore,
    loading: partySearchLoading,
    searchError: partySearchError,
    settledQuery: partySearchSettledQuery,
    adoptingCompanyId,
    clearSearch: clearPartySearch,
    adoptParty
  } = useParties({ enabled: unifiedPartySelectorEnabled })

  const setOrganizationContext = useCallback((nextOrganizationId: string | null) => {
    setOrganizationId(nextOrganizationId)
    setContactIdentityProfileId(null)
    setHubspotDealId(null)
  }, [])

  const partySelectorOptions = useMemo<QuoteContextPartySelectorOption[]>(
    () =>
      partySearchResults.map(result => ({
        kind: result.kind,
        organizationId: result.organizationId,
        commercialPartyId: result.commercialPartyId,
        hubspotCompanyId: result.hubspotCompanyId,
        displayName: result.displayName,
        lifecycleStage: result.lifecycleStage,
        domain: result.domain ?? null,
        logoUrl: result.logoUrl ?? null,
        canAdopt: result.canAdopt
      })),
    [partySearchResults]
  )

  const partySearchTrimmedQuery = partySearchQuery.trim()

  const partySearchWaitingForCurrentQuery =
    unifiedPartySelectorEnabled &&
    partySearchTrimmedQuery.length >= 2 &&
    partySearchSettledQuery !== partySearchTrimmedQuery &&
    !partySearchError

  const partySelectorLiveMessage = useMemo(() => {
    if (!unifiedPartySelectorEnabled) return undefined

    if (adoptingCompanyId) {
      return GH_PRICING.contextChips.organization.unifiedAdopting
    }

    if (partySearchLoading || partySearchWaitingForCurrentQuery) {
      return 'Buscando organizaciones…'
    }

    if (partySearchError) {
      return formatPartySelectorError(partySearchError)
    }

    const trimmedQuery = partySearchQuery.trim()

    if (trimmedQuery.length < 2) {
      return GH_PRICING.contextChips.organization.unifiedMinQuery
    }

    if (partySearchResults.length === 0) {
      return GH_PRICING.contextChips.organization.unifiedEmpty
    }

    return partySearchHasMore
      ? `${partySearchResults.length} resultados parciales disponibles.`
      : `${partySearchResults.length} resultados disponibles.`
  }, [
    adoptingCompanyId,
    partySearchError,
    partySearchHasMore,
    partySearchLoading,
    partySearchQuery,
    partySearchResults.length,
    partySearchWaitingForCurrentQuery,
    unifiedPartySelectorEnabled
  ])

  const handleOrganizationChange = useCallback(
    (nextOrganizationId: string | null) => {
      setPendingOrganizationLabel(null)
      setOrganizationContext(nextOrganizationId)
    },
    [setOrganizationContext]
  )

  const handlePartySelection = useCallback(async (party: QuoteContextPartySelectorOption | null) => {
    if (!party) {
      setPendingOrganizationLabel(null)
      setOrganizationContext(null)

      return
    }

    if (party.kind === 'party' && party.organizationId) {
      setPendingOrganizationLabel(null)
      setLocalOrganizations(current =>
        upsertOrganization(current, {
          organizationId: party.organizationId as string,
          organizationName: party.displayName,
          logoUrl: party.logoUrl ?? null
        })
      )
      setOrganizationContext(party.organizationId)
      clearPartySearch()

      return
    }

    if (party.kind !== 'hubspot_candidate') {
      return
    }

    setPendingOrganizationLabel(party.displayName)

    try {
      const adopted = await adoptParty(party as PartySearchItem)

      if (!adopted) return

      setLocalOrganizations(current =>
        upsertOrganization(current, {
          organizationId: adopted.organizationId,
          organizationName: party.displayName,
          logoUrl: party.logoUrl ?? null
        })
      )
      setOrganizationContext(adopted.organizationId)
      clearPartySearch()
      toast.success(GH_PRICING.contextChips.organization.unifiedAdopted, {
        // TASK-512: sonner uses `duration` (ms). Position is set globally on
        // the Toaster in Providers.tsx; per-toast position is not supported.
        duration: 2400
      })
    } catch (caught) {
      const nextError =
        caught && typeof caught === 'object' && 'message' in caught
          ? formatPartySelectorError(caught as PartySearchError)
          : GH_PRICING.contextChips.organization.unifiedError

      setError(nextError)
      toast.error(nextError, {
        duration: 4200
      })
    } finally {
      setPendingOrganizationLabel(null)
    }
  }, [adoptParty, clearPartySearch, setOrganizationContext])

  /*
    TASK-513: pricingConfigQuery reemplaza el useEffect+fetch+AbortController
    manual. La cache de react-query (staleTime 5min) evita re-fetchear el
    catalog en cada mount del builder. El derivar de `pricingConfigQuery.data`
    se hace via useMemo abajo para mantener el contrato existente con
    builderOptions.
  */
  const { data: pricingConfigCatalog } = usePricingConfig()

  useEffect(() => {
    if (!pricingConfigCatalog) return

    const commercialModels = pricingConfigCatalog.commercialModelMultipliers?.map(m => ({
      code: m.modelCode,
      label: m.modelLabel,
      multiplierPct: Number(m.multiplierPct)
    }))

    const countryFactors = pricingConfigCatalog.countryPricingFactors?.map(f => ({
      code: f.factorCode,
      label: f.factorLabel,
      factor: Number(f.factorOpt)
    }))

    const businessLines = pricingConfigCatalog.businessLines
      ?.filter(bl => bl.isActive !== false)
      .map(bl => ({ code: bl.moduleCode, label: bl.label }))

    const employmentTypes = pricingConfigCatalog.employmentTypes
      ?.filter(et => et.active !== false)
      .map(et => ({ value: et.employmentTypeCode, label: et.labelEs }))

    setBuilderOptions(prev => ({
      businessLines: businessLines && businessLines.length > 0 ? businessLines : prev.businessLines,
      commercialModels: commercialModels && commercialModels.length > 0 ? commercialModels : prev.commercialModels,
      countryFactors: countryFactors && countryFactors.length > 0 ? countryFactors : prev.countryFactors,
      employmentTypes: employmentTypes && employmentTypes.length > 0 ? employmentTypes : prev.employmentTypes
    }))
  }, [pricingConfigCatalog])

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

  useEffect(() => {
    if (!organizationId) {
      setOrgDeals([])
      setDealsLoading(false)

      return
    }

    const controller = new AbortController()

    setDealsLoading(true)

    ;(async () => {
      try {
        const res = await fetch(`/api/commercial/organizations/${organizationId}/deals`, {
          signal: controller.signal
        })

        if (!res.ok) {
          console.warn(`[QuoteBuilderShell] deals fetch failed: ${res.status}`)
          setOrgDeals([])

          return
        }

        const payload = (await res.json()) as { items?: QuoteOrganizationDeal[] }
        const items = payload.items ?? []

        setOrgDeals(items)
        setHubspotDealId(current =>
          current && items.some(item => item.hubspotDealId === current) ? current : null
        )
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.warn('[QuoteBuilderShell] deals fetch error', err)
        setOrgDeals([])
      } finally {
        setDealsLoading(false)
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

      setPickerOpen(false)

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

    const requiresHubSpotContext = requiresHubSpotQuoteCommercialContext({
      hubspotDealId,
      hubspotQuoteId: quote?.hubspotQuoteId ?? null,
      sourceSystem: quote?.source ?? null
    })

    if (requiresHubSpotContext && !contactIdentityProfileId) {
      return GH_PRICING.builderValidationHubspotContact
    }

    if (requiresHubSpotContext && !hubspotDealId) {
      return GH_PRICING.builderValidationHubspotDeal
    }

    return null
  }, [
    builderState.description,
    contactIdentityProfileId,
    hubspotDealId,
    linesSnapshot,
    organizationId,
    quote?.hubspotQuoteId,
    quote?.source,
    selectedTemplateId
  ])

  const invalidFields = useMemo(() => {
    const requiresHubSpotContext = requiresHubSpotQuoteCommercialContext({
      hubspotDealId,
      hubspotQuoteId: quote?.hubspotQuoteId ?? null,
      sourceSystem: quote?.source ?? null
    })

    return {
      organizationId: !organizationId && !selectedTemplateId ? GH_PRICING.builderValidationOrganization : undefined,
      contactIdentityProfileId:
        requiresHubSpotContext && !contactIdentityProfileId ? GH_PRICING.builderValidationHubspotContact : undefined,
      hubspotDealId:
        requiresHubSpotContext && !hubspotDealId ? GH_PRICING.builderValidationHubspotDeal : undefined
    }
  }, [
    contactIdentityProfileId,
    hubspotDealId,
    organizationId,
    quote?.hubspotQuoteId,
    quote?.source,
    selectedTemplateId
  ])

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
          duration: 2400
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
            duration: 4200
          })
          router.push(`/finance/quotes/${quotationId}`)

          return
        }

        toast.success(
          issueBody.approvalRequired
            ? GH_PRICING.builderIssueRequested
            : GH_PRICING.builderIssued,
          {
            duration: 2600
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
          hubspotDealId,
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
            pricingEngineCommercialModel: builderState.commercialModel,
            countryFactorCode: builderState.countryFactorCode,
            contactIdentityProfileId,
            hubspotDealId,
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
            contactIdentityProfileId,
            hubspotDealId
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
            lineItems: persistedLineItems,
            pricingContext: {
              commercialModelCode: builderState.commercialModel,
              countryFactorCode: builderState.countryFactorCode,
              autoResolveAddons: 'internal_only'
            }
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
    hubspotDealId,
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
    () => localOrganizations.find(o => o.organizationId === organizationId)?.organizationName ?? pendingOrganizationLabel ?? null,
    [localOrganizations, organizationId, pendingOrganizationLabel]
  )

  const selectedContact = useMemo(
    () => orgContacts.find(contact => contact.identityProfileId === contactIdentityProfileId) ?? null,
    [contactIdentityProfileId, orgContacts]
  )

  const baseTitle = mode === 'edit' && quote?.quotationNumber
    ? `Editar ${quote.quotationNumber}`
    : GH_PRICING.builderTitleNew

  const title = selectedOrgName ? `${baseTitle} · ${selectedOrgName}` : baseTitle

  const quoteStatus = resolveQuoteStatus(quote?.status)
  const canIssueFromBuilder = mode === 'create' || isIssueableFinanceQuotationStatus(quote?.status ?? 'draft')

  // TASK-615: subtitle dinámico que enseña el siguiente paso real del flujo en
  // lugar de la línea estática "Arma la cotización combinando ítems…". El
  // header se queda con identidad + save draft; el dock conserva la acción
  // terminal. La narrativa del top fold cuenta el estado, el dock cierra.
  const requiresHubSpotContextForSubtitle = useMemo(
    () =>
      requiresHubSpotQuoteCommercialContext({
        hubspotDealId,
        hubspotQuoteId: quote?.hubspotQuoteId ?? null,
        sourceSystem: quote?.source ?? null
      }),
    [hubspotDealId, quote?.hubspotQuoteId, quote?.source]
  )

  const subtitle = useMemo(() => {
    if (quoteStatus === 'pending_approval') return GH_PRICING.identityStrip.subtitlePendingApproval
    if (mode === 'edit' && !canIssueFromBuilder) return GH_PRICING.identityStrip.subtitleEditingIssued
    if (!organizationId) return GH_PRICING.identityStrip.subtitleNeedsOrganization
    if (requiresHubSpotContextForSubtitle && !contactIdentityProfileId) return GH_PRICING.identityStrip.subtitleNeedsContact
    if (requiresHubSpotContextForSubtitle && !hubspotDealId) return GH_PRICING.identityStrip.subtitleNeedsDeal
    if (linesSnapshot.length === 0 && !selectedTemplateId) return GH_PRICING.identityStrip.subtitleNeedsLines

    return GH_PRICING.identityStrip.subtitleReady
  }, [
    canIssueFromBuilder,
    contactIdentityProfileId,
    hubspotDealId,
    linesSnapshot.length,
    mode,
    organizationId,
    quoteStatus,
    requiresHubSpotContextForSubtitle,
    selectedTemplateId
  ])

  const totalOutputCurrency = simulation?.totals.totalOutputCurrency ?? null
  const subtotalOutputCurrency = simulation?.totals.totalOutputCurrency ?? null // same for now — engine returns consolidated totalOutputCurrency

  // TASK-530: preview IVA amount + total-con-IVA client-side so the summary
  // dock shows Neto / IVA / Total. Uses the default Chile 19% rate; the
  // server re-resolves the canonical rate from the catalogue at issue time.
  // Engine output is NET (no IVA) — subtotal prop stays net; total prop
  // becomes net + IVA so the dock headline matches the invoice.
  const taxPreview = subtotalOutputCurrency !== null
    ? previewChileTaxAmounts(subtotalOutputCurrency, 'cl_vat_19')
    : null

  const ivaAmountPreview = taxPreview?.taxAmount ?? null
  const totalWithIvaPreview = taxPreview?.totalAmount ?? totalOutputCurrency

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

  // TASK-615: razón humana para el CTA terminal cuando está deshabilitado.
  // Se inyecta al dock como tooltip + aria-describedby. Orden de precedencia:
  // 'busy' (estamos guardando) → 'simulationError' (algo falló en el motor)
  // → 'noOrganization' (sin org no se emite) → 'noLines' (sin items tampoco)
  // → 'notIssueable' (estado del documento no permite emisión).
  const issueDisabledReason = useMemo<string | null>(() => {
    if (!issueActionDisabled) return null
    const reasons = GH_PRICING.summaryDock.disabledReasons

    if (submitting || serviceExpanding) return reasons.busy
    if (simulationError) return reasons.simulationError
    if (!organizationId) return reasons.noOrganization
    if (!hasSubmittableContent) return reasons.noLines
    if (!canIssueFromBuilder) return reasons.notIssueable

    // simulando sin error específico cae acá: pricing en cálculo
    return reasons.busy
  }, [
    canIssueFromBuilder,
    hasSubmittableContent,
    issueActionDisabled,
    organizationId,
    serviceExpanding,
    simulationError,
    submitting
  ])

  const readinessItems = useMemo<QuoteReadinessItem[]>(
    () => [
      { key: 'organization', complete: Boolean(organizationId) },
      { key: 'contact', complete: Boolean(contactIdentityProfileId) },
      { key: 'deal', complete: Boolean(hubspotDealId) },
      { key: 'businessLine', complete: Boolean(builderState.businessLineCode) },
      { key: 'terms', complete: Boolean(builderState.contractDurationMonths && builderState.validUntil) },
      { key: 'lines', complete: hasSubmittableContent }
    ],
    [
      builderState.businessLineCode,
      builderState.contractDurationMonths,
      builderState.validUntil,
      contactIdentityProfileId,
      hasSubmittableContent,
      hubspotDealId,
      organizationId
    ]
  )

  const quoteReadinessTotal = readinessItems.length
  const quoteReadinessFilled = readinessItems.filter(item => item.complete).length

  const quoteContextReady = readinessItems
    .filter(item => item.key !== 'lines')
    .every(item => item.complete)

  const quoteReadinessNextStep = readinessItems.find(item => !item.complete)

  const quoteReadinessNextHint = quoteReadinessNextStep
    ? `${GH_PRICING.contextChips.progress.nextStepPrefix} ${
        GH_PRICING.contextChips.progress.nextSteps[quoteReadinessNextStep.key]
      }`
    : undefined

  const organizationChipOptions = useMemo<ContextChipOption[]>(
    () =>
      localOrganizations.map(org => ({
        value: org.organizationId,
        label: org.organizationName,
        logoUrl: org.logoUrl ?? null
      })),
    [localOrganizations]
  )

  const partyChipOptions = useMemo<ContextChipOption[]>(
    () =>
      partySelectorOptions.map(party => ({
        value: party.organizationId ?? party.hubspotCompanyId ?? party.displayName,
        label: party.displayName,
        secondary: party.domain ?? undefined,
        logoUrl: party.logoUrl ?? null,
        disabled: party.kind === 'hubspot_candidate' && !party.canAdopt,
        meta: {
          party,
          kind: party.kind,
          lifecycleStage: party.lifecycleStage,
          domain: party.domain ?? null,
          canAdopt: party.canAdopt,
          logoUrl: party.logoUrl ?? null
        }
      })),
    [partySelectorOptions]
  )

  const renderPartySelectorOption = useCallback((option: ContextChipOption) => {
    const party = option.meta?.party as QuoteContextPartySelectorOption | undefined
    const lifecycleStage = party?.lifecycleStage
    const kind = party?.kind
    const domain = party?.domain ?? option.secondary ?? null

    const badgeLabel =
      kind === 'hubspot_candidate'
        ? lifecycleStage
          ? `HubSpot · ${PARTY_STAGE_LABEL[lifecycleStage]}`
          : 'HubSpot'
        : lifecycleStage
          ? PARTY_STAGE_LABEL[lifecycleStage]
          : null

    const badgeColor =
      lifecycleStage && PARTY_STAGE_COLOR[lifecycleStage]
        ? PARTY_STAGE_COLOR[lifecycleStage]
        : kind === 'hubspot_candidate'
          ? 'warning'
          : 'primary'

    return (
      <Stack spacing={0.65} sx={{ width: '100%', minWidth: 0 }}>
        <Stack direction='row' spacing={1} alignItems='center' justifyContent='space-between' sx={{ minWidth: 0 }}>
          <Typography variant='body2' sx={{ fontWeight: 600, lineHeight: 1.3, minWidth: 0 }} noWrap>
            {option.label}
          </Typography>
          {badgeLabel ? (
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={badgeColor}
              label={badgeLabel}
              sx={{ flexShrink: 0 }}
            />
          ) : null}
        </Stack>
        <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap sx={{ minWidth: 0 }}>
          {domain ? (
            <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.3 }}>
              {domain}
            </Typography>
          ) : null}
          {kind === 'hubspot_candidate' && party?.canAdopt === false ? (
            <Typography variant='caption' color='warning.main' sx={{ lineHeight: 1.3, fontWeight: 600 }}>
              {GH_PRICING.contextChips.organization.unifiedNoAdoptPermission}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    )
  }, [])

  const contactChipOptions = useMemo<ContextChipOption[]>(
    () =>
      orgContacts.map(contact => {
        const primary = contact.fullName ?? contact.canonicalEmail ?? contact.identityProfileId

        const secondary =
          contact.canonicalEmail && contact.fullName
            ? contact.canonicalEmail
            : contact.jobTitle ?? contact.roleLabel ?? undefined

        return {
          value: contact.identityProfileId,
          label: contact.isPrimary ? `${primary} · ${GH_PRICING.contextChips.contact.primaryBadge}` : primary,
          secondary
        }
      }),
    [orgContacts]
  )

  const dealChipOptions = useMemo<ContextChipOption[]>(
    () =>
      orgDeals.map(deal => ({
        value: deal.hubspotDealId,
        label: deal.dealName,
        secondary: [deal.dealstageLabel, deal.pipelineName].filter(Boolean).join(' · ') || undefined
      })),
    [orgDeals]
  )

  const businessLineChipOptions = useMemo<ContextChipOption[]>(
    () => builderOptions.businessLines.map(bl => ({ value: bl.code, label: bl.label, secondary: bl.code })),
    [builderOptions.businessLines]
  )

  const commercialModelChipOptions = useMemo<ContextChipOption[]>(
    () =>
      builderOptions.commercialModels.map(model => ({
        value: model.code,
        label: model.label,
        secondary: GH_PRICING.contextChips.commercialModel.multiplierSecondary(
          formatMultiplier(model.multiplierPct)
        )
      })),
    [builderOptions.commercialModels]
  )

  const countryFactorChipOptions = useMemo<ContextChipOption[]>(
    () =>
      builderOptions.countryFactors.map(country => ({
        value: country.code,
        label: country.label,
        secondary: GH_PRICING.contextChips.countryFactor.factorSecondary(
          formatCountryFactor(country.factor)
        )
      })),
    [builderOptions.countryFactors]
  )

  const selectedDeal = useMemo(
    () => orgDeals.find(deal => deal.hubspotDealId === hubspotDealId) ?? null,
    [hubspotDealId, orgDeals]
  )

  const selectedBusinessLine = useMemo(
    () => builderOptions.businessLines.find(line => line.code === builderState.businessLineCode) ?? null,
    [builderOptions.businessLines, builderState.businessLineCode]
  )

  const selectedCommercialModel = useMemo(
    () => builderOptions.commercialModels.find(model => model.code === builderState.commercialModel) ?? null,
    [builderOptions.commercialModels, builderState.commercialModel]
  )

  const selectedCountryFactor = useMemo(
    () => builderOptions.countryFactors.find(country => country.code === builderState.countryFactorCode) ?? null,
    [builderOptions.countryFactors, builderState.countryFactorCode]
  )

  const durationValue = builderState.contractDurationMonths
    ? GH_PRICING.contextChips.duration.unit(builderState.contractDurationMonths)
    : null

  const validUntilValue = builderState.validUntil
    ? formatGreenhouseDate(builderState.validUntil, {}, 'es-CL')
    : null

  const organizationContextStatus: ContextChipStatus = organizationId
      ? 'filled'
      : 'blocking-empty'

  const contactContextStatus: ContextChipStatus | undefined = invalidFields.contactIdentityProfileId
    ? 'invalid'
    : organizationId && !contactIdentityProfileId
      ? 'blocking-empty'
      : undefined

  const dealContextStatus: ContextChipStatus | undefined = invalidFields.hubspotDealId
    ? 'invalid'
    : organizationId && !hubspotDealId
      ? 'blocking-empty'
      : undefined

  const summaryDockNode = (
    <QuoteSummaryDock
      subtotal={subtotalOutputCurrency}
      factor={factorApplied}
      ivaAmount={ivaAmountPreview}
      total={totalWithIvaPreview}
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
      disabledReason={issueDisabledReason}
      onPrimaryClick={() => handleSubmit({ issueAfterSave: true })}
      marginClassification={marginClass}
      marginPct={marginPct}
      marginTierRange={marginTierRange}
      appliedAddonsTotal={appliedAddonsTotal}
      saveState={saveState}
      simulationError={dockSimulationError}

      /*
        TASK-615: empty messages secuenciales. El dock guía al siguiente
        paso concreto (organización primero, luego ítems) en vez de
        empaquetar la causa en un placeholder genérico.
      */
      emptyStateMessage={
        linesSnapshot.length === 0
          ? !organizationId
            ? GH_PRICING.summaryDock.emptyNoOrganization
            : GH_PRICING.summaryDock.emptyNoLines
          : null
      }
    />
  )

  const quoteLineItemsNode = (
    <QuoteLineItemsEditor
      ref={editorRef}
      quotationId={quote?.quotationId ?? ''}
      currency={currency}
      editable
      lineItems={linesSnapshot}
      saving={submitting || serviceExpanding}
      businessLineCode={builderState.businessLineCode}
      canViewCostStack={canSeeCostStack}
      canOverrideCost={canSeeCostStack}
      onCostOverrideApplied={() => {
        // TASK-481: refresh pricing después del override; re-seteamos
        // el snapshot para que el hook de simulación recompute cost
        // breakdown + margen con la metadata nueva persistida.
        setLinesSnapshot(current => current.map(line => ({ ...line })))
      }}
      simulationLines={simulation?.lines ?? null}
      outputCurrency={currency}
      structuredWarnings={mergedStructuredWarnings.length > 0 ? mergedStructuredWarnings : null}
      simulating={simulating}
      employmentTypeOptions={builderOptions.employmentTypes}
      onDraftChange={setLinesSnapshot}
      headerAction={
        linesSnapshot.length > 0 ? (
          <AddLineSplitButton
            onCatalog={openCatalogPicker}
            onService={openServicePicker}
            onTemplate={() => setTemplatePickerOpen(true)}
            onManual={handleManualLine}
            disabled={submitting || serviceExpanding}
          />
        ) : null
      }
      onAddFromCatalog={openCatalogPicker}
      onAddFromService={openServicePicker}
      onAddFromTemplate={() => setTemplatePickerOpen(true)}
      onAddFromManual={handleManualLine}
      pendingHint={
        !organizationId
          ? GH_PRICING.emptyItems.pendingNote(
              GH_PRICING.contextChips.progress.nextSteps.organization
            )
          : null
      }
    />
  )

  const quoteDetailsNode = (
    <FormSectionAccordion
      id='quote-detail'
      title={GH_PRICING.detailAccordion.title}
      iconClassName='tabler-notes'
      defaultExpanded={builderState.description.length > 0}
    >
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
    </FormSectionAccordion>
  )

  const activeWizardPanel =
    activeWizardStep === 'context' ? (
      <Stack spacing={3} sx={{ p: { xs: 2.5, md: 3 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.05fr) minmax(360px, 0.95fr)' },
            gap: { xs: 3, xl: 4 },
            alignItems: 'start'
          }}
        >
          <Stack spacing={2.5} sx={{ minWidth: 0 }}>
            <Stack spacing={0.5}>
              <Typography variant='h6'>{GH_PRICING.builderWizard.contextSetup.identityTitle}</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ maxWidth: '62ch' }}>
                {GH_PRICING.builderWizard.contextSetup.identityDescription}
              </Typography>
            </Stack>

            <Box
              component='fieldset'
              sx={{
                border: 0,
                m: 0,
                p: 0,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                gap: 1.25,
                minWidth: 0
              }}
            >
              <Typography component='legend' sx={visuallyHidden}>
                {GH_PRICING.builderWizard.contextSetup.identityTitle}
              </Typography>
              <ContextChip
                fullWidth
                required
                testId='quote-party-organization-trigger'
                prominence='primary'
                icon={GH_PRICING.contextChips.organization.icon}
                label={GH_PRICING.contextChips.organization.label}
                value={selectedOrgName ?? pendingOrganizationLabel}
                placeholder={GH_PRICING.contextChips.organization.placeholder}
                status={mode === 'edit' ? 'locked' : organizationContextStatus}
                disabled={submitting}
                options={unifiedPartySelectorEnabled ? partyChipOptions : organizationChipOptions}
                selectedValue={organizationId}
                inputValue={unifiedPartySelectorEnabled ? partySearchQuery : undefined}
                onInputValueChange={unifiedPartySelectorEnabled ? setPartySearchQuery : undefined}
                onSelectChange={value => {
                  if (unifiedPartySelectorEnabled) {
                    if (!value) void handlePartySelection(null)

                    return
                  }

                  handleOrganizationChange(value)
                }}
                onOptionSelect={
                  unifiedPartySelectorEnabled
                    ? option => {
                        const party = option?.meta?.party as QuoteContextPartySelectorOption | undefined

                        void handlePartySelection(party ?? null)
                      }
                    : undefined
                }
                searchPlaceholder={GH_PRICING.contextChips.organization.unifiedSearchPlaceholder}
                loading={partySearchLoading || partySearchWaitingForCurrentQuery || Boolean(adoptingCompanyId)}
                loadingText={
                  adoptingCompanyId
                    ? GH_PRICING.contextChips.organization.unifiedAdopting
                    : partySearchTrimmedQuery.length >= 2
                      ? GH_PRICING.contextChips.organization.unifiedSearching
                      : GH_PRICING.contextChips.organization.unifiedMinQuery
                }
                renderOption={unifiedPartySelectorEnabled ? renderPartySelectorOption : undefined}
                noOptionsText={
                  partySearchError
                    ? formatPartySelectorError(partySearchError)
                    : GH_PRICING.contextChips.organization.unifiedEmpty
                }
                liveMessage={partySelectorLiveMessage}
                popoverWidth={460}
              />
              <ContextChip
                fullWidth
                prominence='primary'
                icon={GH_PRICING.contextChips.contact.icon}
                label={GH_PRICING.contextChips.contact.label}
                value={selectedContact?.fullName ?? selectedContact?.canonicalEmail ?? null}
                placeholder={
                  organizationId
                    ? GH_PRICING.contextChips.contact.placeholder
                    : GH_PRICING.contextChips.contact.noOrgFirst
                }
                status={contactContextStatus}
                disabled={submitting || !organizationId}
                errorMessage={invalidFields.contactIdentityProfileId}
                options={contactChipOptions}
                selectedValue={contactIdentityProfileId}
                onSelectChange={setContactIdentityProfileId}
                loading={contactsLoading}
                loadingText={GH_PRICING.contextChips.contact.loading}
                noOptionsText={
                  organizationId
                    ? GH_PRICING.contextChips.contact.empty
                    : GH_PRICING.contextChips.contact.noOrgFirst
                }
                popoverWidth={420}
              />
              <ContextChip
                fullWidth
                prominence='primary'
                icon={GH_PRICING.contextChips.deal.icon}
                label={GH_PRICING.contextChips.deal.label}
                value={selectedDeal?.dealName ?? null}
                placeholder={
                  organizationId
                    ? GH_PRICING.contextChips.deal.placeholder
                    : GH_PRICING.contextChips.deal.noOrgFirst
                }
                status={dealContextStatus}
                disabled={submitting || !organizationId}
                errorMessage={invalidFields.hubspotDealId}
                options={dealChipOptions}
                selectedValue={hubspotDealId}
                onSelectChange={setHubspotDealId}
                loading={dealsLoading}
                loadingText={GH_PRICING.contextChips.deal.loading}
                noOptionsText={
                  organizationId
                    ? GH_PRICING.contextChips.deal.empty
                    : GH_PRICING.contextChips.deal.noOrgFirst
                }
                popoverWidth={420}
                popoverNotice={
                  organizationId
                    ? {
                        tone: dealChipOptions.length === 0 ? 'warning' : 'info',
                        message:
                          dealChipOptions.length === 0
                            ? GH_PRICING.contextChips.deal.emptyHelper
                            : GH_PRICING.contextChips.deal.searchFooterPrompt,
                        actionLabel: GH_PRICING.builderWizard.contextSetup.createDealInline,
                        onAction: () => setCreateDealDrawerOpen(true)
                      }
                    : undefined
                }
              />
            </Box>
          </Stack>

          <Stack spacing={2.5} sx={{ minWidth: 0 }}>
            <Stack spacing={0.5}>
              <Typography variant='h6'>{GH_PRICING.builderWizard.contextSetup.termsTitle}</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ maxWidth: '62ch' }}>
                {GH_PRICING.builderWizard.contextSetup.termsDescription}
              </Typography>
            </Stack>

            <Box
              component='fieldset'
              sx={{
                border: 0,
                m: 0,
                p: 0,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                gap: 1.25,
                minWidth: 0
              }}
            >
              <Typography component='legend' sx={visuallyHidden}>
                {GH_PRICING.builderWizard.contextSetup.termsTitle}
              </Typography>
              <ContextChip
                fullWidth
                prominence='primary'
                icon={GH_PRICING.contextChips.businessLine.icon}
                label={GH_PRICING.contextChips.businessLine.label}
                value={selectedBusinessLine?.label ?? null}
                placeholder={GH_PRICING.contextChips.businessLine.placeholder}
                disabled={submitting}
                options={businessLineChipOptions}
                selectedValue={builderState.businessLineCode}
                onSelectChange={code => setBuilderState(prev => ({ ...prev, businessLineCode: code }))}
              />
              <ContextChip
                fullWidth
                prominence='primary'
                icon={GH_PRICING.contextChips.commercialModel.icon}
                label={GH_PRICING.contextChips.commercialModel.label}
                value={selectedCommercialModel?.label ?? null}
                placeholder={GH_PRICING.contextChips.commercialModel.placeholder}
                disabled={submitting}
                options={commercialModelChipOptions}
                selectedValue={builderState.commercialModel}
                onSelectChange={value =>
                  value && setBuilderState(prev => ({ ...prev, commercialModel: value as CommercialModelCode }))
                }
              />
              <ContextChip
                fullWidth
                prominence='primary'
                icon={GH_PRICING.contextChips.countryFactor.icon}
                label={GH_PRICING.contextChips.countryFactor.label}
                value={selectedCountryFactor?.label ?? null}
                placeholder={GH_PRICING.contextChips.countryFactor.placeholder}
                disabled={submitting}
                options={countryFactorChipOptions}
                selectedValue={builderState.countryFactorCode}
                onSelectChange={value =>
                  value && setBuilderState(prev => ({ ...prev, countryFactorCode: value }))
                }
              />
              <ContextChip
                fullWidth
                prominence='primary'
                icon={GH_PRICING.contextChips.currency.icon}
                label={GH_PRICING.contextChips.currency.label}
                value={builderState.outputCurrency}
                placeholder={GH_PRICING.contextChips.currency.placeholder}
                disabled={submitting}
                options={QUOTE_CURRENCY_OPTIONS}
                selectedValue={builderState.outputCurrency}
                onSelectChange={value =>
                  value && setBuilderState(prev => ({ ...prev, outputCurrency: value as PricingOutputCurrency }))
                }
                popoverWidth={320}
              />
              <ContextChip
                fullWidth
                prominence='primary'
                mode='custom'
                icon={GH_PRICING.contextChips.duration.icon}
                label={GH_PRICING.contextChips.duration.label}
                value={durationValue}
                placeholder={GH_PRICING.contextChips.duration.placeholder}
                disabled={submitting}
                popoverWidth={300}
                popoverContent={() => (
                  <Stack spacing={1.5}>
                    <Typography variant='h6'>{GH_PRICING.contextChips.duration.label}</Typography>
                    <CustomTextField
                      fullWidth
                      size='small'
                      type='number'
                      value={builderState.contractDurationMonths ?? ''}
                      onChange={event => {
                        const parsed = Number.parseInt(event.target.value, 10)

                        setBuilderState(prev => ({
                          ...prev,
                          contractDurationMonths: Number.isFinite(parsed) ? parsed : null
                        }))
                      }}
                      inputProps={{ min: 1, max: 120, step: 1 }}
                      helperText={GH_PRICING.contextChips.duration.hint}
                      disabled={submitting}
                      aria-label={GH_PRICING.contextChips.duration.label}
                      autoFocus
                    />
                  </Stack>
                )}
              />
              <ContextChip
                fullWidth
                prominence='primary'
                mode='custom'
                icon={GH_PRICING.contextChips.validUntil.icon}
                label={GH_PRICING.contextChips.validUntil.label}
                value={validUntilValue}
                placeholder={GH_PRICING.contextChips.validUntil.placeholder}
                disabled={submitting}
                popoverWidth={300}
                popoverContent={() => (
                  <Stack spacing={1.5}>
                    <Typography variant='h6'>{GH_PRICING.contextChips.validUntil.label}</Typography>
                    <CustomTextField
                      fullWidth
                      size='small'
                      type='date'
                      value={builderState.validUntil ?? ''}
                      onChange={event =>
                        setBuilderState(prev => ({ ...prev, validUntil: event.target.value || null }))
                      }
                      InputLabelProps={{ shrink: true }}
                      disabled={submitting}
                      aria-label={GH_PRICING.contextChips.validUntil.label}
                      autoFocus
                    />
                  </Stack>
                )}
              />
            </Box>
          </Stack>
        </Box>

        <Divider />

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent='space-between'
          aria-label={GH_PRICING.builderWizard.contextSetup.sectionActionsLabel}
        >
          <Stack spacing={0.25}>
            <Typography variant='h6'>
              {organizationId
                ? GH_PRICING.builderWizard.contextSetup.readinessComplete
                : GH_PRICING.builderWizard.contextSetup.readinessPending}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {organizationId
                ? GH_PRICING.builderWizard.steps.scope.description
                : GH_PRICING.identityStrip.subtitleNeedsOrganization}
            </Typography>
          </Stack>
          <Button
            variant='contained'
            endIcon={<i className='tabler-arrow-right' aria-hidden='true' />}
            onClick={() => setActiveWizardStep('scope')}
            disabled={!organizationId}
          >
            {GH_PRICING.builderWizard.steps.context.cta}
          </Button>
        </Stack>
      </Stack>
    ) : activeWizardStep === 'scope' ? (
      <Stack spacing={2.5} sx={{ p: { xs: 2, md: 3 } }}>
        {quoteLineItemsNode}
        <Divider />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent='space-between'
        >
          <Button
            variant='text'
            color='inherit'
            startIcon={<i className='tabler-arrow-left' aria-hidden='true' />}
            onClick={() => setActiveWizardStep('context')}
            sx={{ alignSelf: { sm: 'center' } }}
          >
            {GH_PRICING.builderWizard.steps.scope.back}
          </Button>
          <Button
            variant='contained'
            size='small'
            endIcon={<i className='tabler-arrow-right' aria-hidden='true' />}
            onClick={() => setActiveWizardStep('economics')}
            disabled={!hasSubmittableContent}
            sx={{ minHeight: 38, px: 2.5 }}
          >
            {GH_PRICING.builderWizard.steps.scope.cta}
          </Button>
        </Stack>
      </Stack>
    ) : (
      <Stack spacing={2.5} sx={{ p: { xs: 2, md: 3 } }}>
        <Box
          data-capture='quote-builder-economics-review'
          sx={theme => ({
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            backgroundColor: theme.palette.background.default,
            overflow: 'hidden'
          })}
        >
          <Box sx={{ p: { xs: 2, md: 2.5 }, backgroundColor: 'background.paper' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent='space-between'>
              <Stack spacing={0.35} sx={{ minWidth: 0 }}>
                <Typography variant='h6'>{GH_PRICING.builderWizard.steps.economics.reviewTitle}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {GH_PRICING.builderWizard.steps.economics.reviewDescription}
                </Typography>
              </Stack>
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color={!issueActionDisabled ? 'success' : 'warning'}
                label={
                  !issueActionDisabled
                    ? GH_PRICING.builderWizard.steps.economics.reviewReady
                    : GH_PRICING.builderWizard.steps.economics.reviewPending
                }
              />
            </Stack>
          </Box>
          <Divider />
          <Box
            component='ul'
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: 0,
              m: 0,
              p: 0,
              listStyle: 'none'
            }}
          >
            {[
              {
                key: 'context',
                icon: 'tabler-building-bank',
                title: GH_PRICING.builderWizard.steps.context.title,
                description: GH_PRICING.builderWizard.steps.context.description,
                complete: quoteContextReady,
                onClick: () => setActiveWizardStep('context')
              },
              {
                key: 'scope',
                icon: 'tabler-list-details',
                title: GH_PRICING.builderWizard.steps.scope.title,
                description: GH_PRICING.builderWizard.steps.scope.description,
                complete: hasSubmittableContent,
                onClick: () => setActiveWizardStep('scope')
              },
              {
                key: 'pricing',
                icon: 'tabler-chart-donut-3',
                title: GH_PRICING.dealDesk.pricingTitle,
                description: simulating ? GH_PRICING.dealDesk.pricingCalculating : GH_PRICING.dealDesk.pricingReady,
                complete: !saveDraftDisabled && hasSubmittableContent && !simulationError,
                onClick: undefined
              }
            ].map(item => (
              <Box
                key={item.key}
                component='li'
                sx={theme => ({
                  minWidth: 0,
                  borderInlineEnd: { md: `1px solid ${theme.palette.divider}` },
                  '&:last-of-type': {
                    borderInlineEnd: 0
                  }
                })}
              >
                <ButtonBase
                  disabled={!item.onClick}
                  onClick={item.onClick}
                  sx={theme => ({
                    width: '100%',
                    minHeight: 92,
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    gap: 1.25,
                    p: { xs: 2, md: 2.25 },
                    textAlign: 'left',
                    color: 'text.primary',
                    cursor: item.onClick ? 'pointer' : 'default',
                    transition: theme.transitions.create(['background-color', 'color'], {
                      duration: theme.transitions.duration.shortest
                    }),
                    '&:hover': item.onClick
                      ? {
                          backgroundColor: alpha(theme.palette.primary.main, 0.035)
                        }
                      : undefined,
                    '&.Mui-disabled': {
                      color: theme.palette.text.primary,
                      opacity: 1
                    },
                    '&.Mui-focusVisible': {
                      outline: `2px solid ${theme.palette.primary.main}`,
                      outlineOffset: -2
                    }
                  })}
                >
                  <Box
                    component='span'
                    aria-hidden='true'
                    sx={theme => ({
                      width: 34,
                      height: 34,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                      color: item.complete ? 'success.main' : 'text.secondary',
                      backgroundColor: item.complete ? theme.palette.success.lightOpacity : theme.palette.background.paper,
                      border: `1px solid ${item.complete ? alpha(theme.palette.success.main, 0.22) : theme.palette.divider}`
                    })}
                  >
                    <i className={item.complete ? 'tabler-check' : item.icon} aria-hidden='true' style={{ fontSize: 18 }} />
                  </Box>
                  <Stack spacing={0.3} sx={{ minWidth: 0 }}>
                    <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                      {item.title}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {item.description}
                    </Typography>
                  </Stack>
                </ButtonBase>
              </Box>
            ))}
          </Box>
          <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.75, borderTop: theme => `1px solid ${theme.palette.divider}` }}>
            <Typography variant='body2' color='text.secondary' role='status'>
              {!issueActionDisabled
                ? GH_PRICING.builderWizard.steps.economics.reviewHintReady
                : issueDisabledReason ?? GH_PRICING.builderWizard.steps.economics.reviewHintPending}
            </Typography>
          </Box>
        </Box>
        {quoteDetailsNode}
        <Box data-capture='quote-builder-mobile-summary-dock' sx={{ display: { xs: 'block', lg: 'none' } }}>
          {summaryDockNode}
        </Box>
      </Stack>
    )

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
        centerSlot={
          <FieldsProgressChip
            filled={quoteReadinessFilled}
            total={quoteReadinessTotal}
            suffix={GH_PRICING.contextChips.progress.suffix}
            srLabel={
              quoteReadinessFilled >= quoteReadinessTotal
                ? () => GH_PRICING.contextChips.progress.readyAriaLive
                : GH_PRICING.contextChips.progress.ariaLive
            }
            readyLabel={GH_PRICING.contextChips.progress.readyLabel}
            nextStepHint={quoteReadinessNextHint}
            testId='quote-header-readiness-progress'
          />
        }
        actions={

          /*
            TASK-615 — Action hierarchy convergence.
            Header conserva navegación + save draft. La acción terminal vive
            EXCLUSIVAMENTE en QuoteSummaryDock (junto al total y al save state)
            para que la pantalla tenga un solo centro de gravedad. El save
            draft queda outlined/primary para mantener affordance sin competir
            con el contained CTA del dock.
          */
          <>
            <Button
              variant='outlined'
              color='inherit'
              onClick={handleCancel}
              disabled={submitting}
              sx={theme => ({
                borderColor: theme.palette.divider,
                color: theme.palette.text.secondary,
                backgroundColor: theme.palette.background.paper,
                '&:hover': {
                  borderColor: theme.palette.text.primary,
                  backgroundColor: theme.palette.action.hover
                }
              })}
            >
              {GH_PRICING.builderCancel}
            </Button>
            <Tooltip
              title={GH_PRICING.identityStrip.saveDraftMeta}
              placement='bottom'
              disableInteractive
            >
              <span>
                <Button
                  variant='outlined'
                  color='primary'
                  size='small'
                  startIcon={<i className='tabler-device-floppy' aria-hidden='true' />}
                  onClick={() => handleSubmit({ closeAfter: false })}
                  disabled={saveDraftDisabled}
                  sx={{ minHeight: 36 }}
                >
                  {submitting ? GH_PRICING.builderSaving : simulating ? 'Calculando pricing…' : GH_PRICING.builderSaveDraft}
                </Button>
              </span>
            </Tooltip>
          </>
        }
      />

      <CreateDealDrawer
        open={createDealDrawerOpen}
        onClose={() => setCreateDealDrawerOpen(false)}
        organizationId={organizationId ?? ''}
        organizationName={selectedOrgName}
        quotationId={quote?.quotationId ?? null}
        contactIdentityProfileId={contactIdentityProfileId}
        defaultCurrency={currency as 'CLP' | 'USD' | 'CLF' | 'COP' | 'MXN' | 'PEN'}
        defaultBusinessLineCode={builderState.businessLineCode}
        selectedContact={selectedContact}
        onSuccess={(response, meta) => {
          // Immediately bind the new hubspot deal so the quote ties to it.
          if (response.hubspotDealId) {
            setHubspotDealId(response.hubspotDealId)

            // Optimistic insert so the selector shows the new deal without a
            // roundtrip. TASK-571: pull pipeline/stage + labels from the
            // resolved selection returned by the backend — no more
            // hardcoded `appointmentscheduled`.
            setOrgDeals(current => {
              const next: QuoteOrganizationDeal = {
                hubspotDealId: response.hubspotDealId as string,
                dealName: meta.dealName,
                dealstage: response.stageUsed ?? 'pending',
                dealstageLabel: response.stageLabelUsed ?? response.stageUsed,
                pipelineName: response.pipelineLabelUsed ?? response.pipelineUsed,
                isClosed: false,
                isWon: false
              }

              return current.some(d => d.hubspotDealId === next.hubspotDealId)
                ? current
                : [next, ...current]
            })
          }
        }}
      />

      <Box
        component='section'
        aria-label={GH_PRICING.dealDesk.workspaceAriaLabel}
        data-capture='quote-builder-deal-desk'
        sx={{
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 3 },
          minWidth: 0,
          '[data-capture="composition-shell-aside-drawer-trigger"]': {
            display: { xs: 'none', lg: 'inline-flex' }
          }
        }}
      >
        <CompositionShell
          composition={activeWizardStep === 'context' ? 'single' : 'split'}
          kind='custom'
          instanceId='finance-quote-builder-deal-desk'
          asideLabel={GH_PRICING.dealDesk.asideTitle}
          regions={{
            primary: (
              <Stack spacing={3} sx={{ minWidth: 0 }}>
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

                <QuoteWizardFrame
                  activeStep={activeWizardStep}
                  canOpenScope={Boolean(organizationId)}
                  canOpenEconomics={hasSubmittableContent}
                  onStepChange={setActiveWizardStep}
                >
                  {activeWizardPanel}
                </QuoteWizardFrame>
              </Stack>
            ),
            aside:
              activeWizardStep === 'context' ? undefined : (
                <QuoteReadinessAside
                  subtotal={subtotalOutputCurrency}
                  ivaAmount={ivaAmountPreview}
                  total={totalWithIvaPreview}
                  currency={currency}
                  loading={simulating}
                  simulationError={dockSimulationError}
                  marginPct={marginPct}
                  marginClassification={marginClass}
                  addonCount={addonPanelEntries.length}
                  appliedAddonsTotal={appliedAddonsTotal}
                  primaryCtaLabel={GH_PRICING.summaryDock.primaryCta}
                  primaryCtaLoading={submitting}
                  primaryCtaDisabled={issueActionDisabled}
                  disabledReason={issueDisabledReason}
                  saveState={saveState}
                  onPrimaryClick={() => handleSubmit({ issueAfterSave: true })}
                />
              )
          }}
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
