import { NextResponse } from 'next/server'

import {
  normalizeCommercialCostBasisRequest,
  runCommercialCostBasisMaterialization
} from '@/lib/commercial-cost-worker/materialize'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    if (body.allowInlineFallback !== true) {
      return NextResponse.json(
        {
          error: 'Use commercial-cost-worker for primary execution. Set allowInlineFallback=true for an explicit manual fallback.',
          servicePath: '/cost-basis/materialize'
        },
        { status: 409 }
      )
    }

    const requestInput = normalizeCommercialCostBasisRequest(body, {
      triggerSource: 'next_internal_fallback',
      triggeredBy: tenant.userId || 'internal_admin',
      tenantScope: {
        organizationId: tenant.organizationId ?? null,
        clientId: tenant.clientId ?? null,
        spaceId: tenant.spaceId ?? null
      }
    })

    if (requestInput.scope === 'roles') {
      return NextResponse.json(
        {
          error: 'Role cost basis materialization is reserved for TASK-477.',
          taskId: 'TASK-477'
        },
        { status: 501 }
      )
    }

    if (requestInput.monthsBack > 1) {
      return NextResponse.json(
        {
          error: 'Inline fallback only supports monthsBack=1. Use commercial-cost-worker for multi-period runs.',
          servicePath: '/cost-basis/materialize'
        },
        { status: 400 }
      )
    }

    const result = await runCommercialCostBasisMaterialization(requestInput)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
