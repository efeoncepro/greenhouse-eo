'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import ContextChip, {
  type ContextChipOption,
  type ContextChipStatus
} from '@/components/greenhouse/primitives/ContextChip'
import FieldsProgressChip from '@/components/greenhouse/primitives/FieldsProgressChip'
import useReducedMotion from '@/hooks/useReducedMotion'
import { motion } from '@/libs/FramerMotion'
import { GH_PRICING } from '@/config/greenhouse-nomenclature'
import type { CommercialModelCode } from '@/lib/commercial/pricing-governance-types'
import type { PricingOutputCurrency } from '@/lib/finance/pricing/contracts'

export interface QuoteContextOrganizationOption {
  organizationId: string
  organizationName: string
}

export interface QuoteContextPartySelectorOption {
  kind: 'party' | 'hubspot_candidate'
  organizationId?: string
  commercialPartyId?: string
  hubspotCompanyId?: string
  displayName: string
  lifecycleStage?: 'prospect' | 'opportunity' | 'active_client' | 'inactive'
  domain?: string | null
  canAdopt: boolean
}

export interface QuoteContextContactOption {
  identityProfileId: string
  fullName: string | null
  canonicalEmail: string | null
  jobTitle: string | null
  roleLabel: string | null
  isPrimary: boolean
}

export interface QuoteContextBusinessLineOption {
  code: string
  label: string
}

export interface QuoteContextDealOption {
  hubspotDealId: string
  dealName: string
  dealstageLabel: string | null
  pipelineName: string | null
  isClosed: boolean
  isWon: boolean
}

export interface QuoteContextCommercialModelOption {
  code: CommercialModelCode
  label: string
  multiplierPct: number
}

export interface QuoteContextCountryFactorOption {
  code: string
  label: string
  factor: number
}

export interface QuoteContextStripValues {
  organizationId: string | null
  contactIdentityProfileId: string | null
  hubspotDealId: string | null
  businessLineCode: string | null
  commercialModel: CommercialModelCode
  countryFactorCode: string
  outputCurrency: PricingOutputCurrency
  contractDurationMonths: number | null
  validUntil: string | null
}

export interface QuoteContextStripHandlers {
  onOrganizationChange: (organizationId: string | null) => void
  onContactChange: (contactIdentityProfileId: string | null) => void
  onDealChange: (hubspotDealId: string | null) => void
  onBusinessLineChange: (code: string | null) => void
  onCommercialModelChange: (code: CommercialModelCode) => void
  onCountryFactorChange: (code: string) => void
  onCurrencyChange: (currency: PricingOutputCurrency) => void
  onDurationChange: (months: number | null) => void
  onValidUntilChange: (iso: string | null) => void
}

export interface QuoteContextStripOptions {
  organizations: QuoteContextOrganizationOption[]
  contacts: QuoteContextContactOption[]
  contactsLoading: boolean
  deals: QuoteContextDealOption[]
  dealsLoading: boolean
  businessLines: QuoteContextBusinessLineOption[]
  commercialModels: QuoteContextCommercialModelOption[]
  countryFactors: QuoteContextCountryFactorOption[]
}

export interface QuoteContextOrganizationSelectorConfig {
  enabled: boolean
  searchValue: string
  selectedLabel?: string | null
  options: QuoteContextPartySelectorOption[]
  loading: boolean
  liveMessage?: string
  errorMessage?: string | null
  retryActionLabel?: string
  minQueryMessage?: string
  emptyMessage?: string
  loadingText?: string
  searchPlaceholder?: string
  onSearchChange: (value: string) => void
  onSelectParty: (party: QuoteContextPartySelectorOption | null) => void
  onRetry?: () => void
}

export interface QuoteContextStripProps extends QuoteContextStripHandlers {
  values: QuoteContextStripValues
  options: QuoteContextStripOptions
  organizationSelector?: QuoteContextOrganizationSelectorConfig
  disabled?: boolean
  organizationLocked?: boolean
  stickyOffset?: number
  invalidFields?: Partial<Record<keyof QuoteContextStripValues, string>>
}

