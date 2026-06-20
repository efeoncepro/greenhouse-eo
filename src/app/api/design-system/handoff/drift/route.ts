import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { getDesignHandoffMissingEvidenceSignal } from '@/lib/reliability/queries/design-handoff-missing-evidence'
import { getDesignHandoffNodeDriftSignal } from '@/lib/reliability/queries/design-handoff-node-drift'
import { getDesignHandoffOrphanSurfacesSignal } from '@/lib/reliability/queries/design-handoff-orphan-surfaces'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'design_system.handoff.drift.read' as const

export async function GET() {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, CAPABILITY, 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  const signals = await Promise.all([
    getDesignHandoffMissingEvidenceSignal(),
    getDesignHandoffNodeDriftSignal(),
    getDesignHandoffOrphanSurfacesSignal()
  ])

  return NextResponse.json({ signals })
}
