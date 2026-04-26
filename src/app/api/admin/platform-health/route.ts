import { NextResponse } from 'next/server'

import { getPlatformHealth } from '@/lib/platform-health/composer'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * Platform Health V1 — admin lane.
 *
 * Returns the FULL `PlatformHealthV1` payload (with evidence refs and
 * degraded-source error details) to authenticated admin operators.
 * Read-only; no mutation endpoints live here. The admin Center UI may
 * consume this for a compact health badge, but the canonical detail
 * dashboard remains `/admin/ops-health`.
 *
 * Spec: docs/tasks/in-progress/TASK-672-platform-health-api-contract.md
 */
export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await getPlatformHealth({ audience: 'admin' })

  return NextResponse.json(data, {
    headers: {
      'cache-control': 'private, max-age=0, must-revalidate',
      'x-platform-health-contract': data.contractVersion
    }
  })
}
