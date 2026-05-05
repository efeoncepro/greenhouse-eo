import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import type { PersonLegalAuditAction } from './types'

/**
 * TASK-784 — Audit log writers para person_identity_documents +
 * person_addresses. Append-only enforced via PG triggers (Slice 1).
 *
 * NUNCA incluir `value_full`, `value_normalized`, `street_line_1`,
 * `presentation_text` en `diff_json`. Los diff_json describen WHICH
 * campos cambiaron, no su valor pleno. Para reveal, el diff es:
 *   { revealedFields: ['value_full', 'street_line_1'], reason: '...' }
 */

interface WriteDocumentAuditInput {
  documentId: string
  profileId: string
  action: PersonLegalAuditAction
  actorUserId?: string | null
  actorEmail?: string | null
  reason?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  diff?: Record<string, unknown>
}

interface WriteAddressAuditInput {
  addressId: string
  profileId: string
  action: PersonLegalAuditAction
  actorUserId?: string | null
  actorEmail?: string | null
  reason?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  diff?: Record<string, unknown>
}

const buildAuditId = () => `pdal-${randomUUID()}`
const buildAddressAuditId = () => `paal-${randomUUID()}`

export const writePersonIdentityDocumentAuditEntry = async (
  client: PoolClient,
  input: WriteDocumentAuditInput
): Promise<string> => {
  const auditId = buildAuditId()

  await client.query(
    `INSERT INTO greenhouse_core.person_identity_document_audit_log (
       audit_id, document_id, profile_id, action, actor_user_id,
       actor_email, reason, ip_address, user_agent, diff_json
     )
     VALUES ($1, $2, $3, $4, $5,
             $6, $7, $8, $9, $10::jsonb)`,
    [
      auditId,
      input.documentId,
      input.profileId,
      input.action,
      input.actorUserId ?? null,
      input.actorEmail ?? null,
      input.reason ?? null,
      input.ipAddress ?? null,
      input.userAgent ?? null,
      JSON.stringify(input.diff ?? {})
    ]
  )

  return auditId
}

export const writePersonAddressAuditEntry = async (
  client: PoolClient,
  input: WriteAddressAuditInput
): Promise<string> => {
  const auditId = buildAddressAuditId()

  await client.query(
    `INSERT INTO greenhouse_core.person_address_audit_log (
       audit_id, address_id, profile_id, action, actor_user_id,
       actor_email, reason, ip_address, user_agent, diff_json
     )
     VALUES ($1, $2, $3, $4, $5,
             $6, $7, $8, $9, $10::jsonb)`,
    [
      auditId,
      input.addressId,
      input.profileId,
      input.action,
      input.actorUserId ?? null,
      input.actorEmail ?? null,
      input.reason ?? null,
      input.ipAddress ?? null,
      input.userAgent ?? null,
      JSON.stringify(input.diff ?? {})
    ]
  )

  return auditId
}
