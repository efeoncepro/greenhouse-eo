import 'server-only'

import { derivePlainDescription } from '@/lib/commercial/description-sanitizer'
import { loadHubSpotOwnerBindingByOwnerId } from '@/lib/commercial/hubspot-owner-identity'
import {
  CURRENCY_CODES,
  type CurrencyCode
} from '@/lib/commercial/product-catalog-prices'
import {
  getProductCategoryByHubspotValue,
  getProductUnitByHubspotValue,
  getTaxCategoryByHubspotValue
} from '@/lib/commercial/product-catalog-references'
import { query } from '@/lib/db'

import type { HubSpotGreenhouseProductProfile } from '@/lib/integrations/hubspot-greenhouse-service'

// ─────────────────────────────────────────────────────────────
// TASK-604 — Drift detector v2.
//
// Compares HubSpot's v2 profile against the Greenhouse product_catalog row
// field-by-field and produces a classified drift report. Three levels:
//
//   • pending_overwrite — HS has a value that differs from GH-SoT. The
//     next outbound push will resolve it automatically. Log informational,
//     no alert needed. Covers: prices, description (plain + rich), product
//     type / classification / pricing model / bundle type, marketing URL,
//     image URLs, category/unit/tax when the value IS in the GH ref table
//     but doesn't match the current GH-assigned code.
//
//   • manual_drift — HS has a value that GH could accept but isn't in the
//     ref table yet. Typically means an operator in HS picked an option
//     value that Greenhouse hasn't enumerated. Requires human review before
//     auto-fix (add to ref table OR override HS). Covers: category / unit /
//     tax with unknown `hubspot_option_value`.
//
//   • error — HS has a value that cannot be resolved or is structurally
//     invalid. Alert-worthy. Covers: owner with no Greenhouse member
//     binding (breaks the bridge) and any malformed payload we don't know
//     how to classify.
//
// Drift reports are persisted to `greenhouse_sync.source_sync_runs` with
// `source_system = 'product_drift_v2'`. Admin UI (TASK-605) reads them from
// there; reconcile scheduler (TASK-605) drives the cadence.
//
// This module does NOT mutate `product_catalog`. It is read-only for
// hubspot data + product_catalog + product_catalog_prices, and write-only
// against `source_sync_runs`. That isolation is what lets TASK-605 wire a
// reconcile scheduler without fear of double-writes.
// ─────────────────────────────────────────────────────────────

export type DriftClassification = 'pending_overwrite' | 'manual_drift' | 'error'

export interface DriftedField {
  name: string
  hsValue: unknown
  ghValue: unknown
  classification: DriftClassification

  /** Optional human-readable explanation for `error` or `manual_drift`. */
  reason?: string
}

export interface DriftReport {
  productId: string
  hubspotProductId: string | null
  scannedAt: string
  driftedFields: DriftedField[]
}

export interface ProductCatalogDriftSnapshot extends Record<string, unknown> {
  product_id: string
  hubspot_product_id: string | null
  product_name: string | null
  description: string | null
  description_rich_html: string | null
  hubspot_product_type_code: string | null
  hubspot_pricing_model: string | null
  hubspot_product_classification: string | null
  hubspot_bundle_type_code: string | null
  category_code: string | null
  unit_code: string | null
  tax_category_code: string | null
  marketing_url: string | null
  image_urls: string[] | null
  commercial_owner_member_id: string | null
  is_archived: boolean
}

interface ProductPriceRow extends Record<string, unknown> {
  currency_code: string
  unit_price: string | number
}

// ── Field comparators ──────────────────────────────────────────────────

const toTrimmedString = (value: unknown): string => {
  if (value === null || value === undefined) return ''

  return String(value).trim()
}

const sameText = (a: unknown, b: unknown): boolean =>
  toTrimmedString(a).toLowerCase() === toTrimmedString(b).toLowerCase()

const sameNumber = (a: unknown, b: unknown, epsilon = 0.005): boolean => {
  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b
  }

  const na = typeof a === 'number' ? a : Number(a)
  const nb = typeof b === 'number' ? b : Number(b)

  if (!Number.isFinite(na) || !Number.isFinite(nb)) return false

  return Math.abs(na - nb) < epsilon
}

const sameStringArray = (a: string[] | null | undefined, b: string[] | null | undefined): boolean => {
  const na = a ?? []
  const nb = b ?? []

  if (na.length !== nb.length) return false

  return na.every((value, index) => value === nb[index])
}

// ── Individual drift checks ────────────────────────────────────────────

