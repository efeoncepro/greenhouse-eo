#!/usr/bin/env tsx
/**
 * Sync a single HubSpot company on demand (raw → core promotion).
 *
 * Usage:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/integrations/hubspot-sync-company.ts <hubspotCompanyId> [--no-promote]
 */

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { syncHubSpotCompanyById } from '@/lib/hubspot/sync-company-by-id'

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const args = process.argv.slice(2)
  const hubspotCompanyId = args[0]
  const promote = !args.includes('--no-promote')

  if (!hubspotCompanyId) {
    console.error('Usage: hubspot-sync-company.ts <hubspotCompanyId> [--no-promote]')
    process.exit(1)
  }

  console.log(`[hubspot-sync-company] Syncing HubSpot company ${hubspotCompanyId} (promote=${promote})...`)
  const result = await syncHubSpotCompanyById(hubspotCompanyId, { promote })

  console.log('[hubspot-sync-company] Result:')
  console.log(JSON.stringify(result, null, 2))
}

main().catch(err => {
  console.error('[hubspot-sync-company] FAILED:', err.message)
  console.error(err.stack)
  process.exit(1)
})
