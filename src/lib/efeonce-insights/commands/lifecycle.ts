import 'server-only'

/**
 * TASK-1845 — `issue` / `withdraw` / `recover`. Emitir exige: flag de emisión, capability
 * `insights.edition.issue`, estado `ready_for_review`, outputs solicitados VALIDADOS (puerto de
 * TASK-1846; bloqueado hasta conectarlo) y una persona autenticada (gate humano en DB y TS).
 * El `issued_hash` liga la aprobación a snapshot + plan + encargo + outputs: cualquier cambio
 * posterior sería otra edición.
 */

import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { captureWithDomain } from '@/lib/observability/capture'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { assertInsightsAccess } from '../authz'
import type { InsightFailedPhase } from '../contracts/states'
import { InsightsInputError, InsightsIssuanceDisabledError, InsightsNotFoundError, InsightsNotReadyError } from '../errors'
import { publishInsightEditionIssued, publishInsightEditionStateTransitioned, publishInsightShareRevoked } from '../events'
import { isInsightsIssuanceEnabled } from '../flags'
import { getInsightOutputsPort } from '../ports'
import { cancelPendingInsightDeliveryRecipients, insertInsightDeliveryEvent } from '../delivery/store'
import { revokeActiveInsightShareGrantsForEdition } from '../sharing/store'
import { hashCanonical } from '../request-hash'
import { getInsightEditionById, transitionInsightEditionState } from '../stores/edition-store'
import { getInsightEditorialPlanByEdition } from '../stores/plan-store'
import { getInsightReportById } from '../stores/report-store'
import { clientFitViolations } from '../presentation/client-fit-gate'
import { buildInsightWebModel } from '../sharing/web-model'
import type { InsightEditionRecord } from '../stores/records'
import { getInsightEvidenceSnapshotByEdition } from '../stores/snapshot-store'
import { runInsightGeneration, type RunGenerationResult } from './generation'

interface LifecycleInput {
  subject: TenantEntitlementSubject
  actorOrganizationId: string | null
  organizationId: string
  editionId: string
  reason: string
  env?: NodeJS.ProcessEnv
}

export const issueInsightEdition = async (input: LifecycleInput): Promise<{ edition: InsightEditionRecord; idempotent: boolean }> => {
  if (!isInsightsIssuanceEnabled(input.env)) throw new InsightsIssuanceDisabledError()

  const grant = await assertInsightsAccess({ ...input, need: 'issue' })
  const edition = await getInsightEditionById(undefined, grant.organizationId, input.editionId)

  if (!edition) throw new InsightsNotFoundError('edition', input.editionId)
  if (edition.state === 'issued') return { edition, idempotent: true }
  if (edition.state !== 'ready_for_review') throw new InsightsNotReadyError('Sólo una edición en ready_for_review puede emitirse', { state: edition.state })

  const [snapshot, plan, outputs] = await Promise.all([
    getInsightEvidenceSnapshotByEdition(undefined, grant.organizationId, edition.editionId),
    getInsightEditorialPlanByEdition(undefined, grant.organizationId, edition.editionId),
    getInsightOutputsPort().assertOutputsValidated(edition)
  ])

  if (!snapshot?.snapshotHash || !plan?.planHash) throw new InsightsNotReadyError('Snapshot o plan sin congelar', { editionId: edition.editionId })

  // TASK-1957 — gate «apto para cliente»: una edición de cliente no se emite con identificadores internos, límites con
  // diagnóstico de adapter o figuras sin información. Se corrige con `revise` (edición nueva), nunca con un bypass.
  if (edition.audience === 'client') {
    const report = await getInsightReportById(undefined, grant.organizationId, edition.reportId)
    const violations = clientFitViolations({ model: buildInsightWebModel({ plan: plan.plan, facts: snapshot.facts }), reportTitle: report?.title, facts: snapshot.facts })

    if (violations.length > 0) {
      captureWithDomain(new Error('insights_client_fit_violation'), 'insights', { tags: { source: 'insights_client_fit_violation' }, extra: { editionId: edition.editionId, count: violations.length, rules: [...new Set(violations.map(v => v.rule))] } })

      throw new InsightsNotReadyError('La edición tiene textos o figuras que no pueden llegar a un cliente; revísala antes de emitir', { reason: 'client_fit', violations: violations.slice(0, 20) })
    }
  }

  const issuedHash = hashCanonical({ requestHash: edition.requestHash, snapshotHash: snapshot.snapshotHash, planHash: plan.planHash, outputs: outputs.outputs })

  return withGreenhousePostgresTransaction(async client => {
    const result = await transitionInsightEditionState(client, {
      organizationId: grant.organizationId,
      editionId: edition.editionId,
      toState: 'issued',
      actor: grant.actor,
      reason: input.reason,
      metadata: { issuedHash, outputCount: outputs.outputs.length },
      patch: { issued: { byUserId: grant.actor.userId ?? '', hash: issuedHash } }
    })

    if (!result.idempotent) {
      await publishInsightEditionStateTransitioned(client, { version: 1, editionId: edition.editionId, reportId: edition.reportId, organizationId: edition.organizationId, fromState: result.transition.fromState, toState: 'issued', requiresHumanGate: true, actorKind: grant.actor.kind, transitionId: result.transition.transitionId })
      await publishInsightEditionIssued(client, { version: 1, editionId: edition.editionId, reportId: edition.reportId, organizationId: edition.organizationId, editionVersion: edition.version, issuedHash, actorKind: grant.actor.kind })
    }

    return { edition: result.edition, idempotent: result.idempotent }
  })
}

