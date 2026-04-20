'use client'

import { useMemo } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'

import ContextChip, { type ContextChipOption } from '@/components/greenhouse/primitives/ContextChip'
import ContextChipStrip from '@/components/greenhouse/primitives/ContextChipStrip'
import { GH_PRICING } from '@/config/greenhouse-nomenclature'
import type { CommercialModelCode } from '@/lib/commercial/pricing-governance-types'
import type { PricingOutputCurrency } from '@/lib/finance/pricing/contracts'

export interface QuoteContextOrganizationOption {
  organizationId: string
  organizationName: string
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
  businessLines: QuoteContextBusinessLineOption[]
  commercialModels: QuoteContextCommercialModelOption[]
  countryFactors: QuoteContextCountryFactorOption[]
}

export interface QuoteContextStripProps extends QuoteContextStripHandlers {
  values: QuoteContextStripValues
  options: QuoteContextStripOptions
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

const formatMultiplier = (pct: number): string => {
  const signed = pct >= 0 ? `+${pct}` : `${pct}`

  return `${signed}%`
}

const formatFactor = (factor: number): string => factor.toFixed(2)

/**
 * Row 2 del patron Command Bar: strip horizontal con 8 ContextChips con Autocomplete
 * inline (2 clicks para seleccionar). Organizacion, Contacto, BL, Modelo comercial,
 * Pais, Moneda = mode 'select'. Duracion y Valida hasta = mode 'custom' (inputs nativos).
 */
const QuoteContextStrip = ({
  values,
  options,
  disabled = false,
  organizationLocked = false,
  stickyOffset = 0,
  invalidFields = {},
  onOrganizationChange,
  onContactChange,
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
      <ContextChipStrip ariaLabel={GH_PRICING.contextChips.ariaLabel}>
        {/* Organizacion — 2 clicks con Autocomplete */}
        <ContextChip
          icon={GH_PRICING.contextChips.organization.icon}
          label={GH_PRICING.contextChips.organization.label}
          value={selectedOrganization?.organizationName ?? null}
          placeholder={GH_PRICING.contextChips.organization.placeholder}
          required
          disabled={disabled}
          status={organizationLocked ? 'locked' : undefined}
          errorMessage={invalidFields.organizationId}
          options={orgOptions}
          selectedValue={values.organizationId}
          onSelectChange={onOrganizationChange}
          searchPlaceholder='Buscar organización…'
          noOptionsText='Sin organizaciones'
        />

        {/* Contacto — 2 clicks con Autocomplete */}
        <ContextChip
          icon={GH_PRICING.contextChips.contact.icon}
          label={GH_PRICING.contextChips.contact.label}
          value={contactValue}
          placeholder={
            !values.organizationId
              ? GH_PRICING.contextChips.contact.noOrgFirst
              : GH_PRICING.contextChips.contact.placeholder
          }
          disabled={disabled || !values.organizationId}
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

        {/* Business line */}
        <ContextChip
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

        {/* Modelo comercial */}
        <ContextChip
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

        {/* Pais / factor */}
        <ContextChip
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

        {/* Moneda */}
        <ContextChip
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

        {/* Duracion — custom input (number) */}
        <ContextChip
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

        {/* Valida hasta — custom input (date) */}
        <ContextChip
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
      </ContextChipStrip>
    </Box>
  )
}

export default QuoteContextStrip
