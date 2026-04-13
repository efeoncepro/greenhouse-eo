import { NextResponse } from 'next/server'

import { checkMultipleReadiness } from '@/lib/integrations/readiness'
import { getRequestedIntegrationKeys, runSisterPlatformReadRoute } from '@/lib/sister-platforms/external-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runSisterPlatformReadRoute({
    request,
    routeKey: 'sister-platforms.readiness',
    handler: async ({ requestId, binding }) => {
      const keys = getRequestedIntegrationKeys(request)
      const results = await checkMultipleReadiness(keys)
      const allReady = [...results.values()].every(result => result.ready)

      return NextResponse.json({
        requestId,
        binding,
        allReady,
        results: Object.fromEntries(results)
      })
    }
  })
}
