import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { query } from '@/lib/db'
import type {
  ApprovalAuthorityResolution,
  ApprovalStageCode,
  ApprovalWorkflowDomain,
  WorkflowApprovalSnapshotRecord
} from '@/lib/approval-authority/types'

type WorkflowApprovalSnapshotRow = {
  snapshot_id: string
  workflow_domain: ApprovalWorkflowDomain
  workflow_entity_id: string
  stage_code: ApprovalStageCode
  subject_member_id: string
  authority_source: WorkflowApprovalSnapshotRecord['authoritySource']
  formal_approver_member_id: string | null
  formal_approver_name: string | null
  effective_approver_member_id: string | null
  effective_approver_name: string | null
  delegate_member_id: string | null
  delegate_member_name: string | null
  delegate_responsibility_id: string | null
  fallback_role_codes: string[] | null
  override_actor_user_id: string | null
  override_reason: string | null
  snapshot_payload: Record<string, unknown> | null
  created_by_user_id: string | null
  created_at: string
  updated_at: string
}

const buildWorkflowApprovalSnapshotId = () => `EO-APS-${randomUUID().slice(0, 8).toUpperCase()}`

const queryRows = async <T extends Record<string, unknown>>(text: string, values: unknown[] = [], client?: PoolClient) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return query<T>(text, values)
}

