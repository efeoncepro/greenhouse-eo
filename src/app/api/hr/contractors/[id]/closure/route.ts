import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import {
  CONTRACTOR_CLOSURE_BLOCKER_CODES,
  CONTRACTOR_CLOSURE_REASONS,
  ContractorEngagementValidationError,
  type ContractorClosureBlockerCode,
  type ContractorClosureReason
} from '@/lib/contractor-engagements'
import { toContractorEngagementErrorResponse } from '@/lib/contractor-engagements/error-response'
import {
  assessContractorClosureReadiness,
  executeContractorClosure,
  initiateContractorClosure,
  setPostClosureInvoicesAllowed
} from '@/lib/contractor-engagements/closure/store'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const isMember = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value)

const parseAcknowledgedBlockers = (value: unknown): ContractorClosureBlockerCode[] | undefined => {
  if (!Array.isArray(value)) return undefined

  return value.filter((v): v is ContractorClosureBlockerCode =>
    isMember(CONTRACTOR_CLOSURE_BLOCKER_CODES, v)
  )
}

const parseClosureReason = (value: unknown): ContractorClosureReason => {
  if (!isMember(CONTRACTOR_CLOSURE_REASONS, value)) {
    throw new ContractorEngagementValidationError(
      'closureReason inválido.',
      'invalid_closure_reason',
      400
    )
  }

  return value
}

/** GET — readiness assessment del cierre (read). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'hr.contractor_engagement', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  const { id } = await params

  try {
    const { engagement, readiness } = await assessContractorClosureReadiness(id)

    return NextResponse.json({ engagement, readiness })
  } catch (error) {
    if (!(error instanceof ContractorEngagementValidationError)) {
      captureWithDomain(error, 'identity', {
        tags: { source: 'contractor_closure_api', stage: 'assess' }
      })
    }

    return toContractorEngagementErrorResponse(error)
  }
}

/** POST — initiate | execute | allow_post_closure_invoices (manage). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'hr.contractor_engagement', 'manage', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  const { id } = await params

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      throw new ContractorEngagementValidationError(
        'El cuerpo de la solicitud es inválido.',
        'invalid_body'
      )
    }

    const action = body.action
    const reason = typeof body.reason === 'string' ? body.reason : ''

    if (action === 'initiate') {
      const engagement = await initiateContractorClosure({
        contractorEngagementId: id,
        closureReason: parseClosureReason(body.closureReason),
        reason,
        closureEffectiveDate:
          typeof body.closureEffectiveDate === 'string'
            ? body.closureEffectiveDate
            : (() => {
                throw new ContractorEngagementValidationError(
                  'closureEffectiveDate es obligatorio.',
                  'closure_effective_date_required',
                  400
                )
              })(),
        providerTerminationRef:
          typeof body.providerTerminationRef === 'string' ? body.providerTerminationRef : null,
        actorUserId: tenant.userId
      })

      return NextResponse.json({ engagement })
    }

    if (action === 'execute') {
      const { engagement, readiness } = await executeContractorClosure({
        contractorEngagementId: id,
        closureReason: isMember(CONTRACTOR_CLOSURE_REASONS, body.closureReason)
          ? body.closureReason
          : undefined,
        reason,
        closureEffectiveDate:
          typeof body.closureEffectiveDate === 'string' ? body.closureEffectiveDate : undefined,
        providerTerminationRef:
          typeof body.providerTerminationRef === 'string' ? body.providerTerminationRef : undefined,
        acknowledgedBlockerCodes: parseAcknowledgedBlockers(body.acknowledgedBlockerCodes),
        postClosureInvoicesAllowed:
          typeof body.postClosureInvoicesAllowed === 'boolean'
            ? body.postClosureInvoicesAllowed
            : undefined,
        actorUserId: tenant.userId
      })

      return NextResponse.json({ engagement, readiness })
    }

    if (action === 'allow_post_closure_invoices') {
      const engagement = await setPostClosureInvoicesAllowed({
        contractorEngagementId: id,
        allowed: body.allowed === true,
        reason,
        actorUserId: tenant.userId
      })

      return NextResponse.json({ engagement })
    }

    throw new ContractorEngagementValidationError(
      `Acción de cierre no soportada: ${String(action)}.`,
      'unsupported_closure_action'
    )
  } catch (error) {
    if (!(error instanceof ContractorEngagementValidationError)) {
      captureWithDomain(error, 'identity', {
        tags: { source: 'contractor_closure_api', stage: 'post' }
      })
    }

    return toContractorEngagementErrorResponse(error)
  }
}
