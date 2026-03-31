import { NextResponse } from 'next/server'

import { getAiToolingAdminMetadata } from '@/lib/ai-tools/service'
import { toAiToolingErrorResponse } from '@/lib/ai-tools/shared'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getAiToolingAdminMetadata()

    return NextResponse.json(payload)
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to load AI tooling admin metadata.')
  }
}
