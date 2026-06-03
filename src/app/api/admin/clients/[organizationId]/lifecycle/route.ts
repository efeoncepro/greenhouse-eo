import { NextResponse } from 'next/server'

import { authorizeLifecycle, mapLifecycleError } from '@/lib/client-lifecycle/api-helpers'
import {
  getActiveCaseForOrganization,
  getCaseEvents,
  getChecklistItems,
  listCasesForOrganization
} from '@/lib/client-lifecycle/store'

export const dynamic = 'force-dynamic'

// GET /api/admin/clients/[organizationId]/lifecycle
// Active onboarding case + checklist + recent events + full case history.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await params
  const { tenant, errorResponse } = await authorizeLifecycle('client.lifecycle.case.read')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [activeCase, history] = await Promise.all([
      getActiveCaseForOrganization(organizationId, 'onboarding'),
      listCasesForOrganization(organizationId)
    ])

    const checklist = activeCase ? await getChecklistItems(activeCase.caseId) : []
    const events = activeCase ? await getCaseEvents(activeCase.caseId, 20) : []

    return NextResponse.json({ activeCase, checklist, events, history })
  } catch (error) {
    return mapLifecycleError(error, 'get_organization_lifecycle')
  }
}
