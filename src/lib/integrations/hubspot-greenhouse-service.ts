import 'server-only'

import { resolveContactDisplayName } from '@/lib/contacts/contact-display'

const DEFAULT_BASE_URL = 'https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app'
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
    ghCommercialPartyId: string | null
    ghLastQuoteAt: string | null
    ghLastContractAt: string | null
    ghActiveContractsCount: number | null
    ghLastWriteAt: string | null
    ghMrrTier: string | null
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

export interface HubSpotGreenhouseUpdateCompanyLifecycleRequest {
  organizationId?: string
  commercialPartyId?: string | null
  lifecycleStage?: string | null
  activeContractsCount?: number | null
  lastQuoteAt?: string | null
  lastContractAt?: string | null
  ghLastWriteAt: string
  mrrTier?: string | null
}

export interface HubSpotGreenhouseUpdateCompanyLifecycleResponse {
  status: 'updated' | 'endpoint_not_deployed'
  hubspotCompanyId: string | null
  fieldsWritten: string[]
  message?: string
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

  // TASK-547 Fase C — outbound bridge annotations. The Cloud Run service
  // forwards these as HubSpot custom properties (`gh_product_code`,
  // `gh_source_kind`, `gh_last_write_at`, `gh_archived_by_greenhouse`,
  // `gh_business_line`). `createdBy` is an audit tag persisted into HubSpot's
  // default audit trail.
  createdBy?: string
  customProperties?: Partial<{
    gh_product_code: string
    gh_source_kind: string
    gh_last_write_at: string
    gh_archived_by_greenhouse: boolean
    gh_business_line: string | null
  }>
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
  timeoutMs: parseTimeoutMs(process.env.HUBSPOT_GREENHOUSE_INTEGRATION_TIMEOUT_MS),
  integrationToken: process.env.GREENHOUSE_INTEGRATION_API_TOKEN?.trim() || null
})

const buildServiceHeaders = (
  extraHeaders?: Record<string, string>,
  includeIntegrationAuth = false
) => {
  const { integrationToken } = getServiceConfig()

  const headers: Record<string, string> = {
    ...(extraHeaders ?? {})
  }

  if (includeIntegrationAuth && !integrationToken) {
    throw new Error(
      'Missing GREENHOUSE_INTEGRATION_API_TOKEN for HubSpot integration service write request.'
    )
  }

  if (includeIntegrationAuth && integrationToken) {
    headers.Authorization = `Bearer ${integrationToken}`
    headers['x-greenhouse-integration-key'] = integrationToken
  }

  return headers
}

