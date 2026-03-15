import { NextResponse } from 'next/server'

import { reloadAiCredits } from '@/lib/ai-tools/service'
import { requireAiOperatorTenantContext, toAiToolingErrorResponse } from '@/lib/ai-tools/shared'
import type { ReloadCreditsInput } from '@/types/ai-tools'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAiOperatorTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as ReloadCreditsInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const result = await reloadAiCredits({
      input: body,
      actorUserId: tenant.userId
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to reload AI credits.')
  }
}
