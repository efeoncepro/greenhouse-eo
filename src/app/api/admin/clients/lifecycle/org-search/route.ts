import { NextResponse } from 'next/server'

import { authorizeLifecycle, mapLifecycleError } from '@/lib/client-lifecycle/api-helpers'
import { findOrganizationByNormalizedTaxId, searchOrganizations } from '@/lib/client-onboarding/org-search'

export const dynamic = 'force-dynamic'

// GET /api/admin/clients/lifecycle/org-search?q=<text>  | ?taxId=<normalized>
// Feeds the onboarding wizard pickers (prefill) + the duplicate-tax-id gate.
export async function GET(request: Request) {
  const { tenant, errorResponse } = await authorizeLifecycle('client.lifecycle.case.read')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const taxId = searchParams.get('taxId')

    const results = taxId
      ? await findOrganizationByNormalizedTaxId(taxId.replace(/[.\-\s]/g, '').toUpperCase())
      : await searchOrganizations(searchParams.get('q') ?? '')

    return NextResponse.json({ results })
  } catch (error) {
    return mapLifecycleError(error, 'org_search')
  }
}
