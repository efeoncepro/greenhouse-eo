import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import type { RoleTitleAuditAction, RoleTitleSource } from './types'

/**
 * TASK-785 — Append-only audit writer for member.role_title changes.
 *
 * NUNCA almacenar valores irrelevantes al audit en `diff_json`. Solo
 * el delta (campos cambiados + razon).
 */

interface WriteRoleTitleAuditInput {
  memberId: string
  action: RoleTitleAuditAction
  source: RoleTitleSource | 'system'
  oldRoleTitle?: string | null
  newRoleTitle?: string | null
  actorUserId?: string | null
  actorEmail?: string | null
  reason?: string | null
  effectiveAt?: Date
  ipAddress?: string | null
  userAgent?: string | null
  diff?: Record<string, unknown>
}

const buildAuditId = () => `mrtal-${randomUUID()}`

export const writeRoleTitleAuditEntry = async (
  client: PoolClient,
  input: WriteRoleTitleAuditInput
): Promise<string> => {
  const auditId = buildAuditId()

  await client.query(
    `INSERT INTO greenhouse_core.member_role_title_audit_log (
       audit_id, member_id, action, actor_user_id, actor_email,
       reason, source, old_role_title, new_role_title,
       effective_at, ip_address, user_agent, diff_json
     )
     VALUES ($1, $2, $3, $4, $5,
             $6, $7, $8, $9,
             $10, $11, $12, $13::jsonb)`,
    [
      auditId,
      input.memberId,
      input.action,
      input.actorUserId ?? null,
      input.actorEmail ?? null,
      input.reason ?? null,
      input.source,
      input.oldRoleTitle ?? null,
      input.newRoleTitle ?? null,
      input.effectiveAt ?? new Date(),
      input.ipAddress ?? null,
      input.userAgent ?? null,
      JSON.stringify(input.diff ?? {})
    ]
  )

  return auditId
}
