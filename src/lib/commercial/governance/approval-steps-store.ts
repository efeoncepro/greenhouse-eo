import 'server-only'

import { query, withTransaction } from '@/lib/db'

import { recordAudit } from './audit-log'
import {
  evaluateApproval,
  type ApprovalEvaluationInput
} from './approval-evaluator'

import type { ApprovalStep, ApprovalStepStatus } from './contracts'

interface StepRow extends Record<string, unknown> {
  step_id: string
  quotation_id: string
  version_number: number
  policy_id: string | null
  step_order: number
  required_role: string
  assigned_to: string | null
  condition_label: string
  status: string
  decided_by: string | null
  decided_at: string | Date | null
  notes: string | null
  created_at: string | Date
}

const toIso = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return value
}

const mapStep = (row: StepRow): ApprovalStep => ({
  stepId: row.step_id,
  quotationId: row.quotation_id,
  versionNumber: row.version_number,
  policyId: row.policy_id,
  stepOrder: row.step_order,
  requiredRole: row.required_role,
  assignedTo: row.assigned_to,
  conditionLabel: row.condition_label,
  status: row.status as ApprovalStepStatus,
  decidedBy: row.decided_by,
  decidedAt: toIso(row.decided_at),
  notes: row.notes,
  createdAt: toIso(row.created_at) as string
})

export const listApprovalSteps = async (
  quotationId: string,
  versionNumber?: number
): Promise<ApprovalStep[]> => {
  const params: unknown[] = [quotationId]
  let filter = 'quotation_id = $1'

  if (typeof versionNumber === 'number') {
    filter += ' AND version_number = $2'
    params.push(versionNumber)
  }

  const rows = await query<StepRow>(
    `SELECT step_id, quotation_id, version_number, policy_id, step_order,
            required_role, assigned_to, condition_label, status,
            decided_by, decided_at, notes, created_at
       FROM greenhouse_commercial.approval_steps
       WHERE ${filter}
       ORDER BY version_number DESC, step_order ASC, created_at ASC`,
    params
  )

  return rows.map(mapStep)
}

export interface RequestApprovalResult {
  steps: ApprovalStep[]
  quotationStatusChanged: boolean
}

export interface RequestApprovalParams {
  quotationId: string
  versionNumber: number
  actor: { userId: string; name: string }
  evaluationInput: ApprovalEvaluationInput
}

export const requestApproval = async (
  params: RequestApprovalParams
): Promise<RequestApprovalResult> => {
  const evaluation = await evaluateApproval(params.evaluationInput)

  if (evaluation.length === 0) {
    return { steps: [], quotationStatusChanged: false }
  }

  const steps = await withTransaction(async client => {
    const existing = await client.query<StepRow>(
      `SELECT step_id, quotation_id, version_number, policy_id, step_order,
              required_role, assigned_to, condition_label, status,
              decided_by, decided_at, notes, created_at
         FROM greenhouse_commercial.approval_steps
         WHERE quotation_id = $1 AND version_number = $2`,
      [params.quotationId, params.versionNumber]
    )

    if (existing.rows.length > 0) {
      return existing.rows.map(mapStep)
    }

    const created: ApprovalStep[] = []

    for (const step of evaluation) {
      const inserted = await client.query<StepRow>(
        `INSERT INTO greenhouse_commercial.approval_steps (
           quotation_id, version_number, policy_id, step_order,
           required_role, condition_label
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING step_id, quotation_id, version_number, policy_id, step_order,
                   required_role, assigned_to, condition_label, status,
                   decided_by, decided_at, notes, created_at`,
        [
          params.quotationId,
          params.versionNumber,
          step.policyId,
          step.stepOrder,
          step.requiredRole,
          step.conditionLabel
        ]
      )

      created.push(mapStep(inserted.rows[0]))
    }

    await client.query(
      `UPDATE greenhouse_commercial.quotations
          SET status = 'pending_approval', updated_at = CURRENT_TIMESTAMP
          WHERE quotation_id = $1`,
      [params.quotationId]
    )

    await recordAudit(
      {
        quotationId: params.quotationId,
        versionNumber: params.versionNumber,
        action: 'approval_requested',
        actorUserId: params.actor.userId,
        actorName: params.actor.name,
        details: {
          steps: created.map(step => ({
            stepId: step.stepId,
            requiredRole: step.requiredRole,
            conditionLabel: step.conditionLabel
          }))
        }
      },
      client
    )

    return created
  })

  return { steps, quotationStatusChanged: true }
}

