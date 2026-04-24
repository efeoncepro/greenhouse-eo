import { NextResponse } from 'next/server'

import {
  getAllPrices,
  type ProductPrice
} from '@/lib/commercial/product-catalog-prices'
import { getCommercialProduct } from '@/lib/commercial/product-catalog-store'
import {
  listProductCategories,
  listProductUnits,
  listSourceKindMappings,
  listTaxCategories
} from '@/lib/commercial/product-catalog-references'
import { query } from '@/lib/db'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────
// TASK-605 Fase E — Admin API: product detail.
//
// GET: full catalog row + all prices + last drift report + ref options
// PATCH: update mutable catalog fields (no prices — prices endpoint is
//        separate to keep semantics explicit and allow selective updates)
// ─────────────────────────────────────────────────────────────

interface ProductCatalogFullRow extends Record<string, unknown> {
  product_id: string
  finance_product_id: string | null
  hubspot_product_id: string | null
  product_code: string
  product_name: string
  description: string | null
  description_rich_html: string | null
  default_unit_price: string | number | null
  default_currency: string
  default_unit: string
  product_type: string
  pricing_model: string | null
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
  commercial_owner_assigned_at: string | Date | null
  owner_gh_authoritative: boolean | null
  marketing_url: string | null
  image_urls: string[] | null
  business_line_code: string | null
  source_kind: string | null
  source_id: string | null
  is_archived: boolean
  sync_status: string
  last_outbound_sync_at: string | Date | null
  gh_last_write_at: string | Date | null
  updated_at: string | Date
}

interface DriftReportRow extends Record<string, unknown> {
  notes: string | null
  finished_at: string | Date | null
}

interface OwnerLookupRow extends Record<string, unknown> {
  member_id: string
  email: string | null
  full_name: string | null
}

const ALLOWED_PRODUCT_TYPES = new Set(['service', 'inventory', 'non_inventory'])
const ALLOWED_PRICING_MODELS = new Set(['flat', 'volume', 'stairstep', 'graduated'])

const toIso = (v: string | Date | null): string | null => {
  if (!v) return null
  if (v instanceof Date) return v.toISOString()

  return v
}

const toNullableNumber = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  const parsed = typeof v === 'number' ? v : Number(v)

  return Number.isFinite(parsed) ? parsed : null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const productId = id.trim()

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  // Use getCommercialProduct as a fast-lookup for existence + canonical entry.
  const entry = await getCommercialProduct(productId)

  if (!entry) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Fetch full row (v2 columns not covered by CommercialProductCatalogEntry).
  const fullRows = await query<ProductCatalogFullRow>(
    `SELECT product_id, finance_product_id, hubspot_product_id, product_code,
            product_name, description, description_rich_html,
            default_unit_price, default_currency, default_unit,
            product_type, pricing_model,
            hubspot_product_type_code, hubspot_pricing_model,
            hubspot_product_classification, hubspot_bundle_type_code,
            category_code, unit_code, tax_category_code,
            is_recurring, recurring_billing_period_iso, recurring_billing_frequency_code,
            commercial_owner_member_id,
            commercial_owner_assigned_at::text AS commercial_owner_assigned_at,
            owner_gh_authoritative, marketing_url, image_urls,
            business_line_code, source_kind, source_id, is_archived,
            hubspot_sync_status AS sync_status,
            last_outbound_sync_at::text AS last_outbound_sync_at,
            gh_last_write_at::text AS gh_last_write_at,
            updated_at::text AS updated_at
       FROM greenhouse_commercial.product_catalog
      WHERE product_id = $1
      LIMIT 1`,
    [entry.productId]
  )

  const row = fullRows[0]

  if (!row) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const prices: ProductPrice[] = await getAllPrices(row.product_id)

  // Latest drift report (if any) for this product.
  const driftRows = await query<DriftReportRow>(
    `SELECT notes, finished_at
       FROM greenhouse_sync.source_sync_runs
      WHERE source_system = 'product_drift_v2'
        AND (notes::jsonb ->> 'productId') = $1
      ORDER BY finished_at DESC
      LIMIT 1`,
    [row.product_id]
  )

  let drift: unknown = null

  if (driftRows[0]?.notes) {
    try {
      drift = JSON.parse(driftRows[0].notes)
    } catch {
      drift = null
    }
  }

  // Owner lookup (best-effort; null if no binding).
  let owner: { memberId: string; email: string | null; displayName: string | null } | null = null

  if (row.commercial_owner_member_id) {
    const ownerRows = await query<OwnerLookupRow>(
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
      owner = {
        memberId: ownerRow.member_id,
        email: ownerRow.email,
        displayName: ownerRow.full_name
      }
    }
  }

  // Ref options (for dropdowns in the admin UI).
  const [categories, units, taxCategories, sourceKindMappings] = await Promise.all([
    listProductCategories(),
    listProductUnits(),
    listTaxCategories(),
    listSourceKindMappings()
  ])

  return NextResponse.json({
    product: {
      productId: row.product_id,
      financeProductId: row.finance_product_id,
      hubspotProductId: row.hubspot_product_id,
      productCode: row.product_code,
      productName: row.product_name,
      description: row.description,
      descriptionRichHtml: row.description_rich_html,
      defaultUnitPrice: toNullableNumber(row.default_unit_price),
      defaultCurrency: row.default_currency,
      defaultUnit: row.default_unit,
      productType: row.product_type,
      pricingModel: row.pricing_model,
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
      commercialOwnerAssignedAt: toIso(row.commercial_owner_assigned_at),
      ownerGhAuthoritative: Boolean(row.owner_gh_authoritative),
      marketingUrl: row.marketing_url,
      imageUrls: row.image_urls ?? [],
      businessLineCode: row.business_line_code,
      sourceKind: row.source_kind,
      sourceId: row.source_id,
      isArchived: row.is_archived,
      syncStatus: row.sync_status,
      lastOutboundSyncAt: toIso(row.last_outbound_sync_at),
      ghLastWriteAt: toIso(row.gh_last_write_at),
      updatedAt: toIso(row.updated_at)
    },
    prices,
    owner,
    drift,
    refOptions: {
      categories,
      units,
      taxCategories,
      sourceKindMappings
    }
  })
}

