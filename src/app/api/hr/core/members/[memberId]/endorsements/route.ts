import { NextResponse } from 'next/server'

import { requireHrTenantContext } from '@/lib/tenant/authorization'
import {
  getMemberEndorsements,
  moderateEndorsement,
  EndorsementValidationError
} from '@/lib/hr-core/endorsements'

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
    const items = await getMemberEndorsements(memberId)

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof EndorsementValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/endorsements] GET error:', error)

    return NextResponse.json({ error: 'Unable to load member endorsements.' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await params

    const body = (await request.json().catch(() => null)) as {
      endorsementId?: string
      status?: 'moderated' | 'removed'
    } | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body.endorsementId) {
      return NextResponse.json({ error: 'endorsementId es requerido.' }, { status: 400 })
    }

    if (!body.status || !['moderated', 'removed'].includes(body.status)) {
      return NextResponse.json({ error: 'status debe ser "moderated" o "removed".' }, { status: 400 })
    }

    await moderateEndorsement({
      endorsementId: body.endorsementId,
      status: body.status,
      actorUserId: tenant.userId
    })

    // Return updated list for the member
    const items = await getMemberEndorsements(memberId)

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof EndorsementValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/endorsements] PATCH error:', error)

    return NextResponse.json({ error: 'Unable to moderate endorsement.' }, { status: 500 })
  }
}
