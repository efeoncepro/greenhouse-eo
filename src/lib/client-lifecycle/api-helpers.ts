import 'server-only'

import { NextResponse } from 'next/server'

import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import type { EntitlementAction } from '@/config/entitlements-catalog'
import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireTenantContext } from '@/lib/tenant/authorization'

import { ClientLifecycleValidationError } from './types'

type LifecycleCapability =
  | 'client.lifecycle.case.open'
  | 'client.lifecycle.case.advance'
  | 'client.lifecycle.case.resolve'
  | 'client.lifecycle.case.override_blocker'
  | 'client.lifecycle.case.read'

const ACTION_BY_CAPABILITY: Record<LifecycleCapability, EntitlementAction> = {
  'client.lifecycle.case.open': 'create',
  'client.lifecycle.case.advance': 'update',
  'client.lifecycle.case.resolve': 'approve',
  'client.lifecycle.case.override_blocker': 'override',
  'client.lifecycle.case.read': 'read'
}

export interface LifecycleAuthResult {
  tenant: Awaited<ReturnType<typeof requireTenantContext>>['tenant']
  userId: string
  errorResponse: NextResponse | null
}

/**
 * Authenticate + authorize a lifecycle request against a granular capability.
 * Returns a sanitized error response when the subject is unauthenticated or lacks
 * the capability (no info leak about case existence at this layer).
 */
export const authorizeLifecycle = async (
  capability: LifecycleCapability
): Promise<LifecycleAuthResult> => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return { tenant: null, userId: '', errorResponse: unauthorizedResponse }
  }

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, capability, ACTION_BY_CAPABILITY[capability], 'tenant')) {
    return { tenant: null, userId: '', errorResponse: canonicalErrorResponse('forbidden') }
  }

  return { tenant, userId: tenant.userId, errorResponse: null }
}

/**
 * Map a thrown error to a sanitized NextResponse. Domain validation errors carry
 * es-CL safe messages; anything else is captured + returned as a generic 502.
 */
export const mapLifecycleError = (error: unknown, source: string): NextResponse => {
  if (error instanceof ClientLifecycleValidationError) {
    const actionable = error.statusCode === 409 || error.statusCode === 422


    return NextResponse.json(
      { error: error.message, code: error.code, actionable },
      { status: error.statusCode }
    )
  }

  captureWithDomain(error, 'commercial', { tags: { source: `client_lifecycle:${source}` } })

  return NextResponse.json(
    { error: 'No se pudo procesar la solicitud de ciclo de vida.', code: 'internal_error', actionable: true },
    { status: 502 }
  )
}
