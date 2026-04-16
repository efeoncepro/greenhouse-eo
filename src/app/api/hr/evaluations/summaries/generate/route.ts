import { NextResponse } from 'next/server'

import { generateEvalSummary } from '@/lib/hr-evals/summary-generator'
import { requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { cycleId, memberId } = body as { cycleId?: string; memberId?: string }

    if (!cycleId || !memberId) {
      return NextResponse.json({ error: 'cycleId and memberId are required' }, { status: 400 })
    }

    const summary = await generateEvalSummary(cycleId, memberId)

    return NextResponse.json(summary, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to generate evaluation summary.')
  }
}
