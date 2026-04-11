import { NextResponse } from 'next/server'

import { requireHrTenantContext } from '@/lib/tenant/authorization'
import {
  getMemberEvidence,
  EvidenceValidationError
} from '@/lib/hr-core/evidence'

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
    const items = await getMemberEvidence(memberId)

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof EvidenceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/evidence] GET error:', error)

    return NextResponse.json({ error: 'Unable to load member evidence.' }, { status: 500 })
  }
}
