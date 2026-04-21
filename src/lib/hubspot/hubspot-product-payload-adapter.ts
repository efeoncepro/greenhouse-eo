import 'server-only'

import { sanitizeHubSpotProductPayload } from '@/lib/commercial/hubspot-outbound-guard'

import type {
  HubSpotGreenhouseCreateProductRequest,
  HubSpotGreenhouseProductCustomProperties,
  HubSpotGreenhouseUpdateProductRequest
} from '@/lib/integrations/hubspot-greenhouse-service'

// TASK-547 Fase C — translates a `greenhouse_commercial.product_catalog` row
// into the HubSpot wire payload. Runs the cost/margin guard
// (`sanitizeHubSpotProductPayload`) before returning so no internal costing
// can leak through a caller that forgot the defensive wrapper.
//
// Custom properties:
//   - `gh_product_code`           — SKU mirrored on HubSpot for cross-repo joins
//   - `gh_source_kind`            — sellable_role | tool | overhead_addon | service | manual
//   - `gh_last_write_at`          — ISO timestamp used by the anti-ping-pong guard
//   - `gh_archived_by_greenhouse` — true when archival originated from source deactivation
//   - `gh_business_line`          — business unit owner (optional)

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

export const adaptProductCatalogToHubSpotCreatePayload = (
  snapshot: ProductCatalogSyncSnapshot
): HubSpotGreenhouseCreateProductRequest => {
  const raw: HubSpotGreenhouseCreateProductRequest & {
    customProperties?: HubSpotGreenhouseProductCustomProperties
  } = {
    name: snapshot.productName,
    sku: snapshot.productCode,
    description: snapshot.description ?? undefined,
    unitPrice: snapshot.defaultUnitPrice ?? undefined,
    createdBy: 'task-547-outbound',
    customProperties: buildCustomProperties(snapshot)
  }

  // Defense-in-depth: run the cost/margin sanitizer even though the snapshot
  // shape does not include cost fields. This guards against a future caller
  // extending the snapshot type without remembering the guard.
  const safe = sanitizeHubSpotProductPayload(raw as unknown as Record<string, unknown>)

  return safe as unknown as HubSpotGreenhouseCreateProductRequest
}

export const adaptProductCatalogToHubSpotUpdatePayload = (
  snapshot: ProductCatalogSyncSnapshot
): HubSpotGreenhouseUpdateProductRequest => {
  const raw: HubSpotGreenhouseUpdateProductRequest & {
    customProperties: HubSpotGreenhouseProductCustomProperties
  } = {
    name: snapshot.productName,
    sku: snapshot.productCode,
    description: snapshot.description,
    unitPrice: snapshot.defaultUnitPrice,
    isArchived: snapshot.isArchived,
    customProperties: buildCustomProperties(snapshot)
  }

  const safe = sanitizeHubSpotProductPayload(raw as unknown as Record<string, unknown>)

  return safe as unknown as HubSpotGreenhouseUpdateProductRequest
}

// Exposed for tests — lets callers assert the custom property shape in
// isolation without mocking the Cloud Run client.
export const __buildCustomProperties = buildCustomProperties
