'use client'

import { useMemo } from 'react'

import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'

import ContextChip from '@/components/greenhouse/primitives/ContextChip'
import ContextChipStrip from '@/components/greenhouse/primitives/ContextChipStrip'
import { GH_PRICING } from '@/config/greenhouse-nomenclature'
import type { CommercialModelCode } from '@/lib/commercial/pricing-governance-types'
import type { PricingOutputCurrency } from '@/lib/finance/pricing/contracts'

import CurrencySwitcher from './CurrencySwitcher'

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

  /** Cuando se esta en modo edit, la organizacion queda locked (no se puede cambiar
   * despues de crear el quote, por contrato del modelo canonico) */
  organizationLocked?: boolean

  stickyOffset?: number
  invalidFields?: Partial<Record<keyof QuoteContextStripValues, string>>
}

const formatMultiplier = (pct: number): string => {
  const signed = pct >= 0 ? `+${pct}` : `${pct}`

  return `${signed}%`
}

const formatFactor = (factor: number): string => factor.toFixed(2)

/**
 * Row 2 del patron Command Bar: strip horizontal con los 7 chips de contexto
 * (Organizacion, Contacto, Business Line, Modelo Comercial, Pais, Moneda,
 * Duracion, Valida Hasta). Cada chip abre un Popover con el editor correspondiente.
 * Reemplaza la sidebar vertical de QuoteBuilderActions.
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
    ? `${selectedContact.fullName ?? selectedContact.canonicalEmail ?? selectedContact.identityProfileId}${selectedContact.isPrimary ? ' · Principal' : ''}`
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
        {/* Organizacion */}
        <ContextChip
          icon={GH_PRICING.contextChips.organization.icon}
          label={GH_PRICING.contextChips.organization.label}
          value={selectedOrganization?.organizationName ?? null}
          placeholder={GH_PRICING.contextChips.organization.placeholder}
          required
          disabled={disabled}
          status={organizationLocked ? 'locked' : undefined}
          errorMessage={invalidFields.organizationId}
          popoverWidth={360}
          popoverContent={({ close }) => (
            <Stack spacing={2}>
              <Typography variant='subtitle2'>{GH_PRICING.contextChips.organization.label}</Typography>
              <Typography variant='caption' color='text.secondary'>
                {GH_PRICING.contextChips.organization.hint}
              </Typography>
              {organizationLocked ? (
                <Typography variant='caption' color='text.secondary'>
                  {GH_PRICING.contextChips.lockedHint}
                </Typography>
              ) : null}
              <CustomTextField
                select
                fullWidth
                size='small'
                value={values.organizationId ?? ''}
                onChange={event => {
                  onOrganizationChange(event.target.value || null)

                  if (event.target.value) close()
                }}
                disabled={disabled || organizationLocked}
                aria-label={GH_PRICING.contextChips.organization.label}
                autoFocus
              >
                <MenuItem value=''>{GH_PRICING.contextChips.organization.placeholder}</MenuItem>
                {options.organizations.map(org => (
                  <MenuItem key={org.organizationId} value={org.organizationId}>
                    {org.organizationName}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Stack>
          )}
        />

        {/* Contacto */}
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
          popoverWidth={380}
          popoverContent={({ close }) => (
            <Stack spacing={2}>
              <Typography variant='subtitle2'>{GH_PRICING.contextChips.contact.label}</Typography>
              <Typography variant='caption' color='text.secondary'>
                {GH_PRICING.contextChips.contact.hint}
              </Typography>
              {!values.organizationId ? (
                <Typography variant='caption' color='text.secondary'>
                  {GH_PRICING.contextChips.contact.noOrgFirst}
                </Typography>
              ) : options.contactsLoading ? (
                <Typography variant='caption' color='text.secondary'>
                  {GH_PRICING.contextChips.contact.loading}
                </Typography>
              ) : options.contacts.length === 0 ? (
                <Typography variant='caption' color='text.secondary'>
                  {GH_PRICING.contextChips.contact.empty}
                </Typography>
              ) : (
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  value={values.contactIdentityProfileId ?? ''}
                  onChange={event => {
                    onContactChange(event.target.value || null)

                    if (event.target.value) close()
                  }}
                  disabled={disabled}
                  aria-label={GH_PRICING.contextChips.contact.label}
                  autoFocus
                >
                  <MenuItem value=''>{GH_PRICING.contextChips.contact.placeholder}</MenuItem>
                  {options.contacts.map(contact => {
                    const primary = contact.fullName ?? contact.canonicalEmail ?? contact.identityProfileId

                    const secondary =
                      contact.canonicalEmail && contact.fullName
                        ? contact.canonicalEmail
                        : contact.jobTitle ?? contact.roleLabel ?? null

                    return (
                      <MenuItem key={contact.identityProfileId} value={contact.identityProfileId}>
                        <Stack spacing={0}>
                          <Typography variant='body2' sx={{ lineHeight: 1.3 }}>
                            {primary}
                            {contact.isPrimary ? ` · ${GH_PRICING.contextChips.contact.primaryBadge}` : ''}
                          </Typography>
                          {secondary ? (
                            <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.2 }}>
                              {secondary}
                            </Typography>
                          ) : null}
                        </Stack>
                      </MenuItem>
                    )
                  })}
                </CustomTextField>
              )}
            </Stack>
          )}
        />

        {/* Business line */}
        <ContextChip
          icon={GH_PRICING.contextChips.businessLine.icon}
          label={GH_PRICING.contextChips.businessLine.label}
          value={selectedBusinessLine?.label ?? null}
          placeholder={GH_PRICING.contextChips.businessLine.placeholder}
          disabled={disabled}
          popoverContent={({ close }) => (
            <Stack spacing={2}>
              <Typography variant='subtitle2'>{GH_PRICING.contextChips.businessLine.label}</Typography>
              <CustomTextField
                select
                fullWidth
                size='small'
                value={values.businessLineCode ?? ''}
                onChange={event => {
                  onBusinessLineChange(event.target.value || null)

                  if (event.target.value) close()
                }}
                disabled={disabled}
                aria-label={GH_PRICING.contextChips.businessLine.label}
                autoFocus
              >
                <MenuItem value=''>{GH_PRICING.contextChips.businessLine.placeholder}</MenuItem>
                {options.businessLines.map(bl => (
                  <MenuItem key={bl.code} value={bl.code}>
                    {bl.label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Stack>
          )}
        />

        {/* Modelo comercial */}
        <ContextChip
          icon={GH_PRICING.contextChips.commercialModel.icon}
          label={GH_PRICING.contextChips.commercialModel.label}
          value={commercialModelValue}
          placeholder={GH_PRICING.contextChips.commercialModel.placeholder}
          disabled={disabled}
          popoverContent={({ close }) => (
            <Stack spacing={2}>
              <Typography variant='subtitle2'>{GH_PRICING.contextChips.commercialModel.label}</Typography>
              <CustomTextField
                select
                fullWidth
                size='small'
                value={values.commercialModel}
                onChange={event => {
                  onCommercialModelChange(event.target.value as CommercialModelCode)
                  close()
                }}
                disabled={disabled}
                aria-label={GH_PRICING.contextChips.commercialModel.label}
                autoFocus
              >
                {options.commercialModels.map(model => (
                  <MenuItem key={model.code} value={model.code}>
                    <Stack>
                      <Typography variant='body2' sx={{ lineHeight: 1.3 }}>
                        {model.label}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {formatMultiplier(model.multiplierPct)} sobre tarifa base
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </CustomTextField>
            </Stack>
          )}
        />

        {/* Pais / factor */}
        <ContextChip
          icon={GH_PRICING.contextChips.countryFactor.icon}
          label={GH_PRICING.contextChips.countryFactor.label}
          value={countryFactorValue}
          placeholder={GH_PRICING.contextChips.countryFactor.placeholder}
          disabled={disabled}
          popoverContent={({ close }) => (
            <Stack spacing={2}>
              <Typography variant='subtitle2'>{GH_PRICING.contextChips.countryFactor.label}</Typography>
              <CustomTextField
                select
                fullWidth
                size='small'
                value={values.countryFactorCode}
                onChange={event => {
                  onCountryFactorChange(event.target.value)
                  close()
                }}
                disabled={disabled}
                aria-label={GH_PRICING.contextChips.countryFactor.label}
                autoFocus
              >
                {options.countryFactors.map(factor => (
                  <MenuItem key={factor.code} value={factor.code}>
                    <Stack>
                      <Typography variant='body2' sx={{ lineHeight: 1.3 }}>
                        {factor.label}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Factor ×{formatFactor(factor.factor)}
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </CustomTextField>
            </Stack>
          )}
        />

        {/* Moneda */}
        <ContextChip
          icon={GH_PRICING.contextChips.currency.icon}
          label={GH_PRICING.contextChips.currency.label}
          value={values.outputCurrency}
          disabled={disabled}
          popoverWidth={300}
          popoverContent={({ close }) => (
            <Stack spacing={2}>
              <Typography variant='subtitle2'>{GH_PRICING.contextChips.currency.label}</Typography>
              <CurrencySwitcher
                value={values.outputCurrency}
                onChange={value => {
                  onCurrencyChange(value)
                  close()
                }}
                disabled={disabled}
                size='small'
                fullWidth
              />
            </Stack>
          )}
        />

        {/* Duracion */}
        <ContextChip
          icon={GH_PRICING.contextChips.duration.icon}
          label={GH_PRICING.contextChips.duration.label}
          value={durationValue}
          placeholder={GH_PRICING.contextChips.duration.placeholder}
          disabled={disabled}
          popoverWidth={300}
          popoverContent={() => (
            <Stack spacing={2}>
              <Typography variant='subtitle2'>{GH_PRICING.contextChips.duration.label}</Typography>
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

        {/* Valida hasta */}
        <ContextChip
          icon={GH_PRICING.contextChips.validUntil.icon}
          label={GH_PRICING.contextChips.validUntil.label}
          value={validUntilValue}
          placeholder={GH_PRICING.contextChips.validUntil.placeholder}
          disabled={disabled}
          popoverWidth={300}
          popoverContent={() => (
            <Stack spacing={2}>
              <Typography variant='subtitle2'>{GH_PRICING.contextChips.validUntil.label}</Typography>
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
