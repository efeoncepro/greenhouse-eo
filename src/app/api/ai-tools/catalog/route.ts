import { NextResponse } from 'next/server'

import { listAiToolsCatalog } from '@/lib/ai-tools/service'
import { requireAiOperatorTenantContext, toAiToolingErrorResponse } from '@/lib/ai-tools/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAiOperatorTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const costModel = searchParams.get('costModel')
    const activeOnly = searchParams.get('activeOnly') !== 'false'
    const data = await listAiToolsCatalog({ category, costModel, activeOnly })

    return NextResponse.json(data)
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to load AI tools catalog.')
  }
}
