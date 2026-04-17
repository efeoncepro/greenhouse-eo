import 'server-only'

import { resolveContactDisplayName } from '@/lib/contacts/contact-display'

const DEFAULT_BASE_URL = 'https://hubspot-greenhouse-integration-183008134038.us-central1.run.app'
const DEFAULT_TIMEOUT_MS = 4000

export interface HubSpotGreenhouseServiceContract {
  service: string
  version: string
  realtime: {
    supported: boolean
    mode: string
    details: string
  }
}

export interface HubSpotGreenhouseCompanyProfile {
  hubspotCompanyId: string
  identity: {
    hubspotCompanyId: string
    name: string | null
    domain: string | null
    website: string | null
    industry: string | null
    country: string | null
    city: string | null
    state: string | null
  }
  lifecycle: {
    lifecyclestage: string | null
    hs_current_customer: string | null
    hubspotTeamId: string | null
  }
  capabilities: {
    businessLines: string[]
    serviceModules: string[]
  }
  owner: {
    hubspotOwnerId: string | null
  }
  source: {
    sourceSystem: string
    sourceObjectType: string
    sourceObjectId: string
  }
}

export interface HubSpotGreenhouseOwnerProfile {
  hubspotOwnerId: string
  ownerEmail: string | null
  ownerFirstName: string | null
  ownerLastName: string | null
  ownerDisplayName: string | null
  userId: number | null
  archived: boolean | null
}

export interface HubSpotGreenhouseCompanyOwnerResponse {
  hubspotCompanyId: string
  owner: HubSpotGreenhouseOwnerProfile | null
  detail?: string
}

export interface HubSpotGreenhouseContactProfile {
  hubspotContactId: string
  email: string | null
  firstName: string | null
  lastName: string | null
  displayName: string | null
  phone: string | null
  mobilePhone: string | null
  jobTitle: string | null
  lifecyclestage: string | null
  hsLeadStatus: string | null
  company: string | null
}

export interface HubSpotGreenhouseCompanyContactsResponse {
  hubspotCompanyId: string
  count: number
  contacts: HubSpotGreenhouseContactProfile[]
}

export interface HubSpotGreenhouseServiceProfile {
  identity: {
    serviceId: string
    name: string | null
    hubspotServiceId: string | null
  }
  classification: {
    lineaDeServicio: string | null
    servicioEspecifico: string | null
    modalidad: string | null
    billingFrequency: string | null
    country: string | null
  }
  financial: {
    totalCost: number | null
    amountPaid: number | null
    currency: string | null
  }
  dates: {
    startDate: string | null
    targetEndDate: string | null
  }
  references: {
    notionProjectId: string | null
    hubspotCompanyId: string | null
    hubspotDealId: string | null
  }
  source: {
    sourceSystem: string
    sourceObjectType: string
    sourceObjectId: string
  }
}

export interface HubSpotGreenhouseCompanyServicesResponse {
  hubspotCompanyId: string
  services: HubSpotGreenhouseServiceProfile[]
  count: number
}

// ── Quotes (TASK-210) ──

export interface HubSpotGreenhouseQuoteProfile {
  identity: {
    quoteId: string
    title: string | null
    quoteNumber: string | null
    hubspotQuoteId: string
  }
  financial: {
    amount: number | null
    currency: string | null
    discount: number | null
  }
  dates: {
    createDate: string | null
    expirationDate: string | null
    lastModifiedDate: string | null
  }
  status: {
    approvalStatus: string | null
    signatureStatus: string | null
  }
  associations: {
    dealId: string | null
    companyId: string | null
    contactIds: string[]
    lineItemCount: number
  }
  source: {
    sourceSystem: 'hubspot'
    sourceObjectType: 'quote'
    sourceObjectId: string
  }
}

export interface HubSpotGreenhouseCompanyQuotesResponse {
  hubspotCompanyId: string
  quotes: HubSpotGreenhouseQuoteProfile[]
  count: number
}

export interface HubSpotGreenhouseCreateQuoteRequest {
  title: string
  expirationDate: string
  language?: string
  locale?: string
  sender?: {
    firstName: string
    lastName: string
    email: string
    companyName: string
  }
  associations?: {
    dealId?: string
    companyId?: string
    contactIds?: string[]
    quoteTemplateId?: string
  }
  lineItems?: Array<{
    name: string
    quantity: number
    unitPrice: number
    description?: string
    discount?: number
    taxAmount?: number
  }>
}

export interface HubSpotGreenhouseCreateQuoteResponse {
  hubspotQuoteId: string
  quoteNumber: string | null
  status: string
  quoteLink: string | null
  associations: {
    dealId: string | null
    lineItemIds: string[]
  }
}

