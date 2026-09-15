import 'server-only'

/**
 * TASK-1845 — `issue` / `withdraw` / `recover`. Emitir exige: flag de emisión, capability
 * `insights.edition.issue`, estado `ready_for_review`, outputs solicitados VALIDADOS (puerto de
 * TASK-1846; bloqueado hasta conectarlo) y una persona autenticada (gate humano en DB y TS).
 * El `issued_hash` liga la aprobación a snapshot + plan + encargo + outputs: cualquier cambio
 * posterior sería otra edición.
 */

import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { assertInsightsAccess } from '../authz'
import type { InsightFailedPhase } from '../contracts/states'
import { InsightsInputError, InsightsIssuanceDisabledError, InsightsNotFoundError, InsightsNotReadyError } from '../errors'
import { publishInsightEditionIssued, publishInsightEditionStateTransitioned } from '../events'
import { isInsightsIssuanceEnabled } from '../flags'
import { getInsightOutputsPort } from '../ports'
import { hashCanonical } from '../request-hash'
import { getInsightEditionById, transitionInsightEditionState } from '../stores/edition-store'
import { getInsightEditorialPlanByEdition } from '../stores/plan-store'
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
