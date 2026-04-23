import 'server-only'

import { getOperatingEntityIdentity } from '@/lib/account-360/organization-identity'
import { query } from '@/lib/db'
import { parsePersistedTaxSnapshot } from '@/lib/finance/pricing/quotation-tax-snapshot'
import { getHubSpotGreenhouseTaxRates } from '@/lib/integrations/hubspot-greenhouse-service'

export interface HubSpotQuoteSender {
  firstName: string
  lastName: string
  email: string
  companyName: string
}

export interface HubSpotQuoteWriteLineItem {
  hubspotLineItemId?: string
  hubspotProductId?: string
  productId?: string
  name: string
  description?: string
  quantity: number
  unitPrice: number
  discount?: number | null
  taxAmount?: number | null
  productCode?: string | null
  legacySku?: string | null
  billingFrequency?: string | null
  billingStartDate?: string | null
  taxRate?: number | null
  taxRateGroupId?: string | null
  currency?: string | null
}

export interface HubSpotQuoteSyncPayload {
  quotationId: string
  organizationId: string
  contactIdentityProfileId: string | null
  dealId: string
  title: string
  expirationDate: string
  currency: string
  status: string
  sender: HubSpotQuoteSender
  lineItems: HubSpotQuoteWriteLineItem[]
}

type QuoteSyncRow = {
  quotation_id: string
  quotation_number: string
  organization_id: string | null
  contact_identity_profile_id: string | null
  hubspot_deal_id: string | null
  hubspot_quote_id: string | null
  description: string | null
  valid_until: string | Date | null
  quote_date: string | Date | null
  issued_at: string | Date | null
  issued_by: string | null
  created_by: string | null
  currency: string | null
  billing_frequency: string | null
  current_version: number | null
  tax_rate_snapshot: string | number | null
  tax_snapshot_json: unknown | null
}

type QuoteLineSyncRow = {
  line_item_id: string
  product_id: string | null
  hubspot_line_item_id: string | null
  hubspot_product_id: string | null
  label: string
  description: string | null
  quantity: string | number | null
  unit_price: string | number | null
  discount_amount: string | number | null
  recurrence_type: string | null
  line_currency: string | null
  tax_amount_snapshot: string | number | null
  tax_rate_snapshot: string | number | null
  tax_snapshot_json: unknown | null
  product_code: string | null
  legacy_sku: string | null
  service_sku: string | null
}

type SenderIdentityRow = {
  resolved_email: string | null
  resolved_display_name: string | null
  full_name: string | null
}

const DEFAULT_PUBLISH_STATUS = 'APPROVAL_NOT_NEEDED'

const isTruthy = (value: string | null | undefined) =>
  typeof value === 'string' && value.trim().length > 0

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const toDateString = (value: string | Date | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string') return value.slice(0, 10)

  return null
}

const computeFallbackExpirationDate = (quoteDate?: string | Date | null) => {
  const baseDate = quoteDate ? new Date(toDateString(quoteDate) ?? Date.now()) : new Date()

  baseDate.setUTCDate(baseDate.getUTCDate() + 30)

  return baseDate.toISOString().slice(0, 10)
}

const splitNameParts = (fullName: string, email: string) => {
  const normalized = fullName.trim()

  if (!normalized) {
    const localPart = email.split('@')[0]?.trim() || 'Greenhouse'

    return { firstName: localPart, lastName: 'Team' }
  }

  const parts = normalized.split(/\s+/)

  return {
    firstName: parts[0] || 'Greenhouse',
    lastName: parts.slice(1).join(' ') || 'Team'
  }
}

const normalizeTaxRateForMatch = (value: unknown) => {
  const numeric = toNumber(value)

  if (numeric === null) return null

  return numeric <= 1 ? numeric * 100 : numeric
}

const matchesTaxRate = (left: unknown, right: unknown) => {
  const leftRate = normalizeTaxRateForMatch(left)
  const rightRate = normalizeTaxRateForMatch(right)

  if (leftRate === null || rightRate === null) return false

  return Math.abs(leftRate - rightRate) < 0.0001
}

