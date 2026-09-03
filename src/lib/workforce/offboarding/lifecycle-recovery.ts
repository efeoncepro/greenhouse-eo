import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

import { withTransaction } from '@/lib/db'
import { HrCoreValidationError } from '@/lib/hr-core/shared'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

export interface LifecycleMemberFields {
  active: boolean
  status: string
  assignable: boolean
  contractEndDate: string | null
}

export interface LifecycleAssignmentFields {
  assignmentId: string
  active: boolean
  endDate: string | null
}

export interface LifecycleRecoverySnapshot {
  caseUpdatedAt: string
  member: LifecycleMemberFields & { updatedAt: string }
  assignments: Array<LifecycleAssignmentFields & { updatedAt: string }>
}

export interface RestoreOffboardingLifecycleInput {
  actorUserId: string
  offboardingCaseId: string
  memberId: string
  profileId: string
  idempotencyKey: string
  reason: string
  /** Snapshot/audit reference or explicit operator authority for the desired current state. */
  evidence: string
  expectedSnapshot: LifecycleRecoverySnapshot
  expectedSnapshotHash: string
  desired: { member: LifecycleMemberFields; assignments: LifecycleAssignmentFields[] }
  /** Preview is the default; the caller must explicitly opt into mutation. */
  apply?: boolean
}

const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, stable(entry)]))

  return value
}

export const hashLifecycleRecoverySnapshot = (snapshot: unknown): string =>
  createHash('sha256').update(JSON.stringify(stable(snapshot))).digest('hex')

const fail = (code: string, message: string, status = 409): never => {
  throw new HrCoreValidationError(message, status, undefined, code)
}

const timestamp = (value: string | Date): string => new Date(value).toISOString()
const date = (value: string | Date | null): string | null => value === null ? null : typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10)

/**
 * Compensates a mistaken historical exit on a person with a current later episode.
 * It restores ONLY explicit availability/assignment fields. Legal relationships,
 * compensation, payroll, accounts and financial documents are never written.
 * Deploy corrected member.updated consumers before applying a recovery.
 */
