import 'server-only'

import {
  getAllPrices,
  type ProductPrice
} from '@/lib/commercial/product-catalog-prices'
import {
  listProductCategories,
  listProductUnits,
  listSourceKindMappings,
  listTaxCategories,
  type ProductCategory,
  type ProductUnit,
  type SourceKindMapping,
  type TaxCategory
} from '@/lib/commercial/product-catalog-references'
import { query } from '@/lib/db'

// ─────────────────────────────────────────────────────────────
// TASK-605 Fase E — Detail-page server loader.
// ─────────────────────────────────────────────────────────────

interface DetailRow extends Record<string, unknown> {
  product_id: string
  hubspot_product_id: string | null
  product_code: string
  product_name: string
  description: string | null
  description_rich_html: string | null
  product_type: string
  hubspot_product_type_code: string | null
  hubspot_pricing_model: string | null
  hubspot_product_classification: string | null
  hubspot_bundle_type_code: string | null
  category_code: string | null
  unit_code: string | null
  tax_category_code: string | null
  is_recurring: boolean | null
  recurring_billing_period_iso: string | null
  recurring_billing_frequency_code: string | null
  commercial_owner_member_id: string | null
  commercial_owner_assigned_at: string | null
  owner_gh_authoritative: boolean | null
  marketing_url: string | null
  image_urls: string[] | null
  business_line_code: string | null
  source_kind: string | null
  source_id: string | null
  is_archived: boolean
  hubspot_sync_status: string
  last_outbound_sync_at: string | null
  gh_last_write_at: string | null
  updated_at: string | null
}

interface DriftRow extends Record<string, unknown> {
  notes: string | null
  finished_at: string | Date | null
}

interface OwnerRow extends Record<string, unknown> {
  member_id: string
  email: string | null
  full_name: string | null
}

export interface ProductCatalogDetailData {
  product: {
    productId: string
    hubspotProductId: string | null
    productCode: string
    productName: string
    description: string | null
    descriptionRichHtml: string | null
    productType: string
    hubspotProductTypeCode: string | null
    hubspotPricingModel: string | null
    hubspotProductClassification: string | null
    hubspotBundleTypeCode: string | null
    categoryCode: string | null
    unitCode: string | null
    taxCategoryCode: string | null
    isRecurring: boolean
    recurringBillingPeriodIso: string | null
    recurringBillingFrequencyCode: string | null
    commercialOwnerMemberId: string | null
    commercialOwnerAssignedAt: string | null
    ownerGhAuthoritative: boolean
    marketingUrl: string | null
    imageUrls: string[]
    businessLineCode: string | null
    sourceKind: string | null
    sourceId: string | null
    isArchived: boolean
    syncStatus: string
    lastOutboundSyncAt: string | null
    ghLastWriteAt: string | null
    updatedAt: string | null
  }
  prices: ProductPrice[]
  owner: { memberId: string; email: string | null; displayName: string | null } | null
  drift: { scannedAt?: string; driftedFields?: Array<{ name: string; classification: string; reason?: string }> } | null
  refOptions: {
    categories: ProductCategory[]
    units: ProductUnit[]
    taxCategories: TaxCategory[]
    sourceKindMappings: SourceKindMapping[]
  }
}

export const getProductCatalogDetailData = async (
  productId: string
): Promise<ProductCatalogDetailData | null> => {
  const rows = await query<DetailRow>(
    `SELECT product_id, hubspot_product_id, product_code, product_name,
            description, description_rich_html, product_type,
            hubspot_product_type_code, hubspot_pricing_model,
            hubspot_product_classification, hubspot_bundle_type_code,
            category_code, unit_code, tax_category_code,
            is_recurring, recurring_billing_period_iso, recurring_billing_frequency_code,
            commercial_owner_member_id,
            commercial_owner_assigned_at::text AS commercial_owner_assigned_at,
            owner_gh_authoritative, marketing_url, image_urls,
            business_line_code, source_kind, source_id, is_archived,
            hubspot_sync_status,
            last_outbound_sync_at::text AS last_outbound_sync_at,
            gh_last_write_at::text AS gh_last_write_at,
            updated_at::text AS updated_at
       FROM greenhouse_commercial.product_catalog
      WHERE product_id = $1
      LIMIT 1`,
    [productId]
  )

  const row = rows[0]

  if (!row) return null

  const prices = await getAllPrices(row.product_id)

  const driftRows = await query<DriftRow>(
    `SELECT notes, finished_at
       FROM greenhouse_sync.source_sync_runs
      WHERE source_system = 'product_drift_v2'
        AND (notes::jsonb ->> 'productId') = $1
      ORDER BY finished_at DESC
      LIMIT 1`,
    [row.product_id]
  )

  let drift: ProductCatalogDetailData['drift'] = null

  if (driftRows[0]?.notes) {
    try {
      const parsed = JSON.parse(driftRows[0].notes) as ProductCatalogDetailData['drift']

      drift = parsed
    } catch {
      drift = null
    }
  }

  let owner: ProductCatalogDetailData['owner'] = null

  if (row.commercial_owner_member_id) {
    const ownerRows = await query<OwnerRow>(
      `SELECT m.member_id,
              p360.primary_email AS email,
              COALESCE(p360.full_name, m.member_id) AS full_name
         FROM greenhouse_core.members AS m
         LEFT JOIN greenhouse_serving.person_360 AS p360
           ON p360.identity_profile_id = m.identity_profile_id
        WHERE m.member_id = $1
        LIMIT 1`,
      [row.commercial_owner_member_id]
    )

    const ownerRow = ownerRows[0]

    if (ownerRow) {
      owner = { memberId: ownerRow.member_id, email: ownerRow.email, displayName: ownerRow.full_name }
    }
  }

  const [categories, units, taxCategories, sourceKindMappings] = await Promise.all([
    listProductCategories(),
    listProductUnits(),
    listTaxCategories(),
    listSourceKindMappings()
  ])

  return {
    product: {
      productId: row.product_id,
      hubspotProductId: row.hubspot_product_id,
      productCode: row.product_code,
      productName: row.product_name,
      description: row.description,
      descriptionRichHtml: row.description_rich_html,
      productType: row.product_type,
      hubspotProductTypeCode: row.hubspot_product_type_code,
      hubspotPricingModel: row.hubspot_pricing_model,
      hubspotProductClassification: row.hubspot_product_classification,
      hubspotBundleTypeCode: row.hubspot_bundle_type_code,
      categoryCode: row.category_code,
      unitCode: row.unit_code,
      taxCategoryCode: row.tax_category_code,
      isRecurring: Boolean(row.is_recurring),
      recurringBillingPeriodIso: row.recurring_billing_period_iso,
      recurringBillingFrequencyCode: row.recurring_billing_frequency_code,
      commercialOwnerMemberId: row.commercial_owner_member_id,
      commercialOwnerAssignedAt: row.commercial_owner_assigned_at,
      ownerGhAuthoritative: Boolean(row.owner_gh_authoritative),
      marketingUrl: row.marketing_url,
      imageUrls: row.image_urls ?? [],
      businessLineCode: row.business_line_code,
      sourceKind: row.source_kind,
      sourceId: row.source_id,
      isArchived: row.is_archived,
      syncStatus: row.hubspot_sync_status,
      lastOutboundSyncAt: row.last_outbound_sync_at,
      ghLastWriteAt: row.gh_last_write_at,
      updatedAt: row.updated_at
    },
    prices,
    owner,
    drift,
    refOptions: { categories, units, taxCategories, sourceKindMappings }
  }
}