const detectPriceDrift = async (
  productId: string,
  profile: HubSpotGreenhouseProductProfile
): Promise<DriftedField[]> => {
  if (!profile.pricesByCurrency) return []

  const rows = await query<ProductPriceRow>(
    `SELECT currency_code, unit_price
       FROM greenhouse_commercial.product_catalog_prices
      WHERE product_id = $1`,
    [productId]
  )

  const ghPrices: Record<string, number | null> = {}

  for (const row of rows) {
    const numeric = typeof row.unit_price === 'number' ? row.unit_price : Number(row.unit_price)

    ghPrices[row.currency_code] = Number.isFinite(numeric) ? numeric : null
  }

  const drifts: DriftedField[] = []

  for (const code of CURRENCY_CODES) {
    const hs = profile.pricesByCurrency[code as CurrencyCode] ?? null
    const gh = ghPrices[code] ?? null

    if (!sameNumber(hs, gh)) {
      drifts.push({
        name: `price_${code.toLowerCase()}`,
        hsValue: hs,
        ghValue: gh,
        classification: 'pending_overwrite'
      })
    }
  }

  return drifts
}

const detectOwnerDrift = async (
  profile: HubSpotGreenhouseProductProfile,
  ghRow: ProductCatalogDriftSnapshot,
  loadBinding: typeof loadHubSpotOwnerBindingByOwnerId = loadHubSpotOwnerBindingByOwnerId
): Promise<DriftedField | null> => {
  const ownerHubspotId = profile.owner?.hubspotOwnerId

  if (!ownerHubspotId) return null

  const binding = await loadBinding(ownerHubspotId)

  if (!binding?.memberId) {
    return {
      name: 'commercial_owner',
      hsValue: ownerHubspotId,
      ghValue: ghRow.commercial_owner_member_id,
      classification: 'error',
      reason: `HubSpot owner ${ownerHubspotId} has no member binding in greenhouse_core.members`
    }
  }

  if (binding.memberId === ghRow.commercial_owner_member_id) return null

  return {
    name: 'commercial_owner',
    hsValue: binding.memberId,
    ghValue: ghRow.commercial_owner_member_id,
    classification: 'pending_overwrite'
  }
}

/**
 * Resolves a HubSpot option value to a Greenhouse ref code. Classifies
 * drift as `manual_drift` if the option value isn't enumerated, or
 * `pending_overwrite` if it resolves but differs from GH's current code.
 */
const detectRefDrift = async (
  fieldName: string,
  hsOptionValue: string | null | undefined,
  ghCurrentCode: string | null,
  resolver: (value: string) => Promise<{ code: string } | null>
): Promise<DriftedField | null> => {
  const trimmed = toTrimmedString(hsOptionValue)

  if (!trimmed) return null

  const resolved = await resolver(trimmed)

  if (!resolved) {
    return {
      name: fieldName,
      hsValue: trimmed,
      ghValue: ghCurrentCode,
      classification: 'manual_drift',
      reason: `HubSpot option value "${trimmed}" is not registered in the ${fieldName} ref table`
    }
  }

  if (resolved.code === ghCurrentCode) return null

  return {
    name: fieldName,
    hsValue: resolved.code,
    ghValue: ghCurrentCode,
    classification: 'pending_overwrite'
  }
}

// ── Public API ─────────────────────────────────────────────────────────

export interface DetectProductDriftV2Options {

  /** Test hook — overrides the owner bridge loader. */
  loadOwnerBinding?: typeof loadHubSpotOwnerBindingByOwnerId
}

