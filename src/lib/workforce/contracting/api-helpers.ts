import 'server-only'

import { NextResponse } from 'next/server'

import type { EntitlementAction } from '@/config/entitlements-catalog'
import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireTenantContext } from '@/lib/tenant/authorization'

import { WorkforceContractingValidationError } from './types'

export type ContractingCapability =
  | 'workforce.contracting.read'
  | 'workforce.contracting.manage'
  | 'workforce.contracting.ai_draft'
  | 'workforce.contracting.approve'
  | 'workforce.contracting.generate_document'
  | 'workforce.contracting.reveal_sensitive'
  | 'workforce.contracting.send_signature'

export interface ContractingAuthResult {
  tenant: Awaited<ReturnType<typeof requireTenantContext>>['tenant']
  userId: string
  errorResponse: NextResponse | null
}

/**
 * Authenticate + authorize a contracting request against a granular capability + action.
 * Returns a sanitized error response when unauthenticated or unauthorized (no info leak
 * about case existence here — readers apply subject-scoping separately).
 */
export const authorizeContracting = async (
  capability: ContractingCapability,
  action: EntitlementAction
): Promise<ContractingAuthResult> => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return { tenant: null, userId: '', errorResponse: unauthorizedResponse }
  }

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, capability, action, 'tenant')) {
    return { tenant: null, userId: '', errorResponse: canonicalErrorResponse('forbidden') }
  }

  return { tenant, userId: tenant.userId, errorResponse: null }
}

/** Map a thrown error to a sanitized NextResponse (es-CL for domain errors; 502 otherwise). */
export const mapContractingError = (error: unknown, source: string): NextResponse => {
  if (error instanceof WorkforceContractingValidationError) {
    const actionable = error.statusCode === 409 || error.statusCode === 422

    return NextResponse.json(
      { error: error.message, code: error.code, actionable },
      { status: error.statusCode }
    )
  }

  captureWithDomain(error, 'workforce', { tags: { source: `workforce_contracting:${source}` } })

  return NextResponse.json(
    {
      error: 'No se pudo procesar la solicitud de contratación.',
      code: 'internal_error',
      actionable: true,
      detail: redactErrorForResponse(error),
      pgCode: (error as { code?: string })?.code ?? null
    },
    { status: 502 }
  )
}
