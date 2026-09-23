import 'server-only'

/**
 * TASK-1845 · ISSUE-177 — lecturas del App lane de Efeonce Insights (`/api/platform/app/insights/**`).
 *
 * Mismo contrato que antes (nombres, firmas, errores y forma de respuesta); sólo cambia dónde vive.
 * Las rutas GET importan ESTE módulo y no `app-insights.ts`, porque aquél carga el barrel de
 * commands del dominio Insights (`commands/index.ts`), que re-exporta el render entero: con un
 * único módulo de recursos, cualquier import pesado del render entraba en la función de `catalog`
 * (441 MB en staging, 2026-09-22). Aquí sólo entran readers y las funciones de lectura de
 * delivery/schedules.
 *
 * NUNCA importar desde aquí el barrel de commands de Insights, `render/commands` ni el composer de
 * artefactos (ni directo ni a través de un helper) — lo verifica `insights-read-boundary.test.ts`.
 */

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { buildApiPlatformPaginationMeta, parseApiPlatformPaginationParams } from '@/lib/api-platform/core/pagination'
import { isInsightEditionState, type InsightEditionState } from '@/lib/efeonce-insights/contracts/states'
import { readInsightEdition, readInsightEditions, readInsightRenderRun, readInsightShares, readInsightRenderRuns, readInsightReport, readInsightReports, readInsightsCatalog } from '@/lib/efeonce-insights/readers'

import { readInsightDeliveries, readInsightDelivery } from '@/lib/efeonce-insights/delivery/commands'
import { readInsightSchedule, readInsightSchedules } from '@/lib/efeonce-insights/schedules/commands'

import { resolveScope } from './app-insights-scope'
import { withInsightsErrors } from './insights-errors'

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

// ── TASK-1846 — render durable: lectura de runs (encolar/reintentar/cancelar viven en `app-insights.ts`) ──

export const listAppInsightRenderRuns = async ({ context, request, editionId }: { context: AppPlatformRequestContext; request: Request; editionId: string }) =>
  withInsightsErrors(async () => {
    const pagination = parseApiPlatformPaginationParams(request)
    const result = await readInsightRenderRuns({ ...resolveScope(context, request), editionId, limit: pagination.pageSize, offset: pagination.offset })

    return { data: result.items, meta: buildApiPlatformPaginationMeta({ ...pagination, total: result.total, count: result.items.length }) }
  })

export const getAppInsightRenderRun = async ({ context, request, renderRunId }: { context: AppPlatformRequestContext; request: Request; renderRunId: string }) =>
  withInsightsErrors(() => readInsightRenderRun({ ...resolveScope(context, request), renderRunId }))

// ── TASK-1848 — enlaces compartidos: listado (crear/revocar viven en `app-insights.ts`) ──

export const listAppInsightShares = async ({ context, request, editionId }: { context: AppPlatformRequestContext; request: Request; editionId: string }) =>
  withInsightsErrors(async () => ({ data: (await readInsightShares({ ...resolveScope(context, request), editionId })).items }))

// ── TASK-1848 — envío por correo: lectura de intents ──

export const listAppInsightDeliveries = async ({ context, request, editionId }: { context: AppPlatformRequestContext; request: Request; editionId: string }) =>
  withInsightsErrors(async () => ({ data: (await readInsightDeliveries({ ...resolveScope(context, request), editionId })).items }))

export const getAppInsightDelivery = async ({ context, request, deliveryIntentId }: { context: AppPlatformRequestContext; request: Request; deliveryIntentId: string }) =>
  withInsightsErrors(async () => ({ data: await readInsightDelivery({ ...resolveScope(context, request), deliveryIntentId }) }))

// ── TASK-1848 — recurrencia: lectura de schedules ──

export const listAppInsightSchedules = async ({ context, request }: { context: AppPlatformRequestContext; request: Request }) =>
  withInsightsErrors(async () => ({ data: (await readInsightSchedules(resolveScope(context, request))).items }))

export const getAppInsightSchedule = async ({ context, request, scheduleId }: { context: AppPlatformRequestContext; request: Request; scheduleId: string }) =>
  withInsightsErrors(async () => ({ data: await readInsightSchedule({ ...resolveScope(context, request), scheduleId }) }))
