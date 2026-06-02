// TASK-992 mockup — Client Onboarding wizard (single front door). Typed mock data
// for the 6-step two-pane wizard (Origen → Identidad → Comercial → Finanzas →
// Space → Confirmar) + its surfaces. Shapes mirror the real model (TASK-991
// upsertCanonicalOrganization inputs, client_lifecycle_case, client_profiles).
// Mockup-only: local state, no fetch/API/auth. No real DB writes.

// --- Origin (the 3 user-facing entry points the picker offers) ---------------

export type OnboardingOrigin = 'hubspot_sync' | 'nubox' | 'manual'

// --- Country → tax-id kind + currency (drives Identidad + Finanzas) ----------

export type CountryCode = 'MX' | 'CL' | 'US' | 'AR' | 'CO' | 'PE'

export interface CountryOption {
  code: CountryCode
  label: string
  flag: string
  taxIdLabel: string
  /** Simple mockup-grade format hint shown to the operator. */
  taxIdHint: string
  /** Loose validation regex for the mockup (not production-grade). */
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

/** Loose mockup validation: empty → null (not yet evaluated); else boolean. */
export const isTaxIdValidForCountry = (taxId: string, code: string | null | undefined): boolean | null => {
  const clean = taxId.trim()

  if (!clean) return null

  const country = countryByCode(code)

  if (!country) return null

  return country.taxIdPattern.test(clean)
}

// --- Engagement kind (Comercial) ---------------------------------------------

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

// --- Currency (Finanzas) -----------------------------------------------------

export const CURRENCY_OPTIONS = ['MXN', 'CLP', 'USD', 'ARS', 'COP', 'PEN'] as const

// --- Space type (Space) ------------------------------------------------------

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

// --- HubSpot company fixtures (picker) ---------------------------------------

export interface MockHubspotCompany {
  hubspotCompanyId: string
  name: string
  domain: string
  country: CountryCode
  lifecycleStage: string
  taxId: string | null
}

export const MOCK_HUBSPOT_COMPANIES: MockHubspotCompany[] = [
  { hubspotCompanyId: '55405407542', name: 'Grupo Berel', domain: 'berel.com.mx', country: 'MX', lifecycleStage: 'customer', taxId: 'PBE970101718' },
  { hubspotCompanyId: '55410093321', name: 'Aerolíneas del Sur', domain: 'sur-air.cl', country: 'CL', lifecycleStage: 'opportunity', taxId: null },
  { hubspotCompanyId: '55418772100', name: 'Northwind Bank', domain: 'northwind.com', country: 'US', lifecycleStage: 'customer', taxId: '82-1934567' },
  { hubspotCompanyId: '55421009988', name: 'Café Andino', domain: 'cafeandino.co', country: 'CO', lifecycleStage: 'lead', taxId: null }
]

// --- Nubox sale fixtures (picker) --------------------------------------------

export interface MockNuboxSale {
  saleId: string
  legalName: string
  taxId: string
  country: CountryCode
  currency: string
}

export const MOCK_NUBOX_SALES: MockNuboxSale[] = [
  { saleId: 'NBX-2026-00811', legalName: 'PINTURAS BEREL SA DE CV', taxId: 'PBE970101718', country: 'MX', currency: 'MXN' },
  { saleId: 'NBX-2026-00744', legalName: 'Comercial Aysén Ltda', taxId: '76.998.221-0', country: 'CL', currency: 'CLP' }
]

// --- Existing-org fixtures (duplicate-tax-id dialog) -------------------------
// Tax ids already present in Greenhouse → trigger the "ya existe" dialog.

export interface MockExistingOrg {
  organizationId: string
  publicId: string
  organizationName: string
  taxId: string
  country: CountryCode
}

export const MOCK_EXISTING_ORGS: MockExistingOrg[] = [
  { organizationId: 'org-berel', publicId: 'EO-ORG-0124', organizationName: 'PINTURAS BEREL SA DE CV', taxId: 'PBE970101718', country: 'MX' }
]

export const findExistingOrgByTaxId = (taxId: string): MockExistingOrg | null => {
  const clean = taxId.replace(/[.\-\s]/g, '').toUpperCase()

  return (
    MOCK_EXISTING_ORGS.find(o => o.taxId.replace(/[.\-\s]/g, '').toUpperCase() === clean) ?? null
  )
}

// --- Finance facet drawer: an existing client to complete -------------------

export interface MockFinanceDrawerClient {
  clientId: string
  publicId: string
  organizationName: string
  country: CountryCode
  taxId: string
  taxIdLabel: string
}

export const MOCK_FINANCE_DRAWER_CLIENT: MockFinanceDrawerClient = {
  clientId: 'client-berel',
  publicId: 'EO-ORG-0124',
  organizationName: 'Grupo Berel',
  country: 'MX',
  taxId: 'PBE970101718',
  taxIdLabel: 'RFC'
}

// --- Account 360 lifecycle timeline ------------------------------------------

export type FacetStatus = 'complete' | 'partial' | 'pending'

export interface MockLifecycleFacet {
  key: 'identidad' | 'comercial' | 'operaciones' | 'finanzas' | 'acceso'
  status: FacetStatus
  done: number
  total: number
  /** Human label of what's missing when not complete. */
  missing: string | null
}

export const MOCK_LIFECYCLE_FACETS: MockLifecycleFacet[] = [
  { key: 'identidad', status: 'complete', done: 2, total: 2, missing: null },
  { key: 'comercial', status: 'partial', done: 2, total: 3, missing: 'declarar fases del engagement' },
  { key: 'operaciones', status: 'partial', done: 1, total: 3, missing: 'asignar equipo' },
  { key: 'finanzas', status: 'pending', done: 0, total: 1, missing: 'confirmar facturación' },
  { key: 'acceso', status: 'pending', done: 0, total: 1, missing: 'provisionar acceso al portal' }
]

export interface MockTimelineEvent {
  id: string
  kind: 'opened' | 'item_completed' | 'evidence_attached' | 'blocker_added'
  label: string
  actor: string
  /** Pre-formatted display string — deterministic (no Intl at render → no SSR hydration drift). */
  displayAt: string
  detail: string | null
}

export const MOCK_TIMELINE_EVENTS: MockTimelineEvent[] = [
  {
    id: 'ev-1',
    kind: 'opened',
    label: 'Caso de onboarding abierto',
    actor: 'Julio Reyes',
    displayAt: '2 jun 2026, 10:15',
    detail: 'Origen: HubSpot · Grupo Berel'
  },
  {
    id: 'ev-2',
    kind: 'item_completed',
    label: 'Identidad legal confirmada',
    actor: 'Julio Reyes',
    displayAt: '2 jun 2026, 10:22',
    detail: 'RFC PBE970101718 · México'
  },
  {
    id: 'ev-3',
    kind: 'item_completed',
    label: 'Términos comerciales declarados',
    actor: 'Julio Reyes',
    displayAt: '2 jun 2026, 10:40',
    detail: 'Engagement: Contratado (regular)'
  },
  {
    id: 'ev-4',
    kind: 'evidence_attached',
    label: 'Workspace de Notion provisionado',
    actor: 'Nexa',
    displayAt: '2 jun 2026, 14:30',
    detail: 'Evidencia adjunta'
  }
]

export const MOCK_TIMELINE_HEALTH = {
  state: 'healthy' as 'healthy' | 'stalled' | 'overdue',
  daysSinceProgress: 0,
  daysOverdue: 0
}

// --- Mock operating entity (Efeonce, the payer/issuer) -----------------------

export const MOCK_OPERATING_ENTITY = {
  legalName: 'Efeonce Group SpA'
}
