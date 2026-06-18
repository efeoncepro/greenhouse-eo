import 'server-only'

import { NextResponse } from 'next/server'

import {
  PUBLIC_SITE_GITHUB_CONTROL_PLANE_CONTRACT_VERSION,
  composePublicSiteGithubControlPlanePacket
} from '@/lib/public-site/astro/github-control-plane'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const packet = await composePublicSiteGithubControlPlanePacket()

    return NextResponse.json(packet, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Greenhouse-Contract': PUBLIC_SITE_GITHUB_CONTROL_PLANE_CONTRACT_VERSION
      }
    })
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: {
        source: 'api_admin_public_site_github_control_plane',
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
          'X-Greenhouse-Contract': PUBLIC_SITE_GITHUB_CONTROL_PLANE_CONTRACT_VERSION
        }
      }
    )
  }
}
