import { NextResponse } from 'next/server'

import {
  getMemberCertifications,
  createMemberCertification,
  CertificationValidationError
} from '@/lib/hr-core/certifications'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

import type { CreateCertificationInput } from '@/types/certifications'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await params
    const items = await getMemberCertifications(memberId)

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof CertificationValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/certifications] GET error:', error)

    return NextResponse.json({ error: 'Unable to load member certifications.' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await params
    const body = (await request.json().catch(() => null)) as CreateCertificationInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const certification = await createMemberCertification({
      memberId,
      input: body,
      actorUserId: tenant.userId
    })

    return NextResponse.json({ certification }, { status: 201 })
  } catch (error) {
    if (error instanceof CertificationValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/certifications] POST error:', error)

    return NextResponse.json({ error: 'Unable to create certification.' }, { status: 500 })
  }
}
