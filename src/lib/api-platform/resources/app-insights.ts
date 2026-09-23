import 'server-only'

/**
 * TASK-1845 — App lane de Efeonce Insights (`/api/platform/app/insights/**`): thin adapter
 * sobre commands/readers canónicos. El actor es el usuario autenticado (cookie o bearer
 * first-party); su organización viene del tenant (cliente) — nunca del payload. Un interno
 * declara la org objetivo por query/body y el dominio revalida target y módulo.
 *
 * ISSUE-177 — este módulo contiene SÓLO los commands (escrituras). Las lecturas viven en
 * `app-insights-read.ts` y la derivación del sujeto en `app-insights-scope.ts`, para que una ruta
 * GET no cargue el barrel de commands (que re-exporta el render). No re-exportar nada de lectura
 * desde aquí: volvería a acoplar el grafo de las rutas de lectura con el render.
 *
 * ⚠️ Este módulo DEBE importar el barrel `@/lib/efeonce-insights/commands` (y no deep-imports de
 * cada command): al cargarse, el barrel conecta el puerto de outputs (`wireInsightOutputsPort`).
 * Sin él, `issue` fallaría con un `409 not_ready` engañoso ("puerto sin conectar"). Lo verifica
 * `insights-read-boundary.test.ts`.
 */

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { cancelInsightRender, createInsightEdition, createInsightShare, revokeInsightShare, issueInsightEdition, recoverInsightEdition, requestInsightRender, retryInsightRender, reviseInsightEdition, withdrawInsightEdition } from '@/lib/efeonce-insights/commands'

import {
  cancelInsightDelivery,
  reconcileInsightDeliveryRecipient,
  requestInsightDelivery,
  retryInsightDelivery
} from '@/lib/efeonce-insights/delivery/commands'
import { createInsightSchedule, transitionInsightScheduleCommand } from '@/lib/efeonce-insights/schedules/commands'

import { isRecord, resolveScope } from './app-insights-scope'
import { withInsightsErrors } from './insights-errors'

const reasonFrom = (body: unknown, fallback: string): string => (isRecord(body) && typeof body.reason === 'string' && body.reason.trim().length >= 5 ? body.reason.trim() : fallback)

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

// ── TASK-1846 — render durable: request/retry/cancel (asíncrono: 202, nunca espera a Chromium).
// get/list de runs viven en `app-insights-read.ts`. ──

const renderResult = (result: { run: unknown; outputs: unknown; idempotent: boolean }) => ({
  data: { run: result.run, outputs: result.outputs, idempotent: result.idempotent },
  status: result.idempotent ? 200 : 202
})

export const requestAppInsightRender = async ({ context, request, body, editionId }: { context: AppPlatformRequestContext; request: Request; body: unknown; editionId: string }) =>
  withInsightsErrors(async () => renderResult(await requestInsightRender({ ...resolveScope(context, request, body), editionId, outputs: isRecord(body) ? body.outputs : undefined })))

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
