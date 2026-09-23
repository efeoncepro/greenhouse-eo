import 'server-only'

/**
 * ISSUE-177 — derivación del sujeto máquina del Ecosystem lane de Efeonce Insights, compartida por
 * el módulo de lectura (`ecosystem-insights-read.ts`) y el de commands (`ecosystem-insights.ts`).
 *
 * Vive aparte para que las rutas de lectura NO carguen el barrel de commands de Insights (y con él
 * el render): este archivo jamás importa commands, render ni el composer de artefactos.
 * Lo verifica `insights-read-boundary.test.ts`.
 */

import type { ApiPlatformRequestContext, ApiPlatformSuccessResult } from '@/lib/api-platform/core/context'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { ROLE_CODES } from '@/config/role-codes'

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export interface EcosystemInsightsScope {
  subject: TenantEntitlementSubject
  actorOrganizationId: string | null
  organizationId: string
  canWrite: boolean
}

/**
 * Sujeto máquina derivado del binding (misma regla que el lane SEO: el binding manda). Un
 * binding org-scoped se modela como cliente de esa org (roles cliente ⇒ sólo lectura vía
 * grants `own`); un binding interno como operador de sistema (Account ⇒ crea/revisa, y el
 * gate humano de emisión sigue cerrado porque el actor no es una persona).
 */
export const resolveScope = (context: ApiPlatformRequestContext, request: Request, body?: unknown): EcosystemInsightsScope => {
  const url = new URL(request.url)
  const requested = (isRecord(body) && typeof body.organizationId === 'string' ? body.organizationId : url.searchParams.get('organizationId') ?? '').trim() || null
  const bindingOrg = context.binding.organizationId
  const consumerId = `consumer:${context.consumer.publicId}`

  if (bindingOrg) {
    if (requested && requested !== bindingOrg) {
      throw new ApiPlatformError('Insights resource not found for the resolved scope.', { statusCode: 404, errorCode: 'not_found' })
    }

    return {
      subject: { userId: consumerId, tenantType: 'client', roleCodes: [ROLE_CODES.CLIENT_SPECIALIST], primaryRoleCode: ROLE_CODES.CLIENT_SPECIALIST, routeGroups: ['client'], authorizedViews: [] },
      actorOrganizationId: bindingOrg,
      organizationId: bindingOrg,
      canWrite: false
    }
  }

  if (context.binding.greenhouseScopeType !== 'internal') {
    throw new ApiPlatformError('Insights are not allowed for the resolved binding scope.', { statusCode: 403, errorCode: 'scope_not_allowed' })
  }

  if (!requested) {
    throw new ApiPlatformError('A non-empty "organizationId" parameter is required for internal-scope bindings.', { statusCode: 400, errorCode: 'bad_request' })
  }

  return {
    subject: { userId: consumerId, tenantType: 'efeonce_internal', roleCodes: [ROLE_CODES.EFEONCE_ACCOUNT], primaryRoleCode: ROLE_CODES.EFEONCE_ACCOUNT, routeGroups: ['internal'], authorizedViews: [] },
    actorOrganizationId: null,
    organizationId: requested,
    canWrite: true
  }
}

/** Parte de la policy del scope: sólo un binding interno escribe (un org-scoped sólo lee). */
export const assertWrite = (scope: EcosystemInsightsScope) => {
  if (!scope.canWrite) {
    throw new ApiPlatformError('Creating or revising Insights editions is not allowed for the resolved binding scope.', { statusCode: 403, errorCode: 'scope_not_allowed' })
  }
}

export type Payload<T> = Promise<ApiPlatformSuccessResult<T>>
