import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import {
  getMemberLanguages,
  upsertMemberLanguage,
  removeMemberLanguage,
  LanguageValidationError
} from '@/lib/hr-core/languages'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const items = await getMemberLanguages(memberId)

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof LanguageValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('GET /api/my/languages failed:', error)

    return NextResponse.json({ error: 'Error interno al obtener idiomas.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const items = await upsertMemberLanguage({
      memberId,
      input: {
        languageCode: body.languageCode,
        languageName: body.languageName,
        proficiencyLevel: body.proficiencyLevel,
        visibility: body.visibility
      },
      actorUserId: tenant!.userId
    })

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof LanguageValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('POST /api/my/languages failed:', error)

    return NextResponse.json({ error: 'Error interno al guardar idioma.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const languageCode = typeof body.languageCode === 'string' ? body.languageCode.trim() : ''

    if (!languageCode) {
      return NextResponse.json({ error: 'languageCode es requerido.' }, { status: 400 })
    }

    const items = await removeMemberLanguage({
      memberId,
      languageCode,
      actorUserId: tenant!.userId
    })

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof LanguageValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('DELETE /api/my/languages failed:', error)

    return NextResponse.json({ error: 'Error interno al eliminar idioma.' }, { status: 500 })
  }
}
