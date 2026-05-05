import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  writePersonAddressAuditEntry,
  writePersonIdentityDocumentAuditEntry
} from './audit'
import { PersonLegalProfileError, PersonLegalProfileValidationError } from './errors'
import {
  formatAddressPresentationMask,
  formatAddressPresentationText,
  formatDisplayMask
} from './mask'
import {
  computeValueHash,
  normalizeCountryCode,
  normalizeDocument
} from './normalize'
import {
  type AddressType,
  type PersonAddressMasked,
  type PersonDocumentType,
  type PersonIdentityDocumentMasked,
  type PersonLegalSource,
  isPersonDocumentType
} from './types'

/**
 * TASK-784 — Store: writers transaccionales para person_identity_documents
 * y person_addresses.
 *
 * Cada write atomico:
 *   1. INSERT/UPDATE en la tabla canonica.
 *   2. INSERT en audit log (mismo tx).
 *   3. publishOutboxEvent (mismo tx).
 *
 * Idempotencia: las funciones declare/update detectan duplicados via la
 * partial UNIQUE constraint y la convierten en un upsert semantico.
 *
 * NUNCA loggear el value_full / street_line_1 en errores. Los messages
 * indican type + razon, no contenido.
 */

const buildDocumentId = () => `pid-${randomUUID()}`
const buildAddressId = () => `pad-${randomUUID()}`

// ──────────────────────────────────────────────────────────────────────────────
// Document writers
// ──────────────────────────────────────────────────────────────────────────────

