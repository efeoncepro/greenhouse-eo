import { NextResponse } from 'next/server'

import { requireIntegrationRequest } from '@/lib/integrations/integration-auth'
import { checkMultipleReadiness } from '@/lib/integrations/readiness'

export const dynamic = 'force-dynamic'

/**
 * Check readiness for one or more integrations.
 * Query: ?keys=notion,hubspot
 * Returns readiness status for each requested integration.
 */
export async function GET(request: Request) {
  const { authorized, errorResponse } = requireIntegrationRequest(request)

  if (!authorized) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const keysParam = url.searchParams.get('keys')

  if (!keysParam) {
    return NextResponse.json({ error: 'Missing required query param: keys (comma-separated integration keys)' }, { status: 400 })
  }

  const keys = keysParam.split(',').map(k => k.trim()).filter(Boolean)

  if (keys.length === 0) {
    return NextResponse.json({ error: 'No valid integration keys provided' }, { status: 400 })
  }

  const results = await checkMultipleReadiness(keys)

  const allReady = [...results.values()].every(r => r.ready)

  return NextResponse.json({
    allReady,
    results: Object.fromEntries(results)
  })
}