const CURRENCY_OPTIONS: ContextChipOption[] = [
  { value: 'CLP', label: 'CLP', secondary: 'Peso chileno' },
  { value: 'USD', label: 'USD', secondary: 'Dólar estadounidense' },
  { value: 'CLF', label: 'CLF', secondary: 'Unidad de fomento' },
  { value: 'COP', label: 'COP', secondary: 'Peso colombiano' },
  { value: 'MXN', label: 'MXN', secondary: 'Peso mexicano' },
  { value: 'PEN', label: 'PEN', secondary: 'Sol peruano' }
]

const SR_ONLY_SX = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  borderWidth: 0
} as const

const FIELDSET_RESET_SX = {
  border: 0,
  margin: 0,
  padding: 0,
  minWidth: 0
} as const

const formatMultiplier = (pct: number): string => {
  const signed = pct >= 0 ? `+${pct}` : `${pct}`

  return `${signed}%`
}

const formatFactor = (factor: number): string => factor.toFixed(2)

const PARTY_STAGE_LABEL: Record<NonNullable<QuoteContextPartySelectorOption['lifecycleStage']>, string> = {
  prospect: 'Prospecto',
  opportunity: 'Oportunidad',
  active_client: 'Cliente activo',
  inactive: 'Inactiva'
}

const PARTY_STAGE_COLOR: Record<
  NonNullable<QuoteContextPartySelectorOption['lifecycleStage']>,
  'success' | 'warning' | 'info' | 'secondary'
> = {
  prospect: 'warning',
  opportunity: 'info',
  active_client: 'success',
  inactive: 'secondary'
}

/**
 * Row 2 del patron Command Bar.
 *
 * TASK-565 modernization (2026-04-22):
 * - Rediseñado a 3 tiers jerarquicos en vez de 8 chips iguales en linea.
 * - Tier 1 (Party, prominence='primary'): Organizacion, Contacto, Deal HubSpot.
 *   Cajas visibles, 44px touch target, status 'blocking-empty' con warning tinted
 *   cuando la organizacion esta seleccionada pero el chip requerido downstream aun no.
 * - Tier 2 (Terms, prominence='inline'): Business line, Modelo comercial, Pais, Moneda.
 *   Tokens inline con subrayado on-hover, popover identico al primary.
 * - Tier 3 (Timing, prominence='inline'): Duracion, Valida hasta. Custom-mode popovers.
 *
 * Cada grupo vive dentro de un <fieldset> + <legend sr-only> para semantica a11y.
 * Las strings provienen de GH_PRICING.contextChips.*.
 */
