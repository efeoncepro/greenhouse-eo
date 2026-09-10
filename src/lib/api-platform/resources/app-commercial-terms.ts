import 'server-only'

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import {
  CommercialTermsConflictError,
  CommercialTermsValidationError,
  declareCommercialTerms,
  ENGAGEMENT_COMMERCIAL_TERMS_KINDS,
  getActiveCommercialTerms,
  ServiceNotEligibleForCommercialTermsError,
  type EngagementCommercialTermsKind
} from '@/lib/commercial/sample-sprints/commercial-terms'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'

/**
 * TASK-1852 — Commercial terms of a service through the app lane.
 *
 * The service → portal-module mapping that the enablement preview consumes
 * (`engagement_commercial_terms.bundled_modules`) needs a governed programmatic path:
 * the domain writer already existed (`declareCommercialTerms`) but had no consumer other
 * than tests. This adapter exposes it under Full API Parity rules: the actor is the
 * authenticated human, never the body; the capability is the Commercial one; the
 * catalog validation lives in the writer, not here.
 */

const SERVICE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/

export type DeclareCommercialTermsBody = {
  kind: EngagementCommercialTermsKind
  effectiveFrom: string
  monthlyAmountClp?: number | null
  successCriteria?: Record<string, unknown> | null
  bundledModules: string[]
  reason: string
}

const badRequest = (message: string): never => {
  throw new ApiPlatformError(message, { statusCode: 400, errorCode: 'bad_request' })
}

const assertServiceId = (value: string) => {
  if (!SERVICE_ID_PATTERN.test(value)) badRequest('Invalid service identifier.')

  return value
}

/** Boundary normalization only; business validation belongs to the domain writer. */
export const parseDeclareCommercialTermsBody = (body: unknown): DeclareCommercialTermsBody => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) badRequest('Invalid commercial terms input.')

  const record = body as Record<string, unknown>
  const allowedKeys = new Set(['kind', 'effectiveFrom', 'monthlyAmountClp', 'successCriteria', 'bundledModules', 'reason'])

  for (const key of Object.keys(record)) {
    // The actor never travels in the body: declaredBy/actorUserId are rejected explicitly.
    if (!allowedKeys.has(key)) badRequest(`Unexpected field "${key}".`)
  }

  const kind = record.kind

  if (typeof kind !== 'string' || !(ENGAGEMENT_COMMERCIAL_TERMS_KINDS as readonly string[]).includes(kind)) {
    badRequest('Invalid commercial terms kind.')
  }

  if (typeof record.effectiveFrom !== 'string') badRequest('effectiveFrom is required.')
  if (typeof record.reason !== 'string') badRequest('reason is required.')

  if (record.monthlyAmountClp !== undefined && record.monthlyAmountClp !== null && typeof record.monthlyAmountClp !== 'number') {
    badRequest('monthlyAmountClp must be a number or null.')
  }

  if (
    record.successCriteria !== undefined &&
    record.successCriteria !== null &&
    (typeof record.successCriteria !== 'object' || Array.isArray(record.successCriteria))
  ) {
    badRequest('successCriteria must be an object or null.')
  }

  if (!Array.isArray(record.bundledModules) || record.bundledModules.some(item => typeof item !== 'string')) {
    badRequest('bundledModules must be an array of module keys (use [] to declare no portal bundle).')
  }

  return {
    kind: kind as EngagementCommercialTermsKind,
    effectiveFrom: record.effectiveFrom as string,
    monthlyAmountClp: (record.monthlyAmountClp as number | null | undefined) ?? null,
    successCriteria: (record.successCriteria as Record<string, unknown> | null | undefined) ?? null,
    bundledModules: record.bundledModules as string[],
    reason: record.reason as string
  }
}

const authorizeCommercialTerms = (context: AppPlatformRequestContext, operation: 'read' | 'declare') => {
  const { tenant } = context

  // The delegated OAuth lane has no reviewed authority contract for commercial declarations.
  if (context.authSource === 'sister_platform_oauth') {
    throw new ApiPlatformError('Delegated commercial terms authority is unavailable.', {
      statusCode: 403, errorCode: 'invalid_delegated_context'
    })
  }

  if (tenant.tenantType !== 'efeonce_internal') {
    throw new ApiPlatformError('Commercial terms administration is internal only.', { statusCode: 403, errorCode: 'forbidden' })
  }

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'commercial.engagement.read', 'read', 'tenant')) {
    throw new ApiPlatformError('Commercial terms are not readable for this actor.', { statusCode: 403, errorCode: 'forbidden' })
  }

  if (operation === 'declare') {
    // A diagnostic/agent session may inventory, but a commercial declaration is a human act.
    if (tenant.authMode === 'agent') {
      throw new ApiPlatformError('An attributed human commercial session is required.', {
        statusCode: 403, errorCode: 'invalid_delegated_context'
      })
    }

    if (!can(subject, 'commercial.engagement.declare', 'create', 'tenant')) {
      throw new ApiPlatformError('The commercial terms declaration is not allowed.', { statusCode: 403, errorCode: 'forbidden' })
    }
  }
}

export const runAppCommercialTermsRead = async ({ context, serviceId }: {
  context: AppPlatformRequestContext; serviceId: string
}): Promise<{ data: unknown }> => {
  authorizeCommercialTerms(context, 'read')

  return { data: { serviceId: assertServiceId(serviceId), activeTerms: await getActiveCommercialTerms(serviceId) } }
}

export const runAppCommercialTermsDeclare = async ({ context, serviceId, body }: {
  context: AppPlatformRequestContext; serviceId: string; body: unknown
}): Promise<{ data: unknown; status: number }> => {
  authorizeCommercialTerms(context, 'declare')
  const input = parseDeclareCommercialTermsBody(body)

  try {
    const result = await declareCommercialTerms({
      serviceId: assertServiceId(serviceId),
      kind: input.kind,
      effectiveFrom: input.effectiveFrom,
      monthlyAmountClp: input.monthlyAmountClp,
      successCriteria: input.successCriteria,
      bundledModules: input.bundledModules,
      reason: input.reason,
      declaredBy: context.tenant.userId
    })

    return { data: { termsId: result.termsId, activeTerms: await getActiveCommercialTerms(serviceId) }, status: 201 }
  } catch (error) {
    if (error instanceof CommercialTermsValidationError) {
      throw new ApiPlatformError(error.message, { statusCode: 400, errorCode: 'bad_request' })
    }

    if (error instanceof ServiceNotEligibleForCommercialTermsError) {
      throw new ApiPlatformError('The service is not eligible for commercial terms.', {
        statusCode: error.reasonCode === 'not_found' ? 404 : 409,
        errorCode: error.reasonCode === 'not_found' ? 'not_found' : 'commercial_terms_service_not_eligible',
        details: { reasonCode: error.reasonCode }
      })
    }

    if (error instanceof CommercialTermsConflictError) {
      throw new ApiPlatformError('The service already has active commercial terms; refresh and retry.', {
        statusCode: 409, errorCode: 'commercial_terms_conflict'
      })
    }

    throw error
  }
}
