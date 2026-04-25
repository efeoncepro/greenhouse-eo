import 'server-only'

import { listCommercialProductCatalog, type CommercialProductCatalogEntry } from '@/lib/commercial/product-catalog-store'
import { sendSlackAlert } from '@/lib/alerts/slack-notify'
import {
  reconcileHubSpotGreenhouseProducts,
  type HubSpotGreenhouseReconcileProductItem
} from '@/lib/integrations/hubspot-greenhouse-service'
import { query } from '@/lib/db'

import { resolveProductSyncConflict } from './conflict-resolution-commands'
import { getProductSyncConflictAlertStats, upsertProductSyncConflict } from './product-sync-conflicts-store'
import type {
  ProductSyncConflictAction,
  ProductSyncConflictActor,
  ProductSyncConflictType
} from './types'

export interface ProductCatalogDriftConflictCandidate {
  productId: string | null
  hubspotProductId: string | null
  conflictType: ProductSyncConflictType
  conflictingFields: Record<string, unknown> | null
  metadata: Record<string, unknown>
  autoHealAction?: Extract<ProductSyncConflictAction, 'replay_greenhouse'>
}

export interface ProductCatalogDriftDetectionResult {
  status: 'ok' | 'endpoint_not_deployed'
  hubspotItemsRead: number
  greenhouseItemsRead: number
  conflictsDetected: number
  conflictsInserted: number
  conflictsRefreshed: number
  autoHealed: number
  alertsSent: number
  message?: string
}

type DriftSnapshot = {
  productId: string
  hubspotProductId: string | null
  productCode: string
  productName: string
  description: string | null
  defaultUnitPrice: number | null
  sourceKind: string | null
  sourceId: string | null
  isArchived: boolean
  hubspotSyncStatus: string
}

const toSnapshot = (entry: CommercialProductCatalogEntry): DriftSnapshot => ({
  productId: entry.productId,
  hubspotProductId: entry.hubspotProductId,
  productCode: entry.productCode,
  productName: entry.productName,
  description: entry.description,
  defaultUnitPrice: entry.defaultUnitPrice,
  sourceKind: entry.sourceKind,
  sourceId: entry.sourceId,
  isArchived: entry.isArchived,
  hubspotSyncStatus: entry.syncStatus
})

const normalizeText = (value: string | null | undefined) => {
  const normalized = value?.trim() ?? ''

  return normalized.length > 0 ? normalized : null
}

const sameText = (left: string | null | undefined, right: string | null | undefined) =>
  normalizeText(left) === normalizeText(right)

const sameNumber = (left: number | null | undefined, right: number | null | undefined) => {
  if (left == null && right == null) return true
  if (left == null || right == null) return false

  return Math.abs(left - right) < 0.0001
}

const buildLocalMetadata = (entry: DriftSnapshot) => ({
  productId: entry.productId,
  hubspotProductId: entry.hubspotProductId,
  productCode: entry.productCode,
  productName: entry.productName,
  description: entry.description,
  defaultUnitPrice: entry.defaultUnitPrice,
  sourceKind: entry.sourceKind,
  sourceId: entry.sourceId,
  isArchived: entry.isArchived,
  hubspotSyncStatus: entry.hubspotSyncStatus
})

const buildHubSpotMetadata = (entry: HubSpotGreenhouseReconcileProductItem) => ({
  hubspotProductId: entry.hubspotProductId,
  gh_product_code: entry.gh_product_code,
  gh_source_kind: entry.gh_source_kind,
  gh_last_write_at: entry.gh_last_write_at,
  name: entry.name,
  sku: entry.sku,
  price: entry.price,
  description: entry.description,
  isArchived: entry.isArchived
})

export const detectOrphansHubSpot = (
  localProducts: DriftSnapshot[],
  hubspotItems: HubSpotGreenhouseReconcileProductItem[]
): ProductCatalogDriftConflictCandidate[] => {
  const localByCode = new Map(localProducts.map(product => [product.productCode, product]))

  return hubspotItems.flatMap(item => {
    const local = item.gh_product_code ? localByCode.get(item.gh_product_code) : null

    if (local) return []

    return [
      {
        productId: null,
        hubspotProductId: item.hubspotProductId,
        conflictType: 'orphan_in_hubspot',
        conflictingFields: null,
        metadata: {
          hubspotSnapshot: buildHubSpotMetadata(item),
          productCode: item.gh_product_code ?? item.sku ?? null,
          autoHealEligible: false
        }
      }
    ]
  })
}