export interface DeclareIdentityDocumentInput {
  profileId: string
  countryCode: string
  documentType: PersonDocumentType
  rawValue: string
  source: PersonLegalSource
  issuingCountry?: string | null
  validFrom?: string | null
  validUntil?: string | null
  evidenceAssetId?: string | null
  declaredByUserId?: string | null
  notes?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

interface DocumentRow {
  document_id: string
  profile_id: string
  country_code: string
  document_type: string
  issuing_country: string | null
  display_mask: string
  verification_status: string
  source: string
  valid_from: Date | null
  valid_until: Date | null
  evidence_asset_id: string | null
  declared_by_user_id: string | null
  declared_at: Date
  verified_by_user_id: string | null
  verified_at: Date | null
  rejected_reason: string | null
  rejected_at: Date | null
  rejected_by_user_id: string | null
  archived_at: Date | null
  notes: string | null
  created_at: Date
  updated_at: Date
  [key: string]: unknown
}

const dateToIso = (value: Date | null): string | null => (value ? value.toISOString() : null)

const dateOnlyToIso = (value: Date | null): string | null =>
  value ? value.toISOString().slice(0, 10) : null

const mapDocumentRowMasked = (row: DocumentRow): PersonIdentityDocumentMasked => ({
  documentId: row.document_id,
  profileId: row.profile_id,
  countryCode: row.country_code,
  documentType: row.document_type as PersonDocumentType,
  issuingCountry: row.issuing_country,
  displayMask: row.display_mask,
  verificationStatus: row.verification_status as PersonIdentityDocumentMasked['verificationStatus'],
  source: row.source as PersonLegalSource,
  validFrom: dateOnlyToIso(row.valid_from),
  validUntil: dateOnlyToIso(row.valid_until),
  evidenceAssetId: row.evidence_asset_id,
  declaredByUserId: row.declared_by_user_id,
  declaredAt: row.declared_at.toISOString(),
  verifiedByUserId: row.verified_by_user_id,
  verifiedAt: dateToIso(row.verified_at),
  rejectedReason: row.rejected_reason,
  rejectedAt: dateToIso(row.rejected_at),
  rejectedByUserId: row.rejected_by_user_id,
  archivedAt: dateToIso(row.archived_at),
  notes: row.notes,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString()
})

/**
 * Declara un documento de identidad nuevo o actualiza el existente activo
 * (pending_review|verified) por (profile, type, country).
 *
 * Comportamiento canonico:
 *   - Si no existe documento activo: INSERT.
 *   - Si existe doc activo con mismo value_hash: UPDATE de metadatos
 *     (notes, valid_from/until, evidence_asset_id, source) sin cambiar
 *     verification_status. Idempotente.
 *   - Si existe doc activo con value_hash distinto: archivar el existente
 *     (archived) e INSERT del nuevo (pending_review). Mantiene historial.
 */
export const declareIdentityDocument = async (
  input: DeclareIdentityDocumentInput
): Promise<{ document: PersonIdentityDocumentMasked; auditId: string; eventId: string; created: boolean }> => {
  if (!input.profileId) {
    throw new PersonLegalProfileValidationError('profileId requerido')
  }

  if (!isPersonDocumentType(input.documentType)) {
    throw new PersonLegalProfileValidationError(
      `documentType invalido: ${String(input.documentType)}`,
      'invalid_document_format'
    )
  }

  const countryCode = normalizeCountryCode(input.countryCode)
  const issuingCountry = input.issuingCountry ? normalizeCountryCode(input.issuingCountry) : null
  const { normalized, formatted } = normalizeDocument(input.documentType, input.rawValue)
  const valueHash = await computeValueHash(normalized)
  const displayMask = formatDisplayMask(input.documentType, formatted)

  return withTransaction(async client => {
    const existing = await client.query<DocumentRow & { value_hash: string }>(
      `
        SELECT *
        FROM greenhouse_core.person_identity_documents
        WHERE profile_id = $1
          AND document_type = $2
          AND country_code = $3
          AND verification_status IN ('pending_review', 'verified')
        FOR UPDATE
      `,
      [input.profileId, input.documentType, countryCode]
    )

    let documentId: string
    let createdNew = false

    if ((existing.rowCount ?? 0) > 0) {
      const row = existing.rows[0]!

      if (row.value_hash === valueHash) {
        // Idempotent metadata refresh
        documentId = row.document_id

        await client.query(
          `
            UPDATE greenhouse_core.person_identity_documents
               SET notes = COALESCE($2, notes),
                   valid_from = COALESCE($3, valid_from),
                   valid_until = COALESCE($4, valid_until),
                   evidence_asset_id = COALESCE($5, evidence_asset_id),
                   source = $6
             WHERE document_id = $1
          `,
          [
            documentId,
            input.notes ?? null,
            input.validFrom ?? null,
            input.validUntil ?? null,
            input.evidenceAssetId ?? null,
            input.source
          ]
        )
      } else {
        // Archive prior + insert new
        await client.query(
          `
            UPDATE greenhouse_core.person_identity_documents
               SET verification_status = 'archived',
                   archived_at = NOW()
             WHERE document_id = $1
          `,
          [row.document_id]
        )

        await writePersonIdentityDocumentAuditEntry(client, {
          documentId: row.document_id,
          profileId: input.profileId,
          action: 'archived',
          actorUserId: input.declaredByUserId ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          diff: { reason: 'superseded_by_new_declaration' }
        })

        documentId = buildDocumentId()
        createdNew = true

        await client.query(
          `
            INSERT INTO greenhouse_core.person_identity_documents (
              document_id, profile_id, country_code, document_type, issuing_country,
              value_full, value_normalized, value_hash, display_mask,
              verification_status, source,
              valid_from, valid_until, evidence_asset_id,
              declared_by_user_id, declared_at, notes
            ) VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9,
              'pending_review', $10,
              $11, $12, $13,
              $14, NOW(), $15
            )
          `,
          [
            documentId,
            input.profileId,
            countryCode,
            input.documentType,
            issuingCountry,
            formatted,
            normalized,
            valueHash,
            displayMask,
            input.source,
            input.validFrom ?? null,
            input.validUntil ?? null,
            input.evidenceAssetId ?? null,
            input.declaredByUserId ?? null,
            input.notes ?? null
          ]
        )
      }
    } else {
      documentId = buildDocumentId()
      createdNew = true

      await client.query(
        `
          INSERT INTO greenhouse_core.person_identity_documents (
            document_id, profile_id, country_code, document_type, issuing_country,
            value_full, value_normalized, value_hash, display_mask,
            verification_status, source,
            valid_from, valid_until, evidence_asset_id,
            declared_by_user_id, declared_at, notes
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9,
            'pending_review', $10,
            $11, $12, $13,
            $14, NOW(), $15
          )
        `,
        [
          documentId,
          input.profileId,
          countryCode,
          input.documentType,
          issuingCountry,
          formatted,
          normalized,
          valueHash,
          displayMask,
          input.source,
          input.validFrom ?? null,
          input.validUntil ?? null,
          input.evidenceAssetId ?? null,
          input.declaredByUserId ?? null,
          input.notes ?? null
        ]
      )
    }

    const auditId = await writePersonIdentityDocumentAuditEntry(client, {
      documentId,
      profileId: input.profileId,
      action: createdNew ? 'declared' : 'updated',
      actorUserId: input.declaredByUserId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      diff: {
        documentType: input.documentType,
        countryCode,
        source: input.source,
        evidenceAttached: Boolean(input.evidenceAssetId)
      }
    })

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'person_identity_document',
        aggregateId: documentId,
        eventType: createdNew
          ? 'person.identity_document.declared'
          : 'person.identity_document.updated',
        payload: {
          documentId,
          profileId: input.profileId,
          documentType: input.documentType,
          countryCode,
          source: input.source,
          declaredByUserId: input.declaredByUserId ?? null
        }
      },
      client
    )

    const finalRow = await client.query<DocumentRow>(
      `SELECT * FROM greenhouse_core.person_identity_documents WHERE document_id = $1`,
      [documentId]
    )

    if (!finalRow.rows[0]) {
      throw new PersonLegalProfileError(
        'Documento creado pero no encontrado en lectura subsecuente',
        'document_not_found',
        500
      )
    }

    return {
      document: mapDocumentRowMasked(finalRow.rows[0]),
      auditId,
      eventId,
      created: createdNew
    }
  })
}

