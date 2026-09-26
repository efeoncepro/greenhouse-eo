import 'server-only'

/**
 * ISSUE-177 — derivación del sujeto del App lane de Efeonce Insights, compartida por el módulo de
 * lectura (`app-insights-read.ts`) y el de commands (`app-insights.ts`).
 *
 * Vive aparte para que las rutas de lectura NO carguen el barrel de commands de Insights (y con él
 * el render): este archivo jamás importa commands, render ni el composer de artefactos.
 * Lo verifica `insights-read-boundary.test.ts`.
 */

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Org objetivo: el tenant cliente manda; el interno la declara (query/body) y sin ella es 400. */
export const resolveScope = (context: AppPlatformRequestContext, request: Request, body?: unknown) => {
  const subject = buildTenantEntitlementSubject(context.tenant)
  const actorOrganizationId = context.tenant.tenantType === 'client' ? context.tenant.organizationId ?? null : null
  const url = new URL(request.url)
  const requested = (isRecord(body) && typeof body.organizationId === 'string' ? body.organizationId : url.searchParams.get('organizationId') ?? '').trim() || null

  if (context.tenant.tenantType === 'client') {
    if (!actorOrganizationId) {
      throw new ApiPlatformError('The client session has no organization context.', { statusCode: 403, errorCode: 'forbidden' })
    }

    return { subject, actorOrganizationId, organizationId: requested ?? actorOrganizationId }
  }

  if (!requested) {
    throw new ApiPlatformError('A non-empty "organizationId" is required for internal actors.', { statusCode: 400, errorCode: 'bad_request' })
  }

  return { subject, actorOrganizationId, organizationId: requested }
}
