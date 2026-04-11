import { NextResponse } from 'next/server'

import {
  verifyMemberSkill,
  unverifyMemberSkill,
  StaffingValidationError
} from '@/lib/agency/skills-staffing'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

import type { MemberSkill } from '@/types/agency-skills'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ memberId: string; skillCode: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId, skillCode } = await params
    const body = await request.json().catch(() => null)

    if (!body || !body.action) {
      return NextResponse.json({ error: 'action is required (verify | unverify).' }, { status: 400 })
    }

    let items: MemberSkill[]

    if (body.action === 'verify') {
      items = await verifyMemberSkill({
        memberId,
        skillCode,
        actorUserId: tenant.userId
      })
    } else if (body.action === 'unverify') {
      items = await unverifyMemberSkill({
        memberId,
        skillCode,
        actorUserId: tenant.userId
      })
    } else {
      return NextResponse.json(
        { error: 'action must be "verify" or "unverify".' },
        { status: 400 }
      )
    }

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof StaffingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/skills/verify] POST error:', error)

    return NextResponse.json({ error: 'Unable to verify/unverify member skill.' }, { status: 500 })
  }
}
