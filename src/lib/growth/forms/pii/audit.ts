import 'server-only'

/**
 * TASK-1255 — Writer del audit append-only de reveal de PII (Slice 3).
 *
 * NUNCA incluir el valor crudo (email/teléfono/cédula) en `diff_json`. El diff
 * describe QUÉ campo se reveló (key + clase PII), nunca su valor:
 *   { revealedField: 'rut', piiClass: 'national_id' }
 *
 * La tabla `greenhouse_growth.lead_pii_reveal_audit` es append-only (trigger PG
 * bloquea UPDATE/DELETE).
 */
import type { PoolClient } from 'pg'

import type { PiiFieldClass } from './types'

export interface WriteLeadPiiRevealAuditInput {
  submissionId: string
  formId: string
  actorUserId: string
  actorEmail?: string | null
  reason: string
  ipAddress?: string | null
  userAgent?: string | null
  revealedField: string
  piiClass: PiiFieldClass
}

export const writeLeadPiiRevealAuditEntry = async (
  client: PoolClient,
  input: WriteLeadPiiRevealAuditInput,
): Promise<string> => {
  const result = await client.query<{ audit_id: string }>(
    `INSERT INTO greenhouse_growth.lead_pii_reveal_audit (
       submission_id, form_id, action, actor_user_id, actor_email, reason,
       ip_address, user_agent, diff_json)
     VALUES ($1, $2, 'revealed_pii', $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING audit_id`,
    [
      input.submissionId,
      input.formId,
      input.actorUserId,
      input.actorEmail ?? null,
      input.reason,
      input.ipAddress ?? null,
      input.userAgent ?? null,
      JSON.stringify({ revealedField: input.revealedField, piiClass: input.piiClass }),
    ],
  )

  return result.rows[0]!.audit_id
}
