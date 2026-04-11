import { NextResponse } from 'next/server'

import {
  updateMemberCertification,
  deleteMemberCertification,
  CertificationValidationError
} from '@/lib/hr-core/certifications'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

import type { UpdateCertificationInput } from '@/types/certifications'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string; certificationId: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId, certificationId } = await params
    const body = (await request.json().catch(() => null)) as UpdateCertificationInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const certification = await updateMemberCertification({
      certificationId,
      memberId,
      input: body,
      actorUserId: tenant.userId
    })

    return NextResponse.json({ certification })
  } catch (error) {
    if (error instanceof CertificationValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/certifications/[id]] PATCH error:', error)

    return NextResponse.json({ error: 'Unable to update certification.' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ memberId: string; certificationId: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId, certificationId } = await params

    await deleteMemberCertification({
      certificationId,
      memberId,
      actorUserId: tenant.userId
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof CertificationValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/certifications/[id]] DELETE error:', error)

    return NextResponse.json({ error: 'Unable to delete certification.' }, { status: 500 })
  }
}
