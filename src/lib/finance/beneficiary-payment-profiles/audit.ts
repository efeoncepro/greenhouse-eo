import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import type { BeneficiaryPaymentProfileAuditAction } from '@/types/payment-profiles'

export interface WriteProfileAuditEntryInput {
  profileId: string
  action: BeneficiaryPaymentProfileAuditAction
  actorUserId: string
  actorEmail?: string | null
  reason?: string | null
  diff?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

const buildAuditId = () => `pal-${randomUUID()}`

export const writeProfileAuditEntry = async (
  client: PoolClient,
  input: WriteProfileAuditEntryInput
): Promise<string> => {
  const auditId = buildAuditId()

  await client.query(
    `INSERT INTO greenhouse_finance.beneficiary_payment_profile_audit_log (
       audit_id, profile_id, action, actor_user_id, actor_email,
       reason, diff_json, ip_address, user_agent
     )
     VALUES ($1, $2, $3, $4, $5,
             $6, $7::jsonb, $8, $9)`,
    [
      auditId,
      input.profileId,
      input.action,
      input.actorUserId,
      input.actorEmail ?? null,
      input.reason ?? null,
      JSON.stringify(input.diff ?? {}),
      input.ipAddress ?? null,
      input.userAgent ?? null
    ]
  )

  return auditId
}
