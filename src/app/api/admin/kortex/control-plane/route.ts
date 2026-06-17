import 'server-only'

import { NextResponse } from 'next/server'

import {
  composeKortexControlPlanePacket,
  KORTEX_CONTROL_PLANE_CONTRACT_VERSION
} from '@/lib/kortex/control-plane'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const sanitizeQueryValue = (value: string | null) => {
  const normalized = value?.trim()

  return normalized ? normalized : null
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)

    const packet = await composeKortexControlPlanePacket({
      portalId: sanitizeQueryValue(url.searchParams.get('portal_id') ?? url.searchParams.get('portalId')),
      hubspotPortalId: sanitizeQueryValue(url.searchParams.get('hubspot_portal_id') ?? url.searchParams.get('hubspotPortalId')),
      tenant
    })

    return NextResponse.json(packet, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Greenhouse-Contract': KORTEX_CONTROL_PLANE_CONTRACT_VERSION
      }
    })
  } catch (error) {
    captureWithDomain(error, 'integrations.kortex', {
      tags: { source: 'api_admin_kortex_control_plane', stage: 'compose_reader' }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error) },
      { status: 500 }
    )
  }
}
