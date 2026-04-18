import { NextResponse } from 'next/server'

import { listCompetencies } from '@/lib/hr-evals/postgres-evals-store'
import { requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const competencies = await listCompetencies()

    return NextResponse.json({ competencies })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load competencies.')
  }
}
