import { NextResponse } from 'next/server'

import { consumeAiCredits } from '@/lib/ai-tools/service'
import { requireAiOperatorTenantContext, toAiToolingErrorResponse } from '@/lib/ai-tools/shared'
import type { ConsumeCreditsInput } from '@/types/ai-tools'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAiOperatorTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as ConsumeCreditsInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const result = await consumeAiCredits({
      input: body,
      actorUserId: tenant.userId
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to consume AI credits.')
  }
}