// ── Products (TASK-211) ──

export interface HubSpotGreenhouseProductProfile {
  identity: {
    productId: string
    name: string | null
    sku: string | null
    hubspotProductId: string
  }
  pricing: {
    unitPrice: number | null
    costOfGoodsSold: number | null
    currency: string | null
    tax: number | null
  }
  billing: {
    isRecurring: boolean
    frequency: string | null
    periodCount: number | null
  }
  metadata: {
    description: string | null
    isArchived: boolean
    createdAt: string | null
    lastModifiedAt: string | null
  }
  source: {
    sourceSystem: 'hubspot'
    sourceObjectType: 'product'
    sourceObjectId: string
  }
}

export interface HubSpotGreenhouseProductCatalogResponse {
  count: number
  products: HubSpotGreenhouseProductProfile[]
}

export interface HubSpotGreenhouseCreateProductRequest {
  name: string
  sku: string
  description?: string
  unitPrice?: number

  /**
   * @deprecated TASK-347: cost must never be forwarded to HubSpot. Keep in the type
   * only to support the legacy inbound sync where HubSpot sends it back to Greenhouse.
   * Callers creating outbound products must NOT set this field; the outbound guard
   * (`src/lib/commercial/hubspot-outbound-guard.ts`) strips it defensively.
   */
  costOfGoodsSold?: number
  tax?: number
  isRecurring?: boolean
  billingFrequency?: string
  billingPeriodCount?: number
}

export interface HubSpotGreenhouseCreateProductResponse {
  hubspotProductId: string
  name: string | null
  sku: string | null
}

// ── Line Items (TASK-211) ──

export interface HubSpotGreenhouseLineItemProfile {
  identity: {
    lineItemId: string
    hubspotLineItemId: string
    hubspotProductId: string | null
  }
  content: {
    name: string | null
    description: string | null
    quantity: number
    unitPrice: number
    discountPercent: number | null
    discountAmount: number | null
    taxAmount: number | null
    totalAmount: number
  }
  billing: {
    frequency: string | null
    period: number | null
  }
  source: {
    sourceSystem: 'hubspot'
    sourceObjectType: 'line_item'
    sourceObjectId: string
  }
}

export interface HubSpotGreenhouseQuoteLineItemsResponse {
  hubspotQuoteId: string
  count: number
  lineItems: HubSpotGreenhouseLineItemProfile[]
}

export interface HubSpotGreenhouseLiveContext {
  serviceConfigured: boolean
  serviceBaseUrl: string | null
  fetchedAt: string | null
  contract: HubSpotGreenhouseServiceContract | null
  company: HubSpotGreenhouseCompanyProfile | null
  owner: HubSpotGreenhouseOwnerProfile | null
  contacts: HubSpotGreenhouseContactProfile[]
  services: HubSpotGreenhouseServiceProfile[]
  error: string | null
}

const normalizeBaseUrl = (value: string | undefined) => {
  const normalized = value?.trim().replace(/\/+$/, '')

  return normalized || DEFAULT_BASE_URL
}

const parseTimeoutMs = (value: string | undefined) => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS
  }

  return Math.floor(parsed)
}

const getServiceConfig = () => ({
  baseUrl: normalizeBaseUrl(process.env.HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL),
  timeoutMs: parseTimeoutMs(process.env.HUBSPOT_GREENHOUSE_INTEGRATION_TIMEOUT_MS)
})

