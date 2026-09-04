import 'server-only'

import type { NextResponse } from 'next/server'

import type { EntitlementAction, EntitlementCapabilityKey } from '@/config/entitlements-catalog'
import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import { isOAuthProtocolError } from './errors'

/**
 * TASK-1829 — Adaptador HTTP de las rutas admin del emisor (portal Greenhouse, Vercel).
 *
 * Las rutas quedan delgadas: guard admin + capability dedicada + traducción de `OAuthProtocolError`
 * al contrato canónico es-CL. El dominio (`clients.ts`/`consent.ts`) no conoce Next.js: el mismo
 * command lo consumen la CLI y Nexa.
 */

export type AuthServerOperator = {
  tenant: TenantContext
  actor: { actorId: string }
}

export const requireAuthServerOperator = async (
  capability: EntitlementCapabilityKey,
  action: EntitlementAction
): Promise<{ operator: AuthServerOperator; response: null } | { operator: null; response: NextResponse }> => {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return { operator: null, response: errorResponse ?? canonicalErrorResponse('unauthorized') }

  if (!can(buildTenantEntitlementSubject(tenant), capability, action, 'tenant')) {
    return { operator: null, response: canonicalErrorResponse('forbidden', { extra: { capability, action } }) }
  }

  return { operator: { tenant, actor: { actorId: tenant.userId } }, response: null }
}

export const authServerErrorResponse = (error: unknown, surface: string) => {
  if (isOAuthProtocolError(error)) {
    if (error.code === 'slow_down') return canonicalErrorResponse('rate_limited')

    return canonicalErrorResponse('auth_server_invalid_request', { extra: { oauthError: error.code, reason: error.reason } })
  }

  captureWithDomain(error, 'identity', { tags: { task: 'TASK-1829', surface } })

  return canonicalErrorResponse('internal_error')
}

export const readJsonBody = async (request: Request): Promise<Record<string, unknown>> => {
  const body = await request.json().catch(() => null)

  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
}

export const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
