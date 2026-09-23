import 'server-only'

/**
 * TASK-1845 · ISSUE-177 — lecturas del Ecosystem lane de Efeonce Insights
 * (`/api/platform/ecosystem/insights/**`, consumido por el gateway MCP federado).
 *
 * Mismo contrato que antes (nombres, firmas, errores y forma de respuesta); sólo cambia dónde vive.
 * Las rutas GET importan ESTE módulo y no `ecosystem-insights.ts`, porque aquél carga el barrel de
 * commands del dominio Insights (`commands/index.ts`), que re-exporta el render entero: con un
 * único módulo de recursos, cualquier import pesado del render entraba en cada función de lectura.
 * Aquí sólo entran readers y las funciones de lectura de delivery/schedules.
 *
 * NUNCA importar desde aquí el barrel de commands de Insights, `render/commands` ni el composer de
 * artefactos (ni directo ni a través de un helper) — lo verifica `insights-read-boundary.test.ts`.
 */

import type { ApiPlatformRequestContext } from '@/lib/api-platform/core/context'
import { buildApiPlatformPaginationMeta, parseApiPlatformPaginationParams } from '@/lib/api-platform/core/pagination'
import { isInsightEditionState, type InsightEditionState } from '@/lib/efeonce-insights/contracts/states'
import { readInsightEdition, readInsightEditions, readInsightRenderRun, readInsightShares, readInsightRenderRuns, readInsightReport, readInsightReports, readInsightsCatalog } from '@/lib/efeonce-insights/readers'

import { readInsightDeliveries, readInsightDelivery } from '@/lib/efeonce-insights/delivery/commands'
import { readInsightSchedule, readInsightSchedules } from '@/lib/efeonce-insights/schedules/commands'

import { resolveScope, type Payload } from './ecosystem-insights-scope'
import { withInsightsErrors } from './insights-errors'

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

// ── TASK-1846 — render durable: lectura de runs. Un binding org-scoped SÓLO lee runs de su audiencia;
// encolar/reintentar/cancelar viven en `ecosystem-insights.ts` y exigen binding interno. ──

export const listEcosystemInsightRenderRunsPayload = async ({ context, request, editionId }: { context: ApiPlatformRequestContext; request: Request; editionId: string }): Payload<unknown> =>
  withInsightsErrors(async () => {
    const pagination = parseApiPlatformPaginationParams(request)
    const result = await readInsightRenderRuns({ ...resolveScope(context, request), editionId, limit: pagination.pageSize, offset: pagination.offset })

    return { data: result.items, meta: buildApiPlatformPaginationMeta({ ...pagination, total: result.total, count: result.items.length }) }
  })

export const getEcosystemInsightRenderRunPayload = async ({ context, request, renderRunId }: { context: ApiPlatformRequestContext; request: Request; renderRunId: string }): Payload<unknown> =>
  withInsightsErrors(async () => ({ data: await readInsightRenderRun({ ...resolveScope(context, request), renderRunId }) }))

// ── TASK-1848 — enlaces compartidos: listado (crear/revocar viven en `ecosystem-insights.ts`) ──

export const listEcosystemInsightSharesPayload = async ({ context, request, editionId }: { context: ApiPlatformRequestContext; request: Request; editionId: string }): Payload<unknown> =>
  withInsightsErrors(async () => ({ data: (await readInsightShares({ ...resolveScope(context, request), editionId })).items }))

// ── TASK-1848 — envíos por correo: el lane ecosystem SÓLO lee. Solicitar, cancelar, reintentar y
// reconciliar exigen una persona interna en el App lane (mismo criterio que `issue`). ──

export const listEcosystemInsightDeliveriesPayload = async ({ context, request, editionId }: { context: ApiPlatformRequestContext; request: Request; editionId: string }): Payload<unknown> =>
  withInsightsErrors(async () => ({ data: (await readInsightDeliveries({ ...resolveScope(context, request), editionId })).items }))

export const getEcosystemInsightDeliveryPayload = async ({ context, request, deliveryIntentId }: { context: ApiPlatformRequestContext; request: Request; deliveryIntentId: string }): Payload<unknown> =>
  withInsightsErrors(async () => ({ data: await readInsightDelivery({ ...resolveScope(context, request), deliveryIntentId }) }))

// ── TASK-1848 — recurrencia: el lane ecosystem SÓLO lee (crearla o activarla exige una persona). ──

export const listEcosystemInsightSchedulesPayload = async ({ context, request }: { context: ApiPlatformRequestContext; request: Request }): Payload<unknown> =>
  withInsightsErrors(async () => ({ data: (await readInsightSchedules(resolveScope(context, request))).items }))

export const getEcosystemInsightSchedulePayload = async ({ context, request, scheduleId }: { context: ApiPlatformRequestContext; request: Request; scheduleId: string }): Payload<unknown> =>
  withInsightsErrors(async () => ({ data: await readInsightSchedule({ ...resolveScope(context, request), scheduleId }) }))