export interface VerifyIdentityDocumentInput {
  documentId: string
  verifiedByUserId: string
  actorEmail?: string | null
  notes?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

export const verifyIdentityDocument = async (
  input: VerifyIdentityDocumentInput
): Promise<{ document: PersonIdentityDocumentMasked; auditId: string; eventId: string }> => {
  return withTransaction(async client => {
    const update = await client.query<DocumentRow>(
      `
        UPDATE greenhouse_core.person_identity_documents
           SET verification_status = 'verified',
               verified_by_user_id = $2,
               verified_at = NOW(),
               notes = COALESCE($3, notes),
               rejected_reason = NULL,
               rejected_at = NULL,
               rejected_by_user_id = NULL
         WHERE document_id = $1
           AND verification_status IN ('pending_review', 'rejected')
         RETURNING *
      `,
      [input.documentId, input.verifiedByUserId, input.notes ?? null]
    )

    if (!update.rows[0]) {
      throw new PersonLegalProfileError(
        `Documento ${input.documentId} no esta en estado verificable (pending_review|rejected)`,
        'verification_status_invalid',
        409
      )
    }

    const auditId = await writePersonIdentityDocumentAuditEntry(client, {
      documentId: input.documentId,
      profileId: update.rows[0].profile_id,
      action: 'verified',
      actorUserId: input.verifiedByUserId,
      actorEmail: input.actorEmail ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      diff: { previousStatus: 'pending_review_or_rejected' }
    })

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'person_identity_document',
        aggregateId: input.documentId,
        eventType: 'person.identity_document.verified',
        payload: {
          documentId: input.documentId,
          profileId: update.rows[0].profile_id,
          verifiedByUserId: input.verifiedByUserId
        }
      },
      client
    )

    return { document: mapDocumentRowMasked(update.rows[0]), auditId, eventId }
  })
}

