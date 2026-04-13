import { NextResponse } from 'next/server'

import { listCapabilityCatalogForIntegration } from '@/lib/integrations/greenhouse-integration'
import { runSisterPlatformReadRoute } from '@/lib/sister-platforms/external-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runSisterPlatformReadRoute({
    request,
    routeKey: 'sister-platforms.catalog.capabilities',
    handler: async ({ requestId, binding }) => {
      const payload = await listCapabilityCatalogForIntegration()

      return NextResponse.json({
        requestId,
        binding,
        ...payload
      })
    }
  })
}
