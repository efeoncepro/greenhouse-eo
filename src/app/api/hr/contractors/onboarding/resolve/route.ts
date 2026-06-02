import { NextResponse } from 'next/server'

import { requireHrTenantContext } from '@/lib/tenant/authorization'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { resolveActivePersonLegalEntityRelationships } from '@/lib/account-360/person-legal-entity-relationships'
import { listOffboardingCases } from '@/lib/workforce/offboarding/store'

export const dynamic = 'force-dynamic'

/**
 * TASK-976 — `GET /api/hr/contractors/onboarding/resolve?profileId=<id>`.
 *
 * Thin read endpoint del wizard de onboarding (Path A). Resuelve, para una
 * persona ya seleccionada en el people-picker, sus dos señales de ruteo:
 *   · ¿tiene una relación de contractor activa? → puede continuar Path A.
 *   · ¿tiene una salida laboral ejecutada? → debe derivar a Path B.
 * El cliente combina ambas para decidir el branch (3 estados: continuar /
 * derivar a B / dead-end Person 360). Read-only; NO muta nada.
 *
 * Auth: requireHrTenantContext + capability `hr.contractor_engagement:read`
 * (mirror exacto del resto de rutas `/api/hr/contractors/**`).
 */

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'hr.contractor_engagement', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('profileId')?.trim()

  if (!profileId) {
    return NextResponse.json(
      { error: 'Indica la persona a resolver.', code: 'missing_profile_id', actionable: false },
      { status: 400 }
    )
  }

  try {
    // (a) Active contractor relationship for this person.
    const contractorRelationships = await resolveActivePersonLegalEntityRelationships({
      profileId,
      relationshipTypes: ['contractor']
    })

    const activeContractor = contractorRelationships[0] ?? null

    // (b) Most-recent executed offboarding for this person.
    const executedCases = await listOffboardingCases({ status: 'executed', limit: 200 })

    const executedForPerson = executedCases
      .filter(c => c.profileId === profileId)
      .sort((a, b) => (a.executedAt ?? a.createdAt) < (b.executedAt ?? b.createdAt) ? 1 : -1)[0]

    return NextResponse.json({
      contractorRelationship: activeContractor
        ? {
            relationshipId: activeContractor.relationshipId,
            legalEntityOrganizationId: activeContractor.legalEntityOrganizationId,
            legalEntityName: activeContractor.legalEntityName
          }
        : null,
      executedOffboarding: executedForPerson
        ? {
            offboardingCaseId: executedForPerson.offboardingCaseId,
            publicId: executedForPerson.publicId,
            lastWorkingDay: executedForPerson.lastWorkingDay,
            separationType: executedForPerson.separationType,
            relationshipType: executedForPerson.relationshipType
          }
        : null
    })
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'contractor_onboarding_resolve', stage: 'get' }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error), code: 'internal_error', actionable: true },
      { status: 500 }
    )
  }
}