const resolveRecurringBillingFrequency = (
  lineRecurrenceType: string | null,
  quoteBillingFrequency: string | null
) => {
  if (lineRecurrenceType === 'one_time') return null

  if (lineRecurrenceType === 'recurring') {
    if (!quoteBillingFrequency || quoteBillingFrequency === 'one_time') {
      throw new Error('billing_frequency_missing')
    }

    return quoteBillingFrequency
  }

  if (!quoteBillingFrequency || quoteBillingFrequency === 'one_time') return null

  return quoteBillingFrequency
}

const resolveBillingStartDate = (
  billingFrequency: string | null,
  quote: Pick<QuoteSyncRow, 'issued_at' | 'quote_date'>
) => {
  if (!billingFrequency) return null

  return (
    toDateString(quote.issued_at)
    || toDateString(quote.quote_date)
    || new Date().toISOString().slice(0, 10)
  )
}

const resolveSenderIdentity = async (candidateId: string): Promise<SenderIdentityRow | null> => {
  const rows = await query<SenderIdentityRow>(
    `SELECT resolved_email, resolved_display_name, full_name
       FROM greenhouse_serving.person_360
      WHERE user_id = $1
         OR member_id = $1
         OR identity_profile_id = $1
         OR eo_id = $1
      LIMIT 1`,
    [candidateId]
  )

  return rows[0] ?? null
}

export const resolveHubSpotQuoteSender = async ({
  actorId,
  issuedBy,
  createdBy
}: {
  actorId?: string | null
  issuedBy?: string | null
  createdBy?: string | null
}): Promise<HubSpotQuoteSender> => {
  const operatingEntity = await getOperatingEntityIdentity()

  if (!operatingEntity?.legalName) {
    throw new Error('issuing_company_missing')
  }

  const candidates = [actorId, issuedBy, createdBy]
    .filter(isTruthy)
    .map(value => value!.trim())

  for (const candidateId of candidates) {
    const identity = await resolveSenderIdentity(candidateId)

    if (!identity?.resolved_email) continue

    const nameSource =
      identity.resolved_display_name?.trim()
      || identity.full_name?.trim()
      || identity.resolved_email.trim()

    const name = splitNameParts(nameSource, identity.resolved_email)

    return {
      firstName: name.firstName,
      lastName: name.lastName,
      email: identity.resolved_email.trim(),
      companyName: operatingEntity.legalName
    }
  }

  throw new Error('sender_missing')
}

const resolveTaxRateGroupIds = async (rows: QuoteLineSyncRow[]) => {
  const taxableRates = new Set<number>()

  rows.forEach(row => {
    const snapshot = parsePersistedTaxSnapshot(row.tax_snapshot_json)

    const rate = snapshot?.kind === 'vat_output'
      ? normalizeTaxRateForMatch(snapshot.rate)
      : normalizeTaxRateForMatch(row.tax_rate_snapshot)

    if (rate !== null) {
      taxableRates.add(rate)
    }
  })

  if (taxableRates.size === 0) {
    return new Map<number, string>()
  }

  const response = await getHubSpotGreenhouseTaxRates({ active: true })
  const mapping = new Map<number, string>()

  for (const targetRate of taxableRates) {
    const match = response.taxRates.find(taxRate => taxRate.isActive && matchesTaxRate(taxRate.rate, targetRate))

    if (!match?.id) {
      throw new Error(`tax_rate_group_missing:${targetRate}`)
    }

    mapping.set(targetRate, match.id)
  }

  return mapping
}

const resolveLineTaxMetadata = (
  row: QuoteLineSyncRow,
  taxRateGroupIds: Map<number, string>
) => {
  const snapshot = parsePersistedTaxSnapshot(row.tax_snapshot_json)

  const normalizedRate =
    snapshot?.kind === 'vat_output'
      ? normalizeTaxRateForMatch(snapshot.rate)
      : normalizeTaxRateForMatch(row.tax_rate_snapshot)

  if (normalizedRate === null) {
    return {
      taxRate: null,
      taxRateGroupId: null
    }
  }

  return {
    taxRate: normalizedRate,
    taxRateGroupId: taxRateGroupIds.get(normalizedRate) ?? null
  }
}

