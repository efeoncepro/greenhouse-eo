import { NextResponse } from 'next/server'

import { getAiCreditSummary } from '@/lib/ai-tools/service'
import { requireAiCreditsReadTenantContext, toAiToolingErrorResponse } from '@/lib/ai-tools/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAiCreditsReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const period = searchParams.get('period') || 'current_month'

    const data = await getAiCreditSummary({
      tenant,
      clientId,
      period
    })

    return NextResponse.json(data)
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to load AI credit summary.')
  }
}
