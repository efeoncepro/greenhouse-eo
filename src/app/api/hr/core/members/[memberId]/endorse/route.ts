import { NextResponse } from 'next/server'

import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import {
  createEndorsement,
  EndorsementValidationError
} from '@/lib/hr-core/endorsements'

import type { CreateEndorsementInput } from '@/types/reputation'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const endorserMemberId = tenant.memberId || null

  if (!endorserMemberId) {
    return NextResponse.json({ error: 'Member identity not linked' }, { status: 422 })
  }

  try {
    const { memberId } = await params
    const body = (await request.json().catch(() => null)) as CreateEndorsementInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const input: CreateEndorsementInput = {
      skillCode: body.skillCode ?? null,
      toolCode: body.toolCode ?? null,
      comment: body.comment ?? null,
      visibility: body.visibility
    }

    const endorsement = await createEndorsement({
      memberId,
      endorsedByMemberId: endorserMemberId,
      input
    })

    return NextResponse.json({ endorsement }, { status: 201 })
  } catch (error) {
    if (error instanceof EndorsementValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/endorse] POST error:', error)

    return NextResponse.json({ error: 'Unable to create endorsement.' }, { status: 500 })
  }
}
