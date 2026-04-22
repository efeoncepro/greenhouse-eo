import { describe, expect, it } from 'vitest'

import type { HubSpotGreenhouseReconcileProductItem } from '@/lib/integrations/hubspot-greenhouse-service'

import {
  detectArchiveMismatches,
  detectFieldDrift,
  detectOrphansGreenhouse,
  detectOrphansHubSpot,
  detectSkuCollisions
} from './drift-reconciler'

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

const buildLocalProduct = (overrides: Partial<DriftSnapshot> = {}): DriftSnapshot => ({
  productId: 'prd-1',
  hubspotProductId: 'hs-1',
  productCode: 'PRD-001',
  productName: 'Growth Retainer',
  description: 'Baseline package',
  defaultUnitPrice: 1200,
  sourceKind: 'manual',
  sourceId: null,
  isArchived: false,
  hubspotSyncStatus: 'synced',
  ...overrides
})

const buildHubSpotProduct = (
  overrides: Partial<HubSpotGreenhouseReconcileProductItem> = {}
): HubSpotGreenhouseReconcileProductItem => ({
  hubspotProductId: 'hs-1',
  gh_product_code: 'PRD-001',
  gh_source_kind: 'manual',
  gh_last_write_at: '2026-04-21T03:00:00.000Z',
  name: 'Growth Retainer',
  sku: 'PRD-001',
  price: 1200,
  description: 'Baseline package',
  isArchived: false,
  ...overrides
})

describe('product catalog drift detector helpers', () => {
  it('detects orphan HubSpot products when no local product matches the Greenhouse code', () => {
    const conflicts = detectOrphansHubSpot([buildLocalProduct()], [
      buildHubSpotProduct({ hubspotProductId: 'hs-2', gh_product_code: 'PRD-999', sku: 'PRD-999' })
    ])

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toEqual(
      expect.objectContaining({
        productId: null,
        hubspotProductId: 'hs-2',
        conflictType: 'orphan_in_hubspot'
      })
    )
    expect(conflicts[0].metadata.hubspotSnapshot).toEqual(
      expect.objectContaining({
        hubspotProductId: 'hs-2',
        gh_product_code: 'PRD-999'
      })
    )
  })

  it('detects local orphans only for active products missing from the reconcile snapshot', () => {
    const activeConflict = detectOrphansGreenhouse(
      [buildLocalProduct({ hubspotProductId: 'hs-missing' })],
      [buildHubSpotProduct()]
    )

    const archivedConflict = detectOrphansGreenhouse(
      [buildLocalProduct({ productId: 'prd-2', hubspotProductId: 'hs-archived', isArchived: true })],
      []
    )

    expect(activeConflict).toHaveLength(1)
    expect(activeConflict[0]).toEqual(
      expect.objectContaining({
        productId: 'prd-1',
        conflictType: 'orphan_in_greenhouse',
        autoHealAction: 'replay_greenhouse'
      })
    )
    expect(archivedConflict).toHaveLength(0)
  })

  it('detects field drift across Greenhouse-owned product fields', () => {
    const conflicts = detectFieldDrift([buildLocalProduct()], [
      buildHubSpotProduct({
        name: 'Growth Retainer Premium',
        price: 1500,
        description: 'Remote override'
      })
    ])

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toEqual(
      expect.objectContaining({
        productId: 'prd-1',
        hubspotProductId: 'hs-1',
        conflictType: 'field_drift',
        autoHealAction: 'replay_greenhouse'
      })
    )
    expect(conflicts[0].conflictingFields).toEqual(
      expect.objectContaining({
        productName: { greenhouse: 'Growth Retainer', hubspot: 'Growth Retainer Premium' },
        defaultUnitPrice: { greenhouse: 1200, hubspot: 1500 },
        description: { greenhouse: 'Baseline package', hubspot: 'Remote override' }
      })
    )
  })

  it('detects SKU collisions and archive mismatches independently', () => {
    const collisions = detectSkuCollisions([
      buildLocalProduct(),
      buildLocalProduct({
        productId: 'prd-2',
        hubspotProductId: 'hs-2',
        productName: 'Growth Retainer Variant'
      })
    ])

    const archiveMismatches = detectArchiveMismatches([buildLocalProduct()], [
      buildHubSpotProduct({ isArchived: true })
    ])

    expect(collisions).toHaveLength(2)
    expect(collisions.every(conflict => conflict.conflictType === 'sku_collision')).toBe(true)
    expect(archiveMismatches).toEqual([
      expect.objectContaining({
        productId: 'prd-1',
        hubspotProductId: 'hs-1',
        conflictType: 'archive_mismatch',
        autoHealAction: 'replay_greenhouse'
      })
    ])
  })
})
