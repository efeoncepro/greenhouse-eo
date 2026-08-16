import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { getTalentPoolProfile, talentPoolFlags, toHiringErrorResponse } from '@/lib/hiring'
import {
  buildHiringApplicationDocumentsViewModel,
  resolveHiringApplicationDocuments,
} from '@/lib/hiring/documents'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string; applicationId: string }> },
) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (
    !can(tenant, 'hiring.talent_pool.read', 'read', 'tenant') ||
    !can(tenant, 'hiring.application.read', 'read', 'tenant')
  ) {
    return canonicalErrorResponse('forbidden')
  }

  if (!talentPoolFlags().search) {
    return NextResponse.json(
      { error: 'El banco de talento todavía no está habilitado.', code: 'talent_pool_disabled', actionable: false },
      { status: 503 },
    )
  }

  try {
    const { id, applicationId } = await params
    const profile = await getTalentPoolProfile(id)
    const belongsToProfile = profile.evidence.some(evidence => evidence.applicationRef === applicationId)

    if (!belongsToProfile) {
      return NextResponse.json(
        { error: 'La postulación no está disponible.', code: 'talent_pool_application_not_found', actionable: false },
        { status: 404 },
      )
    }

    const documents = await resolveHiringApplicationDocuments({ applicationId })

    return NextResponse.json(buildHiringApplicationDocumentsViewModel(documents))
  } catch (error) {
    return toHiringErrorResponse(error, 'talent_pool_application_documents')
  }
}
