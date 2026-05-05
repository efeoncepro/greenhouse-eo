import 'server-only'

import { randomUUID } from 'node:crypto'

import { withTransaction } from '@/lib/db'

import { writeRoleTitleAuditEntry } from './audit'

/**
 * TASK-785 — Apply Entra/Graph jobTitle to member.role_title under governance.
 *
 * Behavior:
 *   - If member has NO human override (last_human_update_at IS NULL OR
 *     role_title_source IN ('unset','entra','migration')): UPDATE the value
 *     (same as legacy behavior — backward compat with current Entra sync).
 *     Source is recorded as 'entra'. Audit row written with action='updated'
 *     and source='entra'.
 *   - If member HAS human override (role_title_source='hr_manual' AND
 *     last_human_update_at IS NOT NULL) AND Entra value differs: DO NOT
 *     overwrite. Insert a drift proposal in
 *     greenhouse_sync.member_role_title_drift_proposals for HR review.
 *     Audit row written with action='drift_proposed'.
 *
 * Returns: { applied, skipped, driftProposed }.
 *
 * NEVER throws on drift — non-blocking for the Entra sync caller.
 */

interface ApplyRoleTitleInput {
  memberId: string
  entraJobTitle: string | null
  /** Identifier of the source sync run (greenhouse_sync.source_sync_runs.run_id), if any. */
  sourceSyncRunId?: string | null
}

interface MemberRoleTitleRow {
  member_id: string
  role_title: string | null
  role_title_source: string
  last_human_update_at: Date | null
  [key: string]: unknown
}

export interface ApplyRoleTitleResult {
  applied: boolean
  skipped: boolean
  driftProposed: boolean
  reason?: string
}

const buildProposalId = () => `mrtdp-${randomUUID()}`

export const applyEntraRoleTitle = async (
  input: ApplyRoleTitleInput
): Promise<ApplyRoleTitleResult> => {
  if (!input.entraJobTitle) {
    return { applied: false, skipped: true, driftProposed: false, reason: 'entra_value_null' }
  }

  return withTransaction(async client => {
    const lookup = await client.query<MemberRoleTitleRow>(
      `SELECT member_id, role_title, role_title_source, last_human_update_at
         FROM greenhouse_core.members
        WHERE member_id = $1
        FOR UPDATE`,
      [input.memberId]
    )

    const row = lookup.rows[0]

    if (!row) {
      return { applied: false, skipped: true, driftProposed: false, reason: 'member_not_found' }
    }

    if (row.role_title === input.entraJobTitle) {
      return { applied: false, skipped: true, driftProposed: false, reason: 'no_change' }
    }

    const hasHrOverride =
      row.role_title_source === 'hr_manual' && row.last_human_update_at !== null

    if (hasHrOverride) {
      // Drift case — record proposal, do NOT overwrite.
      const proposalId = buildProposalId()

      await client.query(
        `INSERT INTO greenhouse_sync.member_role_title_drift_proposals (
           proposal_id, member_id, source_system, source_sync_run_id,
           drift_kind, current_role_title, current_source, proposed_role_title,
           status, policy_action, evidence_json
         )
         VALUES ($1, $2, 'entra', $3,
                 'entra_overwrite_blocked', $4, 'hr_manual', $5,
                 'pending', 'blocked_manual_precedence',
                 jsonb_build_object('blocked_reason', 'hr_override_active'))
         ON CONFLICT (member_id, source_system, drift_kind)
           WHERE status = 'pending'
         DO UPDATE SET
           proposed_role_title = EXCLUDED.proposed_role_title,
           current_role_title = EXCLUDED.current_role_title,
           last_detected_at = NOW(),
           occurrence_count = greenhouse_sync.member_role_title_drift_proposals.occurrence_count + 1`,
        [proposalId, input.memberId, input.sourceSyncRunId ?? null, row.role_title, input.entraJobTitle]
      )

      await writeRoleTitleAuditEntry(client, {
        memberId: input.memberId,
        action: 'drift_proposed',
        source: 'entra',
        oldRoleTitle: row.role_title,
        newRoleTitle: input.entraJobTitle,
        actorUserId: 'system',
        reason: 'Entra value diverges from HR-managed role_title',
        diff: {
          drift_kind: 'entra_overwrite_blocked',
          source_sync_run_id: input.sourceSyncRunId ?? null
        }
      })

      return { applied: false, skipped: true, driftProposed: true, reason: 'hr_override_active' }
    }

    // No HR override — safe to apply Entra value (same as legacy behavior).
    await client.query(
      `UPDATE greenhouse_core.members
          SET role_title = $1,
              role_title_source = 'entra',
              role_title_updated_at = NOW(),
              updated_at = NOW()
        WHERE member_id = $2`,
      [input.entraJobTitle, input.memberId]
    )

    await writeRoleTitleAuditEntry(client, {
      memberId: input.memberId,
      action: 'updated',
      source: 'entra',
      oldRoleTitle: row.role_title,
      newRoleTitle: input.entraJobTitle,
      actorUserId: 'system',
      reason: 'Entra/SCIM sync',
      diff: {
        previous_source: row.role_title_source,
        source_sync_run_id: input.sourceSyncRunId ?? null
      }
    })

    return { applied: true, skipped: false, driftProposed: false }
  })
}
