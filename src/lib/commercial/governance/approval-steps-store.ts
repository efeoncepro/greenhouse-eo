import 'server-only'

import { query, withTransaction } from '@/lib/db'
import { finalizeQuotationIssued } from '@/lib/commercial/quotation-issuance'

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
  spaceId?: string,
  versionNumber?: number
): Promise<ApprovalStep[]> => {
  const params: unknown[] = [quotationId]
  let filter = 'quotation_id = $1'

  if (spaceId) {
    params.push(spaceId)
    filter += ` AND EXISTS (
      SELECT 1
      FROM greenhouse_commercial.quotations q
      WHERE q.quotation_id = greenhouse_commercial.approval_steps.quotation_id
        AND q.space_id = $2
    )`
  }

  if (typeof versionNumber === 'number') {
    const placeholder = params.length + 1

    filter += ` AND version_number = $${placeholder}`
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
  spaceId?: string | null
  actor: { userId: string; name: string }
  evaluationInput: ApprovalEvaluationInput
  requestOrigin?: 'manual' | 'issue'
  issueContext?: Record<string, unknown>
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

    if (params.spaceId) {
      await client.query(
        `UPDATE greenhouse_commercial.quotations
            SET status = 'pending_approval', updated_at = CURRENT_TIMESTAMP
            WHERE quotation_id = $1
              AND space_id = $2`,
        [params.quotationId, params.spaceId]
      )
    } else {
      await client.query(
        `UPDATE greenhouse_commercial.quotations
            SET status = 'pending_approval', updated_at = CURRENT_TIMESTAMP
            WHERE quotation_id = $1`,
        [params.quotationId]
      )
    }

    await recordAudit(
      {
        quotationId: params.quotationId,
        versionNumber: params.versionNumber,
        action: params.requestOrigin === 'issue' ? 'issue_requested' : 'approval_requested',
        actorUserId: params.actor.userId,
        actorName: params.actor.name,
        details: {
          ...(params.requestOrigin === 'issue'
            ? {
                approvalRequired: true,
                ...params.issueContext
              }
            : {}),
          steps: created.map(step => ({
            stepId: step.stepId,
            requiredRole: step.requiredRole,
            conditionLabel: step.conditionLabel
          }))
        }
      },
      client
    )

    if (params.requestOrigin === 'issue') {
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
    }

    return created
  })

  return { steps, quotationStatusChanged: true }
}

export interface DecideApprovalParams {
  stepId: string
  decision: 'approved' | 'rejected'
  actor: { userId: string; name: string; roleCodes: string[] }
  organizationId?: string | null
  spaceId?: string | null
  notes?: string | null
}

export interface DecideApprovalResult {
  step: ApprovalStep
  allResolved: boolean
  anyRejected: boolean
  quotationNewStatus: 'issued' | 'approval_rejected' | null
  versionNumber: number
  quotationId: string
}

export const decideApprovalStep = async (
  params: DecideApprovalParams
): Promise<DecideApprovalResult> => {
  return withTransaction(async client => {
    const stepRows = await client.query<
      StepRow & {
        quotation_organization_id: string | null
        quotation_space_id: string | null
      }
    >(
      `SELECT s.step_id, s.quotation_id, s.version_number, s.policy_id, s.step_order,
              s.required_role, s.assigned_to, s.condition_label, s.status,
              s.decided_by, s.decided_at, s.notes, s.created_at,
              q.organization_id AS quotation_organization_id,
              q.space_id AS quotation_space_id
         FROM greenhouse_commercial.approval_steps s
         JOIN greenhouse_commercial.quotations q
           ON q.quotation_id = s.quotation_id
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

    const effectiveOrganizationId =
      params.organizationId ?? row.quotation_organization_id

    const effectiveSpaceId = params.spaceId ?? row.quotation_space_id

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

    let quotationNewStatus: 'issued' | 'approval_rejected' | null = null

    if (anyRejected) {
      quotationNewStatus = 'approval_rejected'

      await client.query(
        `UPDATE greenhouse_commercial.quotations
            SET status = 'approval_rejected',
                approval_rejected_at = CURRENT_TIMESTAMP,
                approval_rejected_by = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE quotation_id = $1`,
        [step.quotationId, params.actor.userId]
      )
    } else if (allResolved) {
      quotationNewStatus = 'issued'

      await finalizeQuotationIssued({
        quotationId: step.quotationId,
        versionNumber: step.versionNumber,
        actor: { userId: params.actor.userId, name: params.actor.name },
        organizationId: effectiveOrganizationId,
        spaceId: effectiveSpaceId,
        viaApproval: true,
        client
      })
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

    if (quotationNewStatus === 'approval_rejected') {
      await recordAudit(
        {
          quotationId: step.quotationId,
          versionNumber: step.versionNumber,
          action: 'approval_rejected',
          actorUserId: params.actor.userId,
          actorName: params.actor.name,
          details: {
            stepId: step.stepId,
            conditionLabel: step.conditionLabel,
            notes: params.notes ?? null
          }
        },
        client
      )
    }

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
