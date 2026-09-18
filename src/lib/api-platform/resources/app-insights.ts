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
import { cancelInsightRender, createInsightEdition, createInsightShare, revokeInsightShare, issueInsightEdition, recoverInsightEdition, requestInsightRender, retryInsightRender, reviseInsightEdition, withdrawInsightEdition } from '@/lib/efeonce-insights/commands'
import { isInsightEditionState, type InsightEditionState } from '@/lib/efeonce-insights/contracts/states'
import { readInsightEdition, readInsightEditions, readInsightRenderRun, readInsightShares, readInsightRenderRuns, readInsightReport, readInsightReports, readInsightsCatalog } from '@/lib/efeonce-insights/readers'

import {
  cancelInsightDelivery,
  readInsightDeliveries,
  readInsightDelivery,
  reconcileInsightDeliveryRecipient,
  requestInsightDelivery,
  retryInsightDelivery
} from '@/lib/efeonce-insights/delivery/commands'
import { createInsightSchedule, readInsightSchedule, readInsightSchedules, transitionInsightScheduleCommand } from '@/lib/efeonce-insights/schedules/commands'

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

// ── TASK-1846 — render durable: request/get/list/retry/cancel (asíncrono: 202, nunca espera a Chromium) ──

const renderResult = (result: { run: unknown; outputs: unknown; idempotent: boolean }) => ({
  data: { run: result.run, outputs: result.outputs, idempotent: result.idempotent },
  status: result.idempotent ? 200 : 202
})

export const requestAppInsightRender = async ({ context, request, body, editionId }: { context: AppPlatformRequestContext; request: Request; body: unknown; editionId: string }) =>
  withInsightsErrors(async () => renderResult(await requestInsightRender({ ...resolveScope(context, request, body), editionId, outputs: isRecord(body) ? body.outputs : undefined })))

export const listAppInsightRenderRuns = async ({ context, request, editionId }: { context: AppPlatformRequestContext; request: Request; editionId: string }) =>
  withInsightsErrors(async () => {
    const pagination = parseApiPlatformPaginationParams(request)
    const result = await readInsightRenderRuns({ ...resolveScope(context, request), editionId, limit: pagination.pageSize, offset: pagination.offset })

    return { data: result.items, meta: buildApiPlatformPaginationMeta({ ...pagination, total: result.total, count: result.items.length }) }
  })

export const getAppInsightRenderRun = async ({ context, request, renderRunId }: { context: AppPlatformRequestContext; request: Request; renderRunId: string }) =>
  withInsightsErrors(() => readInsightRenderRun({ ...resolveScope(context, request), renderRunId }))

export const retryAppInsightRender = async ({ context, request, body, renderRunId }: { context: AppPlatformRequestContext; request: Request; body: unknown; renderRunId: string }) =>
  withInsightsErrors(async () => renderResult(await retryInsightRender({ ...resolveScope(context, request, body), renderRunId })))

export const cancelAppInsightRender = async ({ context, request, body, renderRunId }: { context: AppPlatformRequestContext; request: Request; body: unknown; renderRunId: string }) =>
  withInsightsErrors(async () => {
    const result = await cancelInsightRender({ ...resolveScope(context, request, body), renderRunId })

    return { data: { run: result.run, outputs: result.outputs, cancelled: result.cancelled, stillRunning: result.stillRunning, idempotent: result.idempotent }, status: 200 }
  })


// ── TASK-1848 — enlaces compartidos (ShareGrant). El token sale UNA vez, en la respuesta de crear. ──

export const createAppInsightShare = async ({ context, request, body, editionId }: { context: AppPlatformRequestContext; request: Request; body: unknown; editionId: string }) =>
  withInsightsErrors(async () => ({ data: await createInsightShare({ ...resolveScope(context, request, body), editionId, options: body }), status: 201 }))

export const listAppInsightShares = async ({ context, request, editionId }: { context: AppPlatformRequestContext; request: Request; editionId: string }) =>
  withInsightsErrors(async () => ({ data: (await readInsightShares({ ...resolveScope(context, request), editionId })).items }))

