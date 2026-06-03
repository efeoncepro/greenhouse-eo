// TASK-992 Slice 2b — Client Onboarding wizard form helpers (runtime).
// Pure presentation helpers for the single-front-door wizard: country → tax-id
// kind + default currency, engagement kind labels, space type labels. Ported from
// the approved mockup data module (frozen) so the runtime does not depend on
// /mockup/. NOT server-only — used by the client wizard view.

export type OnboardingOrigin = 'hubspot_sync' | 'nubox' | 'manual'

export type CountryCode = 'MX' | 'CL' | 'US' | 'AR' | 'CO' | 'PE'

export interface CountryOption {
  code: CountryCode
  label: string
  flag: string
  taxIdLabel: string
  taxIdHint: string
  taxIdPattern: RegExp
  currency: string
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'MX', label: 'México', flag: '🇲🇽', taxIdLabel: 'RFC', taxIdHint: 'RFC persona moral: 12 caracteres', taxIdPattern: /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i, currency: 'MXN' },
  { code: 'CL', label: 'Chile', flag: '🇨🇱', taxIdLabel: 'RUT', taxIdHint: 'RUT: 12.345.678-9', taxIdPattern: /^\d{7,8}-?[\dkK]$/, currency: 'CLP' },
  { code: 'US', label: 'Estados Unidos', flag: '🇺🇸', taxIdLabel: 'EIN', taxIdHint: 'EIN: 12-3456789', taxIdPattern: /^\d{2}-?\d{7}$/, currency: 'USD' },
  { code: 'AR', label: 'Argentina', flag: '🇦🇷', taxIdLabel: 'CUIT', taxIdHint: 'CUIT: 30-12345678-9', taxIdPattern: /^\d{2}-?\d{8}-?\d$/, currency: 'ARS' },
  { code: 'CO', label: 'Colombia', flag: '🇨🇴', taxIdLabel: 'NIT', taxIdHint: 'NIT: 900123456-7', taxIdPattern: /^\d{9,10}-?\d$/, currency: 'COP' },
  { code: 'PE', label: 'Perú', flag: '🇵🇪', taxIdLabel: 'RUC', taxIdHint: 'RUC: 20123456789', taxIdPattern: /^\d{11}$/, currency: 'PEN' }
]

export const countryByCode = (code: string | null | undefined): CountryOption | null =>
  COUNTRY_OPTIONS.find(c => c.code === code) ?? null

export const taxIdLabelForCountry = (code: string | null | undefined): string =>
  countryByCode(code)?.taxIdLabel ?? 'ID tributario'

export const currencyForCountry = (code: string | null | undefined): string =>
  countryByCode(code)?.currency ?? 'USD'

/** Empty → null (not yet evaluated); else boolean. */
export const isTaxIdValidForCountry = (taxId: string, code: string | null | undefined): boolean | null => {
  const clean = taxId.trim()

  if (!clean) return null

  const country = countryByCode(code)

  if (!country) return null

  return country.taxIdPattern.test(clean)
}

export const normalizeTaxId = (taxId: string): string => taxId.replace(/[.\-\s]/g, '').toUpperCase()

export type EngagementKind = 'regular' | 'pilot' | 'trial' | 'poc' | 'discovery'

export const ENGAGEMENT_KIND_OPTIONS: EngagementKind[] = ['regular', 'pilot', 'trial', 'poc', 'discovery']

export const engagementKindLabel = (v: EngagementKind): string => {
  switch (v) {
    case 'regular':
      return 'Contratado (regular)'
    case 'pilot':
      return 'Piloto'
    case 'trial':
      return 'Trial'
    case 'poc':
      return 'Prueba de concepto (POC)'
    case 'discovery':
      return 'Discovery'
  }
}

export const CURRENCY_OPTIONS = ['MXN', 'CLP', 'USD', 'ARS', 'COP', 'PEN'] as const

export type SpaceType = 'client' | 'internal' | 'partner'

export const SPACE_TYPE_OPTIONS: SpaceType[] = ['client', 'internal', 'partner']

export const spaceTypeLabel = (v: SpaceType): string => {
  switch (v) {
    case 'client':
      return 'Cliente'
    case 'internal':
      return 'Interno'
    case 'partner':
      return 'Partner'
  }
}

// Runtime search result shapes (real Greenhouse organizations) used by the wizard
// pickers + the duplicate-tax-id gate. They replace the mockup fixtures.
export interface OrgSearchResult {
  organizationId: string
  publicId: string | null
  organizationName: string
  legalName: string | null
  taxId: string | null
  country: string | null
  hubspotCompanyId: string | null
  lifecycleStage: string | null
}
