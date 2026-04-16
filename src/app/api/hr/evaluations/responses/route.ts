import { NextResponse } from 'next/server'

import { listResponses, upsertResponse } from '@/lib/hr-evals/postgres-evals-store'
import { requireHrCoreManageTenantContext, requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignmentId')

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId query parameter is required' }, { status: 400 })
    }

    const responses = await listResponses(assignmentId)

    return NextResponse.json({ responses })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load responses.')
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

    const { assignmentId, competencyId, rating, comments } = body as {
      assignmentId?: string
      competencyId?: string
      rating?: number
      comments?: string
    }

    if (!assignmentId || !competencyId) {
      return NextResponse.json({ error: 'assignmentId and competencyId are required' }, { status: 400 })
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be between 1 and 5' }, { status: 400 })
    }

    const response = await upsertResponse({ assignmentId, competencyId, rating, comments: comments || undefined })

    return NextResponse.json(response)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to save response.')
  }
}
