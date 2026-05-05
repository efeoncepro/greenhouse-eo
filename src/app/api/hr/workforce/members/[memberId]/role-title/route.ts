import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { requireHrCoreReadTenantContext } from '@/lib/hr-core/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { getRoleTitleGovernanceForMember } from '@/lib/workforce/role-title'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ memberId: string }>
}

/**
 * TASK-785 — GET /api/hr/workforce/members/[memberId]/role-title
 *
 * Capability: requiere algo del paquete workforce role_title (read básico
 * via review_drift, update via update). Devuelve el contrato canonico de
 * governance: cargo actual + source + Entra + drift + pending proposal.
 *
 * Surface: HR profile tab (`MemberRoleTitleSection`) lo consume.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { memberId } = await params

  const { tenant, errorResponse: authErr } = await requireHrCoreReadTenantContext()

  if (!tenant || authErr) {
    return authErr ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Cualquiera de las 2 capabilities relevantes habilita la lectura del contrato
  // (HR review queue + HR update).
  const canRead =
    can(tenant, 'workforce.role_title.update', 'update', 'tenant') ||
    can(tenant, 'workforce.role_title.review_drift', 'read', 'tenant')

  if (!canRead) {
    return NextResponse.json(
      { error: 'Capability missing: workforce.role_title.update | review_drift', code: 'forbidden' },
      { status: 403 }
    )
  }

  try {
    const governance = await getRoleTitleGovernanceForMember(memberId)

    if (!governance) {
      return NextResponse.json(
        { error: 'Member not found', code: 'not_found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...governance,
      capabilities: {
        canUpdate: can(tenant, 'workforce.role_title.update', 'update', 'tenant'),
        canResolveDrift: can(tenant, 'workforce.role_title.review_drift', 'approve', 'tenant')
      }
    })
  } catch (error) {
    captureWithDomain(error, 'identity', {
      extra: { route: 'hr/workforce/members/role-title', memberId, method: 'GET' }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error), code: 'internal_error' },
      { status: 500 }
    )
  }
}
