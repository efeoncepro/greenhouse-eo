import 'server-only'

import type { NextResponse } from 'next/server'

import { canonicalErrorResponse, type CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import type { EntitlementAction, EntitlementCapabilityKey } from '@/config/entitlements-catalog'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import { isExternalAccessError, type ExternalAccessErrorCode } from './errors'

/**
 * TASK-1631 — Adaptador HTTP de las rutas admin del dominio external-access.
 *
 * Las rutas quedan delgadas: guard admin + capability dedicada + traducción de errores al contrato
 * canónico es-CL. El dominio (`commands.ts`/`store.ts`) no conoce Next.js.
 */

const CANONICAL_CODE_BY_DOMAIN_CODE: Record<ExternalAccessErrorCode, CanonicalErrorCode> = {
  invalid_request: 'external_access_invalid_request',
  not_found: 'external_access_not_found',
  conflict: 'external_access_conflict',
  organization_not_eligible: 'external_access_organization_not_eligible',
  environment_not_active: 'external_access_environment_not_active',
  binding_not_active: 'external_access_binding_not_active',
  invitation_not_open: 'external_access_invitation_not_open',
  invitation_expired: 'external_access_invitation_expired',
  identity_collision: 'external_access_identity_collision',
  canary_not_registered: 'external_canary_not_registered',
  canary_expired: 'external_canary_expired',
  capability_not_allowed: 'external_canary_capability_not_allowed',
  canary_cleanup_blocked: 'external_canary_cleanup_blocked',
  forbidden: 'forbidden',
  rate_limited: 'rate_limited',
  limit_reached: 'external_access_limit_reached'
}

export const externalAccessErrorResponse = (error: unknown, surface: string) => {
  if (isExternalAccessError(error)) {
    return canonicalErrorResponse(CANONICAL_CODE_BY_DOMAIN_CODE[error.code], {
      extra: { domainCode: error.code, details: error.details ?? null }
    })
  }

  captureWithDomain(error, 'identity', { tags: { task: 'TASK-1631', surface } })

  return canonicalErrorResponse('internal_error')
}

export type ExternalAccessOperator = {
  tenant: TenantContext
  actor: { actorId: string }
}

export const requireExternalAccessOperator = async (
  capability: EntitlementCapabilityKey,
  action: EntitlementAction
): Promise<{ operator: ExternalAccessOperator; response: null } | { operator: null; response: NextResponse }> => {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return { operator: null, response: errorResponse ?? canonicalErrorResponse('unauthorized') }
  }

  if (!can(buildTenantEntitlementSubject(tenant), capability, action, 'tenant')) {
    return { operator: null, response: canonicalErrorResponse('forbidden', { extra: { capability, action } }) }
  }

  return { operator: { tenant, actor: { actorId: tenant.userId } }, response: null }
}

export const readJsonBody = async (request: Request): Promise<Record<string, unknown>> => {
  const body = await request.json().catch(() => null)

  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
}
