import 'server-only'

/**
 * TASK-1845 — pipeline de generación de una edición (sin render: eso es TASK-1846).
 *
 *   collecting  → recolecta evidencia por adapter y SELLA el snapshot
 *   composing   → autoría del plan (determinista o IA acotada) y CONGELA el plan
 *   validating  → módulos requeridos con evidencia (o `allow_partial` explícito) + plan ⊆ snapshot
 *   → ready_for_review
 *
 * Cada fase es una transacción propia (estado + historial + outbox atómicos). Un fallo deja la
 * edición en `failed` con su fase, recuperable por `recoverInsightEdition` desde ESA fase, sin
 * rehacer las anteriores (el snapshot sellado y el plan congelado se conservan).
 */

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { captureWithDomain } from '@/lib/observability/capture'

import { collectInsightEvidence } from '../adapters/collect-evidence'
import type { InsightModule } from '../contracts/request'
import type { InsightActor, InsightFailedPhase } from '../contracts/states'
import { authorEditorialPlan } from '../editorial/author-plan'
import { validateEditorialPlan } from '../editorial/plan-validation'
import { InsightsEvidenceRejectedError, InsightsNotReadyError, isInsightsError } from '../errors'
import { publishInsightEditionStateTransitioned, publishInsightEvidenceSealed } from '../events'
import { transitionInsightEditionState } from '../stores/edition-store'
import { freezeInsightEditorialPlan, getInsightEditorialPlanByEdition, upsertInsightEditorialPlan } from '../stores/plan-store'
import type { InsightEditionRecord } from '../stores/records'
import { getInsightEvidenceSnapshotByEdition, sealInsightEvidenceSnapshot, upsertInsightEvidenceSnapshot } from '../stores/snapshot-store'
import { resolveInsightWindows } from '../window'

const SYSTEM_ACTOR: InsightActor = { kind: 'system', userId: null, memberId: null }

const PHASES: InsightFailedPhase[] = ['collecting', 'composing', 'validating']

const transition = async (edition: InsightEditionRecord, toState: 'collecting' | 'composing' | 'validating' | 'ready_for_review' | 'failed', reason: string, metadata: Record<string, unknown> = {}, reviewOwnerUserId?: string | null) =>
  withGreenhousePostgresTransaction(async client => {
    const result = await transitionInsightEditionState(client, {
      organizationId: edition.organizationId,
      editionId: edition.editionId,
      toState,
      actor: SYSTEM_ACTOR,
      reason,
      metadata,
      patch: reviewOwnerUserId !== undefined ? { reviewOwnerUserId } : undefined
    })

    if (!result.idempotent) {
      await publishInsightEditionStateTransitioned(client, {
        version: 1,
        editionId: edition.editionId,
        reportId: edition.reportId,
        organizationId: edition.organizationId,
        fromState: result.transition.fromState,
        toState: result.transition.toState,
        requiresHumanGate: result.transition.requiresHumanGate,
        actorKind: 'system',
        transitionId: result.transition.transitionId
      })
    }

    return result.edition
  })

const runCollecting = async (edition: InsightEditionRecord): Promise<void> => {
  const windows = resolveInsightWindows(edition.request.period, edition.request.comparison)

  const content = await collectInsightEvidence({
    organizationId: edition.organizationId,
    audience: edition.audience,
    modules: edition.modules as InsightModule[],
    windows,
    projectIds: edition.request.projectIds ?? []
  })

  await withGreenhousePostgresTransaction(async client => {
    const draft = await upsertInsightEvidenceSnapshot(client, { organizationId: edition.organizationId, editionId: edition.editionId, content })
    const sealed = await sealInsightEvidenceSnapshot(client, { organizationId: edition.organizationId, snapshotId: draft.snapshotId })

    await publishInsightEvidenceSealed(client, {
      version: 1,
      snapshotId: sealed.snapshotId,
      editionId: edition.editionId,
      organizationId: edition.organizationId,
      snapshotHash: sealed.snapshotHash ?? '',
      factCount: sealed.facts.length,
      rejectionCount: sealed.rejections.length,
      asOfMax: sealed.asOfMax
    })
  })
}

