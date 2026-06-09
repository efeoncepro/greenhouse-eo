import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { APPROVAL_WORKFLOW_DEFINITIONS } from '@/lib/approval-authority/config'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1020 — Reliability signal: snapshots de aprobación PENDIENTES cuya
 * autoridad efectiva deriva de un `approval_delegate` genérico inválido en un
 * stage que NO honra delegación genérica.
 *
 * Parametrizado por la política per-stage de `ApprovalStageDefinition`
 * (`config.ts`): cubre los stages `effective_supervisor` con
 * `honorGenericApprovalDelegate !== true` (`leave`, `expense_report`,
 * `performance_evaluation`). Una sola query cubre N workflows; el conteo
 * divergente solo es violación si el stage no honra delegate genérico.
 *
 * Cuenta como violación cualquier snapshot donde:
 *  - `authority_source = 'delegation'`; o
 *  - `effective_approver_member_id != formal_approver_member_id`,
 * restringido a artefactos VIVOS/accionables (para `leave`, solicitudes en
 * `pending_supervisor`). Los snapshots terminales con delegación son registro
 * histórico (se preservan, NUNCA se reescriben) y no cuentan como violación.
 *
 * Steady state esperado = 0 (tras el recovery del caso vivo).
 *
 * **Kind**: `drift`. **Severidad**: `error` cuando count > 0 (over-exposure de
 * autoridad de aprobación, no cosmético — mismo criterio que
 * `identity.session.route_group_drift`).
 *
 * Pattern reference: TASK-987 `identity-session-route-group-drift.ts`.
 */
export const LEAVE_INVALID_DELEGATED_APPROVAL_SNAPSHOTS_SIGNAL_ID =
  'hr.leave.invalid_delegated_approval_snapshots'

/** Stages `effective_supervisor` que NO honran el `approval_delegate` genérico. */
const getNoHonorStagePairs = () =>
  Object.values(APPROVAL_WORKFLOW_DEFINITIONS).flatMap(definition =>
    Object.values(definition.stages)
      .filter(
        stage =>
          stage.resolutionStrategy === 'effective_supervisor' &&
          stage.honorGenericApprovalDelegate !== true
      )
      .map(stage => ({ workflowDomain: definition.workflowDomain, stageCode: stage.stageCode }))
  )

const QUERY_SQL = `
  WITH no_honor(workflow_domain, stage_code) AS (
    SELECT * FROM unnest($1::text[], $2::text[])
  )
  SELECT COUNT(*)::int AS n
  FROM greenhouse_hr.workflow_approval_snapshots s
  INNER JOIN no_honor nh
    ON nh.workflow_domain = s.workflow_domain
   AND nh.stage_code = s.stage_code
  LEFT JOIN greenhouse_hr.leave_requests lr
    ON lr.request_id = s.workflow_entity_id
   AND s.workflow_domain = 'leave'
  WHERE (
      s.authority_source = 'delegation'
      OR s.effective_approver_member_id IS DISTINCT FROM s.formal_approver_member_id
    )
    -- Solo artefactos vivos/accionables. Para leave, la solicitud sigue pendiente
    -- de supervisor (el snapshot terminal con delegación es histórico, no se
    -- reescribe). Los demás workflows no tienen tabla de estado aquí: cualquier
    -- snapshot delegado es violación (gate de datos D2; hoy 0).
    AND (s.workflow_domain <> 'leave' OR lr.status = 'pending_supervisor')
`

export const getLeaveInvalidDelegatedApprovalSnapshotsSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const pairs = getNoHonorStagePairs()
  const workflows = pairs.map(pair => pair.workflowDomain)
  const stages = pairs.map(pair => pair.stageCode)

  try {
    const rows = await query<{ n: number }>(QUERY_SQL, [workflows, stages])
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: LEAVE_INVALID_DELEGATED_APPROVAL_SNAPSHOTS_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getLeaveInvalidDelegatedApprovalSnapshotsSignal',
      label: 'Snapshots de aprobación con delegación genérica inválida',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Ningún snapshot pendiente deriva autoridad de un approval_delegate genérico en stages que no lo honran. Sin over-exposure de autoridad de aprobación.'
          : `${count} snapshot${count === 1 ? '' : 's'} de aprobación pendiente${count === 1 ? '' : 's'} con autoridad efectiva derivada de un approval_delegate genérico inválido. Ejecuta el recovery (\`pnpm hr:leave-approval-authority:recover\`).`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: QUERY_SQL.trim()
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'metric',
          label: 'stages_no_honor',
          value: pairs.map(pair => `${pair.workflowDomain}.${pair.stageCode}`).join(', ')
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-1020-leave-approval-authority-delegation-drift-hardening.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_leave_invalid_delegated_approval_snapshots' }
    })

    return {
      signalId: LEAVE_INVALID_DELEGATED_APPROVAL_SNAPSHOTS_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getLeaveInvalidDelegatedApprovalSnapshotsSignal',
      label: 'Snapshots de aprobación con delegación genérica inválida',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