const QuoteContextStrip = ({
  values,
  options,
  organizationSelector,
  disabled = false,
  organizationLocked = false,
  stickyOffset = 0,
  invalidFields = {},
  onOrganizationChange,
  onContactChange,
  onDealChange,
  onBusinessLineChange,
  onCommercialModelChange,
  onCountryFactorChange,
  onCurrencyChange,
  onDurationChange,
  onValidUntilChange
}: QuoteContextStripProps) => {
  const orgOptions = useMemo<ContextChipOption[]>(
    () =>
      options.organizations.map(org => ({
        value: org.organizationId,
        label: org.organizationName
      })),
    [options.organizations]
  )

  const unifiedPartyOptions = useMemo<ContextChipOption[]>(
    () =>
      organizationSelector?.options.map(party => ({
        value: party.organizationId ?? party.hubspotCompanyId ?? party.displayName,
        label: party.displayName,
        secondary: party.domain ?? undefined,
        disabled: party.kind === 'hubspot_candidate' && !party.canAdopt,
        meta: {
          kind: party.kind,
          lifecycleStage: party.lifecycleStage,
          canAdopt: party.canAdopt,
          domain: party.domain ?? null
        }
      })) ?? [],
    [organizationSelector?.options]
  )

  const contactOptions = useMemo<ContextChipOption[]>(
    () =>
      options.contacts.map(c => {
        const primary = c.fullName ?? c.canonicalEmail ?? c.identityProfileId

        const secondary =
          c.canonicalEmail && c.fullName
            ? c.canonicalEmail
            : c.jobTitle ?? c.roleLabel ?? undefined

        return {
          value: c.identityProfileId,
          label: c.isPrimary ? `${primary} · ${GH_PRICING.contextChips.contact.primaryBadge}` : primary,
          secondary
        }
      }),
    [options.contacts]
  )

  const dealOptions = useMemo<ContextChipOption[]>(
    () =>
      options.deals.map(deal => ({
        value: deal.hubspotDealId,
        label: deal.dealName,
        secondary: [
          deal.dealstageLabel,
          deal.pipelineName,
          deal.isClosed ? (deal.isWon ? 'Cerrado ganado' : 'Cerrado') : 'Abierto'
        ]
          .filter(Boolean)
          .join(' · ')
      })),
    [options.deals]
  )

  const businessLineOptions = useMemo<ContextChipOption[]>(
    () => options.businessLines.map(bl => ({ value: bl.code, label: bl.label })),
    [options.businessLines]
  )

  const commercialModelOptions = useMemo<ContextChipOption[]>(
    () =>
      options.commercialModels.map(m => ({
        value: m.code,
        label: m.label,
        secondary: `${formatMultiplier(m.multiplierPct)} sobre tarifa base`
      })),
    [options.commercialModels]
  )

  const countryFactorOptions = useMemo<ContextChipOption[]>(
    () =>
      options.countryFactors.map(c => ({
        value: c.code,
        label: c.label,
        secondary: `Factor ×${formatFactor(c.factor)}`
      })),
    [options.countryFactors]
  )

  const selectedOrganization = useMemo(
    () => options.organizations.find(o => o.organizationId === values.organizationId) ?? null,
    [options.organizations, values.organizationId]
  )

  const selectedContact = useMemo(
    () => options.contacts.find(c => c.identityProfileId === values.contactIdentityProfileId) ?? null,
    [options.contacts, values.contactIdentityProfileId]
  )

  const selectedDeal = useMemo(
    () => options.deals.find(d => d.hubspotDealId === values.hubspotDealId) ?? null,
    [options.deals, values.hubspotDealId]
  )

  const selectedBusinessLine = useMemo(
    () => options.businessLines.find(bl => bl.code === values.businessLineCode) ?? null,
    [options.businessLines, values.businessLineCode]
  )

  const selectedCommercialModel = useMemo(
    () => options.commercialModels.find(m => m.code === values.commercialModel) ?? null,
    [options.commercialModels, values.commercialModel]
  )

  const selectedCountryFactor = useMemo(
    () => options.countryFactors.find(c => c.code === values.countryFactorCode) ?? null,
    [options.countryFactors, values.countryFactorCode]
  )

  const contactValue = selectedContact
    ? `${selectedContact.fullName ?? selectedContact.canonicalEmail ?? selectedContact.identityProfileId}${selectedContact.isPrimary ? ' · ' + GH_PRICING.contextChips.contact.primaryBadge : ''}`
    : null

  const dealValue = selectedDeal
    ? [
        selectedDeal.dealName,
        selectedDeal.dealstageLabel,
        selectedDeal.isClosed ? (selectedDeal.isWon ? 'Cerrado ganado' : 'Cerrado') : null
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  const commercialModelValue = selectedCommercialModel
    ? `${selectedCommercialModel.label} · ${formatMultiplier(selectedCommercialModel.multiplierPct)}`
    : null

  const countryFactorValue = selectedCountryFactor
    ? `${selectedCountryFactor.label} · ×${formatFactor(selectedCountryFactor.factor)}`
    : null

  const durationValue = values.contractDurationMonths
    ? GH_PRICING.contextChips.duration.unit(values.contractDurationMonths)
    : null

  const validUntilValue = values.validUntil
    ? (() => {
        try {
          return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(
            new Date(values.validUntil)
          )
        } catch {
          return values.validUntil
        }
      })()
    : null

  // TASK-565: blocking-empty tension only when organization is set but required
  // downstream chip (Deal HubSpot) is still empty. Keeps the CTA silent for the
  // very first load (no organization → no tension yet).
  const dealStatus: ContextChipStatus | undefined =
    invalidFields.hubspotDealId
      ? 'invalid'
      : values.organizationId && !values.hubspotDealId
        ? 'blocking-empty'
        : undefined

  // TASK-565: completion counter. 6 fields the user must explicitly pick (the
  // other 3 — commercial model / country / currency — ship with defaults so
  // they are always "filled" from the user's perspective). Keep this aligned
  // with the Tier 1/3 chips that actually require a decision.
  const progressTotal = 6

  const progressFilled =
    (values.organizationId ? 1 : 0) +
    (values.contactIdentityProfileId ? 1 : 0) +
    (values.hubspotDealId ? 1 : 0) +
    (values.businessLineCode ? 1 : 0) +
    (values.contractDurationMonths ? 1 : 0) +
    (values.validUntil ? 1 : 0)

  // TASK-565: fire a single "attention" pulse on the Deal chip the first time
  // the user picks an organization with no deal attached. Gated by reduced-motion.
  const prefersReduced = useReducedMotion()
  const previousOrganizationIdRef = useRef<string | null>(values.organizationId)
  const [dealShouldPulse, setDealShouldPulse] = useState(false)

  useEffect(() => {
    const previous = previousOrganizationIdRef.current
    const current = values.organizationId

    if (!previous && current && !values.hubspotDealId && !prefersReduced) {
      setDealShouldPulse(true)
      const timer = window.setTimeout(() => setDealShouldPulse(false), 2600)

      previousOrganizationIdRef.current = current

      return () => window.clearTimeout(timer)
    }

    previousOrganizationIdRef.current = current

    return undefined
  }, [values.organizationId, values.hubspotDealId, prefersReduced])

  return (
    <Box
      sx={theme => ({
        position: 'sticky',
        top: stickyOffset,
        zIndex: theme.zIndex.appBar - 2,
        py: 1.5,
        px: { xs: 2, md: 3 },
        backgroundColor: alpha(theme.palette.background.paper, 0.9),
        backdropFilter: 'saturate(180%) blur(8px)',
        WebkitBackdropFilter: 'saturate(180%) blur(8px)',
        borderBottom: `1px solid ${theme.palette.divider}`
      })}
    >
      <Stack spacing={2} aria-label={GH_PRICING.contextChips.ariaLabel}>
        {/* ────────────────────────────────────────────────────────────────
            Tier 1 — Party (prominence='primary'). Flex-distributed chips
            + right-anchored progress counter. Balances the strip so the
            content is not left-crammed with a big empty right half.
            ──────────────────────────────────────────────────────────────── */}
        <Box component='fieldset' sx={FIELDSET_RESET_SX}>
          <Typography component='legend' sx={SR_ONLY_SX}>
            {GH_PRICING.contextChips.groupLabels.party}
          </Typography>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 1.5, md: 2 }}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent='space-between'
            useFlexGap
          >
            <Stack
              direction='row'
              spacing={1.5}
              rowGap={1.5}
              flexWrap='wrap'
              useFlexGap
              sx={{ flex: 1, minWidth: 0 }}
            >
        {/* Organizacion — 2 clicks con Autocomplete */}
        <Box sx={{ flex: 1, minWidth: 180 }}>
        <ContextChip
          fullWidth
          prominence='primary'
          icon={GH_PRICING.contextChips.organization.icon}
          label={GH_PRICING.contextChips.organization.label}
          value={organizationSelector?.selectedLabel ?? selectedOrganization?.organizationName ?? null}
          placeholder={GH_PRICING.contextChips.organization.placeholder}
          required
          disabled={disabled}
          status={organizationLocked ? 'locked' : undefined}
          errorMessage={invalidFields.organizationId}
          options={organizationSelector?.enabled ? unifiedPartyOptions : orgOptions}
          selectedValue={values.organizationId}
          onSelectChange={organizationSelector?.enabled ? () => undefined : onOrganizationChange}
          onOptionSelect={
            organizationSelector?.enabled
              ? option => {
                  if (!option) {
                    organizationSelector.onSelectParty(null)

                    return
                  }

                  const party = organizationSelector.options.find(
                    candidate =>
                      (candidate.organizationId ?? candidate.hubspotCompanyId ?? candidate.displayName) === option.value
                  )

                  organizationSelector.onSelectParty(party ?? null)
                }
              : undefined
          }
          inputValue={organizationSelector?.enabled ? organizationSelector.searchValue : undefined}
          onInputValueChange={organizationSelector?.enabled ? organizationSelector.onSearchChange : undefined}
          loading={organizationSelector?.enabled ? organizationSelector.loading : undefined}
          loadingText={organizationSelector?.enabled ? organizationSelector.loadingText : undefined}
          liveMessage={organizationSelector?.enabled ? organizationSelector.liveMessage : undefined}
          filterOptions={organizationSelector?.enabled ? options => options : undefined}
          renderOption={
            organizationSelector?.enabled
              ? option => {
                  const lifecycleStage = option.meta?.lifecycleStage as QuoteContextPartySelectorOption['lifecycleStage'] | undefined
                  const kind = option.meta?.kind as QuoteContextPartySelectorOption['kind'] | undefined
                  const canAdopt = option.meta?.canAdopt as boolean | undefined
                  const domain = typeof option.meta?.domain === 'string' ? option.meta.domain : null

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
                        : 'secondary'

                  return (
                    <Stack spacing={0.75} sx={{ width: '100%' }}>
                      <Stack direction='row' spacing={1} alignItems='center' justifyContent='space-between'>
                        <Typography variant='body2' sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                          {option.label}
                        </Typography>
                        {badgeLabel ? (
                          <CustomChip size='small' variant='tonal' color={badgeColor} label={badgeLabel} />
                        ) : null}
                      </Stack>
                      <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
                        {domain ? (
                          <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.3 }}>
                            {domain}
                          </Typography>
                        ) : null}
                        {kind === 'hubspot_candidate' && canAdopt === false ? (
                          <Typography variant='caption' color='warning.main' sx={{ lineHeight: 1.3 }}>
                            {GH_PRICING.contextChips.organization.unifiedNoAdoptPermission}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Stack>
                  )
                }
              : undefined
          }
          popoverNotice={
            organizationSelector?.enabled && organizationSelector.errorMessage
              ? {
                  tone: 'error',
                  message: organizationSelector.errorMessage,
                  actionLabel: organizationSelector.retryActionLabel,
                  onAction: organizationSelector.onRetry
                }
              : undefined
          }
          searchPlaceholder={
            organizationSelector?.enabled
              ? organizationSelector.searchPlaceholder
              : 'Buscar organización…'
          }
          noOptionsText={
            organizationSelector?.enabled
              ? organizationSelector.searchValue.trim().length < 2
                ? organizationSelector.minQueryMessage ?? GH_PRICING.contextChips.organization.unifiedMinQuery
                : organizationSelector.emptyMessage ?? GH_PRICING.contextChips.organization.unifiedEmpty
              : 'Sin organizaciones'
          }
        />
        </Box>

        {/* Contacto — 2 clicks con Autocomplete */}
        <Box sx={{ flex: 1, minWidth: 180 }}>
        <ContextChip
          fullWidth
          prominence='primary'
          icon={GH_PRICING.contextChips.contact.icon}
          label={GH_PRICING.contextChips.contact.label}
          value={contactValue}
          placeholder={
            !values.organizationId
              ? GH_PRICING.contextChips.contact.noOrgFirst
              : GH_PRICING.contextChips.contact.placeholder
          }
          disabled={disabled || !values.organizationId}
          errorMessage={invalidFields.contactIdentityProfileId}
          options={contactOptions}
          selectedValue={values.contactIdentityProfileId}
          onSelectChange={onContactChange}
          searchPlaceholder='Buscar contacto…'
          loading={options.contactsLoading}
          loadingText={GH_PRICING.contextChips.contact.loading}
          noOptionsText={
            !values.organizationId
              ? GH_PRICING.contextChips.contact.noOrgFirst
              : GH_PRICING.contextChips.contact.empty
          }
        />
        </Box>

        {/* Deal HubSpot */}
        <Box sx={{ flex: 1, minWidth: 180 }}>
        <motion.div
          style={{ display: 'block' }}
          animate={dealShouldPulse ? { opacity: [1, 0.88, 1, 0.88, 1] } : { opacity: 1 }}
          transition={{ duration: 2.4, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 1] }}
        >
          <ContextChip
            fullWidth
            prominence='primary'
            icon={GH_PRICING.contextChips.deal.icon}
            label={GH_PRICING.contextChips.deal.label}
            value={dealValue}
          placeholder={
            !values.organizationId
              ? GH_PRICING.contextChips.deal.noOrgFirst
              : GH_PRICING.contextChips.deal.placeholder
          }
          status={dealStatus}
          requiredHint={
            dealStatus === 'blocking-empty' ? GH_PRICING.contextChips.requiredBadge : undefined
          }
          disabled={disabled || !values.organizationId}
          errorMessage={invalidFields.hubspotDealId}
          options={dealOptions}
          selectedValue={values.hubspotDealId}
          onSelectChange={onDealChange}
          searchPlaceholder='Buscar deal…'
          loading={options.dealsLoading}
          loadingText={GH_PRICING.contextChips.deal.loading}
          noOptionsText={
            !values.organizationId
              ? GH_PRICING.contextChips.deal.noOrgFirst
              : GH_PRICING.contextChips.deal.empty
          }
          popoverNotice={
            dealStatus === 'blocking-empty' && dealOptions.length === 0
              ? {
                  tone: 'warning',
                  message: GH_PRICING.contextChips.deal.emptyHelper
                }
              : undefined
          }
        />
        </motion.div>
        </Box>
            </Stack>
            {/* Progress counter anchored top-right, aligned to Tier 1 row for balance. */}
            <Box sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', md: 'center' } }}>
              <FieldsProgressChip
                filled={progressFilled}
                total={progressTotal}
                suffix={GH_PRICING.contextChips.progress.suffix}
                srLabel={GH_PRICING.contextChips.progress.ariaLive}
                testId='quote-context-progress'
              />
            </Box>
          </Stack>
        </Box>

        {/* ────────────────────────────────────────────────────────────────
            Tier 2 — Commercial terms (prominence='inline'). Sin cajas.
            ──────────────────────────────────────────────────────────────── */}
        <Box component='fieldset' sx={FIELDSET_RESET_SX}>
          <Typography component='legend' sx={SR_ONLY_SX}>
            {GH_PRICING.contextChips.groupLabels.terms}
          </Typography>
          <Stack
            direction='row'
            spacing={0.5}
            flexWrap='wrap'
            rowGap={0.5}
            alignItems='baseline'
            useFlexGap
          >
            {/* Business line */}
            <ContextChip
              prominence='inline'
              icon={GH_PRICING.contextChips.businessLine.icon}
              label={GH_PRICING.contextChips.businessLine.label}
              value={selectedBusinessLine?.label ?? null}
              placeholder={GH_PRICING.contextChips.businessLine.placeholder}
              disabled={disabled}
              options={businessLineOptions}
              selectedValue={values.businessLineCode}
              onSelectChange={onBusinessLineChange}
              searchPlaceholder='Buscar business line…'
              noOptionsText='Sin business lines activas'
            />
            <Typography component='span' variant='body2' sx={{ color: 'text.disabled', px: 0.5 }}>
              ·
            </Typography>
            {/* Modelo comercial */}
            <ContextChip
              prominence='inline'
              icon={GH_PRICING.contextChips.commercialModel.icon}
              label={GH_PRICING.contextChips.commercialModel.label}
              value={commercialModelValue}
              placeholder={GH_PRICING.contextChips.commercialModel.placeholder}
              disabled={disabled}
              options={commercialModelOptions}
              selectedValue={values.commercialModel}
              onSelectChange={value => value && onCommercialModelChange(value as CommercialModelCode)}
              searchPlaceholder='Buscar modelo…'
              noOptionsText='Sin modelos'
            />
            <Typography component='span' variant='body2' sx={{ color: 'text.disabled', px: 0.5 }}>
              ·
            </Typography>
            {/* Pais / factor */}
            <ContextChip
              prominence='inline'
              icon={GH_PRICING.contextChips.countryFactor.icon}
              label={GH_PRICING.contextChips.countryFactor.label}
              value={countryFactorValue}
              placeholder={GH_PRICING.contextChips.countryFactor.placeholder}
              disabled={disabled}
              options={countryFactorOptions}
              selectedValue={values.countryFactorCode}
              onSelectChange={value => value && onCountryFactorChange(value)}
              searchPlaceholder='Buscar país…'
              noOptionsText='Sin países'
            />
            <Typography component='span' variant='body2' sx={{ color: 'text.disabled', px: 0.5 }}>
              ·
            </Typography>
            {/* Moneda */}
            <ContextChip
              prominence='inline'
              icon={GH_PRICING.contextChips.currency.icon}
              label={GH_PRICING.contextChips.currency.label}
              value={values.outputCurrency}
              disabled={disabled}
              options={CURRENCY_OPTIONS}
              selectedValue={values.outputCurrency}
              onSelectChange={value => value && onCurrencyChange(value as PricingOutputCurrency)}
              searchPlaceholder='Buscar moneda…'
              popoverWidth={320}
            />
          </Stack>
        </Box>

        {/* ────────────────────────────────────────────────────────────────
            Tier 3 — Timing (prominence='inline'). Progress counter live
            anchors at Tier 1 top-right, not here.
            ──────────────────────────────────────────────────────────────── */}
        <Box component='fieldset' sx={FIELDSET_RESET_SX}>
          <Typography component='legend' sx={SR_ONLY_SX}>
            {GH_PRICING.contextChips.groupLabels.timing}
          </Typography>
          <Stack
            direction='row'
            spacing={0.5}
            flexWrap='wrap'
            rowGap={0.5}
            alignItems='baseline'
            useFlexGap
          >
            {/* Duracion — custom input (number) */}
            <ContextChip
              prominence='inline'
              mode='custom'
              icon={GH_PRICING.contextChips.duration.icon}
              label={GH_PRICING.contextChips.duration.label}
              value={durationValue}
              placeholder={GH_PRICING.contextChips.duration.placeholder}
              disabled={disabled}
              popoverWidth={280}
              popoverContent={() => (
                <Stack spacing={1.5}>
                  <Typography variant='subtitle1'>{GH_PRICING.contextChips.duration.label}</Typography>
                  <CustomTextField
                    fullWidth
                    size='small'
                    type='number'
                    value={values.contractDurationMonths ?? ''}
                    onChange={event => {
                      const parsed = Number.parseInt(event.target.value, 10)

                      onDurationChange(Number.isFinite(parsed) ? parsed : null)
                    }}
                    inputProps={{ min: 1, max: 120, step: 1 }}
                    helperText={GH_PRICING.contextChips.duration.hint}
                    disabled={disabled}
                    aria-label={GH_PRICING.contextChips.duration.label}
                    autoFocus
                  />
                </Stack>
              )}
            />
            <Typography component='span' variant='body2' sx={{ color: 'text.disabled', px: 0.5 }}>
              ·
            </Typography>
            {/* Valida hasta — custom input (date) */}
            <ContextChip
              prominence='inline'
              mode='custom'
              icon={GH_PRICING.contextChips.validUntil.icon}
              label={GH_PRICING.contextChips.validUntil.label}
              value={validUntilValue}
              placeholder={GH_PRICING.contextChips.validUntil.placeholder}
              disabled={disabled}
              popoverWidth={280}
              popoverContent={() => (
                <Stack spacing={1.5}>
                  <Typography variant='subtitle1'>{GH_PRICING.contextChips.validUntil.label}</Typography>
                  <CustomTextField
                    fullWidth
                    size='small'
                    type='date'
                    value={values.validUntil ?? ''}
                    onChange={event => onValidUntilChange(event.target.value || null)}
                    InputLabelProps={{ shrink: true }}
                    disabled={disabled}
                    aria-label={GH_PRICING.contextChips.validUntil.label}
                    autoFocus
                  />
                </Stack>
              )}
            />
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}

export default QuoteContextStrip
