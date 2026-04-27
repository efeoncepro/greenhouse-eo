import { query } from '@/lib/db'
import { toTimestampString } from '@/lib/finance/shared'
import type { PaymentInstrumentAuditEntry } from '@/lib/finance/payment-instruments/types'

type AuditRow = {
  audit_id: string
  account_id: string
  actor_user_id: string | null
  action: string
  field_name: string | null
  reason: string | null
  diff_json: Record<string, unknown> | null
  impact_json: Record<string, unknown> | null
  created_at: string | Date
}

const mapAuditRow = (row: AuditRow): PaymentInstrumentAuditEntry => ({
  auditId: row.audit_id,
  accountId: row.account_id,
  action: row.action,
  fieldName: row.field_name,
  actorUserId: row.actor_user_id,
  reason: row.reason,
  diff: row.diff_json ?? {},
  impact: row.impact_json ?? {},
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null) ?? new Date().toISOString()
})

export const listPaymentInstrumentAuditEntries = async ({
  accountId,
  spaceId,
  limit = 30
}: {
  accountId: string
  spaceId: string | null
  limit?: number
}) => {
  const rows = await query<AuditRow>(
    `
      SELECT
        audit_id,
        account_id,
        actor_user_id,
        action,
        field_name,
        reason,
        diff_json,
        impact_json,
        created_at
      FROM greenhouse_finance.payment_instrument_admin_audit_log
      WHERE account_id = $1
        AND space_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `,
    [accountId, spaceId, limit]
  )

  return rows.map(mapAuditRow)
}

export const writePaymentInstrumentAuditEntry = async ({
  accountId,
  spaceId,
  actorUserId,
  action,
  fieldName = null,
  reason = null,
  diff = {},
  impact = {},
  requestId = null
}: {
  accountId: string
  spaceId: string | null
  actorUserId: string | null
  action: 'updated' | 'revealed_sensitive' | 'deactivated' | 'reactivated' | 'created'
  fieldName?: string | null
  reason?: string | null
  diff?: Record<string, unknown>
  impact?: Record<string, unknown>
  requestId?: string | null
}) => {
  const rows = await query<{ audit_id: string }>(
    `
      INSERT INTO greenhouse_finance.payment_instrument_admin_audit_log (
        space_id,
        account_id,
        actor_user_id,
        action,
        field_name,
        reason,
        diff_json,
        impact_json,
        request_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
      RETURNING audit_id
    `,
    [
      spaceId,
      accountId,
      actorUserId,
      action,
      fieldName,
      reason,
      JSON.stringify(diff),
      JSON.stringify(impact),
      requestId
    ]
  )

  return rows[0]?.audit_id ?? null
}
