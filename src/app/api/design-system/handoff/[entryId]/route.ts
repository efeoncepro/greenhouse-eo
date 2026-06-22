import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getDesignHandoffEntry } from '@/lib/design-system/handoff/store'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const READ_CAPABILITY = 'design_system.handoff.read' as const

export async function GET(_request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, READ_CAPABILITY, 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  const { entryId } = await params

  try {
    const entry = await getDesignHandoffEntry(entryId)

    if (!entry) return canonicalErrorResponse('design_handoff_not_found')

    return NextResponse.json({ entry })
  } catch (error) {
    captureWithDomain(error, 'platform', { tags: { source: 'design_handoff_get' } })

    return canonicalErrorResponse('internal_error')
  }
}
