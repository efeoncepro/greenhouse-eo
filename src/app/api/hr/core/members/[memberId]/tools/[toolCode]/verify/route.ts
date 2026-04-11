import { NextResponse } from 'next/server'

import {
  verifyMemberTool,
  unverifyMemberTool,
  rejectMemberTool,
  ToolValidationError
} from '@/lib/hr-core/tools'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

import type { MemberTool } from '@/types/talent-taxonomy'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ memberId: string; toolCode: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId, toolCode } = await params
    const body = await request.json().catch(() => null)

    if (!body || !body.action) {
      return NextResponse.json({ error: 'action is required (verify | unverify | reject).' }, { status: 400 })
    }

    let items: MemberTool[]

    if (body.action === 'verify') {
      items = await verifyMemberTool({
        memberId,
        toolCode,
        actorUserId: tenant.userId
      })
    } else if (body.action === 'unverify') {
      items = await unverifyMemberTool({
        memberId,
        toolCode,
        actorUserId: tenant.userId
      })
    } else if (body.action === 'reject') {
      items = await rejectMemberTool({
        memberId,
        toolCode,
        actorUserId: tenant.userId,
        reason: typeof body.rejectionReason === 'string' ? body.rejectionReason.trim() || null : null
      })
    } else {
      return NextResponse.json(
        { error: 'action must be "verify", "unverify", or "reject".' },
        { status: 400 }
      )
    }

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof ToolValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/tools/verify] POST error:', error)

    return NextResponse.json({ error: 'Unable to verify/unverify/reject member tool.' }, { status: 500 })
  }
}