const runComposing = async (edition: InsightEditionRecord): Promise<void> => {
  const snapshot = await getInsightEvidenceSnapshotByEdition(undefined, edition.organizationId, edition.editionId)

  if (!snapshot || !snapshot.sealedAt) throw new InsightsNotReadyError('No hay snapshot sellado para componer el plan', { editionId: edition.editionId })

  const authored = await authorEditorialPlan({
    snapshot: { facts: snapshot.facts, sources: snapshot.sources, rejections: snapshot.rejections },
    modules: edition.modules as InsightModule[],
    locale: edition.request.locale
  })

  await withGreenhousePostgresTransaction(async client => {
    const plan = await upsertInsightEditorialPlan(client, {
      organizationId: edition.organizationId,
      editionId: edition.editionId,
      snapshotId: snapshot.snapshotId,
      plan: authored.plan,
      provenance: authored.provenance
    })

    await freezeInsightEditorialPlan(client, { organizationId: edition.organizationId, planId: plan.planId })
  })
}

const runValidating = async (edition: InsightEditionRecord): Promise<{ reviewOwnerUserId: string | null }> => {
  const [snapshot, plan] = await Promise.all([
    getInsightEvidenceSnapshotByEdition(undefined, edition.organizationId, edition.editionId),
    getInsightEditorialPlanByEdition(undefined, edition.organizationId, edition.editionId)
  ])

  if (!snapshot?.sealedAt || !plan?.frozenAt) throw new InsightsNotReadyError('Snapshot o plan no congelados', { editionId: edition.editionId })

  // Un módulo requerido sin ningún hecho bloquea la emisión salvo `allow_partial` EXPLÍCITO
  // (arquitectura §5); aun así la omisión queda visible en `limits` del plan.
  const modulesWithoutFacts = (edition.modules as InsightModule[]).filter(module => !snapshot.facts.some(fact => fact.module === module))

  if (modulesWithoutFacts.length > 0 && edition.request.policy?.allowPartial !== true) {
    throw new InsightsEvidenceRejectedError('Módulos requeridos sin evidencia; la policy no permite omisiones', {
      modules: modulesWithoutFacts,
      rejections: snapshot.rejections.filter(rejection => modulesWithoutFacts.includes(rejection.module))
    })
  }

  const violations = validateEditorialPlan(plan.plan, { facts: snapshot.facts, sources: snapshot.sources, rejections: snapshot.rejections })

  if (violations.length > 0) throw new InsightsEvidenceRejectedError('El plan congelado no coincide con el snapshot', { violations })

  // Owner de revisión: el creador cuando es una persona interna; una solicitud de cliente queda
  // sin owner hasta que la policy de EPIC-046 P01 lo asigne (visible como pendiente).
  return { reviewOwnerUserId: edition.createdByActorKind === 'member' ? edition.createdByUserId : null }
}

export interface RunGenerationResult {
  edition: InsightEditionRecord
  /** Fase alcanzada; `ready_for_review` cuando todo pasó. */
  outcome: 'ready_for_review' | 'failed'
  failedPhase: InsightFailedPhase | null
  failureCode: string | null
}

/** Ejecuta el pipeline desde `fromPhase` (default: desde el principio). */
export const runInsightGeneration = async (edition: InsightEditionRecord, fromPhase: InsightFailedPhase = 'collecting'): Promise<RunGenerationResult> => {
  let current = edition

  for (const phase of PHASES.slice(PHASES.indexOf(fromPhase))) {
    current = await transition(current, phase, `fase ${phase}`)

    try {
      if (phase === 'collecting') await runCollecting(current)
      if (phase === 'composing') await runComposing(current)

      if (phase === 'validating') {
        const { reviewOwnerUserId } = await runValidating(current)

        current = await transition(current, 'ready_for_review', 'validación superada', {}, reviewOwnerUserId)
      }
    } catch (error) {
      const code = isInsightsError(error) ? error.code : 'unexpected'
      const details = isInsightsError(error) ? error.details : {}

      if (!isInsightsError(error)) captureWithDomain(error, 'insights', { extra: { operation: 'runInsightGeneration', phase, editionId: current.editionId } })

      current = await transition(current, 'failed', `fase ${phase} falló: ${code}`, { failureCode: code, ...redact(details) })

      return { edition: current, outcome: 'failed', failedPhase: phase, failureCode: code }
    }
  }

  return { edition: current, outcome: 'ready_for_review', failedPhase: null, failureCode: null }
}

/** El historial es redactado: ids, códigos y conteos; nunca hechos ni narrativa. */
const redact = (details: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(details)) {
    if (Array.isArray(value)) out[key] = value.length
    else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) out[key] = value
  }

  return out
}
