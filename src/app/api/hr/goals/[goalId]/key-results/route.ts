import { NextResponse } from 'next/server'

import { createKeyResult } from '@/lib/hr-goals/postgres-goals-store'
import { requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ goalId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { goalId } = await params
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const keyResult = await createKeyResult(goalId, body)

    return NextResponse.json(keyResult, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to create key result.')
  }
}
