import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { toContractorEngagementErrorResponse } from '@/lib/contractor-engagements/error-response'
import { getContractorSupportDocumentsBundle } from '@/lib/contractor-engagements/support-documents/reader'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const subject = buildTenantEntitlementSubject(tenant)
  const canReadEngagement = can(subject, 'hr.contractor_engagement', 'read', 'tenant')
  const canReadWorkSubmission = can(subject, 'hr.contractor_work_submission', 'read', 'tenant')

  if (!canReadEngagement && !canReadWorkSubmission) {
    return canonicalErrorResponse('forbidden')
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const contractorWorkSubmissionId = searchParams.get('contractorWorkSubmissionId')

  try {
    const bundle = await getContractorSupportDocumentsBundle({
      contractorEngagementId: id,
      contractorWorkSubmissionId
    })

    if (!bundle) {
      return NextResponse.json(
        { error: 'El engagement no existe.', code: 'engagement_not_found', actionable: false },
        { status: 404 }
      )
    }

    return NextResponse.json(bundle)
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'contractor_support_documents_api', stage: 'get' }
    })

    return toContractorEngagementErrorResponse(error)
  }
}
