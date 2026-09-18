import 'server-only'

/**
 * TASK-1845 — Ecosystem lane de Efeonce Insights (`/api/platform/ecosystem/insights/**`,
 * consumido por el gateway MCP federado). Mismo command/reader que el App lane; sólo cambia
 * cómo se deriva el sujeto:
 *
 * - binding org-scoped (`organization`/`client`): la org ES la del binding; un `organizationId`
 *   distinto es 404 anti-oracle. El consumer se comporta como CLIENTE de esa org: sólo lee.
 * - binding `internal` (operador máquina — gateway/Nexa interna): `organizationId` requerido;
 *   actúa como actor interno de sistema: lee, crea, revisa y recupera; NUNCA emite ni retira
 *   (gate humano: una máquina no tiene autoridad de emisión). MCP hereda el consentimiento
 *   efectivo del binding; base-only read no autoriza create/issue (arquitectura §7).
 */

import type { ApiPlatformRequestContext, ApiPlatformSuccessResult } from '@/lib/api-platform/core/context'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { buildApiPlatformPaginationMeta, parseApiPlatformPaginationParams } from '@/lib/api-platform/core/pagination'
import { cancelInsightRender, createInsightEdition, createInsightShare, revokeInsightShare, recoverInsightEdition, requestInsightRender, retryInsightRender, reviseInsightEdition } from '@/lib/efeonce-insights/commands'
import { isInsightEditionState, type InsightEditionState } from '@/lib/efeonce-insights/contracts/states'
import { readInsightEdition, readInsightEditions, readInsightRenderRun, readInsightShares, readInsightRenderRuns, readInsightReport, readInsightReports, readInsightsCatalog } from '@/lib/efeonce-insights/readers'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { ROLE_CODES } from '@/config/role-codes'

import { readInsightDeliveries, readInsightDelivery } from '@/lib/efeonce-insights/delivery/commands'

import { withInsightsErrors } from './insights-errors'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