export interface RejectIdentityDocumentInput {
  documentId: string
  rejectedByUserId: string
  rejectedReason: string
  actorEmail?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

export const rejectIdentityDocument = async (
  input: RejectIdentityDocumentInput
): Promise<{ document: PersonIdentityDocumentMasked; auditId: string; eventId: string }> => {
  if (!input.rejectedReason || input.rejectedReason.trim().length < 10) {
    throw new PersonLegalProfileValidationError(
      'rejectedReason debe tener al menos 10 caracteres (requerido para audit)',
      'rejection_reason_too_short'
    )
  }

  return withTransaction(async client => {
    const update = await client.query<DocumentRow>(
      `
        UPDATE greenhouse_core.person_identity_documents
           SET verification_status = 'rejected',
               rejected_by_user_id = $2,
               rejected_reason = $3,
               rejected_at = NOW(),
               verified_by_user_id = NULL,
               verified_at = NULL
         WHERE document_id = $1
           AND verification_status IN ('pending_review', 'verified')
         RETURNING *
      `,
      [input.documentId, input.rejectedByUserId, input.rejectedReason.trim()]
    )

    if (!update.rows[0]) {
      throw new PersonLegalProfileError(
        `Documento ${input.documentId} no esta en estado rechazable (pending_review|verified)`,
        'verification_status_invalid',
        409
      )
    }

    const auditId = await writePersonIdentityDocumentAuditEntry(client, {
      documentId: input.documentId,
      profileId: update.rows[0].profile_id,
      action: 'rejected',
      actorUserId: input.rejectedByUserId,
      actorEmail: input.actorEmail ?? null,
      reason: input.rejectedReason.trim(),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      diff: { rejectedReason: input.rejectedReason.trim() }
    })

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'person_identity_document',
        aggregateId: input.documentId,
        eventType: 'person.identity_document.rejected',
        payload: {
          documentId: input.documentId,
          profileId: update.rows[0].profile_id,
          rejectedByUserId: input.rejectedByUserId,
          rejectedReason: input.rejectedReason.trim()
        }
      },
      client
    )

    return { document: mapDocumentRowMasked(update.rows[0]), auditId, eventId }
  })
}

export const archiveIdentityDocument = async (
  documentId: string,
  actorUserId: string,
  client?: PoolClient
): Promise<void> => {
  const run = async (c: PoolClient) => {
    const update = await c.query<DocumentRow>(
      `
        UPDATE greenhouse_core.person_identity_documents
           SET verification_status = 'archived',
               archived_at = NOW()
         WHERE document_id = $1
           AND verification_status IN ('pending_review', 'verified', 'rejected')
         RETURNING profile_id
      `,
      [documentId]
    )

    if (!update.rows[0]) {
      throw new PersonLegalProfileError(
        `Documento ${documentId} ya esta archivado o no existe`,
        'document_already_archived',
        409
      )
    }

    await writePersonIdentityDocumentAuditEntry(c, {
      documentId,
      profileId: update.rows[0].profile_id,
      action: 'archived',
      actorUserId,
      diff: { reason: 'manual_archive' }
    })

    await publishOutboxEvent(
      {
        aggregateType: 'person_identity_document',
        aggregateId: documentId,
        eventType: 'person.identity_document.archived',
        payload: {
          documentId,
          profileId: update.rows[0].profile_id,
          actorUserId
        }
      },
      c
    )
  }

  if (client) return run(client)

  return withTransaction(run)
}

// ──────────────────────────────────────────────────────────────────────────────
// Address writers
// ──────────────────────────────────────────────────────────────────────────────

