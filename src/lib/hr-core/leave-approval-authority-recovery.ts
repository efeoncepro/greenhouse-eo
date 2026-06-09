import 'server-only'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { resolveApprovalAuthorityForStage } from '@/lib/approval-authority/resolver'
import { upsertWorkflowApprovalSnapshotInTransaction } from '@/lib/approval-authority/store'
import type { ApprovalAuthorityResolution, ApprovalAuthoritySource } from '@/lib/approval-authority/types'
import { revokeResponsibilityInTransaction } from '@/lib/operational-responsibility/store'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-1020 — Recovery auditado de autoridad de aprobación de permisos.
 *
 * Repara el drift donde una responsabilidad operacional GENÉRICA
 * `operational_responsibilities.responsibility_type='approval_delegate'` congeló
 * a la delegada como `effective_approver_member_id` de un permiso pendiente,
 * desplazando a la supervisora formal vigente en `reporting_lines`.
 *
 * Hace DOS cosas, en una sola transacción atómica:
 *  1. Revoca globalmente (lifecycle/audit append-only, NUNCA DELETE — D4) las
 *     responsabilidades `approval_delegate` genéricas inválidas que matchean el
 *     filtro, vía `revokeResponsibilityInTransaction` (emite `responsibility.revoked`).
 *  2. Recomputa los snapshots de permisos PENDIENTES cuyo aprobador efectivo ya
 *     no corresponde a la política, invocando SIEMPRE el resolver canónico
 *     post-fix (`resolveApprovalAuthorityForStage`) — NUNCA reimplementa la lógica
 *     de autoridad (SSOT: runtime y recovery no pueden divergir). Tras el fix de
 *     Slice 2, `leave.supervisor_review` resuelve `effective = formal` y
 *     `authoritySource='reporting_hierarchy'`.
 *
 * Invariantes:
 *  - dry-run por default (no muta nada);
 *  - apply explícito;
 *  - idempotente (re-ejecutar es no-op: ya no hay responsabilidad activa ni
 *    snapshot a la deriva);
 *  - solo toca snapshots de solicitudes PENDIENTES de supervisor (nunca
 *    terminales: approved/rejected/cancelled → preserva el audit trail histórico);
 *  - NO aprueba, rechaza ni cambia el estado de la solicitud;
 *  - falla → la transacción aborta y los datos quedan sin cambiar.
 */

export type LeaveApprovalAuthorityRecoveryFilters = {
  supervisorMemberId?: string | null
  delegateResponsibilityId?: string | null
  leaveRequestId?: string | null
}

export type LeaveApprovalAuthorityRecoveryInput = LeaveApprovalAuthorityRecoveryFilters & {
  dryRun?: boolean
  actorUserId?: string | null
  reason?: string | null
}

export type InvalidResponsibilityAction = 'revoke' | 'ignore_already_inactive'

export type RecoverySnapshotState = {
  authoritySource: string
  formalApproverMemberId: string | null
  effectiveApproverMemberId: string | null
  delegateResponsibilityId: string | null
}

export type LeaveApprovalAuthorityRecoveryPlan = {
  generatedAt: string
  dryRun: boolean
  applied: boolean
  filters: LeaveApprovalAuthorityRecoveryFilters
  invalidResponsibilities: Array<{
    responsibilityId: string
    supervisorMemberId: string
    delegateMemberId: string
    reason: 'generic_delegate_not_valid_for_leave'
    action: InvalidResponsibilityAction
  }>
  snapshotRepairs: Array<{
    leaveRequestId: string
    subjectMemberId: string
    stageCode: 'supervisor_review'
    before: RecoverySnapshotState
    after: RecoverySnapshotState & { authoritySource: ApprovalAuthoritySource }
  }>
}

const RECOVERY_ACTOR_FALLBACK = 'system:hr-leave-approval-authority-recovery'
const RECOVERY_REASON_FALLBACK = 'TASK-1020 leave approval authority recovery'

type InvalidResponsibilityRow = {
  responsibility_id: string
  delegate_member_id: string
  supervisor_member_id: string
  active: boolean
}

type DriftedSnapshotRow = {
  leave_request_id: string
  subject_member_id: string
  authority_source: string
  formal_approver_member_id: string | null
  effective_approver_member_id: string | null
  delegate_responsibility_id: string | null
}

const normalizeFilter = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? '').trim()

  return trimmed.length > 0 ? trimmed : null
}

