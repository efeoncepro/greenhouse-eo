import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { requireMyTenantContext } from '@/lib/tenant/authorization'
import { mapContractingError } from '@/lib/workforce/contracting/api-helpers'
import { getOwnContractingSummary } from '@/lib/workforce/contracting/readers'

export const dynamic = 'force-dynamic'

// Collaborator self view of own offer letters. Honest status only, scoped to the
// session's own identity profile (anti-IDOR). No legal text body.
export async function GET() {
  const { tenant, errorResponse } = await requireMyTenantContext()

  if (errorResponse) return errorResponse

  const identityProfileId = tenant?.identityProfileId

  if (!identityProfileId) {
    return canonicalErrorResponse('member_identity_not_linked')
  }

  try {
    const items = await getOwnContractingSummary(identityProfileId, 'offer_letter')

    return NextResponse.json({ items })
  } catch (error) {
    return mapContractingError(error, 'my_offers')
  }
}
