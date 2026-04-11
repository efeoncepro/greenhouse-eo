import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import {
  getMemberEndorsements,
  EndorsementValidationError
} from '@/lib/hr-core/endorsements'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const items = await getMemberEndorsements(memberId)

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof EndorsementValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('GET /api/my/endorsements failed:', error)

    return NextResponse.json({ error: 'Error interno al obtener endorsements.' }, { status: 500 })
  }
}
