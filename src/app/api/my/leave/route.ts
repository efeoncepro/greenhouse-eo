import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import { getPersonHrContext } from '@/lib/person-360/get-person-hr'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const hr = await getPersonHrContext(memberId)

    return NextResponse.json({
      leave: hr?.leave ?? null,
      memberId
    })
  } catch (error) {
    console.error('GET /api/my/leave failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