const mapSnapshotRow = (row: WorkflowApprovalSnapshotRow): WorkflowApprovalSnapshotRecord => ({
  snapshotId: row.snapshot_id,
  workflowDomain: row.workflow_domain,
  workflowEntityId: row.workflow_entity_id,
  stageCode: row.stage_code,
  subjectMemberId: row.subject_member_id,
  authoritySource: row.authority_source,
  formalApproverMemberId: row.formal_approver_member_id,
  formalApproverName: row.formal_approver_name,
  effectiveApproverMemberId: row.effective_approver_member_id,
  effectiveApproverName: row.effective_approver_name,
  delegateMemberId: row.delegate_member_id,
  delegateMemberName: row.delegate_member_name,
  delegateResponsibilityId: row.delegate_responsibility_id,
  fallbackRoleCodes: (row.fallback_role_codes ?? []) as WorkflowApprovalSnapshotRecord['fallbackRoleCodes'],
  delegated: row.authority_source === 'delegation',
  overrideActorUserId: row.override_actor_user_id,
  overrideReason: row.override_reason,
  snapshotPayload: row.snapshot_payload ?? {},
  createdByUserId: row.created_by_user_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export const upsertWorkflowApprovalSnapshotInTransaction = async ({
  workflowDomain,
  workflowEntityId,
  subjectMemberId,
  resolution,
  createdByUserId,
  client
}: {
  workflowDomain: ApprovalWorkflowDomain
  workflowEntityId: string
  subjectMemberId: string
  resolution: ApprovalAuthorityResolution
  createdByUserId: string | null
  client: PoolClient
}): Promise<WorkflowApprovalSnapshotRecord> => {
  const rows = await queryRows<WorkflowApprovalSnapshotRow>(
    `
      INSERT INTO greenhouse_hr.workflow_approval_snapshots (
        snapshot_id,
        workflow_domain,
        workflow_entity_id,
        stage_code,
        subject_member_id,
        authority_source,
        formal_approver_member_id,
        formal_approver_name,
        effective_approver_member_id,
        effective_approver_name,
        delegate_member_id,
        delegate_member_name,
        delegate_responsibility_id,
        fallback_role_codes,
        override_actor_user_id,
        override_reason,
        snapshot_payload,
        created_by_user_id
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::text[], NULL, NULL, $15::jsonb, $16
      )
      ON CONFLICT (workflow_domain, workflow_entity_id, stage_code)
      DO UPDATE SET
        subject_member_id = EXCLUDED.subject_member_id,
        authority_source = EXCLUDED.authority_source,
        formal_approver_member_id = EXCLUDED.formal_approver_member_id,
        formal_approver_name = EXCLUDED.formal_approver_name,
        effective_approver_member_id = EXCLUDED.effective_approver_member_id,
        effective_approver_name = EXCLUDED.effective_approver_name,
        delegate_member_id = EXCLUDED.delegate_member_id,
        delegate_member_name = EXCLUDED.delegate_member_name,
        delegate_responsibility_id = EXCLUDED.delegate_responsibility_id,
        fallback_role_codes = EXCLUDED.fallback_role_codes,
        snapshot_payload = EXCLUDED.snapshot_payload,
        created_by_user_id = EXCLUDED.created_by_user_id,
        updated_at = CURRENT_TIMESTAMP
      RETURNING
        snapshot_id,
        workflow_domain,
        workflow_entity_id,
        stage_code,
        subject_member_id,
        authority_source,
        formal_approver_member_id,
        formal_approver_name,
        effective_approver_member_id,
        effective_approver_name,
        delegate_member_id,
        delegate_member_name,
        delegate_responsibility_id,
        fallback_role_codes,
        override_actor_user_id,
        override_reason,
        snapshot_payload,
        created_by_user_id,
        created_at,
        updated_at
    `,
    [
      buildWorkflowApprovalSnapshotId(),
      workflowDomain,
      workflowEntityId,
      resolution.stageCode,
      subjectMemberId,
      resolution.authoritySource,
      resolution.formalApproverMemberId,
      resolution.formalApproverName,
      resolution.effectiveApproverMemberId,
      resolution.effectiveApproverName,
      resolution.delegateMemberId,
      resolution.delegateMemberName,
      resolution.delegateResponsibilityId,
      resolution.fallbackRoleCodes,
      JSON.stringify(resolution.snapshotPayload),
      createdByUserId
    ],
    client
  )

  const row = rows[0]

  if (!row) {
    throw new Error(`Unable to upsert workflow approval snapshot for ${workflowDomain}:${workflowEntityId}`)
  }

  return mapSnapshotRow(row)
}

export const getWorkflowApprovalSnapshotForStage = async ({
  workflowDomain,
  workflowEntityId,
  stageCode,
  client
}: {
  workflowDomain: ApprovalWorkflowDomain
  workflowEntityId: string
  stageCode: ApprovalStageCode
  client?: PoolClient
}): Promise<WorkflowApprovalSnapshotRecord | null> => {
  const rows = await queryRows<WorkflowApprovalSnapshotRow>(
    `
      SELECT
        snapshot_id,
        workflow_domain,
        workflow_entity_id,
        stage_code,
        subject_member_id,
        authority_source,
        formal_approver_member_id,
        formal_approver_name,
        effective_approver_member_id,
        effective_approver_name,
        delegate_member_id,
        delegate_member_name,
        delegate_responsibility_id,
        fallback_role_codes,
        override_actor_user_id,
        override_reason,
        snapshot_payload,
        created_by_user_id,
        created_at,
        updated_at
      FROM greenhouse_hr.workflow_approval_snapshots
      WHERE workflow_domain = $1
        AND workflow_entity_id = $2
        AND stage_code = $3
      LIMIT 1
    `,
    [workflowDomain, workflowEntityId, stageCode],
    client
  )

  return rows[0] ? mapSnapshotRow(rows[0]) : null
}

export const listWorkflowApprovalSnapshotsForEntities = async ({
  workflowDomain,
  workflowEntityIds,
  client
}: {
  workflowDomain: ApprovalWorkflowDomain
  workflowEntityIds: string[]
  client?: PoolClient
}): Promise<WorkflowApprovalSnapshotRecord[]> => {
  if (workflowEntityIds.length === 0) {
    return []
  }

  const rows = await queryRows<WorkflowApprovalSnapshotRow>(
    `
      SELECT
        snapshot_id,
        workflow_domain,
        workflow_entity_id,
        stage_code,
        subject_member_id,
        authority_source,
        formal_approver_member_id,
        formal_approver_name,
        effective_approver_member_id,
        effective_approver_name,
        delegate_member_id,
        delegate_member_name,
        delegate_responsibility_id,
        fallback_role_codes,
        override_actor_user_id,
        override_reason,
        snapshot_payload,
        created_by_user_id,
        created_at,
        updated_at
      FROM greenhouse_hr.workflow_approval_snapshots
      WHERE workflow_domain = $1
        AND workflow_entity_id = ANY($2::text[])
    `,
    [workflowDomain, workflowEntityIds],
    client
  )

  return rows.map(mapSnapshotRow)
}

export const listVisibleWorkflowEntityIdsForApprover = async ({
  workflowDomain,
  approverMemberId,
  client
}: {
  workflowDomain: ApprovalWorkflowDomain
  approverMemberId: string
  client?: PoolClient
}) => {
  const rows = await queryRows<{ workflow_entity_id: string }>(
    `
      SELECT DISTINCT workflow_entity_id
      FROM greenhouse_hr.workflow_approval_snapshots
      WHERE workflow_domain = $1
        AND effective_approver_member_id = $2
    `,
    [workflowDomain, approverMemberId],
    client
  )

  return rows.map(row => row.workflow_entity_id)
}

export const applyWorkflowApprovalOverrideInTransaction = async ({
  workflowDomain,
  workflowEntityId,
  stageCode,
  overrideActorUserId,
  overrideReason,
  client
}: {
  workflowDomain: ApprovalWorkflowDomain
  workflowEntityId: string
  stageCode: ApprovalStageCode
  overrideActorUserId: string
  overrideReason: string | null
  client: PoolClient
}): Promise<WorkflowApprovalSnapshotRecord> => {
  const rows = await queryRows<WorkflowApprovalSnapshotRow>(
    `
      UPDATE greenhouse_hr.workflow_approval_snapshots
      SET
        authority_source = 'admin_override',
        override_actor_user_id = $4,
        override_reason = $5,
        snapshot_payload = COALESCE(snapshot_payload, '{}'::jsonb) || jsonb_build_object(
          'overrideApplied', TRUE,
          'overrideActorUserId', $4,
          'overrideReason', $5,
          'overrideAppliedAt', CURRENT_TIMESTAMP
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE workflow_domain = $1
        AND workflow_entity_id = $2
        AND stage_code = $3
      RETURNING
        snapshot_id,
        workflow_domain,
        workflow_entity_id,
        stage_code,
        subject_member_id,
        authority_source,
        formal_approver_member_id,
        formal_approver_name,
        effective_approver_member_id,
        effective_approver_name,
        delegate_member_id,
        delegate_member_name,
        delegate_responsibility_id,
        fallback_role_codes,
        override_actor_user_id,
        override_reason,
        snapshot_payload,
        created_by_user_id,
        created_at,
        updated_at
    `,
    [workflowDomain, workflowEntityId, stageCode, overrideActorUserId, overrideReason],
    client
  )

  const row = rows[0]

  if (!row) {
    throw new Error(`Approval snapshot not found for ${workflowDomain}:${workflowEntityId}:${stageCode}`)
  }

  return mapSnapshotRow(row)
}
