import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockHandleSellableRole = vi.fn()
const mockHandleTool = vi.fn()
const mockHandleOverheadAddon = vi.fn()
const mockHandleService = vi.fn()

vi.mock('@/lib/sync/handlers/sellable-role-to-product', () => ({
  handleSellableRoleToProduct: (...args: unknown[]) => mockHandleSellableRole(...args)
}))
vi.mock('@/lib/sync/handlers/tool-to-product', () => ({
  handleToolToProduct: (...args: unknown[]) => mockHandleTool(...args)
}))
vi.mock('@/lib/sync/handlers/overhead-addon-to-product', () => ({
  handleOverheadAddonToProduct: (...args: unknown[]) => mockHandleOverheadAddon(...args)
}))
vi.mock('@/lib/sync/handlers/service-to-product', () => ({
  handleServiceToProduct: (...args: unknown[]) => mockHandleService(...args)
}))

vi.mock('@/lib/db', () => ({
  withTransaction: async <T,>(fn: (client: unknown) => Promise<T>) => fn({ mock: 'client' })
}))

import {
  SOURCE_TO_PRODUCT_CATALOG_TRIGGER_EVENTS,
  sourceToProductCatalogProjection
} from '../source-to-product-catalog'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  mockHandleSellableRole.mockReset()
  mockHandleTool.mockReset()
  mockHandleOverheadAddon.mockReset()
  mockHandleService.mockReset()
})

describe('sourceToProductCatalogProjection registration', () => {
  it('is registered in the cost_intelligence domain with a canonical name', () => {
    expect(sourceToProductCatalogProjection.name).toBe('source_to_product_catalog')
    expect(sourceToProductCatalogProjection.domain).toBe('cost_intelligence')
  })

  it('lists the full Fase B trigger set (6 sellable_role + 4 ai_tool + 4 overhead_addon + 3 service)', () => {
    expect(SOURCE_TO_PRODUCT_CATALOG_TRIGGER_EVENTS).toEqual([
      'commercial.sellable_role.created',
      'commercial.sellable_role.updated',
      'commercial.sellable_role.cost_updated',
      'commercial.sellable_role.pricing_updated',
      'commercial.sellable_role.deactivated',
      'commercial.sellable_role.reactivated',
      'ai_tool.created',
      'ai_tool.updated',
      'ai_tool.deactivated',
      'ai_tool.reactivated',
      'commercial.overhead_addon.created',
      'commercial.overhead_addon.updated',
      'commercial.overhead_addon.deactivated',
      'commercial.overhead_addon.reactivated',
      'service.created',
      'service.updated',
      'service.deactivated'
    ])
  })
})

describe('sourceToProductCatalogProjection.extractScope', () => {
  it('resolves entity id from sellable_role payload', () => {
    expect(
      sourceToProductCatalogProjection.extractScope({ roleId: 'role-1', sku: 'ECG-001' })
    ).toEqual({ entityType: 'sellable_role', entityId: 'role-1' })
  })

  it('resolves entity id from tool payload', () => {
    expect(
      sourceToProductCatalogProjection.extractScope({ toolId: 'tool-1' })
    ).toEqual({ entityType: 'tool', entityId: 'tool-1' })
  })

  it('resolves entity id from service payload (module_id preferred)', () => {
    expect(
      sourceToProductCatalogProjection.extractScope({ moduleId: 'mod-1' })
    ).toEqual({ entityType: 'service', entityId: 'mod-1' })

    expect(
      sourceToProductCatalogProjection.extractScope({ serviceId: 'svc-1' })
    ).toEqual({ entityType: 'service', entityId: 'svc-1' })
  })

  it('resolves entity id from overhead_addon payload', () => {
    expect(
      sourceToProductCatalogProjection.extractScope({ addonId: 'addon-1' })
    ).toEqual({ entityType: 'overhead_addon', entityId: 'addon-1' })
  })

  it('returns null for payloads without a recognized id', () => {
    expect(sourceToProductCatalogProjection.extractScope({})).toBeNull()
    expect(
      sourceToProductCatalogProjection.extractScope({ unrelated: 'value' })
    ).toBeNull()
  })
})

