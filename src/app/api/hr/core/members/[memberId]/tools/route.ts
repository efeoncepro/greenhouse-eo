import { NextResponse } from 'next/server'

import {
  getMemberTools,
  upsertMemberTool,
  removeMemberTool,
  ToolValidationError
} from '@/lib/hr-core/tools'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

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
    const items = await getMemberTools(memberId)

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof ToolValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/tools] GET error:', error)

    return NextResponse.json({ error: 'Unable to load member tools.' }, { status: 500 })
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

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const items = await upsertMemberTool({
      memberId,
      input: {
        toolCode: body.toolCode,
        proficiencyLevel: body.proficiencyLevel,
        visibility: body.visibility,
        notes: body.notes
      },
      actorUserId: tenant.userId
    })

    return NextResponse.json({ items }, { status: 201 })
  } catch (error) {
    if (error instanceof ToolValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/tools] POST error:', error)

    return NextResponse.json({ error: 'Unable to upsert member tool.' }, { status: 500 })
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

    if (!body || typeof body !== 'object' || !body.toolCode) {
      return NextResponse.json({ error: 'toolCode is required in body' }, { status: 400 })
    }

    const items = await removeMemberTool({
      memberId,
      toolCode: body.toolCode,
      actorUserId: tenant.userId
    })

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof ToolValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/tools] DELETE error:', error)

    return NextResponse.json({ error: 'Unable to remove member tool.' }, { status: 500 })
  }
}