export const detectOrphansGreenhouse = (
  localProducts: DriftSnapshot[],
  hubspotItems: HubSpotGreenhouseReconcileProductItem[]
): ProductCatalogDriftConflictCandidate[] => {
  const hubspotIds = new Set(hubspotItems.map(item => item.hubspotProductId))

  return localProducts.flatMap(product => {
    if (product.isArchived) return []
    if (product.hubspotProductId && hubspotIds.has(product.hubspotProductId)) return []

    return [
      {
        productId: product.productId,
        hubspotProductId: product.hubspotProductId,
        conflictType: 'orphan_in_greenhouse',
        conflictingFields: {
          hubspotProductId: {
            greenhouse: product.hubspotProductId,
            hubspot: null
          }
        },
        metadata: {
          productCode: product.productCode,
          localSnapshot: buildLocalMetadata(product),
          autoHealEligible: true
        },
        autoHealAction: 'replay_greenhouse'
      }
    ]
  })
}

export const detectFieldDrift = (
  localProducts: DriftSnapshot[],
  hubspotItems: HubSpotGreenhouseReconcileProductItem[]
): ProductCatalogDriftConflictCandidate[] => {
  const hubspotById = new Map(hubspotItems.map(item => [item.hubspotProductId, item]))

  return localProducts.flatMap(product => {
    if (!product.hubspotProductId) return []

    const hubspot = hubspotById.get(product.hubspotProductId)

    if (!hubspot) return []

    const conflictingFields: Record<string, unknown> = {}

    if (!sameText(product.productName, hubspot.name)) {
      conflictingFields.productName = {
        greenhouse: product.productName,
        hubspot: hubspot.name
      }
    }

    if (!sameText(product.description, hubspot.description)) {
      conflictingFields.description = {
        greenhouse: product.description,
        hubspot: hubspot.description
      }
    }

    if (!sameNumber(product.defaultUnitPrice, hubspot.price)) {
      conflictingFields.defaultUnitPrice = {
        greenhouse: product.defaultUnitPrice,
        hubspot: hubspot.price
      }
    }

    if (Object.keys(conflictingFields).length === 0) return []

    return [
      {
        productId: product.productId,
        hubspotProductId: product.hubspotProductId,
        conflictType: 'field_drift',
        conflictingFields,
        metadata: {
          productCode: product.productCode,
          localSnapshot: buildLocalMetadata(product),
          hubspotSnapshot: buildHubSpotMetadata(hubspot),
          autoHealEligible: true
        },
        autoHealAction: 'replay_greenhouse'
      }
    ]
  })
}

export const detectSkuCollisions = (
  localProducts: DriftSnapshot[]
): ProductCatalogDriftConflictCandidate[] => {
  const collisions = new Map<string, DriftSnapshot[]>()

  for (const product of localProducts) {
    const current = collisions.get(product.productCode) ?? []

    current.push(product)
    collisions.set(product.productCode, current)
  }

  const candidates: ProductCatalogDriftConflictCandidate[] = []

  for (const [productCode, items] of collisions.entries()) {
    if (items.length < 2) continue

    for (const item of items) {
      candidates.push({
        productId: item.productId,
        hubspotProductId: item.hubspotProductId,
        conflictType: 'sku_collision',
        conflictingFields: {
          productCode,
          duplicateProductIds: items.map(entry => entry.productId)
        },
        metadata: {
          productCode,
          duplicateProducts: items.map(buildLocalMetadata),
          autoHealEligible: false
        }
      })
    }
  }

  return candidates
}

export const detectArchiveMismatches = (
  localProducts: DriftSnapshot[],
  hubspotItems: HubSpotGreenhouseReconcileProductItem[]
): ProductCatalogDriftConflictCandidate[] => {
  const hubspotById = new Map(hubspotItems.map(item => [item.hubspotProductId, item]))

  return localProducts.flatMap(product => {
    if (!product.hubspotProductId) return []

    const hubspot = hubspotById.get(product.hubspotProductId)

    if (!hubspot || product.isArchived === hubspot.isArchived) return []

    return [
      {
        productId: product.productId,
        hubspotProductId: product.hubspotProductId,
        conflictType: 'archive_mismatch',
        conflictingFields: {
          isArchived: {
            greenhouse: product.isArchived,
            hubspot: hubspot.isArchived
          }
        },
        metadata: {
          productCode: product.productCode,
          localSnapshot: buildLocalMetadata(product),
          hubspotSnapshot: buildHubSpotMetadata(hubspot),
          autoHealEligible: true
        },
        autoHealAction: 'replay_greenhouse'
      }
    ]
  })
}