export interface DeclarePersonAddressInput {
  profileId: string
  addressType: AddressType
  countryCode: string
  streetLine1: string
  streetLine2?: string | null
  city: string
  region?: string | null
  postalCode?: string | null
  source: PersonLegalSource
  validFrom?: string | null
  validUntil?: string | null
  evidenceAssetId?: string | null
  declaredByUserId?: string | null
  notes?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

interface AddressRow {
  address_id: string
  profile_id: string
  address_type: string
  country_code: string
  street_line_1: string
  street_line_2: string | null
  city: string
  region: string | null
  postal_code: string | null
  presentation_text: string
  presentation_mask: string
  verification_status: string
  source: string
  valid_from: Date | null
  valid_until: Date | null
  evidence_asset_id: string | null
  declared_by_user_id: string | null
  declared_at: Date
  verified_by_user_id: string | null
  verified_at: Date | null
  rejected_reason: string | null
  rejected_at: Date | null
  rejected_by_user_id: string | null
  archived_at: Date | null
  notes: string | null
  created_at: Date
  updated_at: Date
  [key: string]: unknown
}

const mapAddressRowMasked = (row: AddressRow): PersonAddressMasked => ({
  addressId: row.address_id,
  profileId: row.profile_id,
  addressType: row.address_type as AddressType,
  countryCode: row.country_code,
  presentationMask: row.presentation_mask,
  city: row.city,
  region: row.region,
  verificationStatus: row.verification_status as PersonAddressMasked['verificationStatus'],
  source: row.source as PersonLegalSource,
  validFrom: dateOnlyToIso(row.valid_from),
  validUntil: dateOnlyToIso(row.valid_until),
  evidenceAssetId: row.evidence_asset_id,
  declaredByUserId: row.declared_by_user_id,
  declaredAt: row.declared_at.toISOString(),
  verifiedByUserId: row.verified_by_user_id,
  verifiedAt: dateToIso(row.verified_at),
  rejectedReason: row.rejected_reason,
  rejectedAt: dateToIso(row.rejected_at),
  rejectedByUserId: row.rejected_by_user_id,
  archivedAt: dateToIso(row.archived_at),
  notes: row.notes,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString()
})

const ADDRESS_TYPE_VALUES: AddressType[] = ['legal', 'residence', 'mailing', 'emergency']

const isValidAddressType = (v: unknown): v is AddressType =>
  typeof v === 'string' && (ADDRESS_TYPE_VALUES as string[]).includes(v)

export const declarePersonAddress = async (
  input: DeclarePersonAddressInput
): Promise<{ address: PersonAddressMasked; auditId: string; eventId: string; created: boolean }> => {
  if (!isValidAddressType(input.addressType)) {
    throw new PersonLegalProfileValidationError(
      `addressType invalido: ${String(input.addressType)}`
    )
  }

  if (!input.streetLine1 || input.streetLine1.trim().length === 0) {
    throw new PersonLegalProfileValidationError('streetLine1 requerido')
  }

  if (!input.city || input.city.trim().length === 0) {
    throw new PersonLegalProfileValidationError('city requerido')
  }

  const countryCode = normalizeCountryCode(input.countryCode)

  const presentationText = formatAddressPresentationText({
    streetLine1: input.streetLine1,
    streetLine2: input.streetLine2 ?? null,
    city: input.city,
    region: input.region ?? null,
    postalCode: input.postalCode ?? null,
    countryCode
  })

  const presentationMask = formatAddressPresentationMask({
    streetLine1: input.streetLine1,
    city: input.city,
    region: input.region ?? null,
    countryCode
  })

  return withTransaction(async client => {
    const existing = await client.query<AddressRow>(
      `
        SELECT *
        FROM greenhouse_core.person_addresses
        WHERE profile_id = $1
          AND address_type = $2
          AND verification_status IN ('pending_review', 'verified')
        FOR UPDATE
      `,
      [input.profileId, input.addressType]
    )

    let addressId: string
    let createdNew = false

    if ((existing.rowCount ?? 0) > 0) {
      const row = existing.rows[0]!
      const sameContent = row.presentation_text === presentationText && row.country_code === countryCode

      if (sameContent) {
        addressId = row.address_id
        // metadata-only update
        await client.query(
          `
            UPDATE greenhouse_core.person_addresses
               SET notes = COALESCE($2, notes),
                   valid_from = COALESCE($3, valid_from),
                   valid_until = COALESCE($4, valid_until),
                   evidence_asset_id = COALESCE($5, evidence_asset_id),
                   source = $6
             WHERE address_id = $1
          `,
          [
            addressId,
            input.notes ?? null,
            input.validFrom ?? null,
            input.validUntil ?? null,
            input.evidenceAssetId ?? null,
            input.source
          ]
        )
      } else {
        await client.query(
          `
            UPDATE greenhouse_core.person_addresses
               SET verification_status = 'archived',
                   archived_at = NOW()
             WHERE address_id = $1
          `,
          [row.address_id]
        )

        await writePersonAddressAuditEntry(client, {
          addressId: row.address_id,
          profileId: input.profileId,
          action: 'archived',
          actorUserId: input.declaredByUserId ?? null,
          diff: { reason: 'superseded_by_new_declaration' }
        })

        addressId = buildAddressId()
        createdNew = true

        await client.query(
          `
            INSERT INTO greenhouse_core.person_addresses (
              address_id, profile_id, address_type, country_code,
              street_line_1, street_line_2, city, region, postal_code,
              presentation_text, presentation_mask,
              verification_status, source,
              valid_from, valid_until, evidence_asset_id,
              declared_by_user_id, declared_at, notes
            ) VALUES (
              $1, $2, $3, $4,
              $5, $6, $7, $8, $9,
              $10, $11,
              'pending_review', $12,
              $13, $14, $15,
              $16, NOW(), $17
            )
          `,
          [
            addressId,
            input.profileId,
            input.addressType,
            countryCode,
            input.streetLine1.trim(),
            input.streetLine2?.trim() ?? null,
            input.city.trim(),
            input.region?.trim() ?? null,
            input.postalCode?.trim() ?? null,
            presentationText,
            presentationMask,
            input.source,
            input.validFrom ?? null,
            input.validUntil ?? null,
            input.evidenceAssetId ?? null,
            input.declaredByUserId ?? null,
            input.notes ?? null
          ]
        )
      }
    } else {
      addressId = buildAddressId()
      createdNew = true

      await client.query(
        `
          INSERT INTO greenhouse_core.person_addresses (
            address_id, profile_id, address_type, country_code,
            street_line_1, street_line_2, city, region, postal_code,
            presentation_text, presentation_mask,
            verification_status, source,
            valid_from, valid_until, evidence_asset_id,
            declared_by_user_id, declared_at, notes
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8, $9,
            $10, $11,
            'pending_review', $12,
            $13, $14, $15,
            $16, NOW(), $17
          )
        `,
        [
          addressId,
          input.profileId,
          input.addressType,
          countryCode,
          input.streetLine1.trim(),
          input.streetLine2?.trim() ?? null,
          input.city.trim(),
          input.region?.trim() ?? null,
          input.postalCode?.trim() ?? null,
          presentationText,
          presentationMask,
          input.source,
          input.validFrom ?? null,
          input.validUntil ?? null,
          input.evidenceAssetId ?? null,
          input.declaredByUserId ?? null,
          input.notes ?? null
        ]
      )
    }

    const auditId = await writePersonAddressAuditEntry(client, {
      addressId,
      profileId: input.profileId,
      action: createdNew ? 'declared' : 'updated',
      actorUserId: input.declaredByUserId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      diff: { addressType: input.addressType, countryCode, source: input.source }
    })

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'person_address',
        aggregateId: addressId,
        eventType: createdNew
          ? 'person.address.declared'
          : 'person.address.updated',
        payload: {
          addressId,
          profileId: input.profileId,
          addressType: input.addressType,
          countryCode,
          source: input.source
        }
      },
      client
    )

    const finalRow = await client.query<AddressRow>(
      `SELECT * FROM greenhouse_core.person_addresses WHERE address_id = $1`,
      [addressId]
    )

    if (!finalRow.rows[0]) {
      throw new PersonLegalProfileError(
        'Address creada pero no encontrada en lectura subsecuente',
        'address_not_found',
        500
      )
    }

    return { address: mapAddressRowMasked(finalRow.rows[0]), auditId, eventId, created: createdNew }
  })
}