export const restoreOffboardingLifecycleAfterReentry = async (input: RestoreOffboardingLifecycleInput) => {
  if (input.reason.trim().length < 20 || !input.evidence.trim() || !input.idempotencyKey.trim()) fail('recovery_evidence_required', 'Se requiere motivo de al menos 20 caracteres, evidencia y clave idempotente.', 400)
  if (input.desired.member.active !== true || input.desired.member.status !== 'active') fail('invalid_recovery_target', 'La recuperación requiere un miembro activo.', 400)
  if (typeof input.desired.member.assignable !== 'boolean' || input.desired.assignments.some(a => a.active !== true)) fail('invalid_recovery_target', 'La recuperación solo permite restaurar asignaciones activas y disponibilidad explícita.', 400)

  for (const value of [input.desired.member.contractEndDate, ...input.desired.assignments.map(a => a.endDate)]) {
    if (value !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) fail('invalid_recovery_target', 'Las fechas deseadas deben ser fechas ISO reales o null.', 400)
  }

  const assignmentIds = input.expectedSnapshot.assignments.map(a => a.assignmentId).sort()

  if (new Set(assignmentIds).size !== assignmentIds.length || JSON.stringify(assignmentIds) !== JSON.stringify(input.desired.assignments.map(a => a.assignmentId).sort())) fail('recovery_assignment_scope_mismatch', 'Las asignaciones esperadas y deseadas deben coincidir sin duplicados.', 400)
  if (hashLifecycleRecoverySnapshot(input.expectedSnapshot) !== input.expectedSnapshotHash) fail('recovery_snapshot_hash_mismatch', 'El hash del snapshot no coincide.', 400)

  const requestHash = hashLifecycleRecoverySnapshot({ ...input, apply: undefined })

  return withTransaction(async client => {
    // A role name supplied by the caller is not authorization: verify the live grant.
    const admin = await client.query(`SELECT u.user_id, u.active, u.status FROM greenhouse_core.client_users u
      JOIN greenhouse_core.user_role_assignments r USING (user_id)
      WHERE u.user_id=$1 AND u.active=TRUE AND u.status='active' AND r.active=TRUE AND r.role_code='efeonce_admin'
        AND (r.effective_from IS NULL OR r.effective_from<=NOW())
        AND (r.effective_to IS NULL OR r.effective_to>NOW())`, [input.actorUserId])

    if (!admin.rows.some(row => row.user_id === input.actorUserId && row.active === true && row.status === 'active')) fail('recovery_forbidden', 'La recuperación requiere un administrador vigente.', 403)
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`offboarding-lifecycle-recovery:${input.idempotencyKey}`])

    const prior = await client.query(`SELECT payload FROM greenhouse_hr.work_relationship_offboarding_case_events
      WHERE offboarding_case_id=$1 AND event_type='offboarding_case.lifecycle_writeback_reverted'
        AND payload->>'idempotencyKey'=$2`, [input.offboardingCaseId, input.idempotencyKey])

    if (prior.rows.length) {
      if (prior.rows[0].payload.requestHash !== requestHash) fail('recovery_idempotency_conflict', 'La clave ya fue utilizada con otro contenido.')

      return { outcome: 'already_applied' as const, receipt: prior.rows[0].payload }
    }

    const cases = await client.query(`SELECT offboarding_case_id, profile_id, member_id, legal_entity_organization_id,
      status, rule_lane, last_working_day::text, updated_at FROM greenhouse_hr.work_relationship_offboarding_cases
      WHERE offboarding_case_id=$1 FOR UPDATE`, [input.offboardingCaseId])

    const currentCase = cases.rows[0]

    if (!currentCase || currentCase.status !== 'executed' || currentCase.rule_lane === 'identity_only' || !currentCase.last_working_day || currentCase.member_id !== input.memberId || currentCase.profile_id !== input.profileId) fail('recovery_case_mismatch', 'El caso ejecutado no corresponde al miembro y perfil declarados.')

    const members = await client.query(`SELECT member_id, identity_profile_id, active, status, assignable,
      contract_end_date::text, updated_at FROM greenhouse_core.members WHERE member_id=$1 FOR UPDATE`, [input.memberId])

    const member = members.rows[0]

    if (!member || member.identity_profile_id !== input.profileId) fail('recovery_member_mismatch', 'El miembro no corresponde al perfil declarado.')

    const assignments = await client.query(`SELECT assignment_id, member_id, client_id, active, start_date::text, end_date::text, updated_at
      FROM greenhouse_core.client_team_assignments WHERE assignment_id=ANY($1::text[]) ORDER BY assignment_id FOR UPDATE`, [assignmentIds])

    if (assignments.rows.length !== assignmentIds.length || assignments.rows.some(a => a.member_id !== input.memberId)) fail('recovery_assignment_scope_mismatch', 'Una asignación falta o pertenece a otro miembro.')

    for (const target of input.desired.assignments) {
      const start = date(assignments.rows.find(a => a.assignment_id === target.assignmentId)!.start_date)

      if (target.endDate !== null && start !== null && target.endDate < start) fail('invalid_recovery_assignment_dates', 'El fin de la asignación no puede ser anterior a su inicio.', 400)
    }

    const observed: LifecycleRecoverySnapshot = {
      caseUpdatedAt: timestamp(currentCase.updated_at),
      member: { active: member.active, status: member.status, assignable: member.assignable, contractEndDate: date(member.contract_end_date), updatedAt: timestamp(member.updated_at) },
      assignments: assignments.rows.map(a => ({ assignmentId: a.assignment_id, active: a.active, endDate: date(a.end_date), updatedAt: timestamp(a.updated_at) }))
    }

    if (hashLifecycleRecoverySnapshot(observed) !== input.expectedSnapshotHash) fail('recovery_state_conflict', 'El estado cambió desde la revisión; vuelve a obtener el snapshot.')

    const reentries = await client.query(`SELECT relationship_id, effective_from::text FROM greenhouse_core.person_legal_entity_relationships
      WHERE profile_id=$1 AND legal_entity_organization_id=$2 AND relationship_type IN ('employee','contractor','executive')
        AND status='active' AND effective_from>$3::date AND effective_from<=CURRENT_DATE
        AND (effective_to IS NULL OR effective_to>=CURRENT_DATE)
      ORDER BY effective_from DESC FOR SHARE`, [input.profileId, currentCase.legal_entity_organization_id, currentCase.last_working_day])

    if (!reentries.rows.length) fail('recovery_reentry_required', 'No existe un episodio laboral posterior vigente que respalde la recuperación.')

    const receipt = { idempotencyKey: input.idempotencyKey, requestHash, memberId: input.memberId, profileId: input.profileId, actorUserId: input.actorUserId, reason: input.reason, evidence: input.evidence, before: observed, desired: input.desired, reentry: reentries.rows[0] }

    if (!input.apply) return { outcome: 'preview' as const, receipt }

    await client.query(`UPDATE greenhouse_core.members SET active=$2,status=$3,assignable=$4,contract_end_date=$5::date,
      updated_at=CURRENT_TIMESTAMP,last_human_update_at=CURRENT_TIMESTAMP WHERE member_id=$1`, [input.memberId, input.desired.member.active, input.desired.member.status, input.desired.member.assignable, input.desired.member.contractEndDate])

    for (const desired of input.desired.assignments) {
      await client.query(`UPDATE greenhouse_core.client_team_assignments SET active=$2,end_date=$3::date,
        updated_at=CURRENT_TIMESTAMP WHERE assignment_id=$1 AND member_id=$4`, [desired.assignmentId, desired.active, desired.endDate, input.memberId])
      const assignment = assignments.rows.find(a => a.assignment_id === desired.assignmentId)!

      await publishOutboxEvent({ aggregateType: AGGREGATE_TYPES.assignment, aggregateId: desired.assignmentId, eventType: EVENT_TYPES.assignmentUpdated, payload: { assignmentId: desired.assignmentId, memberId: input.memberId, clientId: assignment.client_id, updatedFields: ['active', 'end_date'], recoveryKey: input.idempotencyKey } }, client)
    }

    await client.query(`INSERT INTO greenhouse_hr.work_relationship_offboarding_case_events
      (event_id,offboarding_case_id,event_type,from_status,to_status,actor_user_id,source,reason,payload)
      VALUES ($1,$2,'offboarding_case.lifecycle_writeback_reverted','executed','executed',$3,'admin',$4,$5::jsonb)`, [`offboarding-case-event-${randomUUID()}`, input.offboardingCaseId, input.actorUserId, input.reason, JSON.stringify(receipt)])
    await publishOutboxEvent({ aggregateType: AGGREGATE_TYPES.member, aggregateId: input.memberId, eventType: EVENT_TYPES.memberUpdated, payload: { memberId: input.memberId, updatedFields: ['active', 'status', 'assignable', 'contract_end_date'], recoveryKey: input.idempotencyKey } }, client)

    return { outcome: 'restored' as const, receipt }
  })
}