describe('sourceToProductCatalogProjection.refresh dispatching', () => {
  it('skips when sub-flag is OFF (default)', async () => {
    delete process.env.GREENHOUSE_PRODUCT_SYNC_ROLES

    const result = await sourceToProductCatalogProjection.refresh(
      { entityType: 'sellable_role', entityId: 'role-1' },
      {}
    )

    expect(result).toBe('skip:flag_disabled:sellable_role')
    expect(mockHandleSellableRole).not.toHaveBeenCalled()
  })

  it('dispatches to sellable-role handler when flag ON and reports applied outcome', async () => {
    process.env.GREENHOUSE_PRODUCT_SYNC_ROLES = 'true'

    mockHandleSellableRole.mockResolvedValueOnce({
      status: 'applied',
      result: {
        productId: 'prd-abc',
        outcome: 'created',
        previousChecksum: null,
        checksum: 'new-checksum'
      }
    })

    const result = await sourceToProductCatalogProjection.refresh(
      { entityType: 'sellable_role', entityId: 'role-1' },
      {}
    )

    expect(result).toBe('created:sellable_role:role-1:prd-abc')
    expect(mockHandleSellableRole).toHaveBeenCalledTimes(1)
  })

  it('reports skip when handler returns skipped_not_found', async () => {
    process.env.GREENHOUSE_PRODUCT_SYNC_ROLES = 'true'

    mockHandleSellableRole.mockResolvedValueOnce({
      status: 'skipped_not_found'
    })

    const result = await sourceToProductCatalogProjection.refresh(
      { entityType: 'sellable_role', entityId: 'role-zombie' },
      {}
    )

    expect(result).toBe('skip:skipped_not_found:sellable_role:role-zombie')
  })

  it('dispatches to tool handler when tool flag is ON', async () => {
    process.env.GREENHOUSE_PRODUCT_SYNC_TOOLS = 'true'

    mockHandleTool.mockResolvedValueOnce({
      status: 'skipped_not_sellable'
    })

    const result = await sourceToProductCatalogProjection.refresh(
      { entityType: 'tool', entityId: 'tool-42' },
      {}
    )

    expect(result).toBe('skip:skipped_not_sellable:tool:tool-42')
    expect(mockHandleTool).toHaveBeenCalledTimes(1)
  })

  it('dispatches to overhead-addon handler when overheads flag is ON', async () => {
    process.env.GREENHOUSE_PRODUCT_SYNC_OVERHEADS = 'true'

    mockHandleOverheadAddon.mockResolvedValueOnce({
      status: 'applied',
      result: {
        productId: 'prd-addon',
        outcome: 'updated',
        previousChecksum: 'old',
        checksum: 'new'
      }
    })

    const result = await sourceToProductCatalogProjection.refresh(
      { entityType: 'overhead_addon', entityId: 'addon-1' },
      {}
    )

    expect(result).toBe('updated:overhead_addon:addon-1:prd-addon')
  })

  it('dispatches to service handler when services flag is ON', async () => {
    process.env.GREENHOUSE_PRODUCT_SYNC_SERVICES = 'true'

    mockHandleService.mockResolvedValueOnce({
      status: 'applied',
      result: {
        productId: 'prd-svc',
        outcome: 'archived',
        previousChecksum: 'prev',
        checksum: 'next'
      }
    })

    const result = await sourceToProductCatalogProjection.refresh(
      { entityType: 'service', entityId: 'mod-1' },
      {}
    )

    expect(result).toBe('archived:service:mod-1:prd-svc')
  })

  it('rejects unknown entity types', async () => {
    const result = await sourceToProductCatalogProjection.refresh(
      { entityType: 'manual', entityId: 'prd-manual' },
      {}
    )

    expect(result).toBe('skip:unknown_source_kind:manual')
  })
})