export interface VerifyPersonAddressInput {
  addressId: string
  verifiedByUserId: string
  actorEmail?: string | null
  notes?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

export const verifyPersonAddress = async (
  input: VerifyPersonAddressInput
): Promise<{ address: PersonAddressMasked; auditId: string; eventId: string }> => {
  return withTransaction(async client => {
    const update = await client.query<AddressRow>(
      `
        UPDATE greenhouse_core.person_addresses
           SET verification_status = 'verified',
               verified_by_user_id = $2,
               verified_at = NOW(),
               notes = COALESCE($3, notes),
               rejected_reason = NULL,
               rejected_at = NULL,
               rejected_by_user_id = NULL
         WHERE address_id = $1
           AND verification_status IN ('pending_review', 'rejected')
         RETURNING *
      `,
      [input.addressId, input.verifiedByUserId, input.notes ?? null]
    )

    if (!update.rows[0]) {
      throw new PersonLegalProfileError(
        `Address ${input.addressId} no esta en estado verificable`,
        'verification_status_invalid',
        409
      )
    }

    const auditId = await writePersonAddressAuditEntry(client, {
      addressId: input.addressId,
      profileId: update.rows[0].profile_id,
      action: 'verified',
      actorUserId: input.verifiedByUserId,
      actorEmail: input.actorEmail ?? null,
      diff: {}
    })

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'person_address',
        aggregateId: input.addressId,
        eventType: 'person.address.verified',
        payload: {
          addressId: input.addressId,
          profileId: update.rows[0].profile_id,
          verifiedByUserId: input.verifiedByUserId
        }
      },
      client
    )

    return { address: mapAddressRowMasked(update.rows[0]), auditId, eventId }
  })
}