const readAllCommercialProductsForDrift = async (): Promise<DriftSnapshot[]> => {
  const items: DriftSnapshot[] = []
  let offset = 0
  const pageSize = 500

  while (true) {
    const page = await listCommercialProductCatalog({
      includeArchived: true,
      limit: pageSize,
      offset
    })

    items.push(...page.items.map(toSnapshot))

    if (page.items.length < pageSize) break

    offset += pageSize
  }

  return items
}

const readAllHubSpotProductsForDrift = async () => {
  const items: HubSpotGreenhouseReconcileProductItem[] = []
  let cursor: string | null = null

  while (true) {
    const response = await reconcileHubSpotGreenhouseProducts({
      cursor,
      limit: 200,
      includeArchived: true
    })

    if (response.status === 'endpoint_not_deployed') {
      return response
    }

    items.push(...response.items)

    if (!response.nextCursor) {
      return {
        status: 'ok' as const,
        items
      }
    }

    cursor = response.nextCursor
  }
}

const markProductsDriftChecked = async (productIds: string[]) => {
  if (productIds.length === 0) return

  await query(
    `UPDATE greenhouse_commercial.product_catalog
        SET last_drift_check_at = CURRENT_TIMESTAMP
      WHERE product_id = ANY($1::text[])`,
    [productIds]
  )
}

const maybeSendSlackAlert = async () => {
  const stats = await getProductSyncConflictAlertStats()
  const shouldAlert = stats.createdLastWindow > 10 || stats.skuCollisionTotal > 3

  if (!shouldAlert) {
    return 0
  }

  const sent = await sendSlackAlert(
    [
      ':warning: Product catalog drift detector',
      `Conflicts in last 24h: \`${stats.createdLastWindow}\``,
      `Unresolved total: \`${stats.unresolvedTotal}\``,
      `SKU collisions unresolved: \`${stats.skuCollisionTotal}\``
    ].join('\n')
  )

  return sent ? 1 : 0
}

const AUTO_HEAL_ACTOR: ProductSyncConflictActor = {
  userId: null,
  actorName: 'ops-worker:auto-heal',
  reason: 'task-548_auto_heal'
}

export const runProductCatalogDriftDetection = async (): Promise<ProductCatalogDriftDetectionResult> => {
  const [localProducts, hubspotResponse] = await Promise.all([
    readAllCommercialProductsForDrift(),
    readAllHubSpotProductsForDrift()
  ])

  if (hubspotResponse.status === 'endpoint_not_deployed') {
    await markProductsDriftChecked(localProducts.map(product => product.productId))

    return {
      status: 'endpoint_not_deployed',
      hubspotItemsRead: 0,
      greenhouseItemsRead: localProducts.length,
      conflictsDetected: 0,
      conflictsInserted: 0,
      conflictsRefreshed: 0,
      autoHealed: 0,
      alertsSent: 0,
      message: hubspotResponse.message
    }
  }

  const hubspotItems = hubspotResponse.items

  const detected = [
    ...detectOrphansHubSpot(localProducts, hubspotItems),
    ...detectOrphansGreenhouse(localProducts, hubspotItems),
    ...detectFieldDrift(localProducts, hubspotItems),
    ...detectSkuCollisions(localProducts),
    ...detectArchiveMismatches(localProducts, hubspotItems)
  ]

  let conflictsInserted = 0
  let conflictsRefreshed = 0
  let autoHealed = 0

  for (const candidate of detected) {
    const { conflict, inserted } = await upsertProductSyncConflict({
      productId: candidate.productId,
      hubspotProductId: candidate.hubspotProductId,
      conflictType: candidate.conflictType,
      conflictingFields: candidate.conflictingFields,
      metadata: candidate.metadata
    })

    if (inserted) {
      conflictsInserted += 1
    } else {
      conflictsRefreshed += 1
    }

    if (candidate.autoHealAction) {
      try {
        await resolveProductSyncConflict({
          conflictId: conflict.conflictId,
          action: candidate.autoHealAction,
          actor: AUTO_HEAL_ACTOR
        })
        autoHealed += 1
      } catch (error) {
        console.warn('[product-catalog-drift] auto-heal failed', {
          conflictId: conflict.conflictId,
          action: candidate.autoHealAction,
          error: error instanceof Error ? error.message : error
        })
      }
    }
  }

  await markProductsDriftChecked(localProducts.map(product => product.productId))

  const alertsSent = await maybeSendSlackAlert()

  return {
    status: 'ok',
    hubspotItemsRead: hubspotItems.length,
    greenhouseItemsRead: localProducts.length,
    conflictsDetected: detected.length,
    conflictsInserted,
    conflictsRefreshed,
    autoHealed,
    alertsSent
  }
}
