import { NextResponse } from 'next/server'

import {
  getMemberLanguages,
  upsertMemberLanguage,
  removeMemberLanguage,
  LanguageValidationError
} from '@/lib/hr-core/languages'
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
    const items = await getMemberLanguages(memberId)

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof LanguageValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/languages] GET error:', error)

    return NextResponse.json({ error: 'Unable to load member languages.' }, { status: 500 })
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

    const items = await upsertMemberLanguage({
      memberId,
      input: {
        languageCode: body.languageCode,
        languageName: body.languageName,
        proficiencyLevel: body.proficiencyLevel,
        visibility: body.visibility
      },
      actorUserId: tenant.userId
    })

    return NextResponse.json({ items }, { status: 201 })
  } catch (error) {
    if (error instanceof LanguageValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/languages] POST error:', error)

    return NextResponse.json({ error: 'Unable to upsert member language.' }, { status: 500 })
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

    if (!body || typeof body !== 'object' || !body.languageCode) {
      return NextResponse.json({ error: 'languageCode is required in body' }, { status: 400 })
    }

    const items = await removeMemberLanguage({
      memberId,
      languageCode: body.languageCode,
      actorUserId: tenant.userId
    })

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof LanguageValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/languages] DELETE error:', error)

    return NextResponse.json({ error: 'Unable to remove member language.' }, { status: 500 })
  }
}
