import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import {
  listToolCatalog,
  getMemberTools,
  upsertMemberTool,
  removeMemberTool,
  ToolValidationError
} from '@/lib/hr-core/tools'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [items, catalog] = await Promise.all([
      getMemberTools(memberId),
      listToolCatalog()
    ])

    return NextResponse.json({ items, catalog })
  } catch (error) {
    if (error instanceof ToolValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('GET /api/my/tools failed:', error)

    return NextResponse.json({ error: 'Error interno al obtener herramientas.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const items = await upsertMemberTool({
      memberId,
      input: {
        toolCode: body.toolCode,
        proficiencyLevel: body.proficiencyLevel,
        visibility: body.visibility,
        notes: body.notes ?? null
      },
      actorUserId: tenant!.userId
    })

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof ToolValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('POST /api/my/tools failed:', error)

    return NextResponse.json({ error: 'Error interno al guardar herramienta.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const toolCode = typeof body.toolCode === 'string' ? body.toolCode.trim() : ''

    if (!toolCode) {
      return NextResponse.json({ error: 'toolCode es requerido.' }, { status: 400 })
    }

    const items = await removeMemberTool({
      memberId,
      toolCode,
      actorUserId: tenant!.userId
    })

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof ToolValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('DELETE /api/my/tools failed:', error)

    return NextResponse.json({ error: 'Error interno al eliminar herramienta.' }, { status: 500 })
  }
}
