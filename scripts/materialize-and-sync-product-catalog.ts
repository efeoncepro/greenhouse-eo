import { createRequire } from 'node:module'

type SourceKey = 'roles' | 'tools' | 'overheads' | 'services'

const SOURCE_KEYS: readonly SourceKey[] = ['roles', 'tools', 'overheads', 'services'] as const

const require = createRequire(import.meta.url)
const serverOnlyModuleId = require.resolve('server-only')

require.cache[serverOnlyModuleId] = {
  exports: {}
} as NodeModule

const parseSources = (): SourceKey[] => {
  const raw = process.argv.find(arg => arg.startsWith('--sources='))?.split('=')[1]

  if (!raw) return [...SOURCE_KEYS]

  const requested = raw
    .split(',')
    .map(value => value.trim())
    .filter((value): value is SourceKey => SOURCE_KEYS.includes(value as SourceKey))

  return requested.length > 0 ? requested : [...SOURCE_KEYS]
}

const readIds = async (source: SourceKey): Promise<string[]> => {
  const { query } = await import('@/lib/db')

  switch (source) {
    case 'roles': {
      const rows = await query<{ role_id: string }>(
        `SELECT role_id
           FROM greenhouse_commercial.sellable_roles
          WHERE active = TRUE
            AND role_sku IS NOT NULL
          ORDER BY role_sku ASC`
      )

      return rows.map(row => row.role_id)
    }

    case 'tools': {
      const rows = await query<{ tool_id: string }>(
        `SELECT tool_id
           FROM greenhouse_ai.tool_catalog
          WHERE is_active = TRUE
            AND tool_sku IS NOT NULL
          ORDER BY tool_sku ASC`
      )

      return rows.map(row => row.tool_id)
    }

    case 'overheads': {
      const rows = await query<{ addon_id: string }>(
        `SELECT addon_id
           FROM greenhouse_commercial.overhead_addons
          WHERE addon_sku IS NOT NULL
          ORDER BY addon_sku ASC`
      )

      return rows.map(row => row.addon_id)
    }

    case 'services': {
      const rows = await query<{ module_id: string }>(
        `SELECT module_id
           FROM greenhouse_commercial.service_pricing
          WHERE active = TRUE
            AND service_sku IS NOT NULL
          ORDER BY service_sku ASC`
      )

      return rows.map(row => row.module_id)
    }
  }
}

const materializeSource = async (source: SourceKey, entityId: string): Promise<string | null> => {
  const { withTransaction } = await import('@/lib/db')

  return withTransaction(async client => {
    switch (source) {
      case 'roles': {
        const { handleSellableRoleToProduct } = await import('@/lib/sync/handlers/sellable-role-to-product')
        const result = await handleSellableRoleToProduct(client, entityId)

        
return result.result?.productId ?? null
      }

      case 'tools': {
        const { handleToolToProduct } = await import('@/lib/sync/handlers/tool-to-product')
        const result = await handleToolToProduct(client, entityId)

        
return result.result?.productId ?? null
      }

      case 'overheads': {
        const { handleOverheadAddonToProduct } = await import('@/lib/sync/handlers/overhead-addon-to-product')
        const result = await handleOverheadAddonToProduct(client, entityId)

        
return result.result?.productId ?? null
      }

      case 'services': {
        const { handleServiceToProduct } = await import('@/lib/sync/handlers/service-to-product')
        const result = await handleServiceToProduct(client, entityId)

        
return result.result?.productId ?? null
      }
    }
  })
}

const main = async () => {
  const { pushProductToHubSpot } = await import('@/lib/hubspot/push-product-to-hubspot')
  const { query } = await import('@/lib/db')
  const sources = parseSources()
  const materializedProductIds = new Set<string>()

  for (const source of sources) {
    const ids = await readIds(source)

    console.log(`[product-catalog] materializing ${source}: ${ids.length}`)

    for (const entityId of ids) {
      const productId = await materializeSource(source, entityId)

      if (productId) materializedProductIds.add(productId)
    }
  }

  console.log(`[product-catalog] syncing to HubSpot: ${materializedProductIds.size}`)

  const results = {
    synced: 0,
    endpointNotDeployed: 0,
    skipped: 0,
    failed: 0
  }

  const errors: Array<{ productId: string; message: string }> = []

  for (const productId of materializedProductIds) {
    try {
      const result = await pushProductToHubSpot({ productId, actorId: 'task-549-cutover-script' })

      if (result.status === 'synced') results.synced += 1
      else if (result.status === 'endpoint_not_deployed') results.endpointNotDeployed += 1
      else results.skipped += 1
    } catch (error) {
      results.failed += 1
      errors.push({
        productId,
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  const leftover = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM greenhouse_commercial.product_catalog
      WHERE source_kind = 'hubspot_imported'`
  )

  console.log(
    JSON.stringify(
      {
        materialized: materializedProductIds.size,
        sync: results,
        leftoverHubSpotImported: Number(leftover[0]?.count ?? 0),
        errors
      },
      null,
      2
    )
  )
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