const listInvalidGenericDelegates = async (
  filters: LeaveApprovalAuthorityRecoveryFilters
): Promise<InvalidResponsibilityRow[]> =>
  runGreenhousePostgresQuery<InvalidResponsibilityRow>(
    `
      SELECT
        r.responsibility_id,
        r.member_id AS delegate_member_id,
        r.scope_id AS supervisor_member_id,
        r.active
      FROM greenhouse_core.operational_responsibilities AS r
      WHERE r.responsibility_type = 'approval_delegate'
        AND r.scope_type = 'member'
        AND ($1::text IS NULL OR r.scope_id = $1)
        AND ($2::text IS NULL OR r.responsibility_id = $2)
        -- Sin un id explícito, solo las activas (las inactivas ya están revocadas).
        -- Con un id explícito, también las inactivas (para reportar el no-op).
        AND (r.active = TRUE OR $2::text IS NOT NULL)
      ORDER BY r.active DESC, r.effective_from DESC, r.created_at DESC
    `,
    [normalizeFilter(filters.supervisorMemberId), normalizeFilter(filters.delegateResponsibilityId)]
  )

const listDriftedPendingLeaveSnapshots = async (
  filters: LeaveApprovalAuthorityRecoveryFilters
): Promise<DriftedSnapshotRow[]> =>
  runGreenhousePostgresQuery<DriftedSnapshotRow>(
    `
      SELECT
        s.workflow_entity_id AS leave_request_id,
        s.subject_member_id,
        s.authority_source,
        s.formal_approver_member_id,
        s.effective_approver_member_id,
        s.delegate_responsibility_id
      FROM greenhouse_hr.workflow_approval_snapshots AS s
      INNER JOIN greenhouse_hr.leave_requests AS lr
        ON lr.request_id = s.workflow_entity_id
      WHERE s.workflow_domain = 'leave'
        AND s.stage_code = 'supervisor_review'
        AND lr.status = 'pending_supervisor'
        AND (
          s.authority_source = 'delegation'
          OR s.effective_approver_member_id IS DISTINCT FROM s.formal_approver_member_id
        )
        AND ($1::text IS NULL OR s.formal_approver_member_id = $1)
        AND ($2::text IS NULL OR s.delegate_responsibility_id = $2)
        AND ($3::text IS NULL OR s.workflow_entity_id = $3)
      ORDER BY s.updated_at DESC
    `,
    [
      normalizeFilter(filters.supervisorMemberId),
      normalizeFilter(filters.delegateResponsibilityId),
      normalizeFilter(filters.leaveRequestId)
    ]
  )

const toBeforeState = (row: DriftedSnapshotRow): RecoverySnapshotState => ({
  authoritySource: row.authority_source,
  formalApproverMemberId: row.formal_approver_member_id,
  effectiveApproverMemberId: row.effective_approver_member_id,
  delegateResponsibilityId: row.delegate_responsibility_id
})

const isUnchanged = (before: RecoverySnapshotState, resolution: ApprovalAuthorityResolution): boolean =>
  before.authoritySource === resolution.authoritySource &&
  before.effectiveApproverMemberId === resolution.effectiveApproverMemberId &&
  before.delegateResponsibilityId === resolution.delegateResponsibilityId

/**
 * Construye el plan de recovery (read-only). Recomputa cada snapshot a la deriva
 * vía el resolver canónico para mostrar el `after` exacto que se aplicaría.
 */
