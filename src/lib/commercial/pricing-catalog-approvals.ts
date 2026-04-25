import 'server-only'

import { query, withTransaction } from '@/lib/db'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  applyPricingCatalogEntityChanges,
  EntityWriterError
} from './pricing-catalog-entity-writer'
import {
  applyPricingCatalogExcelProposal,
  isPricingCatalogExcelApprovalPayload,
  PricingCatalogExcelApprovalError
} from './pricing-catalog-excel-approval'
import {
  getSellableRoleProjectionEventRow,
  publishSellableRoleProjectionEvent
} from './sellable-role-sync-events'

export type ApprovalCriticality = 'low' | 'medium' | 'high' | 'critical'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface PricingCatalogApprovalEntry {
  approvalId: string
  entityType: string
  entityId: string
  entitySku: string | null
  proposedChanges: Record<string, unknown>
  proposedByUserId: string
  proposedByName: string
  proposedAt: string
  justification: string | null
  status: ApprovalStatus
  reviewedByUserId: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  reviewComment: string | null
  criticality: ApprovalCriticality
}

interface ApprovalRow extends Record<string, unknown> {
  approval_id: string
  entity_type: string
  entity_id: string
  entity_sku: string | null
  proposed_changes: unknown
  proposed_by_user_id: string
  proposed_by_name: string
  proposed_at: string | Date
  justification: string | null
  status: string
  reviewed_by_user_id: string | null
  reviewed_by_name: string | null
  reviewed_at: string | Date | null
  review_comment: string | null
  criticality: string
}

const toIso = (value: string | Date | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return value
}

const toChangesObject = (value: unknown): Record<string, unknown> => {
  if (!value) return {}

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }

  if (typeof value === 'object') return value as Record<string, unknown>

  return {}
}

const mapRow = (row: ApprovalRow): PricingCatalogApprovalEntry => ({
  approvalId: row.approval_id,
  entityType: row.entity_type,
  entityId: row.entity_id,
  entitySku: row.entity_sku,
  proposedChanges: toChangesObject(row.proposed_changes),
  proposedByUserId: row.proposed_by_user_id,
  proposedByName: row.proposed_by_name,
  proposedAt: toIso(row.proposed_at) ?? '',
  justification: row.justification,
  status: row.status as ApprovalStatus,
  reviewedByUserId: row.reviewed_by_user_id,
  reviewedByName: row.reviewed_by_name,
  reviewedAt: toIso(row.reviewed_at),
  reviewComment: row.review_comment,
  criticality: row.criticality as ApprovalCriticality
})

const toProposalMeta = (proposedChanges: Record<string, unknown>) => {
  const meta = proposedChanges.__meta

  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return null
  }

  return meta as Record<string, unknown>
}

const buildApprovalProposedEventPayload = (approval: PricingCatalogApprovalEntry) => ({
  approvalId: approval.approvalId,
  entityType: approval.entityType,
  entityId: approval.entityId,
  entitySku: approval.entitySku,
  proposedByUserId: approval.proposedByUserId,
  proposedByName: approval.proposedByName,
  criticality: approval.criticality,
  justification: approval.justification,
  proposedAt: approval.proposedAt,
  proposalMeta: toProposalMeta(approval.proposedChanges)
})

const buildApprovalDecidedEventPayload = (input: {
  approval: PricingCatalogApprovalEntry
  decision: DecideApprovalInput['decision']
  decidedByUserId: string
  decidedByName: string
  comment: string
  applied: boolean
  appliedFields: string[] | null
  newAuditId: string | null
}) => ({
  approvalId: input.approval.approvalId,
  entityType: input.approval.entityType,
  entityId: input.approval.entityId,
  entitySku: input.approval.entitySku,
  proposedByUserId: input.approval.proposedByUserId,
  proposedByName: input.approval.proposedByName,
  criticality: input.approval.criticality,
  decision: input.decision,
  decidedByUserId: input.decidedByUserId,
  decidedByName: input.decidedByName,
  decidedAt: input.approval.reviewedAt,
  comment: input.comment,
  applied: input.applied,
  appliedFields: input.appliedFields,
  newAuditId: input.newAuditId,
  proposalMeta: toProposalMeta(input.approval.proposedChanges)
})

