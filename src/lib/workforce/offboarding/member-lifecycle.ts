import 'server-only'

import type { PoolClient } from 'pg'

import { HrCoreValidationError } from '@/lib/hr-core/shared'
import { endPersonLegalEntityRelationship } from '@/lib/person-legal-entity-relationships/store'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type { OffboardingCase } from './types'

/**
 * TASK-1349 — Lifecycle effects of a REAL termination, applied inside the
 * executor's transaction. Never called for `identity_only` (access-only)
 * cases: a deprovisioned account is not a labor fact.
 *
 * Ordering is load-bearing:
 * 1. compensation vigencia closes at the last working day (history preserved,
 *    no row deleted);
 * 2. the legal relationship ends WITH THE REAL DATE — before the member is
 *    deactivated, so the reactive `operating_entity_legal_relationship`
 *    projection (triggered by `member.deactivated`) finds it already ended and
 *    does not stamp `CURRENT_DATE`;
 * 3. the member row is marked inactive (current availability), `member.deactivated`
 *    is published for 360/serving/BQ consumers.
 *
 * Steps 2 and 3 are gated by `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED`
 * (default OFF) until the temporal semantics are verified in staging; step 1
 * is the pre-existing behaviour and stays unconditional for real terminations.
 */

export const isOffboardingMemberDeactivationEnabled = (): boolean =>
  process.env.WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED === 'true'

export type OffboardingLifecycleEffects = {
  updatedCompensationVersions: number
  relationshipEnded: string | null
  memberDeactivated: boolean
  assignmentsClosed: number
  /** `null` when the writeback is flag-gated OFF; explains why nothing else moved. */
  skippedReason: 'flag_off' | 'identity_only' | 'no_member' | null
}

/**
 * A compensation version that starts AFTER the last working day contradicts
 * the exit: it would silently resurrect payroll after the person left. The
 * executor refuses (409) and names the versions; the operator supersedes or
 * corrects them first. Never auto-deleted.
 */
export const assertNoFutureCompensationVersions = async (client: PoolClient, memberId: string, lastWorkingDay: string) => {
  const result = await client.query<{ version_id: string; effective_from: string }>(
    `
      SELECT version_id, effective_from::text AS effective_from
      FROM greenhouse_payroll.compensation_versions
      WHERE member_id = $1
        AND effective_from > $2::date
      ORDER BY effective_from ASC
    `,
    [memberId, lastWorkingDay]
  )

  if (result.rows.length > 0) {
    throw new HrCoreValidationError(
      'Existen versiones de compensación que empiezan después del último día trabajado. Corrígelas o supersédelas antes de ejecutar la salida; el sistema no las borra.',
      409,
      { memberId, lastWorkingDay, conflictingVersions: result.rows },
      'compensation_future_version_conflict'
    )
  }
}

export const closeCompensationVigencyAtExit = async (client: PoolClient, memberId: string, lastWorkingDay: string) => {
  const result = await client.query<{ version_id: string }>(
    `
      UPDATE greenhouse_payroll.compensation_versions
      SET
        effective_to = $2::date,
        is_current = FALSE
      WHERE member_id = $1
        AND effective_from <= $2::date
        AND (effective_to IS NULL OR effective_to > $2::date)
      RETURNING version_id
    `,
    [memberId, lastWorkingDay]
  )

  return result.rows.length
}

