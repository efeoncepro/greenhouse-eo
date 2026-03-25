import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import { getPersonRuntimeSnapshot } from '@/lib/person-360/get-person-runtime'
import { getPersonHrContext } from '@/lib/person-360/get-person-hr'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [runtime, hr] = await Promise.allSettled([
      getPersonRuntimeSnapshot(memberId),
      getPersonHrContext(memberId)
    ])

    return NextResponse.json({
      runtime: runtime.status === 'fulfilled' ? runtime.value : null,
      hr: hr.status === 'fulfilled' ? hr.value : null,
      memberId,
      tenantType: tenant.tenantType
    })
  } catch (error) {
    console.error('GET /api/my/dashboard failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
