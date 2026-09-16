import 'server-only'

/**
 * TASK-1846 — commands del render durable: `requestInsightRender` (encolar), `retryInsightRender`,
 * `cancelInsightRender`. Son la ENTRADA del motor: sin esto la cola no se puede llenar por código.
 *
 * Gates fail-closed al encolar (no esperan al worker):
 *   1. Flag `INSIGHTS_RENDER_ENABLED` en este runtime.
 *   2. Tres planos de acceso (`assertInsightsAccess`, need `create`) + audiencia de la edición
 *      permitida al actor (un cliente no encarga outputs de un draft interno).
 *   3. Edición en `ready_for_review` con snapshot sellado y plan congelado: el manifest se compone
 *      sobre hechos inmutables; nunca sobre un plan en autoría.
 *   4. Sólo outputs renderizables hoy (`deck_pdf`); otro target ⇒ `render_rejected`, nunca "queda
 *      para después".
 *   5. Manifest resuelto por el composer (selector + contratos + validadores) y hash sellado ACÁ;
 *      el worker re-resuelve y compara byte a byte.
 *
 * Idempotencia: un output por (org, edición, target, audiencia). Re-encargar devuelve el run existente
 * mientras su output no esté en `dead_letter`/`cancelled`; nunca produce un segundo asset final.
 */

import { hashResolvedManifest } from '@/lib/artifact-composer/manifest-hash'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { assertAudienceAllowed, assertInsightsAccess } from '../authz'
import { isInsightOutput, type InsightOutput } from '../contracts/request'
import { InsightsNotFoundError, InsightsNotReadyError, InsightsRenderDisabledError, InsightsRenderRejectedError } from '../errors'
import { publishInsightRenderRequested } from '../events'
import { isInsightsRenderEnabled } from '../flags'
import { getInsightEditionById } from '../stores/edition-store'
import { getInsightEditorialPlanByEdition } from '../stores/plan-store'
import { getInsightReportById } from '../stores/report-store'
import { getInsightEvidenceSnapshotByEdition } from '../stores/snapshot-store'

import { INSIGHT_RENDER_CATALOG_NAME, INSIGHT_RENDERABLE_OUTPUTS, type InsightOutputRecord, type InsightRenderRunRecord } from './contracts'
import { buildInsightDeckPlanInput } from './deck-mapper'
import {
  cancelInsightRenderRun,
  findInsightOutputsForEdition,
  getInsightRenderRun,
  insertInsightRenderRun,
  listInsightOutputsForRun,
  retryFailedInsightOutputs
} from './store'

interface RenderScope {
  subject: TenantEntitlementSubject
  actorOrganizationId: string | null
  organizationId: string
  env?: NodeJS.ProcessEnv
}

export interface RequestInsightRenderInput extends RenderScope {
  editionId: string
  /** Subconjunto de `edition.outputs`; por defecto, todos los solicitados por la edición. */
  outputs?: unknown
}

export interface InsightRenderRunResult {
  run: InsightRenderRunRecord
  outputs: InsightOutputRecord[]
  idempotent: boolean
}

const resolveRequestedOutputs = (edition: { outputs: string[] }, requested: unknown): InsightOutput[] => {
  const editionOutputs = edition.outputs.filter(isInsightOutput)

  if (requested === undefined || requested === null) return editionOutputs

  if (!Array.isArray(requested) || requested.length === 0 || !requested.every(isInsightOutput)) {
    throw new InsightsRenderRejectedError('"outputs" debe ser una lista no vacía de outputs válidos', { outputs: requested })
  }

  const outside = requested.filter(output => !editionOutputs.includes(output))

  if (outside.length > 0) {
    throw new InsightsRenderRejectedError('Se pidieron outputs que la edición no declaró en su encargo', { outside })
  }

  return requested
}

