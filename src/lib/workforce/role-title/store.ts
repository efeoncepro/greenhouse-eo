import 'server-only'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { writeRoleTitleAuditEntry } from './audit'
import { RoleTitleError } from './errors'
import type { UpdateMemberRoleTitleInput } from './types'

/**
 * TASK-785 — HR-direct mutation of member.role_title with full governance.
 *
 * Atomic transaction:
 *   1. SELECT FOR UPDATE current member row.
 *   2. Reject if no actual change (no_change error code).
 *   3. UPDATE members.role_title + role_title_source='hr_manual' +
 *      role_title_updated_by_user_id + role_title_updated_at +
 *      last_human_update_at.
 *   4. Resolve any pending Entra drift proposal as 'rejected' (HR
 *      explicitly chose new value, so existing drift is stale).
 *   5. Append audit row (action='updated', source='hr_manual').
 *   6. Publish outbox event member.role_title.changed.
 *
 * Caller MUST validate capability `workforce.role_title.update` upstream.
 */

interface CurrentMemberRow {
  member_id: string
  role_title: string | null
  role_title_source: string
  [key: string]: unknown
}

export interface UpdateMemberRoleTitleResult {
  memberId: string
  oldRoleTitle: string | null
  newRoleTitle: string | null
  auditId: string
  eventId: string
}

export const updateMemberRoleTitle = async (
  input: UpdateMemberRoleTitleInput
): Promise<UpdateMemberRoleTitleResult> => {
  if (!input.actorUserId) {
    throw new RoleTitleError('actorUserId requerido', 'forbidden', 401)
  }

  if (!input.reason || input.reason.trim().length < 10) {
    throw new RoleTitleError(
      'Razon del cambio HR requerida (minimo 10 caracteres) — queda en audit log.',
      'reason_required',
      400
    )
  }

  return withTransaction(async client => {
    const lookup = await client.query<CurrentMemberRow>(
      `SELECT member_id, role_title, role_title_source
         FROM greenhouse_core.members
        WHERE member_id = $1
        FOR UPDATE`,
      [input.memberId]
    )

    const row = lookup.rows[0]

    if (!row) {
      throw new RoleTitleError(`Member ${input.memberId} no existe`, 'member_not_found', 404)
    }

    if (row.role_title === input.newRoleTitle) {
      throw new RoleTitleError('Sin cambio: el cargo nuevo es identico al actual.', 'no_change', 409)
    }

    const effectiveAt = input.effectiveAt ?? new Date()

    await client.query(
      `UPDATE greenhouse_core.members
          SET role_title = $1,
              role_title_source = 'hr_manual',
              role_title_updated_by_user_id = $2,
              role_title_updated_at = $3,
              last_human_update_at = $3,
              updated_at = NOW()
        WHERE member_id = $4`,
      [input.newRoleTitle, input.actorUserId, effectiveAt, input.memberId]
    )

    // If there was a pending Entra drift proposal, mark it as resolved
    // (rejected because HR explicitly chose a new value).
    await client.query(
      `UPDATE greenhouse_sync.member_role_title_drift_proposals
          SET status = 'rejected',
              resolved_at = NOW(),
              resolved_by_user_id = $1,
              resolution_note = 'Resolved automatically: HR chose new role_title via governed mutation'
        WHERE member_id = $2
          AND status = 'pending'`,
      [input.actorUserId, input.memberId]
    )

    const auditId = await writeRoleTitleAuditEntry(client, {
      memberId: input.memberId,
      action: 'updated',
      source: 'hr_manual',
      oldRoleTitle: row.role_title,
      newRoleTitle: input.newRoleTitle,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail ?? null,
      reason: input.reason.trim(),
      effectiveAt,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      diff: {
        previous_source: row.role_title_source
      }
    })

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'member',
        aggregateId: input.memberId,
        eventType: 'member.role_title.changed',
        payload: {
          memberId: input.memberId,
          oldRoleTitle: row.role_title,
          newRoleTitle: input.newRoleTitle,
          source: 'hr_manual',
          actorUserId: input.actorUserId,
          reason: input.reason.trim(),
          effectiveAt: effectiveAt.toISOString()
        }
      },
      client
    )

    return {
      memberId: input.memberId,
      oldRoleTitle: row.role_title,
      newRoleTitle: input.newRoleTitle,
      auditId,
      eventId
    }
  })
}
