import 'server-only'

import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { inspectPublicSiteBridge } from '@/lib/public-site/bridge-inspection'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const parsePositiveInteger = (value: string | null) => {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const toBooleanFlag = (value: string | null, defaultValue: boolean) => {
  if (value === null) return defaultValue

  return !['0', 'false', 'no'].includes(value.trim().toLowerCase())
}

/**
 * GET /api/admin/public-site/bridge-inspection?pageId=244079
 *
 * Read-only control-plane lane for the active WordPress bridge. It inspects
 * authenticated health, Elementor document structure and the Ohio widget
 * catalog without mutating WordPress, publishing content, clearing cache or
 * creating backups.
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'platform.public_site.bridge.inspect', 'read', 'all')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const pageId = parsePositiveInteger(url.searchParams.get('pageId'))

  if (!pageId) {
    return NextResponse.json({ error: 'pageId must be a positive integer' }, { status: 400 })
  }

  try {
    const report = await inspectPublicSiteBridge({
      pageId,
      includeCatalog: toBooleanFlag(url.searchParams.get('includeCatalog'), true)
    })

    return NextResponse.json(report)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (message.startsWith('wordpress_authentication_not_configured:')) {
      return NextResponse.json(
        {
          error: 'WordPress bridge authentication is not configured for this runtime',
          code: 'public_site_bridge_auth_not_configured'
        },
        { status: 503 }
      )
    }

    captureWithDomain(error, 'cloud', {
      tags: { source: 'api_admin_public_site_bridge_inspection', stage: 'inspect_bridge' }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error) },
      { status: 500 }
    )
  }
}