export const buildLeaveApprovalAuthorityRecoveryPlan = async (
  filters: LeaveApprovalAuthorityRecoveryFilters
): Promise<{
  plan: LeaveApprovalAuthorityRecoveryPlan
  resolutionsByRequestId: Map<string, ApprovalAuthorityResolution>
}> => {
  const [invalidRows, driftedRows] = await Promise.all([
    listInvalidGenericDelegates(filters),
    listDriftedPendingLeaveSnapshots(filters)
  ])

  const resolutionsByRequestId = new Map<string, ApprovalAuthorityResolution>()
  const snapshotRepairs: LeaveApprovalAuthorityRecoveryPlan['snapshotRepairs'] = []

  for (const row of driftedRows) {
    const before = toBeforeState(row)

    const resolution = await resolveApprovalAuthorityForStage({
      workflowDomain: 'leave',
      subjectMemberId: row.subject_member_id,
      stageCode: 'supervisor_review'
    })

    // Si el resolver post-fix devuelve lo mismo que ya está congelado, no hay
    // nada que reparar (defensa: no "reparar" un snapshot que la política sí
    // honra, ni rehacer trabajo en una segunda corrida).
    if (isUnchanged(before, resolution)) {
      continue
    }

    resolutionsByRequestId.set(row.leave_request_id, resolution)

    snapshotRepairs.push({
      leaveRequestId: row.leave_request_id,
      subjectMemberId: row.subject_member_id,
      stageCode: 'supervisor_review',
      before,
      after: {
        authoritySource: resolution.authoritySource,
        formalApproverMemberId: resolution.formalApproverMemberId,
        effectiveApproverMemberId: resolution.effectiveApproverMemberId,
        delegateResponsibilityId: resolution.delegateResponsibilityId
      }
    })
  }

  const plan: LeaveApprovalAuthorityRecoveryPlan = {
    generatedAt: new Date().toISOString(),
    dryRun: true,
    applied: false,
    filters: {
      supervisorMemberId: normalizeFilter(filters.supervisorMemberId),
      delegateResponsibilityId: normalizeFilter(filters.delegateResponsibilityId),
      leaveRequestId: normalizeFilter(filters.leaveRequestId)
    },
    invalidResponsibilities: invalidRows.map(row => ({
      responsibilityId: row.responsibility_id,
      supervisorMemberId: row.supervisor_member_id,
      delegateMemberId: row.delegate_member_id,
      reason: 'generic_delegate_not_valid_for_leave',
      action: row.active ? 'revoke' : 'ignore_already_inactive'
    })),
    snapshotRepairs
  }

  return { plan, resolutionsByRequestId }
}

/**
 * Ejecuta el recovery. Con `dryRun !== false` solo devuelve el plan. Con
 * `dryRun === false` aplica revoke + recompute en una transacción atómica.
 */
export const runLeaveApprovalAuthorityRecovery = async (
  input: LeaveApprovalAuthorityRecoveryInput
): Promise<LeaveApprovalAuthorityRecoveryPlan> => {
  const dryRun = input.dryRun !== false

  const filters: LeaveApprovalAuthorityRecoveryFilters = {
    supervisorMemberId: input.supervisorMemberId,
    delegateResponsibilityId: input.delegateResponsibilityId,
    leaveRequestId: input.leaveRequestId
  }

  const { plan, resolutionsByRequestId } = await buildLeaveApprovalAuthorityRecoveryPlan(filters)

  if (dryRun) {
    return plan
  }

  const responsibilitiesToRevoke = plan.invalidResponsibilities.filter(item => item.action === 'revoke')
  const hasWork = responsibilitiesToRevoke.length > 0 || plan.snapshotRepairs.length > 0

  if (!hasWork) {
    return { ...plan, dryRun: false, applied: true }
  }

  const actorUserId = normalizeFilter(input.actorUserId)
  const reason = (input.reason ?? '').trim() || RECOVERY_REASON_FALLBACK

  try {
    await withGreenhousePostgresTransaction(async client => {
      for (const responsibility of responsibilitiesToRevoke) {
        await revokeResponsibilityInTransaction(responsibility.responsibilityId, client)
      }

      for (const repair of plan.snapshotRepairs) {
        const resolution = resolutionsByRequestId.get(repair.leaveRequestId)

        if (!resolution) {
          throw new Error(`Missing recomputed resolution for leave request ${repair.leaveRequestId}`)
        }

        await upsertWorkflowApprovalSnapshotInTransaction({
          workflowDomain: 'leave',
          workflowEntityId: repair.leaveRequestId,
          subjectMemberId: repair.subjectMemberId,
          resolution,
          createdByUserId: actorUserId,
          client
        })

        await publishOutboxEvent(
          {
            aggregateType: AGGREGATE_TYPES.leaveRequest,
            aggregateId: repair.leaveRequestId,
            eventType: EVENT_TYPES.leaveApprovalAuthorityRecovered,
            payload: {
              schemaVersion: 1,
              leaveRequestId: repair.leaveRequestId,
              subjectMemberId: repair.subjectMemberId,
              stageCode: repair.stageCode,
              before: repair.before,
              after: repair.after,
              revokedResponsibilityIds: responsibilitiesToRevoke.map(item => item.responsibilityId),
              actorUserId: actorUserId ?? RECOVERY_ACTOR_FALLBACK,
              reason
            }
          },
          client
        )
      }
    })
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'leave_approval_authority_recovery', stage: 'apply' }
    })

    throw error
  }

  return { ...plan, dryRun: false, applied: true }
}