const endRelationshipIfActive = async (
  client: PoolClient,
  current: OffboardingCase,
  lastWorkingDay: string,
  actorUserId: string,
  reason: string | null
): Promise<string | null> => {
  const relationshipId =
    current.personLegalEntityRelationshipId ??
    (
      await client.query<{ relationship_id: string }>(
        `
          SELECT relationship_id
          FROM greenhouse_core.person_legal_entity_relationships
          WHERE profile_id = $1
            AND status = 'active'
            AND effective_to IS NULL
            AND relationship_type IN ('employee', 'contractor', 'executive')
          ORDER BY effective_from DESC, created_at DESC
          LIMIT 1
        `,
        [current.profileId]
      )
    ).rows[0]?.relationship_id ??
    null

  if (!relationshipId) return null

  const active = await client.query<{ relationship_id: string }>(
    `
      SELECT relationship_id
      FROM greenhouse_core.person_legal_entity_relationships
      WHERE relationship_id = $1
        AND status = 'active'
        AND effective_to IS NULL
      FOR UPDATE
    `,
    [relationshipId]
  )

  if (!active.rows[0]) return null

  const ended = await endPersonLegalEntityRelationship(client, {
    relationshipId,
    effectiveTo: lastWorkingDay,
    actorUserId,
    notes: reason,
    metadataPatch: {
      endedByOffboardingCaseId: current.offboardingCaseId,
      endedByOffboardingCasePublicId: current.publicId
    }
  })

  return ended.relationshipId
}

const deactivateMemberRow = async (client: PoolClient, memberId: string, lastWorkingDay: string) => {
  const member = await client.query<{ member_id: string }>(
    `
      UPDATE greenhouse_core.members
      SET
        active = FALSE,
        status = 'inactive',
        contract_end_date = COALESCE(contract_end_date, $2::date),
        assignable = FALSE,
        updated_at = CURRENT_TIMESTAMP,
        last_human_update_at = CURRENT_TIMESTAMP
      WHERE member_id = $1
        AND active = TRUE
      RETURNING member_id
    `,
    [memberId, lastWorkingDay]
  )

  const assignments = await client.query<{ assignment_id: string }>(
    `
      UPDATE greenhouse_core.client_team_assignments
      SET active = FALSE, end_date = COALESCE(end_date, $2::date), updated_at = CURRENT_TIMESTAMP
      WHERE member_id = $1 AND active = TRUE
      RETURNING assignment_id
    `,
    [memberId, lastWorkingDay]
  )

  return { memberDeactivated: member.rows.length > 0, assignmentsClosed: assignments.rows.length }
}

/**
 * Apply the lifecycle effects of an executed REAL termination. Idempotent:
 * re-running over an already-closed member/relationship changes nothing.
 */
export const applyOffboardingLifecycleEffects = async (
  client: PoolClient,
  {
    current,
    lastWorkingDay,
    actorUserId,
    reason
  }: {
    current: OffboardingCase
    lastWorkingDay: string | null
    actorUserId: string
    reason: string | null
  }
): Promise<OffboardingLifecycleEffects> => {
  const none: OffboardingLifecycleEffects = {
    updatedCompensationVersions: 0,
    relationshipEnded: null,
    memberDeactivated: false,
    assignmentsClosed: 0,
    skippedReason: null
  }

  if (current.ruleLane === 'identity_only' || current.separationType === 'identity_only') {
    return { ...none, skippedReason: 'identity_only' }
  }

  if (!current.memberId || !lastWorkingDay) {
    return { ...none, skippedReason: 'no_member' }
  }

  await assertNoFutureCompensationVersions(client, current.memberId, lastWorkingDay)

  const updatedCompensationVersions = await closeCompensationVigencyAtExit(client, current.memberId, lastWorkingDay)

  if (!isOffboardingMemberDeactivationEnabled()) {
    return { ...none, updatedCompensationVersions, skippedReason: 'flag_off' }
  }

  const relationshipEnded = await endRelationshipIfActive(client, current, lastWorkingDay, actorUserId, reason)
  const { memberDeactivated, assignmentsClosed } = await deactivateMemberRow(client, current.memberId, lastWorkingDay)

  if (memberDeactivated) {
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.member,
        aggregateId: current.memberId,
        eventType: EVENT_TYPES.memberDeactivated,
        payload: {
          schemaVersion: 1,
          memberId: current.memberId,
          deactivationKind: 'offboarding_executed',
          offboardingCaseId: current.offboardingCaseId,
          offboardingCasePublicId: current.publicId,
          lastWorkingDay,
          relationshipEnded
        }
      },
      client
    )
  }

  return { updatedCompensationVersions, relationshipEnded, memberDeactivated, assignmentsClosed, skippedReason: null }
}