const fetchJson = async <T>(path: string): Promise<T> => {
  const { baseUrl, timeoutMs } = getServiceConfig()

  const response = await fetch(`${baseUrl}${path}`, {
    cache: 'no-store',
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (!response.ok) {
    const body = await response.text()

    throw new Error(`HubSpot integration service returned ${response.status} for ${path}: ${body || response.statusText}`)
  }

  return (await response.json()) as T
}

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown HubSpot integration service error'
}

export const getHubSpotGreenhouseServiceContract = async () => fetchJson<HubSpotGreenhouseServiceContract>('/contract')

export const getHubSpotGreenhouseCompanyProfile = async (hubspotCompanyId: string) =>
  fetchJson<HubSpotGreenhouseCompanyProfile>(`/companies/${hubspotCompanyId}`)

export const getHubSpotGreenhouseCompanyOwner = async (hubspotCompanyId: string) =>
  fetchJson<HubSpotGreenhouseCompanyOwnerResponse>(`/companies/${hubspotCompanyId}/owner`)

export const getHubSpotGreenhouseCompanyServices = async (hubspotCompanyId: string) =>
  fetchJson<HubSpotGreenhouseCompanyServicesResponse>(`/companies/${hubspotCompanyId}/services`)

export const getHubSpotGreenhouseService = async (serviceId: string) =>
  fetchJson<HubSpotGreenhouseServiceProfile>(`/services/${serviceId}`)

export const getHubSpotGreenhouseCompanyContacts = async (hubspotCompanyId: string) =>
  {
    const response = await fetchJson<HubSpotGreenhouseCompanyContactsResponse>(`/companies/${hubspotCompanyId}/contacts`)

    return {
      ...response,
      contacts: response.contacts.map(contact => ({
        ...contact,
        displayName: resolveContactDisplayName(contact)
      }))
    }
  }

// ── Products client methods (TASK-211) ──

export const getHubSpotGreenhouseProductCatalog = async () =>
  fetchJson<HubSpotGreenhouseProductCatalogResponse>('/products')

export const getHubSpotGreenhouseProduct = async (productId: string) =>
  fetchJson<HubSpotGreenhouseProductProfile>(`/products/${productId}`)

export const createHubSpotGreenhouseProduct = async (payload: HubSpotGreenhouseCreateProductRequest) => {
  const { baseUrl, timeoutMs } = getServiceConfig()

  // TASK-347 defense-in-depth: strip cost_of_goods_sold if a caller forgot the guard.
  // The authoritative sanitizer lives in src/lib/commercial/hubspot-outbound-guard.ts.
  const safePayload: Record<string, unknown> = { ...payload }

  delete safePayload.costOfGoodsSold

  const response = await fetch(`${baseUrl}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(safePayload),
    cache: 'no-store',
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (!response.ok) {
    const body = await response.text()

    throw new Error(`HubSpot integration service returned ${response.status} for POST /products: ${body || response.statusText}`)
  }

  return (await response.json()) as HubSpotGreenhouseCreateProductResponse
}

// ── Line Items client methods (TASK-211) ──

export const getHubSpotGreenhouseQuoteLineItems = async (hubspotQuoteId: string) =>
  fetchJson<HubSpotGreenhouseQuoteLineItemsResponse>(`/quotes/${hubspotQuoteId}/line-items`)

// ── Quotes client methods (TASK-210) ──

export const getHubSpotGreenhouseCompanyQuotes = async (hubspotCompanyId: string) =>
  fetchJson<HubSpotGreenhouseCompanyQuotesResponse>(`/companies/${hubspotCompanyId}/quotes`)

export const createHubSpotGreenhouseQuote = async (payload: HubSpotGreenhouseCreateQuoteRequest) => {
  const { baseUrl, timeoutMs } = getServiceConfig()

  const response = await fetch(`${baseUrl}/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (!response.ok) {
    const body = await response.text()

    throw new Error(`HubSpot integration service returned ${response.status} for POST /quotes: ${body || response.statusText}`)
  }

  return (await response.json()) as HubSpotGreenhouseCreateQuoteResponse
}

export const getHubSpotGreenhouseLiveContext = async (
  hubspotCompanyId: string | null
): Promise<HubSpotGreenhouseLiveContext> => {
  const { baseUrl } = getServiceConfig()

  if (!hubspotCompanyId) {
    return {
      serviceConfigured: Boolean(baseUrl),
      serviceBaseUrl: baseUrl,
      fetchedAt: null,
      contract: null,
      company: null,
      owner: null,
      contacts: [],
      services: [],
      error: null
    }
  }

  const [contractResult, companyResult, ownerResult, contactsResult, servicesResult] = await Promise.allSettled([
    getHubSpotGreenhouseServiceContract(),
    getHubSpotGreenhouseCompanyProfile(hubspotCompanyId),
    getHubSpotGreenhouseCompanyOwner(hubspotCompanyId),
    getHubSpotGreenhouseCompanyContacts(hubspotCompanyId),
    getHubSpotGreenhouseCompanyServices(hubspotCompanyId)
  ])

  const errors = [contractResult, companyResult, ownerResult, contactsResult, servicesResult]
    .filter(result => result.status === 'rejected')
    .map(result => toErrorMessage((result as PromiseRejectedResult).reason))

  return {
    serviceConfigured: Boolean(baseUrl),
    serviceBaseUrl: baseUrl,
    fetchedAt: new Date().toISOString(),
    contract: contractResult.status === 'fulfilled' ? contractResult.value : null,
    company: companyResult.status === 'fulfilled' ? companyResult.value : null,
    owner: ownerResult.status === 'fulfilled' ? ownerResult.value.owner : null,
    contacts: contactsResult.status === 'fulfilled' ? contactsResult.value.contacts : [],
    services: servicesResult.status === 'fulfilled' ? servicesResult.value.services : [],
    error: errors.length > 0 ? errors.join(' | ') : null
  }
}