/**
 * Criticality detector: given an entity_type + proposed_changes object,
 * returns the criticality level. Low changes bypass the approval queue and
 * apply directly; medium/high/critical must be queued.
 *
 * V1 hardcoded mapping:
 *   - critical: margin_min drops, commercial_model_multiplier on license_consulting
 *   - high: margin_opt changes, country_factor_opt changes, deactivating entities
 *     with likely downstream impact
 *   - medium: cost components, compatibility changes
 *   - low: everything else (labels, notes, cosmetic)
 *
 * Follow-up V2: persist thresholds en tabla config.
 */
export const detectApprovalCriticality = (input: {
  entityType: string
  proposedChanges: Record<string, unknown>
}): ApprovalCriticality => {
  const { entityType, proposedChanges } = input

  // Critical: margin_min drops (would hurt floor protection)
  if (entityType === 'role_tier_margin' || entityType === 'service_tier_margin') {
    if ('marginMin' in proposedChanges || 'margin_min' in proposedChanges) return 'critical'
    if ('marginOpt' in proposedChanges || 'margin_opt' in proposedChanges) return 'high'
  }

  // Critical: commercial_model multiplier change (affects all pricing at once)
  if (entityType === 'commercial_model_multiplier') {
    if ('multiplierPct' in proposedChanges || 'multiplier_pct' in proposedChanges) return 'critical'
  }

  // High: deactivations (potential blast radius on active quotes)
  if ('active' in proposedChanges && proposedChanges.active === false) return 'high'
  if ('isActive' in proposedChanges && proposedChanges.isActive === false) return 'high'

  // High: country factor opt
  if (entityType === 'country_pricing_factor') {
    if ('factorOpt' in proposedChanges || 'factor_opt' in proposedChanges) return 'high'
  }

  // Medium: cost components, compatibility
  if (entityType === 'sellable_role' && (
    'costComponents' in proposedChanges ||
    'compatibility' in proposedChanges
  )) return 'medium'

  // Low: everything else (labels, notes, display cosmetics)
  return 'low'
}

export interface ProposeApprovalInput {
  entityType: string
  entityId: string
  entitySku?: string | null
  proposedChanges: Record<string, unknown>
  justification?: string | null
  proposedByUserId: string
  proposedByName: string
}

export const proposeApproval = async (
  input: ProposeApprovalInput
): Promise<PricingCatalogApprovalEntry> => {
  const criticality = detectApprovalCriticality({
    entityType: input.entityType,
    proposedChanges: input.proposedChanges
  })

  return withTransaction(async client => {
    const inserted = await client.query<ApprovalRow>(
      `INSERT INTO greenhouse_commercial.pricing_catalog_approval_queue (
         entity_type, entity_id, entity_sku, proposed_changes,
         proposed_by_user_id, proposed_by_name, justification, status, criticality
       ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, 'pending', $8)
       RETURNING *`,
      [
        input.entityType,
        input.entityId,
        input.entitySku ?? null,
        JSON.stringify(input.proposedChanges),
        input.proposedByUserId,
        input.proposedByName,
        input.justification ?? null,
        criticality
      ]
    )

    if (inserted.rowCount === 0) throw new Error('Failed to insert approval row')

    const approval = mapRow(inserted.rows[0])

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.pricingCatalogApproval,
        aggregateId: approval.approvalId,
        eventType: EVENT_TYPES.pricingCatalogApprovalProposed,
        payload: buildApprovalProposedEventPayload(approval)
      },
      client
    )

    return approval
  })
}

export interface ListApprovalsInput {
  status?: ApprovalStatus
  limit?: number
}