export const detectProductDriftV2 = async (
  productId: string,
  profile: HubSpotGreenhouseProductProfile,
  ghRow: ProductCatalogDriftSnapshot,
  options: DetectProductDriftV2Options = {}
): Promise<DriftReport> => {
  const drifts: DriftedField[] = []

  // ── 1. Prices (always pending_overwrite) ──
  drifts.push(...(await detectPriceDrift(productId, profile)))

  // ── 2. Owner (error vs pending_overwrite) ──
  const ownerDrift = await detectOwnerDrift(profile, ghRow, options.loadOwnerBinding)

  if (ownerDrift) drifts.push(ownerDrift)

  // ── 3. Classification tuple (GH-SoT, pending_overwrite on mismatch) ──
  if (profile.productType && !sameText(profile.productType, ghRow.hubspot_product_type_code)) {
    drifts.push({
      name: 'hubspot_product_type_code',
      hsValue: profile.productType,
      ghValue: ghRow.hubspot_product_type_code,
      classification: 'pending_overwrite'
    })
  }

  if (profile.pricingModel && !sameText(profile.pricingModel, ghRow.hubspot_pricing_model)) {
    drifts.push({
      name: 'hubspot_pricing_model',
      hsValue: profile.pricingModel,
      ghValue: ghRow.hubspot_pricing_model,
      classification: 'pending_overwrite'
    })
  }

  if (profile.productClassification && !sameText(profile.productClassification, ghRow.hubspot_product_classification)) {
    drifts.push({
      name: 'hubspot_product_classification',
      hsValue: profile.productClassification,
      ghValue: ghRow.hubspot_product_classification,
      classification: 'pending_overwrite'
    })
  }

  if (profile.bundleType && !sameText(profile.bundleType, ghRow.hubspot_bundle_type_code)) {
    drifts.push({
      name: 'hubspot_bundle_type_code',
      hsValue: profile.bundleType,
      ghValue: ghRow.hubspot_bundle_type_code,
      classification: 'pending_overwrite'
    })
  }

  // ── 4. Ref tables (manual_drift if option unknown, else pending_overwrite) ──
  const categoryDrift = await detectRefDrift(
    'category_code',
    profile.categoryHubspotValue,
    ghRow.category_code,
    async value => {
      const row = await getProductCategoryByHubspotValue(value)

      
return row ? { code: row.code } : null
    }
  )

  if (categoryDrift) drifts.push(categoryDrift)

  const unitDrift = await detectRefDrift(
    'unit_code',
    profile.unitHubspotValue,
    ghRow.unit_code,
    async value => {
      const row = await getProductUnitByHubspotValue(value)

      
return row ? { code: row.code } : null
    }
  )

  if (unitDrift) drifts.push(unitDrift)

  const taxDrift = await detectRefDrift(
    'tax_category_code',
    profile.taxCategoryHubspotValue,
    ghRow.tax_category_code,
    async value => {
      const row = await getTaxCategoryByHubspotValue(value)

      
return row ? { code: row.code } : null
    }
  )

  if (taxDrift) drifts.push(taxDrift)

  // ── 5. Rich / plain description (pending_overwrite) ──
  if (profile.descriptionRichHtml && !sameText(profile.descriptionRichHtml, ghRow.description_rich_html)) {
    drifts.push({
      name: 'description_rich_html',
      hsValue: profile.descriptionRichHtml,
      ghValue: ghRow.description_rich_html,
      classification: 'pending_overwrite'
    })
  }

  // Compare plain description against the GH-derived plain (HS may send
  // a plain that diverges from GH's canonical derivation).
  if (profile.metadata.description !== null && profile.metadata.description !== undefined) {
    const ghPlain = ghRow.description ?? derivePlainDescription(ghRow.description_rich_html) ?? ''

    if (!sameText(profile.metadata.description, ghPlain)) {
      drifts.push({
        name: 'description',
        hsValue: profile.metadata.description,
        ghValue: ghPlain,
        classification: 'pending_overwrite'
      })
    }
  }

  // ── 6. Marketing URL + images (pending_overwrite) ──
  if (profile.marketingUrl && !sameText(profile.marketingUrl, ghRow.marketing_url)) {
    drifts.push({
      name: 'marketing_url',
      hsValue: profile.marketingUrl,
      ghValue: ghRow.marketing_url,
      classification: 'pending_overwrite'
    })
  }

  if (profile.imageUrls && !sameStringArray(profile.imageUrls, ghRow.image_urls)) {
    drifts.push({
      name: 'image_urls',
      hsValue: profile.imageUrls,
      ghValue: ghRow.image_urls,
      classification: 'pending_overwrite'
    })
  }

  return {
    productId,
    hubspotProductId: ghRow.hubspot_product_id,
    scannedAt: new Date().toISOString(),
    driftedFields: drifts
  }
}

// ── Persistence ────────────────────────────────────────────────────────

/**
 * Writes the drift report to `source_sync_runs` so admin UI + reconcile
 * scheduler (TASK-605) can consume it. Batched reports share the same
 * `sync_run_id` if the caller provides one; otherwise each call gets a
 * unique id.
 */
export interface PersistDriftReportOptions {
  syncRunId?: string
  triggeredBy?: string
}

export const persistDriftReport = async (
  report: DriftReport,
  options: PersistDriftReportOptions = {}
): Promise<void> => {
  const syncRunId =
    options.syncRunId ??
    `drift-v2-${report.productId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  const notes = JSON.stringify({
    productId: report.productId,
    hubspotProductId: report.hubspotProductId,
    scannedAt: report.scannedAt,
    driftedFields: report.driftedFields
  })

  await query(
    `INSERT INTO greenhouse_sync.source_sync_runs (
        sync_run_id, source_system, source_object_type, sync_mode, status,
        records_read, records_written_raw, records_projected_postgres,
        triggered_by, notes, started_at, finished_at
     ) VALUES (
        $1, 'product_drift_v2', 'product', 'reactive',
        $2, 1, 0, 0, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
     )
     ON CONFLICT (sync_run_id) DO UPDATE SET
        notes = EXCLUDED.notes,
        finished_at = CURRENT_TIMESTAMP`,
    [
      syncRunId,
      report.driftedFields.length === 0 ? 'no_drift' : 'drift_detected',
      options.triggeredBy ?? 'sync-hubspot-products',
      notes.slice(0, 8000)
    ]
  )
}
