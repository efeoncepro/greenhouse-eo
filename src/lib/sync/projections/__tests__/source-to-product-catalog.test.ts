import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  SOURCE_TO_PRODUCT_CATALOG_TRIGGER_EVENTS,
  sourceToProductCatalogProjection
} from '../source-to-product-catalog'

describe('sourceToProductCatalogProjection scaffolding', () => {
  it('is registered in the cost_intelligence domain with a canonical name', () => {
    expect(sourceToProductCatalogProjection.name).toBe('source_to_product_catalog')
    expect(sourceToProductCatalogProjection.domain).toBe('cost_intelligence')
  })

  it('lists the actual source events that exist today (no phantom triggers)', () => {
    // These are the event types currently emitted by sellable-roles-store,
    // tool-catalog-seed, and service-catalog-store. If any of them change
    // their event type, this test surfaces the drift before the reactive
    // worker silently stops receiving triggers.
    expect(SOURCE_TO_PRODUCT_CATALOG_TRIGGER_EVENTS).toEqual([
      'commercial.sellable_role.created',
      'commercial.sellable_role.cost_updated',
      'commercial.sellable_role.pricing_updated',
      'ai_tool.created',
      'ai_tool.updated',
      'service.created',
      'service.updated',
      'service.deactivated'
    ])
  })

  it('extractScope resolves entity id from sellable_role payload', () => {
    expect(
      sourceToProductCatalogProjection.extractScope({ roleId: 'role-1', sku: 'ECG-001' })
    ).toEqual({ entityType: 'sellable_role', entityId: 'role-1' })
  })

  it('extractScope resolves entity id from tool payload', () => {
    expect(
      sourceToProductCatalogProjection.extractScope({ toolId: 'tool-1' })
    ).toEqual({ entityType: 'tool', entityId: 'tool-1' })
  })

  it('extractScope resolves entity id from service payload (module_id preferred)', () => {
    expect(
      sourceToProductCatalogProjection.extractScope({ moduleId: 'mod-1' })
    ).toEqual({ entityType: 'service', entityId: 'mod-1' })

    expect(
      sourceToProductCatalogProjection.extractScope({ serviceId: 'svc-1' })
    ).toEqual({ entityType: 'service', entityId: 'svc-1' })
  })

  it('extractScope returns null for payloads without a recognized id', () => {
    expect(sourceToProductCatalogProjection.extractScope({})).toBeNull()
    expect(
      sourceToProductCatalogProjection.extractScope({ unrelated: 'value' })
    ).toBeNull()
  })

  it('refresh is a no-op in Fase A (returns null without side effects)', async () => {
    const result = await sourceToProductCatalogProjection.refresh(
      { entityType: 'sellable_role', entityId: 'role-1' },
      {}
    )

    expect(result).toBeNull()
  })
})
