import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  writePersonAddressAuditEntry,
  writePersonIdentityDocumentAuditEntry
} from './audit'
import { PersonLegalProfileError, PersonLegalProfileValidationError } from './errors'
import { __internalMapAddressRowMasked, __internalMapDocumentRowMasked, type __AddressRow, type __DocumentRow } from './store'
import type {
  AddressType,
  PersonAddressSensitive,
  PersonDocumentType,
  PersonIdentityDocumentSensitive
} from './types'

/**
 * TASK-784 — Reveal sensitive value (TASK-697 pattern).
 *
 * Caller debe haber validado capability `person.legal_profile.reveal_sensitive`
 * ANTES de invocar este helper. NO chequea autorizacion adentro — defense
 * in depth a nivel route + middleware.
 *
 * Cada reveal escribe:
 *   - audit log con action='revealed_sensitive', reason >= 5 chars,
 *     actor + ip + user_agent.
 *   - outbox event person.identity_document.revealed_sensitive (o address).
 *
 * Ambos forman el trail que el reliability signal
 * `identity.legal_profile.reveal_anomaly_rate` lee.
 */

export interface RevealIdentityDocumentInput {
  documentId: string
  actorUserId: string
  actorEmail?: string | null
  reason: string
  ipAddress?: string | null
  userAgent?: string | null
}

export const revealPersonIdentityDocument = async (
  input: RevealIdentityDocumentInput,
  client?: PoolClient
): Promise<{
  document: PersonIdentityDocumentSensitive
  auditId: string
  eventId: string
}> => {
  if (!input.documentId) throw new PersonLegalProfileValidationError('documentId requerido')
  if (!input.actorUserId) throw new PersonLegalProfileValidationError('actorUserId requerido')

  if (!input.reason || input.reason.trim().length < 5) {
    throw new PersonLegalProfileValidationError(
      'reason debe tener al menos 5 caracteres (requerido para audit)',
      'reason_required'
    )
  }

  const run = async (c: PoolClient) => {
    const result = await c.query<__DocumentRow & { value_full: string; value_normalized: string }>(
      `SELECT * FROM greenhouse_core.person_identity_documents
        WHERE document_id = $1
        LIMIT 1`,
      [input.documentId]
    )

    if ((result.rowCount ?? 0) === 0) {
      throw new PersonLegalProfileError(
        `Documento ${input.documentId} no existe`,
        'document_not_found',
        404
      )
    }

    const row = result.rows[0]!

    if (row.verification_status === 'archived' || row.verification_status === 'expired') {
      throw new PersonLegalProfileError(
        `Documento ${input.documentId} esta en estado ${row.verification_status} — reveal deshabilitado`,
        'reveal_disabled_for_status',
        409
      )
    }

    const masked = __internalMapDocumentRowMasked(row)

    const auditId = await writePersonIdentityDocumentAuditEntry(c, {
      documentId: input.documentId,
      profileId: row.profile_id,
      action: 'revealed_sensitive',
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail ?? null,
      reason: input.reason.trim(),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      diff: {
        revealedFields: ['value_full', 'value_normalized']
      }
    })

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'person_identity_document',
        aggregateId: input.documentId,
        eventType: 'person.identity_document.revealed_sensitive',
        payload: {
          documentId: input.documentId,
          profileId: row.profile_id,
          actorUserId: input.actorUserId,
          reason: input.reason.trim(),
          revealedFields: ['value_full', 'value_normalized']
        }
      },
      c
    )

    return {
      document: {
        ...masked,
        valueFull: row.value_full,
        valueNormalized: row.value_normalized
      },
      auditId,
      eventId
    }
  }

  if (client) return run(client)

  return withTransaction(run)
}

export interface RevealPersonAddressInput {
  addressId: string
  actorUserId: string
  actorEmail?: string | null
  reason: string
  ipAddress?: string | null
  userAgent?: string | null
}

export const revealPersonAddress = async (
  input: RevealPersonAddressInput,
  client?: PoolClient
): Promise<{
  address: PersonAddressSensitive
  auditId: string
  eventId: string
}> => {
  if (!input.addressId) throw new PersonLegalProfileValidationError('addressId requerido')
  if (!input.actorUserId) throw new PersonLegalProfileValidationError('actorUserId requerido')

  if (!input.reason || input.reason.trim().length < 5) {
    throw new PersonLegalProfileValidationError(
      'reason debe tener al menos 5 caracteres (requerido para audit)',
      'reason_required'
    )
  }

  const run = async (c: PoolClient) => {
    const result = await c.query<__AddressRow>(
      `SELECT * FROM greenhouse_core.person_addresses
        WHERE address_id = $1
        LIMIT 1`,
      [input.addressId]
    )

    if ((result.rowCount ?? 0) === 0) {
      throw new PersonLegalProfileError(
        `Address ${input.addressId} no existe`,
        'address_not_found',
        404
      )
    }

    const row = result.rows[0]!
    const masked = __internalMapAddressRowMasked(row)

    const auditId = await writePersonAddressAuditEntry(c, {
      addressId: input.addressId,
      profileId: row.profile_id,
      action: 'revealed_sensitive',
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail ?? null,
      reason: input.reason.trim(),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      diff: { revealedFields: ['street_line_1', 'street_line_2', 'postal_code', 'presentation_text'] }
    })

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'person_address',
        aggregateId: input.addressId,
        eventType: 'person.address.revealed_sensitive',
        payload: {
          addressId: input.addressId,
          profileId: row.profile_id,
          actorUserId: input.actorUserId,
          reason: input.reason.trim(),
          revealedFields: ['street_line_1', 'street_line_2', 'postal_code', 'presentation_text']
        }
      },
      c
    )

    return {
      address: {
        ...masked,
        streetLine1: row.street_line_1,
        streetLine2: row.street_line_2,
        postalCode: row.postal_code,
        presentationText: row.presentation_text
      },
      auditId,
      eventId
    }
  }

  if (client) return run(client)

  return withTransaction(run)
}

// Helper internal: re-export tipos para uso futuro
export type { PersonDocumentType, AddressType }
