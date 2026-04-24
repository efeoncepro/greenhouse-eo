import 'server-only'

import {
  derivePlainDescription,
  sanitizeProductDescriptionHtml
} from '@/lib/commercial/description-sanitizer'
import { sanitizeHubSpotProductPayload } from '@/lib/commercial/hubspot-outbound-guard'
import { loadActorHubSpotOwnerIdentity } from '@/lib/commercial/hubspot-owner-identity'
import {
  CURRENCY_CODES,
  getPricesByCurrency,
  type CurrencyCode
} from '@/lib/commercial/product-catalog-prices'
import {
  getProductCategoryByCode,
  getProductUnitByCode,
  getTaxCategoryByCode,
  resolveHubSpotProductType
} from '@/lib/commercial/product-catalog-references'

import type {
  HubSpotGreenhouseCreateProductRequest,
  HubSpotGreenhouseProductCustomProperties,
  HubSpotGreenhouseUpdateProductRequest,
  HubSpotProductPricesByCurrency,
  HubSpotProductType
} from '@/lib/integrations/hubspot-greenhouse-service'

// ─────────────────────────────────────────────────────────────
// TASK-547 Fase C (v1) → TASK-603 Fase C (v2).
//
// Translates a `greenhouse_commercial.product_catalog` row into the HubSpot
// wire payload consumed by the Cloud Run middleware at
// `services/hubspot_greenhouse_integration/` (POST/PATCH /products with
// `X-Contract-Version: v2`).
//
// v2 additions (TASK-603):
//   - pricesByCurrency: 6 currencies from product_catalog_prices
//   - rich + plain descriptions (sanitized server-side)
//   - productType via source_kind mapping
//   - category/unit/tax_category via ref tables (hubspot_option_value)
//   - commercial owner (email + optional direct hubspotOwnerId)
//   - marketing URL + image URLs
//   - COGS (unblocked by TASK-603 governance)
//   - isRecurring + billing frequency + billing period
//   - pricingModel/productClassification/bundleType (always 'flat'/'standalone'/'none'
//     in Fase 1 — tiered/bundle is out of scope per spec)
//
// Custom properties (gh_*): unchanged from v1; mirrored for drift detection.
// Guard (sanitizeHubSpotProductPayload) still runs as defense-in-depth even
// though COGS is now allowed — blocks margin + cost_breakdown leaks.
// ─────────────────────────────────────────────────────────────

export interface ProductCatalogSyncSnapshot {
  productId: string
  productCode: string
  productName: string
  description: string | null
  defaultUnitPrice: number | null
  defaultCurrency: string
  defaultUnit: string
  isArchived: boolean
  sourceKind: string
  sourceId: string | null
  businessLineCode: string | null
  ghLastWriteAt: string

  // ── TASK-603 v2 fields ───────────────────────────────────────────────
  descriptionRichHtml: string | null
  hubspotProductTypeCode: string | null
  categoryCode: string | null
  unitCode: string | null
  taxCategoryCode: string | null
  hubspotPricingModel: string | null
  hubspotProductClassification: string | null
  hubspotBundleTypeCode: string | null
  isRecurring: boolean
  recurringBillingFrequencyCode: string | null
  recurringBillingPeriodIso: string | null
  commercialOwnerMemberId: string | null
  marketingUrl: string | null
  imageUrls: string[]
}

const buildCustomProperties = (
  snapshot: ProductCatalogSyncSnapshot
): HubSpotGreenhouseProductCustomProperties => ({
  gh_product_code: snapshot.productCode,
  gh_source_kind: snapshot.sourceKind,
  gh_last_write_at: snapshot.ghLastWriteAt,
  gh_archived_by_greenhouse: snapshot.isArchived,
  gh_business_line: snapshot.businessLineCode
})

// ── v2 field builders (extracted for testability + clarity) ─────────────

/**
 * Reads the 6 canonical currencies from product_catalog_prices. Missing
 * currencies are emitted as `null` so the middleware writes `""` to
 * HubSpot — explicit clear, not "don't touch". This ensures
 * Greenhouse-SoT: if we don't have a price in a currency, HubSpot's price
 * in that currency is blanked.
 */
const buildPricesByCurrency = async (
  productId: string
): Promise<HubSpotProductPricesByCurrency> => {
  const prices = await getPricesByCurrency(productId)
  const result: HubSpotProductPricesByCurrency = {}

  for (const code of CURRENCY_CODES) {
    // null propagates as null → middleware writes ""
    result[code as CurrencyCode] = prices[code as CurrencyCode]
  }

  return result
}

/**
 * Resolves the snapshot's `commercialOwnerMemberId` to a HubSpot owner email
 * + direct owner id (if the member already has a bound `hubspot_owner_id`).
 * Returns `{ email: null, hubspotOwnerId: null }` when no member bound — the
 * middleware then omits `hubspot_owner_id` from the properties dict.
 */
const resolveOwnerBinding = async (
  memberId: string | null
): Promise<{ email: string | null; hubspotOwnerId: string | null }> => {
  if (!memberId) return { email: null, hubspotOwnerId: null }

  const identity = await loadActorHubSpotOwnerIdentity({ memberId })
  const email = identity.candidateEmails[0] ?? null

  return { email, hubspotOwnerId: identity.hubspotOwnerId ?? null }
}

/**
 * Maps Greenhouse ref-table codes to HubSpot's `hubspot_option_value`
 * strings. If the code is unknown (or null), the field is omitted entirely
 * from the payload (the middleware won't write the HS property).
 */
