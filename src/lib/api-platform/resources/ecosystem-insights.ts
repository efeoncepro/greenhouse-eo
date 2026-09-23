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
 *
 * ISSUE-177 — este módulo contiene SÓLO los commands (escrituras). Las lecturas viven en
 * `ecosystem-insights-read.ts` y la derivación del sujeto en `ecosystem-insights-scope.ts`, para
 * que una ruta GET no cargue el barrel de commands (que re-exporta el render). No re-exportar nada
 * de lectura desde aquí: volvería a acoplar el grafo de las rutas de lectura con el render.
 *
 * ⚠️ Este módulo DEBE importar el barrel `@/lib/efeonce-insights/commands` (y no deep-imports de
 * cada command): al cargarse, el barrel conecta el puerto de outputs (`wireInsightOutputsPort`),
 * igual que en el App lane. Lo verifica `insights-read-boundary.test.ts`.
 */

import type { ApiPlatformRequestContext } from '@/lib/api-platform/core/context'
import { cancelInsightRender, createInsightEdition, createInsightShare, revokeInsightShare, recoverInsightEdition, requestInsightRender, retryInsightRender, reviseInsightEdition } from '@/lib/efeonce-insights/commands'

import { assertWrite, isRecord, resolveScope, type Payload } from './ecosystem-insights-scope'
import { withInsightsErrors } from './insights-errors'

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
// audiencia (lectura en `ecosystem-insights-read.ts`); encolar/reintentar/cancelar exige binding
// interno. Nunca espera a Chromium (202). ──

export const requestEcosystemInsightRenderPayload = async ({ context, request, body, editionId }: { context: ApiPlatformRequestContext; request: Request; body: unknown; editionId: string }): Payload<unknown> =>
  withInsightsErrors(async () => {
    const scope = resolveScope(context, request, body)

    assertWrite(scope)

    const result = await requestInsightRender({ ...scope, editionId, outputs: isRecord(body) ? body.outputs : undefined })

    return { data: { run: result.run, outputs: result.outputs, idempotent: result.idempotent }, status: result.idempotent ? 200 : 202 }
  })

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

export const revokeEcosystemInsightSharePayload = async ({ context, request, body, shareGrantId }: { context: ApiPlatformRequestContext; request: Request; body: unknown; shareGrantId: string }): Payload<unknown> =>
  withInsightsErrors(async () => {
    const scope = resolveScope(context, request, body)

    assertWrite(scope)

    const result = await revokeInsightShare({ ...scope, shareGrantId })

    return { data: { share: result.share, idempotent: result.idempotent }, status: 200 }
  })
