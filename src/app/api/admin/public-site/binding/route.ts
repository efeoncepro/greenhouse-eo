import 'server-only'

import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { readPublicSiteAstroBinding } from '@/lib/public-site/astro'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/public-site/binding
 *
 * Read-only Greenhouse control-plane reader for the target Astro/Vercel public
 * site rail. It composes static binding + route ownership + live GitHub/Vercel
 * state and never deploys, rolls back, edits assets or touches DNS.
 */
export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'public_site.runtime_binding.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'public_site.runtime_binding.read' }
    })
  }

  if (!can(tenant, 'public_site.route_ownership.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'public_site.route_ownership.read' }
    })
  }

  try {
    const packet = await readPublicSiteAstroBinding()

    return NextResponse.json(packet)
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'api_admin_public_site_binding' }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
