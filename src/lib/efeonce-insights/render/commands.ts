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
 * Idempotencia: a lo más UN output VIVO por (org, edición, target, audiencia) — índice parcial
 * `insight_outputs_live_identity_uq` (`WHERE state NOT IN ('dead_letter','cancelled')`). Re-encargar
 * devuelve el run existente mientras su output esté vivo; nunca produce un segundo asset final.
 *
 * Salida de un output terminal (decidido 2026-10-04, incidente del canary de Berel): `dead_letter` y
 * `cancelled` no tienen transición de vuelta, así que un encargo nuevo del mismo target crea una fila
 * NUEVA cuyo manifest se recompone con el código vigente sobre el MISMO plan congelado. La fila
 * terminal se conserva (append-only) y el evento `queued` del output nuevo la nombra en `supersedes`.
 * `retryInsightRender` NO sirve para esto: reusa el manifest sellado, que es justo lo que un fallo
 * determinista (`semantic_rejected` de un mapper corregido) volvería a rechazar.
 */

import { hashResolvedManifest } from '@/lib/artifact-composer/pure'
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

import {
  INSIGHT_RENDER_CATALOG_BY_OUTPUT,
  INSIGHT_RENDERABLE_OUTPUTS,
  isInsightOutputLive,
  isInsightOutputLiveIdentityViolation,
  type InsightOutputRecord,
  type InsightRenderRunRecord
} from './contracts'
import { buildInsightsDeckPlanInput } from './insights-deck-mapper'
import { buildInsightReportPlanInput } from './report-mapper'
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

/**
 * Idempotencia por (org, edición, target, audiencia): si un mismo run vivo cubre TODOS los targets
 * pedidos, se devuelve ese run. Si sólo parte tiene un render vivo, se rechaza con la causa (no se
 * mezclan runs) y se nombra qué sí se puede encargar. Sin nada vivo, `null`: corresponde encolar.
 */
