import { NextResponse } from 'next/server'

import { listEvalCycles, createEvalCycle } from '@/lib/hr-evals/postgres-evals-store'
import { requireHrCoreManageTenantContext, requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cycles = await listEvalCycles()

    return NextResponse.json({ cycles })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load evaluation cycles.')
  }
}

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

    const cycle = await createEvalCycle({
      cycleName: String(body.cycleName || ''),
      cycleType: String(body.cycleType || 'quarterly') as 'quarterly' | 'semester' | 'annual',
      startDate: String(body.startDate || ''),
      endDate: String(body.endDate || ''),
      selfEvalDeadline: body.selfEvalDeadline ? String(body.selfEvalDeadline) : undefined,
      peerEvalDeadline: body.peerEvalDeadline ? String(body.peerEvalDeadline) : undefined,
      managerDeadline: body.managerDeadline ? String(body.managerDeadline) : undefined,
      competencyIds: Array.isArray(body.competencyIds) ? body.competencyIds as string[] : undefined,
      minTenureDays: typeof body.minTenureDays === 'number' ? body.minTenureDays : undefined,
      createdBy: tenant.userId
    })

    return NextResponse.json(cycle, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to create evaluation cycle.')
  }
}
