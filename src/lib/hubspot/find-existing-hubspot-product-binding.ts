import 'server-only'

import {
  reconcileHubSpotGreenhouseProducts,
  type HubSpotGreenhouseReconcileProductItem
} from '@/lib/integrations/hubspot-greenhouse-service'

export type HubSpotProductBindingMatchType = 'gh_product_code' | 'sku'

export type HubSpotProductBindingLookupResult =
  | {
      status: 'matched'
      matchType: HubSpotProductBindingMatchType
      item: HubSpotGreenhouseReconcileProductItem
    }
  | {
      status: 'ambiguous'
      matchType: HubSpotProductBindingMatchType
      items: HubSpotGreenhouseReconcileProductItem[]
    }
  | {
      status: 'not_found'
    }
  | {
      status: 'endpoint_not_deployed'
      message?: string
    }

const normalizeExact = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed.toUpperCase() : null
}

const filterExactMatches = (
  items: HubSpotGreenhouseReconcileProductItem[],
  matcher: (item: HubSpotGreenhouseReconcileProductItem) => string | null,
  expected: string
) => items.filter(item => matcher(item) === expected)

const resolveMatch = (
  items: HubSpotGreenhouseReconcileProductItem[],
  matchType: HubSpotProductBindingMatchType
): HubSpotProductBindingLookupResult | null => {
  if (items.length === 0) return null

  if (items.length === 1) {
    return {
      status: 'matched',
      matchType,
      item: items[0]
    }
  }

  return {
    status: 'ambiguous',
    matchType,
    items
  }
}

const readAllHubSpotProducts = async (): Promise<HubSpotGreenhouseReconcileProductItem[] | 'endpoint_not_deployed'> => {
  const items: HubSpotGreenhouseReconcileProductItem[] = []
  let cursor: string | null | undefined = null

  while (true) {
    const response = await reconcileHubSpotGreenhouseProducts({
      cursor,
      limit: 100,
      includeArchived: true
    })

    if (response.status === 'endpoint_not_deployed') {
      return 'endpoint_not_deployed'
    }

    items.push(...response.items)
    cursor = response.nextCursor ?? null

    if (!cursor) break
  }

  return items
}

export const findExistingHubSpotProductBinding = async (
  productCode: string
): Promise<HubSpotProductBindingLookupResult> => {
  const normalizedProductCode = normalizeExact(productCode)

  if (!normalizedProductCode) return { status: 'not_found' }

  const allItems = await readAllHubSpotProducts()

  if (allItems === 'endpoint_not_deployed') {
    return {
      status: 'endpoint_not_deployed',
      message: 'HubSpot integration service does not expose GET /products/reconcile yet.'
    }
  }

  const byGhProductCode = filterExactMatches(
    allItems,
    item => normalizeExact(item.gh_product_code),
    normalizedProductCode
  )

  const ghMatch = resolveMatch(byGhProductCode, 'gh_product_code')

  if (ghMatch) return ghMatch

  const bySku = filterExactMatches(allItems, item => normalizeExact(item.sku), normalizedProductCode)
  const skuMatch = resolveMatch(bySku, 'sku')

  if (skuMatch) return skuMatch

  return { status: 'not_found' }
}
