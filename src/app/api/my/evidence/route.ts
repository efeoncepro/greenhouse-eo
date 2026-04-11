import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import {
  getMemberEvidence,
  createMemberEvidence,
  EvidenceValidationError
} from '@/lib/hr-core/evidence'

import type { CreateEvidenceInput } from '@/types/reputation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const items = await getMemberEvidence(memberId)

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof EvidenceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('GET /api/my/evidence failed:', error)

    return NextResponse.json({ error: 'Error interno al obtener evidencia.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const input: CreateEvidenceInput = {
      title: body.title,
      description: body.description ?? null,
      evidenceType: body.evidenceType,
      relatedSkillCode: body.relatedSkillCode ?? null,
      relatedToolCode: body.relatedToolCode ?? null,
      assetId: body.assetId ?? null,
      externalUrl: body.externalUrl ?? null,
      visibility: body.visibility
    }

    const evidence = await createMemberEvidence({
      memberId,
      input,
      actorUserId: tenant!.userId
    })

    return NextResponse.json({ evidence }, { status: 201 })
  } catch (error) {
    if (error instanceof EvidenceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('POST /api/my/evidence failed:', error)

    return NextResponse.json({ error: 'Error interno al crear evidencia.' }, { status: 500 })
  }
}
