import { NextResponse } from 'next/server'

import {
  verifyCertification,
  rejectCertification,
  CertificationValidationError
} from '@/lib/hr-core/certifications'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ memberId: string; certificationId: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId, certificationId } = await params
    const body = await request.json().catch(() => null)

    if (!body || !body.action) {
      return NextResponse.json(
        { error: 'action is required (verify | reject).' },
        { status: 400 }
      )
    }

    if (body.action === 'verify') {
      const certification = await verifyCertification({
        certificationId,
        memberId,
        actorUserId: tenant.userId
      })

      return NextResponse.json({ certification })
    }

    if (body.action === 'reject') {
      const certification = await rejectCertification({
        certificationId,
        memberId,
        actorUserId: tenant.userId,
        reason: typeof body.rejectionReason === 'string' ? body.rejectionReason.trim() || null : null
      })

      return NextResponse.json({ certification })
    }

    return NextResponse.json(
      { error: 'action must be "verify" or "reject".' },
      { status: 400 }
    )
  } catch (error) {
    if (error instanceof CertificationValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/certifications/verify] POST error:', error)

    return NextResponse.json({ error: 'Unable to verify/reject certification.' }, { status: 500 })
  }
}
