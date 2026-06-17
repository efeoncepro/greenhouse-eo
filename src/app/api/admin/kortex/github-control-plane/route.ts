import 'server-only'

import { NextResponse } from 'next/server'

import {
  KORTEX_GITHUB_CONTROL_PLANE_CONTRACT_VERSION,
  composeKortexGithubControlPlanePacket
} from '@/lib/kortex/github-control-plane'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const packet = await composeKortexGithubControlPlanePacket()

    return NextResponse.json(packet, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Greenhouse-Contract': KORTEX_GITHUB_CONTROL_PLANE_CONTRACT_VERSION
      }
    })
  } catch (error) {
    captureWithDomain(error, 'integrations.kortex', {
      tags: {
        source: 'api_admin_kortex_github_control_plane',
        stage: 'compose_packet'
      }
    })

    return NextResponse.json(
      {
        error: redactErrorForResponse(error),
        code: 'internal_error'
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'X-Greenhouse-Contract': KORTEX_GITHUB_CONTROL_PLANE_CONTRACT_VERSION
        }
      }
    )
  }
}