export interface DecideApprovalParams {
  stepId: string
  decision: 'approved' | 'rejected'
  actor: { userId: string; name: string; roleCodes: string[] }
  notes?: string | null
}

export interface DecideApprovalResult {
  step: ApprovalStep
  allResolved: boolean
  anyRejected: boolean
  quotationNewStatus: 'sent' | 'draft' | null
  versionNumber: number
  quotationId: string
}

export const decideApprovalStep = async (
  params: DecideApprovalParams
): Promise<DecideApprovalResult> => {
  return withTransaction(async client => {
    const stepRows = await client.query<StepRow & { actor_role_required: string }>(
      `SELECT step_id, quotation_id, version_number, policy_id, step_order,
              required_role, assigned_to, condition_label, status,
              decided_by, decided_at, notes, created_at
         FROM greenhouse_commercial.approval_steps
         WHERE step_id = $1
         FOR UPDATE`,
      [params.stepId]
    )

    const row = stepRows.rows[0]

    if (!row) {
      throw new Error('Approval step not found')
    }

    if (row.status !== 'pending') {
      throw new Error('Approval step already decided')
    }

    const hasRole =
      params.actor.roleCodes.includes(row.required_role) ||
      params.actor.roleCodes.includes('efeonce_admin')

    if (!hasRole) {
      throw new Error(`Actor does not hold required role: ${row.required_role}`)
    }

    const updated = await client.query<StepRow>(
      `UPDATE greenhouse_commercial.approval_steps
          SET status = $1::text,
              decided_by = $2,
              decided_at = CURRENT_TIMESTAMP,
              notes = COALESCE($3, notes)
          WHERE step_id = $4
          RETURNING step_id, quotation_id, version_number, policy_id, step_order,
                    required_role, assigned_to, condition_label, status,
                    decided_by, decided_at, notes, created_at`,
      [params.decision, params.actor.userId, params.notes ?? null, params.stepId]
    )

    const step = mapStep(updated.rows[0])

    const remaining = await client.query<{ status: string }>(
      `SELECT status FROM greenhouse_commercial.approval_steps
         WHERE quotation_id = $1 AND version_number = $2`,
      [step.quotationId, step.versionNumber]
    )

    const statuses = remaining.rows.map(r => r.status)
    const anyRejected = statuses.includes('rejected')
    const allResolved = statuses.every(status => status !== 'pending')

    let quotationNewStatus: 'sent' | 'draft' | null = null

    if (anyRejected) {
      quotationNewStatus = 'draft'

      await client.query(
        `UPDATE greenhouse_commercial.quotations
            SET status = 'draft', updated_at = CURRENT_TIMESTAMP
            WHERE quotation_id = $1`,
        [step.quotationId]
      )
    } else if (allResolved) {
      quotationNewStatus = 'sent'

      await client.query(
        `UPDATE greenhouse_commercial.quotations
            SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE quotation_id = $1`,
        [step.quotationId]
      )
    }

    await recordAudit(
      {
        quotationId: step.quotationId,
        versionNumber: step.versionNumber,
        action: 'approval_decided',
        actorUserId: params.actor.userId,
        actorName: params.actor.name,
        details: {
          stepId: step.stepId,
          decision: params.decision,
          notes: params.notes ?? null,
          conditionLabel: step.conditionLabel,
          newQuotationStatus: quotationNewStatus
        }
      },
      client
    )

    return {
      step,
      allResolved,
      anyRejected,
      quotationNewStatus,
      versionNumber: step.versionNumber,
      quotationId: step.quotationId
    }
  })
}
