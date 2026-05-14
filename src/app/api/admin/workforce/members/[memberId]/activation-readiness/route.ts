import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { resolveWorkforceActivationReadiness } from '@/lib/workforce/activation/readiness'

export const dynamic = 'force-dynamic'

export const GET = async (_request: Request, { params }: { params: Promise<{ memberId: string }> }) => {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'workforce.member.activation_readiness.read', 'read', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden — capability workforce.member.activation_readiness.read required' }, { status: 403 })
  }

  const { memberId } = await params

  if (!memberId) {
    return NextResponse.json({ error: 'memberId path param is required' }, { status: 400 })
  }

  try {
    return NextResponse.json(await resolveWorkforceActivationReadiness(memberId))
  } catch (error) {
    captureWithDomain(error instanceof Error ? error : new Error(String(error)), 'identity', {
      tags: { source: 'workforce_member_activation_readiness', stage: 'api_get' },
      extra: { memberId }
    })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}