export const revokeAppInsightShare = async ({ context, request, body, shareGrantId }: { context: AppPlatformRequestContext; request: Request; body: unknown; shareGrantId: string }) =>
  withInsightsErrors(async () => {
    const result = await revokeInsightShare({ ...resolveScope(context, request, body), shareGrantId })

    return { data: { share: result.share, idempotent: result.idempotent }, status: 200 }
  })

// ── TASK-1848 — envío por correo (sólo App lane: enviar desde Efeonce exige una persona interna) ──

export const requestAppInsightDelivery = async ({ context, request, body, editionId }: { context: AppPlatformRequestContext; request: Request; body: unknown; editionId: string }) =>
  withInsightsErrors(async () => {
    const result = await requestInsightDelivery({ ...resolveScope(context, request, body), editionId, body })

    return { data: result, status: result.idempotent ? 200 : 202 }
  })

export const listAppInsightDeliveries = async ({ context, request, editionId }: { context: AppPlatformRequestContext; request: Request; editionId: string }) =>
  withInsightsErrors(async () => ({ data: (await readInsightDeliveries({ ...resolveScope(context, request), editionId })).items }))

export const getAppInsightDelivery = async ({ context, request, deliveryIntentId }: { context: AppPlatformRequestContext; request: Request; deliveryIntentId: string }) =>
  withInsightsErrors(async () => ({ data: await readInsightDelivery({ ...resolveScope(context, request), deliveryIntentId }) }))

export const cancelAppInsightDelivery = async ({ context, request, body, deliveryIntentId }: { context: AppPlatformRequestContext; request: Request; body: unknown; deliveryIntentId: string }) =>
  withInsightsErrors(async () => ({ data: await cancelInsightDelivery({ ...resolveScope(context, request, body), deliveryIntentId }), status: 200 }))

export const retryAppInsightDelivery = async ({ context, request, body, deliveryIntentId }: { context: AppPlatformRequestContext; request: Request; body: unknown; deliveryIntentId: string }) =>
  withInsightsErrors(async () => {
    const result = await retryInsightDelivery({ ...resolveScope(context, request, body), deliveryIntentId })

    return { data: result, status: result.idempotent ? 200 : 202 }
  })

export const reconcileAppInsightDeliveryRecipient = async ({ context, request, body, deliveryRecipientId }: { context: AppPlatformRequestContext; request: Request; body: unknown; deliveryRecipientId: string }) =>
  withInsightsErrors(async () => ({
    data: await reconcileInsightDeliveryRecipient({
      ...resolveScope(context, request, body),
      deliveryRecipientId,
      operatorDecision: isRecord(body) ? body.operatorDecision : undefined,
      reason: isRecord(body) ? body.reason : undefined
    }),
    status: 200
  }))

// ── TASK-1848 — recurrencia (sólo App lane: la autoridad durable es una persona interna) ──

export const createAppInsightSchedule = async ({ context, request, body }: { context: AppPlatformRequestContext; request: Request; body: unknown }) =>
  withInsightsErrors(async () => ({ data: await createInsightSchedule({ ...resolveScope(context, request, body), body }), status: 201 }))

export const listAppInsightSchedules = async ({ context, request }: { context: AppPlatformRequestContext; request: Request }) =>
  withInsightsErrors(async () => ({ data: (await readInsightSchedules(resolveScope(context, request))).items }))

export const getAppInsightSchedule = async ({ context, request, scheduleId }: { context: AppPlatformRequestContext; request: Request; scheduleId: string }) =>
  withInsightsErrors(async () => ({ data: await readInsightSchedule({ ...resolveScope(context, request), scheduleId }) }))

export const transitionAppInsightSchedule = async ({
  context,
  request,
  body,
  scheduleId,
  action
}: {
  context: AppPlatformRequestContext
  request: Request
  body: unknown
  scheduleId: string
  action: 'activate' | 'pause' | 'retire'
}) => withInsightsErrors(async () => ({ data: await transitionInsightScheduleCommand({ ...resolveScope(context, request, body), scheduleId, action }), status: 200 }))