export const listApprovals = async (
  input: ListApprovalsInput = {}
): Promise<PricingCatalogApprovalEntry[]> => {
  const limit = Math.min(500, Math.max(1, input.limit ?? 100))
  const conditions: string[] = []
  const values: unknown[] = []

  if (input.status) {
    conditions.push(`status = $${values.length + 1}`)
    values.push(input.status)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await query<ApprovalRow>(
    `SELECT * FROM greenhouse_commercial.pricing_catalog_approval_queue
     ${whereClause}
     ORDER BY proposed_at DESC
     LIMIT ${limit}`,
    values
  )

  return rows.map(mapRow)
}

export const countPendingApprovals = async (): Promise<number> => {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM greenhouse_commercial.pricing_catalog_approval_queue WHERE status = 'pending'`
  )

  return Number(rows[0]?.count ?? 0)
}

export interface DecideApprovalInput {
  approvalId: string
  decision: 'approved' | 'rejected' | 'cancelled'
  reviewerUserId: string
  reviewerName: string
  comment: string
}

export class ApprovalSelfReviewError extends Error {
  constructor(message = 'Proposer cannot review their own approval.') {
    super(message)
    this.name = 'ApprovalSelfReviewError'
  }
}

export class ApprovalNotPendingError extends Error {
  constructor(message = 'Approval is not in pending state.') {
    super(message)
    this.name = 'ApprovalNotPendingError'
  }
}

export class ApprovalApplyError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code = 'apply_failed', statusCode = 500) {
    super(message)
    this.name = 'ApprovalApplyError'
    this.code = code
    this.statusCode = statusCode
  }
}

export interface DecideApprovalResult {
  approval: PricingCatalogApprovalEntry
  applied: boolean
  appliedFields: string[] | null
  newAuditId: string | null
}

/**
 * Transitions an approval to approved/rejected/cancelled. Enforces proposer ≠ reviewer
 * (unless decision='cancelled' by the proposer themselves).
 *
 * When `decision='approved'`, this function ALSO auto-applies the proposed changes
 * to the target entity (TASK-471 Gap-1) via `applyPricingCatalogEntityChanges`,
 * and emits an audit row with action='approval_applied' in the same transaction.
 * The entire flow is atomic: if the apply step fails (whitelist mismatch, entity
 * gone, etc.), the approval status is also rolled back.
 *
 * Returns the approval entry + apply metadata (whether it was applied, updated
 * fields, new audit id).
 */
export const decideApproval = async (
  input: DecideApprovalInput
): Promise<DecideApprovalResult> => {
  return withTransaction(async client => {
    const existing = await client.query<ApprovalRow>(
      `SELECT * FROM greenhouse_commercial.pricing_catalog_approval_queue
       WHERE approval_id = $1 FOR UPDATE`,
      [input.approvalId]
    )

    if (existing.rowCount === 0) throw new Error('Approval not found.')

    const row = existing.rows[0]

    if (row.status !== 'pending') {
      throw new ApprovalNotPendingError()
    }

    // Enforce maker-checker: proposer cannot approve/reject their own proposal.
    // Cancellation is allowed by proposer themselves.
    if (input.decision !== 'cancelled' && row.proposed_by_user_id === input.reviewerUserId) {
      throw new ApprovalSelfReviewError()
    }

    const updated = await client.query<ApprovalRow>(
      `UPDATE greenhouse_commercial.pricing_catalog_approval_queue
          SET status = $1,
              reviewed_by_user_id = $2,
              reviewed_by_name = $3,
              reviewed_at = NOW(),
              review_comment = $4
        WHERE approval_id = $5
        RETURNING *`,
      [input.decision, input.reviewerUserId, input.reviewerName, input.comment, input.approvalId]
    )

    const approval = mapRow(updated.rows[0])

    // Auto-apply: only on approved decisions.
    if (input.decision !== 'approved') {
      const result = { approval, applied: false, appliedFields: null, newAuditId: null }

      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.pricingCatalogApproval,
          aggregateId: approval.approvalId,
          eventType: EVENT_TYPES.pricingCatalogApprovalDecided,
          payload: buildApprovalDecidedEventPayload({
            approval,
            decision: input.decision,
            decidedByUserId: input.reviewerUserId,
            decidedByName: input.reviewerName,
            comment: input.comment,
            applied: result.applied,
            appliedFields: result.appliedFields,
            newAuditId: result.newAuditId
          })
        },
        client
      )

      return result
    }

    const proposedChanges = approval.proposedChanges

    if (!proposedChanges || typeof proposedChanges !== 'object') {
      const result = { approval, applied: false, appliedFields: null, newAuditId: null }

      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.pricingCatalogApproval,
          aggregateId: approval.approvalId,
          eventType: EVENT_TYPES.pricingCatalogApprovalDecided,
          payload: buildApprovalDecidedEventPayload({
            approval,
            decision: input.decision,
            decidedByUserId: input.reviewerUserId,
            decidedByName: input.reviewerName,
            comment: input.comment,
            applied: result.applied,
            appliedFields: result.appliedFields,
            newAuditId: result.newAuditId
          })
        },
        client
      )

      return result
    }

    try {
      const isExcelApproval = isPricingCatalogExcelApprovalPayload(proposedChanges)
      let appliedFields: string[] = []
      let auditId: string | null = null

      if (isExcelApproval) {
        const excelResult = await applyPricingCatalogExcelProposal({
          client,
          approvalId: approval.approvalId,
          reviewerUserId: input.reviewerUserId,
          reviewerName: input.reviewerName,
          diff: proposedChanges.diff
        })

        appliedFields = excelResult.appliedFields
        auditId = excelResult.auditId
      } else {
        const applyResult = await applyPricingCatalogEntityChanges({
          client,
          entityType: approval.entityType,
          entityId: approval.entityId,
          changeset: proposedChanges
        })

        appliedFields = applyResult.updatedFields
        auditId = (
          await client.query<{ audit_id: string }>(
            `INSERT INTO greenhouse_commercial.pricing_catalog_audit_log (
               entity_type, entity_id, entity_sku, action,
               actor_user_id, actor_name, change_summary
             ) VALUES ($1, $2, $3, 'approval_applied', $4, $5, $6::jsonb)
             RETURNING audit_id`,
            [
              approval.entityType,
              approval.entityId,
              approval.entitySku,
              input.reviewerUserId,
              input.reviewerName,
              JSON.stringify({
                approval_id: approval.approvalId,
                proposed_by_user_id: approval.proposedByUserId,
                proposed_by_name: approval.proposedByName,
                justification: approval.justification,
                new_values: proposedChanges,
                fields_changed: appliedFields,
                criticality: approval.criticality,
                review_comment: input.comment,
                source: 'approval_queue',
                proposal_action: 'update'
              })
            ]
          )
        ).rows[0]?.audit_id ?? null

        if (approval.entityType === 'sellable_role' && applyResult.updatedFields.length > 0) {
          const role = await getSellableRoleProjectionEventRow(client, approval.entityId)

          if (role) {
            const activeValue = proposedChanges.active

            const activeChanged =
              applyResult.updatedFields.includes('active') && typeof activeValue === 'boolean'

            if (activeChanged) {
              await publishSellableRoleProjectionEvent(
                activeValue ? 'reactivated' : 'deactivated',
                role,
                client
              )
            } else {
              await publishSellableRoleProjectionEvent('updated', role, client)
            }
          }
        }
      }

      const result: DecideApprovalResult = {
        approval,
        applied: true,
        appliedFields,
        newAuditId: auditId
      }

      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.pricingCatalogApproval,
          aggregateId: approval.approvalId,
          eventType: EVENT_TYPES.pricingCatalogApprovalDecided,
          payload: buildApprovalDecidedEventPayload({
            approval,
            decision: input.decision,
            decidedByUserId: input.reviewerUserId,
            decidedByName: input.reviewerName,
            comment: input.comment,
            applied: result.applied,
            appliedFields: result.appliedFields,
            newAuditId: result.newAuditId
          })
        },
        client
      )

      return result
    } catch (error) {
      if (error instanceof PricingCatalogExcelApprovalError) {
        throw new ApprovalApplyError(error.message, error.code, error.statusCode)
      }

      if (error instanceof EntityWriterError) {
        throw new ApprovalApplyError(error.message, error.code, error.statusCode)
      }

      throw error
    }
  })
}
