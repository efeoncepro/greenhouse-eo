import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import {
  PersonLegalProfileError,
  assessPersonLegalReadiness,
  getDefaultDocumentTypeForCountry,
  listAddressesForProfileMasked,
  listIdentityDocumentsForProfileMasked,
  resolveMemberCountry,
  resolveProfileIdForMember
} from '@/lib/person-legal-profile'
import { requireHrCoreReadTenantContext } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

const errorResponse = (status: number, message: string, code?: string) =>
  NextResponse.json({ error: message, code: code ?? 'error' }, { status })

interface RouteParams {
  params: Promise<{ memberId: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { memberId } = await params

  const { tenant, errorResponse: authErr } = await requireHrCoreReadTenantContext()

  if (!tenant || authErr) return authErr ?? errorResponse(401, 'Unauthorized')

  if (!can(tenant, 'person.legal_profile.read_masked', 'read', 'tenant')) {
    return errorResponse(403, 'Capability missing: person.legal_profile.read_masked', 'forbidden')
  }

  try {
    const profileId = await resolveProfileIdForMember(memberId)

    if (!profileId) {
      return errorResponse(404, 'Member or profile not found', 'profile_not_linked')
    }

    // Sequential queries — sequential reuses the same physical PG connection
    // (each query() releases it back to the pool). Promise.all() would open
    // N concurrent connections and exhausts the pool when /people/[slug]
    // also fetches person-360, ico, hr-core in parallel from the same render.
    const documents = await listIdentityDocumentsForProfileMasked(profileId)
    const addresses = await listAddressesForProfileMasked(profileId)

    const readinessFinalSettlement = await assessPersonLegalReadiness({
      profileId,
      useCase: 'final_settlement_chile'
    })

    const readinessPayrollChile = await assessPersonLegalReadiness({
      profileId,
      useCase: 'payroll_chile_dependent'
    })

    const expectedCountry = await resolveMemberCountry(memberId)
    const expectedDocumentType = getDefaultDocumentTypeForCountry(expectedCountry)

    return NextResponse.json({
      memberId,
      profileId,
      documents,
      addresses,
      expectedCountry,
      expectedDocumentType,
      readiness: {
        finalSettlementChile: readinessFinalSettlement,
        payrollChileDependent: readinessPayrollChile
      },
      capabilities: {
        canVerify: can(tenant, 'person.legal_profile.verify', 'approve', 'tenant'),
        canHrUpdate: can(tenant, 'person.legal_profile.hr_update', 'update', 'tenant'),
        canRevealSensitive: can(tenant, 'person.legal_profile.reveal_sensitive', 'read', 'tenant')
      }
    })
  } catch (error) {
    if (error instanceof PersonLegalProfileError) {
      return errorResponse(error.statusCode, redactErrorForResponse(error), error.code)
    }

    captureWithDomain(error, 'identity', {
      extra: { route: '/api/hr/people/[memberId]/legal-profile', method: 'GET', memberId }
    })

    return errorResponse(500, redactErrorForResponse(error), 'internal_error')
  }
}
