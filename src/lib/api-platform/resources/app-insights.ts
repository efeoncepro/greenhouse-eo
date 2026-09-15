import 'server-only'

/**
 * TASK-1845 — App lane de Efeonce Insights (`/api/platform/app/insights/**`): thin adapter
 * sobre commands/readers canónicos. El actor es el usuario autenticado (cookie o bearer
 * first-party); su organización viene del tenant (cliente) — nunca del payload. Un interno
 * declara la org objetivo por query/body y el dominio revalida target y módulo.
 */

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { buildApiPlatformPaginationMeta, parseApiPlatformPaginationParams } from '@/lib/api-platform/core/pagination'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { createInsightEdition, issueInsightEdition, recoverInsightEdition, reviseInsightEdition, withdrawInsightEdition } from '@/lib/efeonce-insights/commands'
import { isInsightEditionState, type InsightEditionState } from '@/lib/efeonce-insights/contracts/states'
import { readInsightEdition, readInsightEditions, readInsightReport, readInsightReports, readInsightsCatalog } from '@/lib/efeonce-insights/readers'

import { withInsightsErrors } from './insights-errors'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Org objetivo: el tenant cliente manda; el interno la declara (query/body) y sin ella es 400. */
const resolveScope = (context: AppPlatformRequestContext, request: Request, body?: unknown) => {
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

const reasonFrom = (body: unknown, fallback: string): string => (isRecord(body) && typeof body.reason === 'string' && body.reason.trim().length >= 5 ? body.reason.trim() : fallback)

export const getAppInsightsCatalog = async ({ context, request }: { context: AppPlatformRequestContext; request: Request }) =>
  withInsightsErrors(() => readInsightsCatalog(resolveScope(context, request)))

export const listAppInsightReports = async ({ context, request }: { context: AppPlatformRequestContext; request: Request }) =>
  withInsightsErrors(async () => {
    const pagination = parseApiPlatformPaginationParams(request)
    const result = await readInsightReports({ ...resolveScope(context, request), limit: pagination.pageSize, offset: pagination.offset })

    return { data: result.items, meta: buildApiPlatformPaginationMeta({ ...pagination, total: result.total, count: result.items.length }) }
  })

export const getAppInsightReport = async ({ context, request, reportId }: { context: AppPlatformRequestContext; request: Request; reportId: string }) =>
  withInsightsErrors(() => readInsightReport({ ...resolveScope(context, request), reportId }))

export const listAppInsightEditions = async ({ context, request }: { context: AppPlatformRequestContext; request: Request }) =>
  withInsightsErrors(async () => {
    const url = new URL(request.url)
    const pagination = parseApiPlatformPaginationParams(request)
    const states = url.searchParams.getAll('state').filter(isInsightEditionState) as InsightEditionState[]
    const audience = url.searchParams.get('audience')

    const result = await readInsightEditions({
      ...resolveScope(context, request),
      reportId: url.searchParams.get('reportId'),
      states: states.length > 0 ? states : null,
      audience: audience === 'client' || audience === 'internal' ? audience : null,
      limit: pagination.pageSize,
      offset: pagination.offset
    })

    return { data: result.items, meta: buildApiPlatformPaginationMeta({ ...pagination, total: result.total, count: result.items.length }) }
  })

export const getAppInsightEdition = async ({ context, request, editionId }: { context: AppPlatformRequestContext; request: Request; editionId: string }) =>
  withInsightsErrors(() => readInsightEdition({ ...resolveScope(context, request), editionId, includeEvidence: new URL(request.url).searchParams.get('include') === 'evidence' }))

export const createAppInsightEdition = async ({ context, request, body }: { context: AppPlatformRequestContext; request: Request; body: unknown }) =>
  withInsightsErrors(async () => {
    const scope = resolveScope(context, request, body)
    const result = await createInsightEdition({ ...scope, request: isRecord(body) ? body.request ?? body : body })

    return { data: { report: result.report, edition: result.edition, idempotent: result.idempotent, generation: result.generation ? { outcome: result.generation.outcome, failedPhase: result.generation.failedPhase, failureCode: result.generation.failureCode } : null }, status: result.idempotent ? 200 : 202 }
  })

export const reviseAppInsightEdition = async ({ context, request, body, editionId }: { context: AppPlatformRequestContext; request: Request; body: unknown; editionId: string }) =>
  withInsightsErrors(async () => {
    const scope = resolveScope(context, request, body)
    const result = await reviseInsightEdition({ ...scope, editionId, request: isRecord(body) ? body.request ?? body : body })

    return { data: { report: result.report, edition: result.edition, idempotent: result.idempotent, generation: result.generation ? { outcome: result.generation.outcome, failedPhase: result.generation.failedPhase, failureCode: result.generation.failureCode } : null }, status: result.idempotent ? 200 : 202 }
  })

export const issueAppInsightEdition = async ({ context, request, body, editionId }: { context: AppPlatformRequestContext; request: Request; body: unknown; editionId: string }) =>
  withInsightsErrors(async () => ({ data: await issueInsightEdition({ ...resolveScope(context, request, body), editionId, reason: reasonFrom(body, 'emisión aprobada desde el portal') }) }))

export const withdrawAppInsightEdition = async ({ context, request, body, editionId }: { context: AppPlatformRequestContext; request: Request; body: unknown; editionId: string }) =>
  withInsightsErrors(async () => ({ data: await withdrawInsightEdition({ ...resolveScope(context, request, body), editionId, reason: reasonFrom(body, 'retirada desde el portal') }) }))

export const recoverAppInsightEdition = async ({ context, request, body, editionId }: { context: AppPlatformRequestContext; request: Request; body: unknown; editionId: string }) =>
  withInsightsErrors(async () => {
    const result = await recoverInsightEdition({ ...resolveScope(context, request, body), editionId })

    return { data: { edition: result.edition, generation: { outcome: result.outcome, failedPhase: result.failedPhase, failureCode: result.failureCode } }, status: 202 }
  })
