import { NextResponse } from 'next/server'

import {
  assignApprovalDelegation,
  listApprovalDelegations,
  revokeApprovalDelegationById
} from '@/lib/reporting-hierarchy/admin'
import { HrCoreValidationError, requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)

    const delegations = await listApprovalDelegations({
      supervisorMemberId: searchParams.get('supervisorMemberId'),
      delegateMemberId: searchParams.get('delegateMemberId'),
      includeInactive: searchParams.get('includeInactive') === 'true'
    })

    return NextResponse.json({ delegations })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load approval delegations.')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      supervisorMemberId?: string
      delegateMemberId?: string
      effectiveFrom?: string | null
      effectiveTo?: string | null
    } | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const delegation = await assignApprovalDelegation({
      supervisorMemberId: body.supervisorMemberId || '',
      delegateMemberId: body.delegateMemberId || '',
      effectiveFrom: body.effectiveFrom,
      effectiveTo: body.effectiveTo
    })

    return NextResponse.json({ delegation }, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to assign approval delegation.')
  }
}

export async function DELETE(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as { responsibilityId?: string } | null

    if (!body?.responsibilityId) {
      throw new HrCoreValidationError('responsibilityId is required.')
    }

    await revokeApprovalDelegationById(body.responsibilityId)

    return NextResponse.json({ responsibilityId: body.responsibilityId, revoked: true })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to revoke approval delegation.')
  }
}
