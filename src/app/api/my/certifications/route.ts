import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import {
  getMemberCertifications,
  createMemberCertification,
  CertificationValidationError
} from '@/lib/hr-core/certifications'

import type { CreateCertificationInput } from '@/types/certifications'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const items = await getMemberCertifications(memberId)

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof CertificationValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('GET /api/my/certifications failed:', error)

    return NextResponse.json({ error: 'Error interno al obtener certificaciones.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const input: CreateCertificationInput = {
      name: body.name,
      issuer: body.issuer,
      issuedDate: body.issuedDate ?? null,
      expiryDate: body.expiryDate ?? null,
      validationUrl: body.validationUrl ?? null,
      assetId: body.assetId ?? null,
      visibility: body.visibility,
      notes: body.notes ?? null
    }

    const certification = await createMemberCertification({
      memberId,
      input,
      actorUserId: tenant!.userId
    })

    return NextResponse.json({ certification }, { status: 201 })
  } catch (error) {
    if (error instanceof CertificationValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('POST /api/my/certifications failed:', error)

    return NextResponse.json({ error: 'Error interno al crear certificacion.' }, { status: 500 })
  }
}