const fetchJson = async <T>(path: string): Promise<T> => {
  const { baseUrl, timeoutMs } = getServiceConfig()

  const response = await fetch(`${baseUrl}${path}`, {
    headers: buildServiceHeaders(),
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

export const updateHubSpotGreenhouseCompanyLifecycle = async (
  hubspotCompanyId: string,
  payload: HubSpotGreenhouseUpdateCompanyLifecycleRequest
): Promise<HubSpotGreenhouseUpdateCompanyLifecycleResponse> => {
  const { baseUrl, timeoutMs } = getServiceConfig()

  const response = await fetch(`${baseUrl}/companies/${encodeURIComponent(hubspotCompanyId)}/lifecycle`, {
    method: 'PATCH',
    headers: buildServiceHeaders({ 'Content-Type': 'application/json' }, true),
    body: JSON.stringify(payload),
    cache: 'no-store',
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (response.status === 404) {
    return {
      status: 'endpoint_not_deployed',
      hubspotCompanyId,
      fieldsWritten: [],
      message:
        'HubSpot integration service does not expose PATCH /companies/:id/lifecycle yet. Trace persisted; retry on next deploy.'
    }
  }

  if (!response.ok) {
    const body = await response.text()

    throw new Error(
      `HubSpot integration service returned ${response.status} for PATCH /companies/${hubspotCompanyId}/lifecycle: ${body || response.statusText}`
    )
  }

  return (await response.json()) as HubSpotGreenhouseUpdateCompanyLifecycleResponse
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
    headers: buildServiceHeaders({ 'Content-Type': 'application/json' }, true),
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

// ── Product outbound extensions (TASK-547) ──
//
// PATCH / archive / reconcile may still hit older deployments while rollout is
// in flight. Follow the TASK-524 invoice and TASK-539 deal patterns: return a
// structured `endpoint_not_deployed` result on 404 so the reactive outbound
// bridge records the trace without throwing.

export interface HubSpotGreenhouseProductCustomProperties {
  gh_product_code: string
  gh_source_kind: string
  gh_last_write_at: string
  gh_archived_by_greenhouse: boolean
  gh_business_line?: string | null
}

export interface HubSpotGreenhouseUpdateProductRequest {
  name?: string | null
  description?: string | null
  unitPrice?: number | null
  sku?: string | null
  isArchived?: boolean | null
  customProperties?: Partial<HubSpotGreenhouseProductCustomProperties>
}

export interface HubSpotGreenhouseUpdateProductResponse {
  status: 'updated' | 'endpoint_not_deployed'
  hubspotProductId: string | null
  message?: string
}

export const updateHubSpotGreenhouseProduct = async (
  hubspotProductId: string,
  payload: HubSpotGreenhouseUpdateProductRequest
): Promise<HubSpotGreenhouseUpdateProductResponse> => {
  const { baseUrl, timeoutMs } = getServiceConfig()

  // TASK-347 defense-in-depth: the sanitizer guarantees cost fields never leave
  // Greenhouse. Strip any leakage at the wire boundary as well.
  const safePayload: Record<string, unknown> = { ...payload }

  delete safePayload.costOfGoodsSold

  const response = await fetch(`${baseUrl}/products/${encodeURIComponent(hubspotProductId)}`, {
    method: 'PATCH',
    headers: buildServiceHeaders({ 'Content-Type': 'application/json' }, true),
    body: JSON.stringify(safePayload),
    cache: 'no-store',
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (response.status === 404) {
    return {
      status: 'endpoint_not_deployed',
      hubspotProductId,
      message:
        'HubSpot integration service does not expose PATCH /products/:id yet. Trace persisted; retry on next deploy.'
    }
  }

  if (!response.ok) {
    const body = await response.text()

    throw new Error(
      `HubSpot integration service returned ${response.status} for PATCH /products/${hubspotProductId}: ${body || response.statusText}`
    )
  }

  return (await response.json()) as HubSpotGreenhouseUpdateProductResponse
}

export interface HubSpotGreenhouseArchiveProductResponse {
  status: 'archived' | 'endpoint_not_deployed'
  hubspotProductId: string | null
  message?: string
}

export const archiveHubSpotGreenhouseProduct = async (
  hubspotProductId: string,
  reason?: string
): Promise<HubSpotGreenhouseArchiveProductResponse> => {
  const { baseUrl, timeoutMs } = getServiceConfig()

  const response = await fetch(`${baseUrl}/products/${encodeURIComponent(hubspotProductId)}/archive`, {
    method: 'POST',
    headers: buildServiceHeaders({ 'Content-Type': 'application/json' }, true),
    body: JSON.stringify({ reason: reason ?? 'source_deactivated_in_greenhouse' }),
    cache: 'no-store',
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (response.status === 404) {
    return {
      status: 'endpoint_not_deployed',
      hubspotProductId,
      message:
        'HubSpot integration service does not expose POST /products/:id/archive yet. Trace persisted; retry on next deploy.'
    }
  }

  if (!response.ok) {
    const body = await response.text()

    throw new Error(
      `HubSpot integration service returned ${response.status} for POST /products/${hubspotProductId}/archive: ${body || response.statusText}`
    )
  }

  return (await response.json()) as HubSpotGreenhouseArchiveProductResponse
}

export interface HubSpotGreenhouseReconcileProductsRequest {
  cursor?: string | null
  limit?: number
  includeArchived?: boolean
}

export interface HubSpotGreenhouseReconcileProductItem {
  hubspotProductId: string
  gh_product_code: string | null
  gh_source_kind: string | null
  gh_last_write_at: string | null
  name: string | null
  sku: string | null
  price: number | null
  description: string | null
  isArchived: boolean
}

export interface HubSpotGreenhouseReconcileProductsResponse {
  status: 'ok' | 'endpoint_not_deployed'
  items: HubSpotGreenhouseReconcileProductItem[]
  nextCursor?: string | null
  message?: string
}

export const reconcileHubSpotGreenhouseProducts = async (
  input: HubSpotGreenhouseReconcileProductsRequest = {}
): Promise<HubSpotGreenhouseReconcileProductsResponse> => {
  const { baseUrl, timeoutMs } = getServiceConfig()

  const params = new URLSearchParams()

  if (input.cursor) params.set('cursor', input.cursor)
  if (typeof input.limit === 'number' && input.limit > 0) params.set('limit', String(input.limit))
  if (input.includeArchived) params.set('includeArchived', 'true')

  const query = params.toString() ? `?${params.toString()}` : ''

  const response = await fetch(`${baseUrl}/products/reconcile${query}`, {
    method: 'GET',
    cache: 'no-store',
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (response.status === 404) {
    return {
      status: 'endpoint_not_deployed',
      items: [],
      message:
        'HubSpot integration service does not expose GET /products/reconcile yet. TASK-548 drift detector should treat this as an empty batch.'
    }
  }

  if (!response.ok) {
    const body = await response.text()

    throw new Error(
      `HubSpot integration service returned ${response.status} for GET /products/reconcile: ${body || response.statusText}`
    )
  }

  return (await response.json()) as HubSpotGreenhouseReconcileProductsResponse
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
    headers: buildServiceHeaders({ 'Content-Type': 'application/json' }),
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

// ── Invoice client methods (TASK-524) ──
//
// Mirror of `greenhouse_finance.income` into HubSpot's native `invoice`
// object as a **non-billable** reflection. The endpoint is not live in the
// Cloud Run service yet; `upsertHubSpotGreenhouseInvoice` returns a
// structured `endpoint_not_deployed` result on 404 so the reactive bridge
// records the trace without throwing.

export interface HubSpotGreenhouseInvoiceLineItemPayload {
  description: string
  quantity: number
  unitPrice: number
  discountPercent?: number | null
  isExempt?: boolean | null
}

export interface HubSpotGreenhouseInvoiceAssociations {
  hubspotCompanyId: string | null
  hubspotDealId: string | null
  hubspotContactId?: string | null
}

export interface HubSpotGreenhouseUpsertInvoiceRequest {

  /** Greenhouse-side id; the Cloud Run service uses it as idempotency key. */
  incomeId: string

  /** Present on UPDATE; absent on CREATE. */
  hubspotInvoiceId: string | null
  invoiceNumber: string | null
  invoiceDate: string
  dueDate: string | null
  currency: string
  subtotal: number
  taxAmount: number | null
  totalAmount: number
  totalAmountClp: number | null
  exchangeRateToClp: number | null
  description: string | null
  isBillable: false
  associations: HubSpotGreenhouseInvoiceAssociations
  lineItems: HubSpotGreenhouseInvoiceLineItemPayload[]
}

export interface HubSpotGreenhouseUpsertInvoiceResponse {
  status: 'created' | 'updated' | 'endpoint_not_deployed'
  hubspotInvoiceId: string | null
  invoiceNumber?: string | null
  associations?: {
    hubspotCompanyId?: string | null
    hubspotDealId?: string | null
    hubspotContactId?: string | null
  }
  message?: string
}

export const upsertHubSpotGreenhouseInvoice = async (
  payload: HubSpotGreenhouseUpsertInvoiceRequest
): Promise<HubSpotGreenhouseUpsertInvoiceResponse> => {
  const { baseUrl, timeoutMs } = getServiceConfig()

  const response = await fetch(`${baseUrl}/invoices`, {
    method: 'POST',
    headers: buildServiceHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
    cache: 'no-store',
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(timeoutMs)
  })

  // Graceful degradation: while the Cloud Run service ships the /invoices
  // route in a later deploy, the bridge records `endpoint_not_deployed` so
  // ops can detect the backlog without Sentry noise.
  if (response.status === 404) {
    return {
      status: 'endpoint_not_deployed',
      hubspotInvoiceId: payload.hubspotInvoiceId,
      message: 'HubSpot integration service does not expose /invoices yet. Trace persisted; retry on next deploy.'
    }
  }

  if (!response.ok) {
    const body = await response.text()

    throw new Error(
      `HubSpot integration service returned ${response.status} for POST /invoices: ${body || response.statusText}`
    )
  }

  return (await response.json()) as HubSpotGreenhouseUpsertInvoiceResponse
}

// ── Deals client methods (TASK-539) ──
//
// Creates a deal in HubSpot against an existing company. Same graceful-404
// semantics as the invoice bridge — while the Cloud Run service ships the
// `/deals` POST route, clients record the attempt as `endpoint_not_deployed`
// and retry on the next deploy.

export interface HubSpotGreenhouseCreateDealRequest {

  /** Greenhouse-side idempotency key; the Cloud Run service dedupes on this. */
  idempotencyKey: string
  hubspotCompanyId: string
  dealName: string
  amount?: number | null
  currency?: string | null
  pipelineId?: string | null
  stageId?: string | null
  ownerHubspotUserId?: string | null
  closeDate?: string | null
  businessLineCode?: string | null

  /** Origin marker written as a HubSpot custom property (`gh_deal_origin`). */
  origin: 'greenhouse_quote_builder'

  /** Optional correlation id for cross-service tracing. */
  correlationId?: string

  /** Optional contact id to associate at creation. */
  hubspotContactId?: string | null
}

export interface HubSpotGreenhouseCreateDealResponse {
  status: 'created' | 'endpoint_not_deployed'
  hubspotDealId: string | null
  pipelineUsed?: string | null
  stageUsed?: string | null
  ownerUsed?: string | null
  message?: string
}

export const createHubSpotGreenhouseDeal = async (
  payload: HubSpotGreenhouseCreateDealRequest
): Promise<HubSpotGreenhouseCreateDealResponse> => {
  const { baseUrl, timeoutMs } = getServiceConfig()

  const response = await fetch(`${baseUrl}/deals`, {
    method: 'POST',
    headers: buildServiceHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
    cache: 'no-store',
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (response.status === 404) {
    return {
      status: 'endpoint_not_deployed',
      hubspotDealId: null,
      message:
        'HubSpot integration service does not expose POST /deals yet. Attempt persisted; retry on next deploy.'
    }
  }

  if (!response.ok) {
    const body = await response.text()

    throw new Error(
      `HubSpot integration service returned ${response.status} for POST /deals: ${body || response.statusText}`
    )
  }

  return (await response.json()) as HubSpotGreenhouseCreateDealResponse
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