export const withdrawInsightEdition = async (input: LifecycleInput): Promise<{ edition: InsightEditionRecord; idempotent: boolean }> => {
  const grant = await assertInsightsAccess({ ...input, need: 'issue' })
  const edition = await getInsightEditionById(undefined, grant.organizationId, input.editionId)

  if (!edition) throw new InsightsNotFoundError('edition', input.editionId)

  return withGreenhousePostgresTransaction(async client => {
    const result = await transitionInsightEditionState(client, {
      organizationId: grant.organizationId,
      editionId: edition.editionId,
      toState: 'withdrawn',
      actor: grant.actor,
      reason: input.reason
    })

    if (!result.idempotent) {
      await publishInsightEditionStateTransitioned(client, { version: 1, editionId: edition.editionId, reportId: edition.reportId, organizationId: edition.organizationId, fromState: result.transition.fromState, toState: 'withdrawn', requiresHumanGate: true, actorKind: grant.actor.kind, transitionId: result.transition.transitionId })

      // TASK-1848 — retirar corta TODOS los enlaces vivos en la misma transacción. El reader público
      // ya falla cerrado ante una edición retirada; revocar deja además el estado del grant honesto.
      const revoked = await revokeActiveInsightShareGrantsForEdition(client, { organizationId: grant.organizationId, editionId: edition.editionId, actor: grant.actor, reason: 'edition_withdrawn' })

      for (const share of revoked) {
        await publishInsightShareRevoked(client, { version: 1, shareGrantId: share.shareGrantId, editionId: share.editionId, organizationId: share.organizationId, reason: 'edition_withdrawn', actorKind: grant.actor.kind })
      }

      // Lo que aún no salió por correo tampoco sale: los envíos pendientes de la edición se cancelan.
      const cancelledRecipients = await cancelPendingInsightDeliveryRecipients(client, { organizationId: grant.organizationId, editionId: edition.editionId })

      for (const intentId of new Set(cancelledRecipients.map(row => row.deliveryIntentId))) {
        await insertInsightDeliveryEvent(client, { deliveryIntentId: intentId, organizationId: grant.organizationId, toState: 'cancelled', detail: { cause: 'edition_withdrawn' }, actorKind: grant.actor.kind })
      }
    }

    return { edition: result.edition, idempotent: result.idempotent }
  })
}

export const recoverInsightEdition = async (input: Omit<LifecycleInput, 'reason'> & { reason?: string }): Promise<RunGenerationResult> => {
  const grant = await assertInsightsAccess({ ...input, need: 'review' })
  const edition = await getInsightEditionById(undefined, grant.organizationId, input.editionId)

  if (!edition) throw new InsightsNotFoundError('edition', input.editionId)
  if (edition.state !== 'failed' || !edition.failedPhase) throw new InsightsInputError('Sólo una edición en failed se recupera', { state: edition.state })

  return runInsightGeneration(edition, edition.failedPhase as InsightFailedPhase)
}
