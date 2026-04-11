import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import {
  updateMemberEvidence,
  deleteMemberEvidence,
  EvidenceValidationError
} from '@/lib/hr-core/evidence'

import type { UpdateEvidenceInput } from '@/types/reputation'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ evidenceId: string }> }
) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { evidenceId } = await params
    const body = await request.json()

    const input: UpdateEvidenceInput = {}

    if (body.title !== undefined) input.title = body.title
    if (body.description !== undefined) input.description = body.description
    if (body.evidenceType !== undefined) input.evidenceType = body.evidenceType
    if (body.relatedSkillCode !== undefined) input.relatedSkillCode = body.relatedSkillCode
    if (body.relatedToolCode !== undefined) input.relatedToolCode = body.relatedToolCode
    if (body.assetId !== undefined) input.assetId = body.assetId
    if (body.externalUrl !== undefined) input.externalUrl = body.externalUrl
    if (body.visibility !== undefined) input.visibility = body.visibility

    const evidence = await updateMemberEvidence({
      evidenceId,
      memberId,
      input,
      actorUserId: tenant!.userId
    })

    return NextResponse.json({ evidence })
  } catch (error) {
    if (error instanceof EvidenceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('PATCH /api/my/evidence/[id] failed:', error)

    return NextResponse.json({ error: 'Error interno al actualizar evidencia.' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ evidenceId: string }> }
) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { evidenceId } = await params

    await deleteMemberEvidence({
      evidenceId,
      memberId,
      actorUserId: tenant!.userId
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof EvidenceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('DELETE /api/my/evidence/[id] failed:', error)

    return NextResponse.json({ error: 'Error interno al eliminar evidencia.' }, { status: 500 })
  }
}
