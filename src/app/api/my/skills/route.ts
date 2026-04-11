import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import {
  getMemberSkillsDirect,
  upsertSingleMemberSkill,
  removeSingleMemberSkill,
  listSkillCatalog,
  StaffingValidationError
} from '@/lib/agency/skills-staffing'

import type { UpsertMemberSkillInput } from '@/types/agency-skills'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [items, catalog] = await Promise.all([
      getMemberSkillsDirect(memberId),
      listSkillCatalog()
    ])

    return NextResponse.json({ items, catalog })
  } catch (error) {
    if (error instanceof StaffingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('GET /api/my/skills failed:', error)

    return NextResponse.json({ error: 'Error interno al obtener skills.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const input: UpsertMemberSkillInput = {
      skillCode: body.skillCode,
      seniorityLevel: body.seniorityLevel,
      notes: body.notes ?? null,
      sourceSystem: 'self_service',
      visibility: body.visibility
    }

    const items = await upsertSingleMemberSkill({
      memberId,
      input,
      actorUserId: tenant!.userId
    })

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof StaffingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('POST /api/my/skills failed:', error)

    return NextResponse.json({ error: 'Error interno al guardar skill.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const skillCode = typeof body.skillCode === 'string' ? body.skillCode.trim() : ''

    if (!skillCode) {
      return NextResponse.json({ error: 'skillCode es requerido.' }, { status: 400 })
    }

    const items = await removeSingleMemberSkill({
      memberId,
      skillCode,
      actorUserId: tenant!.userId
    })

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof StaffingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('DELETE /api/my/skills failed:', error)

    return NextResponse.json({ error: 'Error interno al eliminar skill.' }, { status: 500 })
  }
}