const resolveHubSpotOptionValue = async (
  kind: 'category' | 'unit' | 'tax',
  code: string | null
): Promise<string | null> => {
  if (!code) return null

  switch (kind) {
    case 'category': {
      const row = await getProductCategoryByCode(code)

      return row?.hubspotOptionValue ?? null
    }

    case 'unit': {
      const row = await getProductUnitByCode(code)

      return row?.hubspotOptionValue ?? null
    }

    case 'tax': {
      const row = await getTaxCategoryByCode(code)

      return row?.hubspotOptionValue ?? null
    }
  }
}

/**
 * Resolves the HubSpot product type from the snapshot's source kind.
 * If the snapshot has an explicit `hubspotProductTypeCode` (operator set it
 * via admin UI), that wins; otherwise fall back to source_kind mapping.
 * Default is `'service'` (most conservative for agency catalog).
 */
const resolveProductType = async (
  snapshot: ProductCatalogSyncSnapshot
): Promise<HubSpotProductType> => {
  if (snapshot.hubspotProductTypeCode) {
    const upper = snapshot.hubspotProductTypeCode.trim().toLowerCase()

    if (upper === 'service' || upper === 'inventory' || upper === 'non_inventory') {
      return upper as HubSpotProductType
    }
  }

  const mapped = await resolveHubSpotProductType(snapshot.sourceKind)

  return mapped as HubSpotProductType
}

/**
 * Shared v2 payload builder — produces the body the middleware receives
 * from both POST (create) and PATCH (update). Create and update diverge
 * only on whether `name`/`sku` are required vs optional, which happens
 * at the type boundary (no runtime branching needed).
 */
const buildV2Payload = async (snapshot: ProductCatalogSyncSnapshot) => {
  const [richHtml, pricesByCurrency, owner, categoryOption, unitOption, taxOption, productType] =
    await Promise.all([
      // Sanitize in-band (cheap, sync, idempotent).
      Promise.resolve(sanitizeProductDescriptionHtml(snapshot.descriptionRichHtml)),
      buildPricesByCurrency(snapshot.productId),
      resolveOwnerBinding(snapshot.commercialOwnerMemberId),
      resolveHubSpotOptionValue('category', snapshot.categoryCode),
      resolveHubSpotOptionValue('unit', snapshot.unitCode),
      resolveHubSpotOptionValue('tax', snapshot.taxCategoryCode),
      resolveProductType(snapshot)
    ])

  // Plain description: prefer the operator-set plain field; fall back to
  // derived from rich HTML so both stay consistent. Empty string is
  // treated as "operator explicitly cleared" — we send "" to HubSpot.
  const plainDescription = snapshot.description ?? derivePlainDescription(richHtml)

  return {
    description: plainDescription,
    descriptionRichHtml: richHtml,
    pricesByCurrency,
    productType,
    pricingModel: snapshot.hubspotPricingModel ?? 'flat',
    productClassification: snapshot.hubspotProductClassification ?? 'standalone',
    bundleType: snapshot.hubspotBundleTypeCode ?? 'none',
    categoryCode: categoryOption,
    unitCode: unitOption,
    taxCategoryCode: taxOption,
    isRecurring: snapshot.isRecurring,
    recurringBillingFrequency: snapshot.recurringBillingFrequencyCode,
    recurringBillingPeriodCode: snapshot.recurringBillingPeriodIso,
    commercialOwnerEmail: owner.email,
    hubspotOwnerId: owner.hubspotOwnerId,
    marketingUrl: snapshot.marketingUrl,
    imageUrls: snapshot.imageUrls,
    customProperties: buildCustomProperties(snapshot)
  }
}

export const adaptProductCatalogToHubSpotCreatePayload = async (
  snapshot: ProductCatalogSyncSnapshot
): Promise<HubSpotGreenhouseCreateProductRequest> => {
  const v2 = await buildV2Payload(snapshot)

  const raw: HubSpotGreenhouseCreateProductRequest = {
    name: snapshot.productName,
    sku: snapshot.productCode,
    unitPrice: snapshot.defaultUnitPrice ?? undefined,
    createdBy: 'task-603-outbound',
    ...v2
  }

  // Defense-in-depth: strip margin + cost_breakdown leaks even though
  // the snapshot shape doesn't include them. Protects against future
  // callers extending the snapshot without remembering the guard.
  const safe = sanitizeHubSpotProductPayload(raw as unknown as Record<string, unknown>)

  return safe as unknown as HubSpotGreenhouseCreateProductRequest
}

export const adaptProductCatalogToHubSpotUpdatePayload = async (
  snapshot: ProductCatalogSyncSnapshot
): Promise<HubSpotGreenhouseUpdateProductRequest> => {
  const v2 = await buildV2Payload(snapshot)

  const raw: HubSpotGreenhouseUpdateProductRequest = {
    name: snapshot.productName,
    sku: snapshot.productCode,
    unitPrice: snapshot.defaultUnitPrice,
    isArchived: snapshot.isArchived,
    ...v2
  }

  const safe = sanitizeHubSpotProductPayload(raw as unknown as Record<string, unknown>)

  return safe as unknown as HubSpotGreenhouseUpdateProductRequest
}

// Exposed for tests — lets callers assert the custom property shape in
// isolation without mocking the Cloud Run client.
export const __buildCustomProperties = buildCustomProperties

// Exposed for tests — lets callers assert the v2 payload construction
// deterministically.
export const __buildV2Payload = buildV2Payload