export const requestInsightRender = async (input: RequestInsightRenderInput): Promise<InsightRenderRunResult> => {
  if (!isInsightsRenderEnabled(input.env)) throw new InsightsRenderDisabledError()

  const grant = await assertInsightsAccess({ ...input, need: 'create' })
  const edition = await getInsightEditionById(undefined, grant.organizationId, input.editionId)

  if (!edition) throw new InsightsNotFoundError('edition', input.editionId)

  // Un cliente no ve ni encarga outputs de una edición interna: anti-oracle, igual que el reader.
  if (!grant.allowedAudiences.includes(edition.audience)) throw new InsightsNotFoundError('edition', input.editionId)
  assertAudienceAllowed(grant, edition.audience)

  if (edition.state !== 'ready_for_review') {
    throw new InsightsNotReadyError('Sólo una edición en ready_for_review puede renderizarse', { state: edition.state })
  }

  const outputs = resolveRequestedOutputs(edition, input.outputs)
  const unsupported = outputs.filter(output => !(INSIGHT_RENDERABLE_OUTPUTS as readonly string[]).includes(output))

  if (unsupported.length > 0) {
    throw new InsightsRenderRejectedError('Hay outputs que el motor aún no puede producir; no se encolan para después', {
      unsupported,
      renderable: INSIGHT_RENDERABLE_OUTPUTS
    })
  }

  // Idempotencia por (org, edición, target, audiencia): si ya existe un output vivo para cada target
  // pedido, se devuelve ese run. dead_letter/cancelled no cuentan como "vivo": ahí sí cabe re-encargar.
  const existing = await findInsightOutputsForEdition({ organizationId: grant.organizationId, editionId: edition.editionId, audience: edition.audience })
  const alive = existing.filter(o => o.state !== 'dead_letter' && o.state !== 'cancelled')
  const coveringRun = alive.find(o => outputs.every(output => alive.some(a => a.output === output && a.renderRunId === o.renderRunId)))

  if (coveringRun) {
    const run = await getInsightRenderRun({ organizationId: grant.organizationId, renderRunId: coveringRun.renderRunId })

    if (run) {
      return { run, outputs: await listInsightOutputsForRun({ organizationId: grant.organizationId, renderRunId: run.renderRunId }), idempotent: true }
    }
  }

  const partial = alive.filter(o => outputs.includes(o.output))

  if (partial.length > 0) {
    // Un target ya vivo en otro run y otro no: no se mezclan runs. Se rechaza con la causa.
    throw new InsightsRenderRejectedError('Parte de los outputs pedidos ya tiene un render vivo en otro run; reintenta o cancela ese run', {
      alive: partial.map(o => ({ output: o.output, renderRunId: o.renderRunId, state: o.state }))
    })
  }

  const [report, snapshot, plan] = await Promise.all([
    getInsightReportById(undefined, grant.organizationId, edition.reportId),
    getInsightEvidenceSnapshotByEdition(undefined, grant.organizationId, edition.editionId),
    getInsightEditorialPlanByEdition(undefined, grant.organizationId, edition.editionId)
  ])

  if (!report) throw new InsightsNotFoundError('report', edition.reportId)
  if (!snapshot?.sealedAt || !snapshot.snapshotHash) throw new InsightsNotReadyError('El snapshot de evidencia no está sellado', { editionId: edition.editionId })
  if (!plan?.frozenAt || !plan.planHash) throw new InsightsNotReadyError('El plan editorial no está congelado', { editionId: edition.editionId })

  // Se sella el INPUT canónico del artefacto, no el manifest resuelto. El manifest lo resuelve el
  // worker, que es quien tiene el catálogo empaquetado: importarlo acá arrastra 19 MB de fuentes y
  // assets al bundle de Vercel (la función `insights/catalog` llegó a 434 MB y rompió staging el
  // 2026-09-16). Es además el patrón de Proposal, cuyo command tampoco resuelve: recibe y hashea.
  //
  // Qué sigue garantizando el hash: que el worker componga EXACTAMENTE las láminas selladas. Si el
  // input que emite el composer no coincide, es `manifest_drift` y no se publica. La validación
  // autoritativa de slots/semántica corre en el worker contra los contratos reales del catálogo;
  // el mapper ya rechaza acá lo que excede los presupuestos conocidos.
  const planInput = buildInsightDeckPlanInput({ edition, report, plan: plan.plan, snapshot })
  const manifest: Record<string, unknown> = { input: planInput as unknown as Record<string, unknown> }
  const manifestHash = hashResolvedManifest(manifest)

  return withGreenhousePostgresTransaction(async client => {
    const inserted = await insertInsightRenderRun({
      client,
      organizationId: grant.organizationId,
      editionId: edition.editionId,
      audience: edition.audience,
      requestedOutputs: outputs,
      requestedByKind: grant.actor.kind === 'member' ? 'member' : 'system',
      requestedByUserId: grant.actor.userId,
      requestedByMemberId: grant.actor.memberId,
      outputs: outputs.map(output => ({ output, catalogName: INSIGHT_RENDER_CATALOG_NAME, manifest, manifestHash }))
    })

    await publishInsightRenderRequested(client as never, {
      version: 1,
      renderRunId: inserted.run.renderRunId,
      editionId: edition.editionId,
      organizationId: edition.organizationId,
      audience: edition.audience,
      outputs,
      manifestHash,
      actorKind: grant.actor.kind
    })

    return { run: inserted.run, outputs: inserted.outputs, idempotent: false }
  })
}

const loadRun = async (scope: RenderScope, renderRunId: string, need: 'read' | 'create') => {
  const grant = await assertInsightsAccess({ ...scope, need })
  const run = await getInsightRenderRun({ organizationId: grant.organizationId, renderRunId })

  if (!run || !grant.allowedAudiences.includes(run.audience)) throw new InsightsNotFoundError('render_run', renderRunId)

  return { grant, run }
}

export const retryInsightRender = async (input: RenderScope & { renderRunId: string }): Promise<InsightRenderRunResult> => {
  if (!isInsightsRenderEnabled(input.env)) throw new InsightsRenderDisabledError()

  const { grant, run } = await loadRun(input, input.renderRunId, 'create')
  const requeued = await retryFailedInsightOutputs({ organizationId: grant.organizationId, renderRunId: run.renderRunId })
  const fresh = (await getInsightRenderRun({ organizationId: grant.organizationId, renderRunId: run.renderRunId })) ?? run

  return { run: fresh, outputs: await listInsightOutputsForRun({ organizationId: grant.organizationId, renderRunId: run.renderRunId }), idempotent: requeued.length === 0 }
}

export const cancelInsightRender = async (
  input: RenderScope & { renderRunId: string }
): Promise<InsightRenderRunResult & { cancelled: number; stillRunning: number }> => {
  const { grant, run } = await loadRun(input, input.renderRunId, 'create')
  const result = await cancelInsightRenderRun({ organizationId: grant.organizationId, renderRunId: run.renderRunId })
  const fresh = (await getInsightRenderRun({ organizationId: grant.organizationId, renderRunId: run.renderRunId })) ?? run

  return { run: fresh, outputs: await listInsightOutputsForRun({ organizationId: grant.organizationId, renderRunId: run.renderRunId }), idempotent: result.cancelled === 0, ...result }
}
