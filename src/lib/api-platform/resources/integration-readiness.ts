import 'server-only'

import { checkMultipleReadiness } from '@/lib/integrations/readiness'
import { getIntegrationRegistry } from '@/lib/integrations/registry'

const parseRequestedKeys = async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const keysParam = searchParams.get('keys')?.trim()

  if (keysParam) {
    const keys = keysParam
      .split(',')
      .map(key => key.trim())
      .filter(Boolean)

    return Array.from(new Set(keys))
  }

  const registry = await getIntegrationRegistry()

  return registry.map(entry => entry.integrationKey)
}

export const getEcosystemIntegrationReadiness = async (request: Request) => {
  const keys = await parseRequestedKeys(request)
  const results = await checkMultipleReadiness(keys)

  return {
    requestedKeys: keys,
    allReady: [...results.values()].every(result => result.ready),
    results: Object.fromEntries(results)
  }
}
