import { NextResponse } from 'next/server'

import {
  getMemberSkillsDirect,
  upsertSingleMemberSkill,
  removeSingleMemberSkill,
  StaffingValidationError
} from '@/lib/agency/skills-staffing'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

import type { MemberSkill } from '@/types/agency-skills'

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
    const items: MemberSkill[] = await getMemberSkillsDirect(memberId)

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof StaffingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/skills] GET error:', error)

    return NextResponse.json({ error: 'Unable to load member skills.' }, { status: 500 })
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
    const body = await request.json().catch(() => null)

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { skillCode, seniorityLevel, notes, visibility } = body

    if (!skillCode || !seniorityLevel) {
      return NextResponse.json(
        { error: 'skillCode and seniorityLevel are required.' },
        { status: 400 }
      )
    }

    const items = await upsertSingleMemberSkill({
      memberId,
      input: { skillCode, seniorityLevel, notes: notes ?? null, visibility },
      actorUserId: tenant.userId
    })

    return NextResponse.json({ items }, { status: 201 })
  } catch (error) {
    if (error instanceof StaffingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/skills] POST error:', error)

    return NextResponse.json({ error: 'Unable to upsert member skill.' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await params
    const body = await request.json().catch(() => null)

    if (!body || !body.skillCode) {
      return NextResponse.json({ error: 'skillCode is required.' }, { status: 400 })
    }

    const items = await removeSingleMemberSkill({
      memberId,
      skillCode: body.skillCode,
      actorUserId: tenant.userId
    })

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof StaffingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/skills] DELETE error:', error)

    return NextResponse.json({ error: 'Unable to remove member skill.' }, { status: 500 })
  }
}
