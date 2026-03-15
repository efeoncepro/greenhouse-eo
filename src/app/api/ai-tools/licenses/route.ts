import { NextResponse } from 'next/server'

import { listAiToolLicenses } from '@/lib/ai-tools/service'
import { requireAiOperatorTenantContext, toAiToolingErrorResponse } from '@/lib/ai-tools/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAiOperatorTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const status = searchParams.get('status')
    const data = await listAiToolLicenses({ memberId, status })

    return NextResponse.json(data)
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to load AI tool licenses.')
  }
}
