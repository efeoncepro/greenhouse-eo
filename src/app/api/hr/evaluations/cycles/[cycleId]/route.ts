import { NextResponse } from 'next/server'

import { getEvalCycleById, updateEvalCycle } from '@/lib/hr-evals/postgres-evals-store'
import { requireHrCoreManageTenantContext, requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { cycleId } = await params
    const cycle = await getEvalCycleById(cycleId)

    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    return NextResponse.json(cycle)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load evaluation cycle.')
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { cycleId } = await params
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const cycle = await updateEvalCycle(cycleId, body)

    return NextResponse.json(cycle)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to update evaluation cycle.')
  }
}