export interface RejectPersonAddressInput {
  addressId: string
  rejectedByUserId: string
  rejectedReason: string
  actorEmail?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

export const rejectPersonAddress = async (
  input: RejectPersonAddressInput
): Promise<{ address: PersonAddressMasked; auditId: string; eventId: string }> => {
  if (!input.rejectedReason || input.rejectedReason.trim().length < 10) {
    throw new PersonLegalProfileValidationError(
      'rejectedReason debe tener al menos 10 caracteres',
      'rejection_reason_too_short'
    )
  }

  return withTransaction(async client => {
    const update = await client.query<AddressRow>(
      `
        UPDATE greenhouse_core.person_addresses
           SET verification_status = 'rejected',
               rejected_by_user_id = $2,
               rejected_reason = $3,
               rejected_at = NOW(),
               verified_by_user_id = NULL,
               verified_at = NULL
         WHERE address_id = $1
           AND verification_status IN ('pending_review', 'verified')
         RETURNING *
      `,
      [input.addressId, input.rejectedByUserId, input.rejectedReason.trim()]
    )

    if (!update.rows[0]) {
      throw new PersonLegalProfileError(
        `Address ${input.addressId} no esta en estado rechazable`,
        'verification_status_invalid',
        409
      )
    }

    const auditId = await writePersonAddressAuditEntry(client, {
      addressId: input.addressId,
      profileId: update.rows[0].profile_id,
      action: 'rejected',
      actorUserId: input.rejectedByUserId,
      actorEmail: input.actorEmail ?? null,
      reason: input.rejectedReason.trim(),
      diff: { rejectedReason: input.rejectedReason.trim() }
    })

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'person_address',
        aggregateId: input.addressId,
        eventType: 'person.address.rejected',
        payload: {
          addressId: input.addressId,
          profileId: update.rows[0].profile_id,
          rejectedByUserId: input.rejectedByUserId,
          rejectedReason: input.rejectedReason.trim()
        }
      },
      client
    )

    return { address: mapAddressRowMasked(update.rows[0]), auditId, eventId }
  })
}

// Internal exports for readers.ts
export const __internalMapDocumentRowMasked = mapDocumentRowMasked
export const __internalMapAddressRowMasked = mapAddressRowMasked
export type { DocumentRow as __DocumentRow, AddressRow as __AddressRow }
