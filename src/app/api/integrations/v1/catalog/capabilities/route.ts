import { NextResponse } from 'next/server'

import { requireIntegrationRequest } from '@/lib/integrations/integration-auth'
import { listCapabilityCatalogForIntegration } from '@/lib/integrations/greenhouse-integration'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireIntegrationRequest(request)

  if (!authorized) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await listCapabilityCatalogForIntegration()

  return NextResponse.json(payload)
}