interface EcosystemInsightsScope {
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
const resolveScope = (context: ApiPlatformRequestContext, request: Request, body?: unknown): EcosystemInsightsScope => {
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

const assertWrite = (scope: EcosystemInsightsScope) => {
  if (!scope.canWrite) {
    throw new ApiPlatformError('Creating or revising Insights editions is not allowed for the resolved binding scope.', { statusCode: 403, errorCode: 'scope_not_allowed' })
  }
}

type Payload<T> = Promise<ApiPlatformSuccessResult<T>>

export const getEcosystemInsightsCatalogPayload = async ({ context, request }: { context: ApiPlatformRequestContext; request: Request }): Payload<unknown> =>
  withInsightsErrors(async () => ({ data: await readInsightsCatalog(resolveScope(context, request)) }))

export const listEcosystemInsightReportsPayload = async ({ context, request }: { context: ApiPlatformRequestContext; request: Request }): Payload<unknown> =>
  withInsightsErrors(async () => {
    const pagination = parseApiPlatformPaginationParams(request)
    const result = await readInsightReports({ ...resolveScope(context, request), limit: pagination.pageSize, offset: pagination.offset })

    return { data: result.items, meta: buildApiPlatformPaginationMeta({ ...pagination, total: result.total, count: result.items.length }) }
  })

export const getEcosystemInsightReportPayload = async ({ context, request, reportId }: { context: ApiPlatformRequestContext; request: Request; reportId: string }): Payload<unknown> =>
  withInsightsErrors(async () => ({ data: await readInsightReport({ ...resolveScope(context, request), reportId }) }))

export const listEcosystemInsightEditionsPayload = async ({ context, request }: { context: ApiPlatformRequestContext; request: Request }): Payload<unknown> =>
  withInsightsErrors(async () => {
    const url = new URL(request.url)
    const pagination = parseApiPlatformPaginationParams(request)
    const states = url.searchParams.getAll('state').filter(isInsightEditionState) as InsightEditionState[]
    const result = await readInsightEditions({ ...resolveScope(context, request), reportId: url.searchParams.get('reportId'), states: states.length > 0 ? states : null, audience: null, limit: pagination.pageSize, offset: pagination.offset })

    return { data: result.items, meta: buildApiPlatformPaginationMeta({ ...pagination, total: result.total, count: result.items.length }) }
  })

export const getEcosystemInsightEditionPayload = async ({ context, request, editionId }: { context: ApiPlatformRequestContext; request: Request; editionId: string }): Payload<unknown> =>
  withInsightsErrors(async () => ({ data: await readInsightEdition({ ...resolveScope(context, request), editionId, includeEvidence: new URL(request.url).searchParams.get('include') === 'evidence' }) }))

export const createEcosystemInsightEditionPayload = async ({ context, request, body }: { context: ApiPlatformRequestContext; request: Request; body: unknown }): Payload<unknown> =>
  withInsightsErrors(async () => {
    const scope = resolveScope(context, request, body)

    assertWrite(scope)

    const result = await createInsightEdition({ ...scope, request: isRecord(body) ? body.request ?? body : body })

    return { data: { report: result.report, edition: result.edition, idempotent: result.idempotent, generation: result.generation ? { outcome: result.generation.outcome, failedPhase: result.generation.failedPhase, failureCode: result.generation.failureCode } : null }, status: result.idempotent ? 200 : 202 }
  })

export const reviseEcosystemInsightEditionPayload = async ({ context, request, body, editionId }: { context: ApiPlatformRequestContext; request: Request; body: unknown; editionId: string }): Payload<unknown> =>
  withInsightsErrors(async () => {
    const scope = resolveScope(context, request, body)

    assertWrite(scope)

    const result = await reviseInsightEdition({ ...scope, editionId, request: isRecord(body) ? body.request ?? body : body })

    return { data: { report: result.report, edition: result.edition, idempotent: result.idempotent, generation: result.generation ? { outcome: result.generation.outcome, failedPhase: result.generation.failedPhase, failureCode: result.generation.failureCode } : null }, status: result.idempotent ? 200 : 202 }
  })

export const recoverEcosystemInsightEditionPayload = async ({ context, request, body, editionId }: { context: ApiPlatformRequestContext; request: Request; body: unknown; editionId: string }): Payload<unknown> =>
  withInsightsErrors(async () => {
    const scope = resolveScope(context, request, body)

    assertWrite(scope)

    const result = await recoverInsightEdition({ ...scope, editionId })

    return { data: { edition: result.edition, generation: { outcome: result.outcome, failedPhase: result.failedPhase, failureCode: result.failureCode } }, status: 202 }
  })

// ── TASK-1846 — render durable por el lane ecosystem. Bindings org-scoped SÓLO leen runs de su
// audiencia; encolar/reintentar/cancelar exige binding interno. Nunca espera a Chromium (202). ──

export const requestEcosystemInsightRenderPayload = async ({ context, request, body, editionId }: { context: ApiPlatformRequestContext; request: Request; body: unknown; editionId: string }): Payload<unknown> =>
  withInsightsErrors(async () => {
    const scope = resolveScope(context, request, body)

    assertWrite(scope)

    const result = await requestInsightRender({ ...scope, editionId, outputs: isRecord(body) ? body.outputs : undefined })

    return { data: { run: result.run, outputs: result.outputs, idempotent: result.idempotent }, status: result.idempotent ? 200 : 202 }
  })

export const listEcosystemInsightRenderRunsPayload = async ({ context, request, editionId }: { context: ApiPlatformRequestContext; request: Request; editionId: string }): Payload<unknown> =>
  withInsightsErrors(async () => {
    const pagination = parseApiPlatformPaginationParams(request)
    const result = await readInsightRenderRuns({ ...resolveScope(context, request), editionId, limit: pagination.pageSize, offset: pagination.offset })

    return { data: result.items, meta: buildApiPlatformPaginationMeta({ ...pagination, total: result.total, count: result.items.length }) }
  })

export const getEcosystemInsightRenderRunPayload = async ({ context, request, renderRunId }: { context: ApiPlatformRequestContext; request: Request; renderRunId: string }): Payload<unknown> =>
  withInsightsErrors(async () => ({ data: await readInsightRenderRun({ ...resolveScope(context, request), renderRunId }) }))

export const retryEcosystemInsightRenderPayload = async ({ context, request, body, renderRunId }: { context: ApiPlatformRequestContext; request: Request; body: unknown; renderRunId: string }): Payload<unknown> =>
  withInsightsErrors(async () => {
    const scope = resolveScope(context, request, body)

    assertWrite(scope)

    const result = await retryInsightRender({ ...scope, renderRunId })

    return { data: { run: result.run, outputs: result.outputs, idempotent: result.idempotent }, status: result.idempotent ? 200 : 202 }
  })

export const cancelEcosystemInsightRenderPayload = async ({ context, request, body, renderRunId }: { context: ApiPlatformRequestContext; request: Request; body: unknown; renderRunId: string }): Payload<unknown> =>
  withInsightsErrors(async () => {
    const scope = resolveScope(context, request, body)

    assertWrite(scope)

    const result = await cancelInsightRender({ ...scope, renderRunId })

    return { data: { run: result.run, outputs: result.outputs, cancelled: result.cancelled, stillRunning: result.stillRunning, idempotent: result.idempotent }, status: 200 }
  })


// ── TASK-1848 — enlaces compartidos por el lane ecosystem. Crear/revocar exige binding interno
// (un binding org-scoped no comparte: su sujeto sintético no tiene `insights.share.manage`). ──

export const createEcosystemInsightSharePayload = async ({ context, request, body, editionId }: { context: ApiPlatformRequestContext; request: Request; body: unknown; editionId: string }): Payload<unknown> =>
  withInsightsErrors(async () => {
    const scope = resolveScope(context, request, body)

    assertWrite(scope)

    return { data: await createInsightShare({ ...scope, editionId, options: body }), status: 201 }
  })

export const listEcosystemInsightSharesPayload = async ({ context, request, editionId }: { context: ApiPlatformRequestContext; request: Request; editionId: string }): Payload<unknown> =>
  withInsightsErrors(async () => ({ data: (await readInsightShares({ ...resolveScope(context, request), editionId })).items }))

export const revokeEcosystemInsightSharePayload = async ({ context, request, body, shareGrantId }: { context: ApiPlatformRequestContext; request: Request; body: unknown; shareGrantId: string }): Payload<unknown> =>
  withInsightsErrors(async () => {
    const scope = resolveScope(context, request, body)

    assertWrite(scope)

    const result = await revokeInsightShare({ ...scope, shareGrantId })

    return { data: { share: result.share, idempotent: result.idempotent }, status: 200 }
  })

// ── TASK-1848 — envíos por correo: el lane ecosystem SÓLO lee. Solicitar, cancelar, reintentar y
// reconciliar exigen una persona interna en el App lane (mismo criterio que `issue`). ──

export const listEcosystemInsightDeliveriesPayload = async ({ context, request, editionId }: { context: ApiPlatformRequestContext; request: Request; editionId: string }): Payload<unknown> =>
  withInsightsErrors(async () => ({ data: (await readInsightDeliveries({ ...resolveScope(context, request), editionId })).items }))

export const getEcosystemInsightDeliveryPayload = async ({ context, request, deliveryIntentId }: { context: ApiPlatformRequestContext; request: Request; deliveryIntentId: string }): Payload<unknown> =>
  withInsightsErrors(async () => ({ data: await readInsightDelivery({ ...resolveScope(context, request), deliveryIntentId }) }))
