import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { getTalentPoolProfile, talentPoolFlags, toHiringErrorResponse } from '@/lib/hiring'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')
  if (!can(tenant, 'hiring.talent_pool.read', 'read', 'tenant')) return canonicalErrorResponse('forbidden')
  if (!talentPoolFlags().search)
    return NextResponse.json(
      { error: 'El banco de talento todavía no está habilitado.', code: 'talent_pool_disabled', actionable: false },
      { status: 503 }
    )

  try {
    return NextResponse.json(await getTalentPoolProfile((await params).id))
  } catch (error) {
    return toHiringErrorResponse(error, 'talent_pool_profile')
  }
}
