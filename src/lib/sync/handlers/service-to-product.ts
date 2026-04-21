import 'server-only'

import type { PoolClient } from 'pg'

import {
  readServiceForSync,
  type ServiceReadResult
} from '@/lib/commercial/product-catalog/source-readers'
import type { GhOwnedFieldsSnapshot } from '@/lib/commercial/product-catalog/types'
import {
  upsertProductCatalogFromSource,
  type UpsertProductCatalogFromSourceResult
} from '@/lib/commercial/product-catalog/upsert-product-catalog-from-source'

// TASK-546 Fase B — service_pricing → product_catalog.
//
// Services are compositional (role recipe + tool recipe + tier margins) and
// don't carry a flat default_unit_price on their row. We materialize them
// with `default_unit_price=null`; downstream quote builders resolve pricing
// contextually from the recipe. This matches how HubSpot renders services
// that don't have a list price.
//
// Pricing model maps from `commercial_model`: on_going/on_demand → retainer,
// hybrid → project, license_consulting → fixed. The default is 'project' so
// unknown future models fall back to the safest bucket.

const SERVICE_PRODUCT_TYPE = 'service' as const
const SERVICE_CURRENCY = 'USD' as const

const mapPricingModel = (
  commercialModel: string
): 'staff_aug' | 'retainer' | 'project' | 'fixed' => {
  switch (commercialModel) {
    case 'on_going':
    case 'on_demand':
      return 'retainer'
    case 'hybrid':
      return 'project'
    case 'license_consulting':
      return 'fixed'
    default:
      return 'project'
  }
}

const mapUnit = (serviceUnit: string): 'hour' | 'month' | 'unit' | 'project' => {
  switch (serviceUnit) {
    case 'monthly':
      return 'month'
    case 'project':
      return 'project'
    default:
      return 'project'
  }
}

const buildServiceSnapshot = (service: ServiceReadResult): GhOwnedFieldsSnapshot => ({
  product_code: service.serviceSku,
  product_name: service.serviceName,
  description: service.description,
  default_unit_price: null,
  default_currency: SERVICE_CURRENCY,
  default_unit: mapUnit(service.serviceUnit),
  product_type: SERVICE_PRODUCT_TYPE,
  pricing_model: mapPricingModel(service.commercialModel),
  business_line_code: service.businessLineCode,
  is_archived: !service.active
})

export interface HandleServiceToProductResult {
  status: 'applied' | 'skipped_not_found'
  result?: UpsertProductCatalogFromSourceResult
}

export const handleServiceToProduct = async (
  client: PoolClient,
  moduleId: string
): Promise<HandleServiceToProductResult> => {
  const service = await readServiceForSync(client, moduleId)

  if (!service) {
    return { status: 'skipped_not_found' }
  }

  const snapshot = buildServiceSnapshot(service)

  const result = await upsertProductCatalogFromSource(client, {
    sourceKind: 'service',
    sourceId: service.moduleId,
    sourceVariantKey: null,
    snapshot
  })

  return { status: 'applied', result }
}

export const __buildServiceSnapshot = buildServiceSnapshot