export const resolveHubSpotQuoteSyncPayload = async ({
  quotationId,
  actorId
}: {
  quotationId: string
  actorId?: string | null
}): Promise<HubSpotQuoteSyncPayload> => {
  const quoteRows = await query<QuoteSyncRow>(
    `SELECT quotation_id,
            quotation_number,
            organization_id,
            contact_identity_profile_id,
            hubspot_deal_id,
            hubspot_quote_id,
            description,
            valid_until,
            quote_date,
            issued_at,
            issued_by,
            created_by,
            currency,
            billing_frequency,
            current_version,
            tax_rate_snapshot,
            tax_snapshot_json
       FROM greenhouse_commercial.quotations
      WHERE quotation_id = $1
      LIMIT 1`,
    [quotationId]
  )

  const quote = quoteRows[0]

  if (!quote) {
    throw new Error(`Canonical quotation not found: ${quotationId}`)
  }

  if (!quote.organization_id) {
    throw new Error('no_organization_id')
  }

  if (!quote.hubspot_deal_id) {
    throw new Error('no_hubspot_deal_id')
  }

  if (!quote.current_version) {
    throw new Error('missing_current_version')
  }

  const lineRows = await query<QuoteLineSyncRow>(
    `SELECT qli.line_item_id,
            qli.product_id,
            qli.hubspot_line_item_id,
            qli.hubspot_product_id,
            qli.label,
            qli.description,
            qli.quantity,
            qli.unit_price,
            qli.discount_amount,
            qli.recurrence_type,
            qli.currency AS line_currency,
            qli.tax_amount_snapshot,
            COALESCE(qli.tax_rate_snapshot, q.tax_rate_snapshot) AS tax_rate_snapshot,
            COALESCE(qli.tax_snapshot_json, q.tax_snapshot_json) AS tax_snapshot_json,
            pc.product_code,
            pc.legacy_sku,
            qli.service_sku
       FROM greenhouse_commercial.quotation_line_items qli
       JOIN greenhouse_commercial.quotations q
         ON q.quotation_id = qli.quotation_id
       LEFT JOIN greenhouse_commercial.product_catalog pc
         ON pc.product_id = qli.product_id
      WHERE qli.quotation_id = $1
        AND qli.version_number = $2
      ORDER BY qli.sort_order ASC, qli.created_at ASC`,
    [quotationId, quote.current_version]
  )

  if (lineRows.length === 0) {
    throw new Error('quote_line_items_missing')
  }

  const sender = await resolveHubSpotQuoteSender({
    actorId,
    issuedBy: quote.issued_by,
    createdBy: quote.created_by
  })

  const taxRateGroupIds = await resolveTaxRateGroupIds(lineRows)

  const lineItems = lineRows.map(row => {
    const productCode = row.product_code?.trim() || row.service_sku?.trim() || null

    if ((row.product_id || productCode) && !row.hubspot_product_id) {
      throw new Error(`catalog_binding_missing:${row.line_item_id}`)
    }

    const billingFrequency = resolveRecurringBillingFrequency(
      row.recurrence_type,
      quote.billing_frequency
    )

    const billingStartDate = resolveBillingStartDate(billingFrequency, quote)
    const taxMetadata = resolveLineTaxMetadata(row, taxRateGroupIds)

    return {
      hubspotLineItemId: row.hubspot_line_item_id ?? undefined,
      hubspotProductId: row.hubspot_product_id ?? undefined,
      productId: row.product_id ?? undefined,
      name: row.label || 'Line item',
      description: row.description || undefined,
      quantity: toNumber(row.quantity) || 1,
      unitPrice: toNumber(row.unit_price) || 0,
      discount: toNumber(row.discount_amount),
      taxAmount: toNumber(row.tax_amount_snapshot),
      productCode,
      legacySku: row.legacy_sku?.trim() || null,
      billingFrequency,
      billingStartDate,
      taxRate: taxMetadata.taxRate,
      taxRateGroupId: taxMetadata.taxRateGroupId,
      currency: row.line_currency?.trim() || quote.currency || 'CLP'
    } satisfies HubSpotQuoteWriteLineItem
  })

  return {
    quotationId,
    organizationId: quote.organization_id,
    contactIdentityProfileId: quote.contact_identity_profile_id,
    dealId: quote.hubspot_deal_id,
    title: quote.description?.trim() || quote.quotation_number,
    expirationDate:
      toDateString(quote.valid_until)
      || computeFallbackExpirationDate(quote.quote_date),
    currency: quote.currency?.trim() || 'CLP',
    status: DEFAULT_PUBLISH_STATUS,
    sender,
    lineItems
  }
}
