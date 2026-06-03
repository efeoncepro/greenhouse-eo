import { NextResponse } from 'next/server'

import { authorizeLifecycle, mapLifecycleError } from '@/lib/client-lifecycle/api-helpers'
import { getLifecycleHealthSummary } from '@/lib/client-lifecycle/store'

export const dynamic = 'force-dynamic'

// GET /api/admin/clients/lifecycle/health
// Lightweight health summary (open cases, overdue, blocked, by kind).
export async function GET() {
  const { tenant, errorResponse } = await authorizeLifecycle('client.lifecycle.case.read')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const summary = await getLifecycleHealthSummary()


    return NextResponse.json({ contractVersion: 'client-lifecycle-health.v1', ...summary })
  } catch (error) {
    return mapLifecycleError(error, 'health')
  }
}