const resolveLiveCoverage = async (
  organizationId: string,
  existing: InsightOutputRecord[],
  outputs: InsightOutput[]
): Promise<InsightRenderRunResult | null> => {
  const alive = existing.filter(o => isInsightOutputLive(o.state))
  const coveringRun = alive.find(o => outputs.every(output => alive.some(a => a.output === output && a.renderRunId === o.renderRunId)))

  if (coveringRun) {
    const run = await getInsightRenderRun({ organizationId, renderRunId: coveringRun.renderRunId })

    if (run) return { run, outputs: await listInsightOutputsForRun({ organizationId, renderRunId: run.renderRunId }), idempotent: true }
  }

  const partial = alive.filter(o => outputs.includes(o.output))

  if (partial.length > 0) {
    throw new InsightsRenderRejectedError('Parte de los outputs pedidos ya tiene un render vivo en otro run; encarga sólo los que faltan, o reintenta o cancela ese run', {
      alive: partial.map(o => ({ output: o.output, renderRunId: o.renderRunId, state: o.state })),
      requestable: outputs.filter(output => !partial.some(o => o.output === output))
    })
  }

  return null
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

  const existing = await findInsightOutputsForEdition({ organizationId: grant.organizationId, editionId: edition.editionId, audience: edition.audience })
  const covered = await resolveLiveCoverage(grant.organizationId, existing, outputs)

  if (covered) return covered

  // El output terminal más reciente de cada target pedido: el nuevo lo reemplaza y el historial lo dice.
  const supersedes = new Map<InsightOutput, string>()

  for (const record of existing) {
    if (!isInsightOutputLive(record.state) && outputs.includes(record.output) && !supersedes.has(record.output)) {
      supersedes.set(record.output, record.insightOutputId)
    }
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
  // Un manifest POR SALIDA: el deck y el informe componen desde el mismo plan sellado pero con
  // catálogos distintos, así que sellar uno solo haría que el worker detectara `manifest_drift` en
  // cuanto la segunda salida compusiera lo suyo.
  const plannedOutputs = outputs.map(output => {
    const catalogName = INSIGHT_RENDER_CATALOG_BY_OUTPUT[output as keyof typeof INSIGHT_RENDER_CATALOG_BY_OUTPUT]

    const planInput =
      output === 'report_pdf'
        ? buildInsightReportPlanInput({ edition, report, plan: plan.plan, snapshot })
        : buildInsightsDeckPlanInput({ edition, report, plan: plan.plan, snapshot })

    const manifest: Record<string, unknown> = { input: planInput as unknown as Record<string, unknown> }

    return { output, catalogName, manifest, manifestHash: hashResolvedManifest(manifest), supersedesOutputId: supersedes.get(output) ?? null }
  })

  // El evento describe el RUN, no una salida. Con más de una, un hash singular mentiría: se sella
  // el conjunto. El hash autoritativo de cada salida sigue viviendo en su propia fila, que es lo
  // que el worker compara para detectar `manifest_drift`.
  const runManifestHash = hashResolvedManifest({
    outputs: plannedOutputs.map(o => ({ output: o.output, manifestHash: o.manifestHash }))
  })

  try {
    return await withGreenhousePostgresTransaction(async client => {
      const inserted = await insertInsightRenderRun({
        client,
        organizationId: grant.organizationId,
        editionId: edition.editionId,
        audience: edition.audience,
        requestedOutputs: outputs,
        // TASK-1846 — el actor se audita tal cual: un usuario del portal cliente es `client_user`, no
        // `system` (así lo registran también reportes, ediciones y transiciones de Insights).
        requestedByKind: grant.actor.kind,
        requestedByUserId: grant.actor.userId,
        requestedByMemberId: grant.actor.memberId,
        outputs: plannedOutputs
      })

      await publishInsightRenderRequested(client as never, {
        version: 1,
        renderRunId: inserted.run.renderRunId,
        editionId: edition.editionId,
        organizationId: edition.organizationId,
        audience: edition.audience,
        outputs,
        manifestHash: runManifestHash,
        actorKind: grant.actor.kind
      })

      return { run: inserted.run, outputs: inserted.outputs, idempotent: false }
    })
  } catch (error) {
    // Carrera: otro encargo del mismo target entró entre la lectura y el INSERT. La DB lo frenó
    // (índice parcial); nunca es un 500. Si ese encargo cubre lo pedido, es el mismo resultado.
    if (!isInsightOutputLiveIdentityViolation(error)) throw error

    const current = await findInsightOutputsForEdition({ organizationId: grant.organizationId, editionId: edition.editionId, audience: edition.audience })
    const raced = await resolveLiveCoverage(grant.organizationId, current, outputs)

    if (raced) return raced

    throw new InsightsRenderRejectedError('Otro encargo concurrente ya tiene un render vivo para parte de estos outputs', {
      outputs,
      alive: current.filter(o => isInsightOutputLive(o.state) && outputs.includes(o.output)).map(o => ({ output: o.output, renderRunId: o.renderRunId, state: o.state }))
    })
  }
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
  const requeued = await retryFailedInsightOutputs({ organizationId: grant.organizationId, renderRunId: run.renderRunId, actorKind: grant.actor.kind })
  const fresh = (await getInsightRenderRun({ organizationId: grant.organizationId, renderRunId: run.renderRunId })) ?? run

  return { run: fresh, outputs: await listInsightOutputsForRun({ organizationId: grant.organizationId, renderRunId: run.renderRunId }), idempotent: requeued.length === 0 }
}

export const cancelInsightRender = async (
  input: RenderScope & { renderRunId: string }
): Promise<InsightRenderRunResult & { cancelled: number; stillRunning: number }> => {
  const { grant, run } = await loadRun(input, input.renderRunId, 'create')
  const result = await cancelInsightRenderRun({ organizationId: grant.organizationId, renderRunId: run.renderRunId, actorKind: grant.actor.kind })
  const fresh = (await getInsightRenderRun({ organizationId: grant.organizationId, renderRunId: run.renderRunId })) ?? run

  return { run: fresh, outputs: await listInsightOutputsForRun({ organizationId: grant.organizationId, renderRunId: run.renderRunId }), idempotent: result.cancelled === 0, ...result }
}
