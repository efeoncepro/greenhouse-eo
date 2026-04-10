import { NextResponse } from 'next/server'

import {
  getMemberSkillsForSpaceMember,
  replaceMemberSkillsForSpaceMember,
  StaffingValidationError
} from '@/lib/agency/skills-staffing'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

import type { UpsertMemberSkillInput } from '@/types/agency-skills'

export const dynamic = 'force-dynamic'

const toErrorResponse = (error: unknown, fallback: string) => {
  if (error instanceof StaffingValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }

  console.error(fallback, error)

  return NextResponse.json({ error: fallback }, { status: 500 })
}

export async function GET(request: Request, context: { params: Promise<{ memberId: string }> }) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await context.params
    const { searchParams } = new URL(request.url)
    const spaceId = searchParams.get('spaceId')

    if (!spaceId) {
      return NextResponse.json({ error: 'spaceId es requerido.' }, { status: 400 })
    }

    return NextResponse.json(await getMemberSkillsForSpaceMember({ spaceId, memberId }))
  } catch (error) {
    return toErrorResponse(error, 'Unable to load member skills.')
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ memberId: string }> }) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await context.params

    const body = (await request.json().catch(() => null)) as {
      spaceId?: string
      skills?: UpsertMemberSkillInput[]
    } | null

    if (!body?.spaceId) {
      return NextResponse.json({ error: 'spaceId es requerido.' }, { status: 400 })
    }

    if (!Array.isArray(body.skills)) {
      return NextResponse.json({ error: 'skills debe ser un arreglo.' }, { status: 400 })
    }

    return NextResponse.json(
      await replaceMemberSkillsForSpaceMember({
        spaceId: body.spaceId,
        memberId,
        skills: body.skills,
        actorUserId: tenant.userId
      })
    )
  } catch (error) {
    return toErrorResponse(error, 'Unable to update member skills.')
  }
}
