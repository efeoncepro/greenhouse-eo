import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import {
  updateMemberCertification,
  deleteMemberCertification,
  CertificationValidationError
} from '@/lib/hr-core/certifications'

import type { UpdateCertificationInput } from '@/types/certifications'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ certificationId: string }> }
) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { certificationId } = await params
    const body = await request.json()

    const input: UpdateCertificationInput = {}

    if (body.name !== undefined) input.name = body.name
    if (body.issuer !== undefined) input.issuer = body.issuer
    if (body.issuedDate !== undefined) input.issuedDate = body.issuedDate
    if (body.expiryDate !== undefined) input.expiryDate = body.expiryDate
    if (body.validationUrl !== undefined) input.validationUrl = body.validationUrl
    if (body.assetId !== undefined) input.assetId = body.assetId
    if (body.visibility !== undefined) input.visibility = body.visibility
    if (body.notes !== undefined) input.notes = body.notes

    const certification = await updateMemberCertification({
      certificationId,
      memberId,
      input,
      actorUserId: tenant!.userId
    })

    return NextResponse.json({ certification })
  } catch (error) {
    if (error instanceof CertificationValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('PATCH /api/my/certifications/[id] failed:', error)

    return NextResponse.json({ error: 'Error interno al actualizar certificacion.' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ certificationId: string }> }
) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { certificationId } = await params

    await deleteMemberCertification({
      certificationId,
      memberId,
      actorUserId: tenant!.userId
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof CertificationValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('DELETE /api/my/certifications/[id] failed:', error)

    return NextResponse.json({ error: 'Error interno al eliminar certificacion.' }, { status: 500 })
  }
}