// ── PATCH: update mutable catalog fields ───────────────────────────────

interface PatchBody {
  productName?: string
  description?: string | null
  descriptionRichHtml?: string | null
  hubspotProductTypeCode?: string | null
  hubspotPricingModel?: string | null
  hubspotProductClassification?: string | null
  hubspotBundleTypeCode?: string | null
  categoryCode?: string | null
  unitCode?: string | null
  taxCategoryCode?: string | null
  isRecurring?: boolean
  recurringBillingFrequencyCode?: string | null
  recurringBillingPeriodIso?: string | null
  commercialOwnerMemberId?: string | null
  ownerGhAuthoritative?: boolean
  marketingUrl?: string | null
  imageUrls?: string[]
  isArchived?: boolean
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const productId = id.trim()

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  const body = (await request.json()) as PatchBody

  const updates: string[] = []
  const values: unknown[] = [productId]

  const pushUpdate = (column: string, value: unknown) => {
    values.push(value)
    updates.push(`${column} = $${values.length}`)
  }

  // Validation for enum-constrained fields.
  if (body.hubspotProductTypeCode !== undefined) {
    if (body.hubspotProductTypeCode !== null && !ALLOWED_PRODUCT_TYPES.has(body.hubspotProductTypeCode)) {
      return NextResponse.json(
        { error: `hubspotProductTypeCode must be one of: ${[...ALLOWED_PRODUCT_TYPES].join(', ')}` },
        { status: 400 }
      )
    }

    pushUpdate('hubspot_product_type_code', body.hubspotProductTypeCode)
  }

  if (body.hubspotPricingModel !== undefined) {
    if (body.hubspotPricingModel !== null && !ALLOWED_PRICING_MODELS.has(body.hubspotPricingModel)) {
      return NextResponse.json(
        { error: `hubspotPricingModel must be one of: ${[...ALLOWED_PRICING_MODELS].join(', ')}` },
        { status: 400 }
      )
    }

    pushUpdate('hubspot_pricing_model', body.hubspotPricingModel)
  }

  if (body.productName !== undefined) pushUpdate('product_name', body.productName)
  if (body.description !== undefined) pushUpdate('description', body.description)
  if (body.descriptionRichHtml !== undefined) pushUpdate('description_rich_html', body.descriptionRichHtml)
  if (body.hubspotProductClassification !== undefined) pushUpdate('hubspot_product_classification', body.hubspotProductClassification)
  if (body.hubspotBundleTypeCode !== undefined) pushUpdate('hubspot_bundle_type_code', body.hubspotBundleTypeCode)
  if (body.categoryCode !== undefined) pushUpdate('category_code', body.categoryCode)
  if (body.unitCode !== undefined) pushUpdate('unit_code', body.unitCode)
  if (body.taxCategoryCode !== undefined) pushUpdate('tax_category_code', body.taxCategoryCode)
  if (body.isRecurring !== undefined) pushUpdate('is_recurring', body.isRecurring)
  if (body.recurringBillingFrequencyCode !== undefined) pushUpdate('recurring_billing_frequency_code', body.recurringBillingFrequencyCode)
  if (body.recurringBillingPeriodIso !== undefined) pushUpdate('recurring_billing_period_iso', body.recurringBillingPeriodIso)
  if (body.commercialOwnerMemberId !== undefined) pushUpdate('commercial_owner_member_id', body.commercialOwnerMemberId)
  if (body.ownerGhAuthoritative !== undefined) pushUpdate('owner_gh_authoritative', body.ownerGhAuthoritative)
  if (body.marketingUrl !== undefined) pushUpdate('marketing_url', body.marketingUrl)
  if (body.imageUrls !== undefined) pushUpdate('image_urls', body.imageUrls)
  if (body.isArchived !== undefined) pushUpdate('is_archived', body.isArchived)

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  updates.push('gh_last_write_at = CURRENT_TIMESTAMP')
  updates.push('updated_at = CURRENT_TIMESTAMP')

  const result = await query<{ product_id: string }>(
    `UPDATE greenhouse_commercial.product_catalog
        SET ${updates.join(', ')}
      WHERE product_id = $1
      RETURNING product_id`,
    values
  )

  if (result.length === 0) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json({ productId: result[0].product_id, updated: true })
}
