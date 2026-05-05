import 'server-only'

import { query } from '@/lib/db'

import {
  __internalMapAddressRowMasked,
  __internalMapDocumentRowMasked,
  type __AddressRow,
  type __DocumentRow
} from './store'
import type {
  AddressType,
  PersonAddressMasked,
  PersonDocumentType,
  PersonIdentityDocumentMasked
} from './types'

/**
 * TASK-784 — Readers canonicos.
 *
 * Modos:
 *   - listIdentityDocumentsForProfileMasked / listAddressesForProfileMasked:
 *     default. NO incluye value_full / street_line_1.
 *   - getActiveIdentityDocumentMasked / getActiveAddressMasked:
 *     unica fila activa por (profile, type[, country]).
 *   - listIdentityDocumentsForHrReview / listAddressesForHrReview:
 *     mismo shape masked + extra metadata para revision (ya cubierto por
 *     PersonIdentityDocumentMasked existente).
 *   - readDocumentSnapshotForUseCase / readAddressSnapshotForUseCase:
 *     server-only, devuelve value_full + presentation_text. SOLO para
 *     document generators (final_settlement, payroll_receipt, etc.).
 *     Logea action='export_snapshot' en audit log.
 *
 * NUNCA exportar mappers que devuelvan value_full sin auditar.
 */

const SELECT_DOCUMENT_COLUMNS = `
  document_id, profile_id, country_code, document_type, issuing_country,
  display_mask, verification_status, source,
  valid_from, valid_until, evidence_asset_id,
  declared_by_user_id, declared_at,
  verified_by_user_id, verified_at,
  rejected_reason, rejected_at, rejected_by_user_id,
  archived_at, notes, created_at, updated_at
`

const SELECT_ADDRESS_COLUMNS = `
  address_id, profile_id, address_type, country_code,
  street_line_1, street_line_2, city, region, postal_code,
  presentation_text, presentation_mask,
  verification_status, source,
  valid_from, valid_until, evidence_asset_id,
  declared_by_user_id, declared_at,
  verified_by_user_id, verified_at,
  rejected_reason, rejected_at, rejected_by_user_id,
  archived_at, notes, created_at, updated_at
`

// ──────────────────────────────────────────────────────────────────────────────
// Document readers
// ──────────────────────────────────────────────────────────────────────────────

export const listIdentityDocumentsForProfileMasked = async (
  profileId: string,
  options: { includeArchived?: boolean } = {}
): Promise<PersonIdentityDocumentMasked[]> => {
  const includeArchived = Boolean(options.includeArchived)

  const rows = await query<__DocumentRow>(
    `
      SELECT ${SELECT_DOCUMENT_COLUMNS}
      FROM greenhouse_core.person_identity_documents
      WHERE profile_id = $1
        ${includeArchived ? '' : "AND verification_status NOT IN ('archived', 'expired')"}
      ORDER BY declared_at DESC
    `,
    [profileId]
  )

  return rows.map(row => __internalMapDocumentRowMasked(row))
}

export const getActiveIdentityDocumentMasked = async (
  profileId: string,
  documentType: PersonDocumentType,
  countryCode: string
): Promise<PersonIdentityDocumentMasked | null> => {
  const rows = await query<__DocumentRow>(
    `
      SELECT ${SELECT_DOCUMENT_COLUMNS}
      FROM greenhouse_core.person_identity_documents
      WHERE profile_id = $1
        AND document_type = $2
        AND country_code = $3
        AND verification_status IN ('pending_review', 'verified')
      ORDER BY verification_status = 'verified' DESC, declared_at DESC
      LIMIT 1
    `,
    [profileId, documentType, countryCode.toUpperCase()]
  )

  return rows[0] ? __internalMapDocumentRowMasked(rows[0]) : null
}

/**
 * Resolve verified active CL_RUT for a profile (helper canonico para Slice 5).
 */
export const getVerifiedClRutForProfile = async (
  profileId: string
): Promise<PersonIdentityDocumentMasked | null> => {
  const rows = await query<__DocumentRow>(
    `
      SELECT ${SELECT_DOCUMENT_COLUMNS}
      FROM greenhouse_core.person_identity_documents
      WHERE profile_id = $1
        AND document_type = 'CL_RUT'
        AND country_code = 'CL'
        AND verification_status = 'verified'
      ORDER BY verified_at DESC NULLS LAST
      LIMIT 1
    `,
    [profileId]
  )

  return rows[0] ? __internalMapDocumentRowMasked(rows[0]) : null
}

// ──────────────────────────────────────────────────────────────────────────────
// Address readers
// ──────────────────────────────────────────────────────────────────────────────

export const listAddressesForProfileMasked = async (
  profileId: string,
  options: { includeArchived?: boolean } = {}
): Promise<PersonAddressMasked[]> => {
  const includeArchived = Boolean(options.includeArchived)

  const rows = await query<__AddressRow>(
    `
      SELECT ${SELECT_ADDRESS_COLUMNS}
      FROM greenhouse_core.person_addresses
      WHERE profile_id = $1
        ${includeArchived ? '' : "AND verification_status NOT IN ('archived', 'expired')"}
      ORDER BY declared_at DESC
    `,
    [profileId]
  )

  return rows.map(row => __internalMapAddressRowMasked(row))
}

export const getActiveAddressMasked = async (
  profileId: string,
  addressType: AddressType
): Promise<PersonAddressMasked | null> => {
  const rows = await query<__AddressRow>(
    `
      SELECT ${SELECT_ADDRESS_COLUMNS}
      FROM greenhouse_core.person_addresses
      WHERE profile_id = $1
        AND address_type = $2
        AND verification_status IN ('pending_review', 'verified')
      ORDER BY verification_status = 'verified' DESC, declared_at DESC
      LIMIT 1
    `,
    [profileId, addressType]
  )

  return rows[0] ? __internalMapAddressRowMasked(rows[0]) : null
}

// ──────────────────────────────────────────────────────────────────────────────
// Audit log readers (masked, append-only)
// ──────────────────────────────────────────────────────────────────────────────

interface AuditLogRow {
  audit_id: string
  document_id?: string | null
  address_id?: string | null
  profile_id: string
  action: string
  actor_user_id: string | null
  actor_email: string | null
  reason: string | null
  ip_address: string | null
  user_agent: string | null
  diff_json: unknown
  created_at: Date
  [key: string]: unknown
}

export interface PersonLegalAuditLogEntry {
  auditId: string
  targetId: string
  targetKind: 'document' | 'address'
  profileId: string
  action: string
  actorUserId: string | null
  actorEmail: string | null
  reason: string | null
  ipAddress: string | null
  userAgent: string | null
  diffJson: Record<string, unknown>
  createdAt: string
}

export const listIdentityDocumentAuditLog = async (
  documentId: string,
  options: { limit?: number } = {}
): Promise<PersonLegalAuditLogEntry[]> => {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500)

  const rows = await query<AuditLogRow>(
    `
      SELECT audit_id, document_id, profile_id, action, actor_user_id,
             actor_email, reason, ip_address, user_agent, diff_json, created_at
      FROM greenhouse_core.person_identity_document_audit_log
      WHERE document_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [documentId, limit]
  )

  return rows.map(r => ({
    auditId: r.audit_id,
    targetId: r.document_id!,
    targetKind: 'document' as const,
    profileId: r.profile_id,
    action: r.action,
    actorUserId: r.actor_user_id,
    actorEmail: r.actor_email,
    reason: r.reason,
    ipAddress: r.ip_address,
    userAgent: r.user_agent,
    diffJson: (r.diff_json && typeof r.diff_json === 'object'
      ? (r.diff_json as Record<string, unknown>)
      : {}),
    createdAt: r.created_at.toISOString()
  }))
}

export const listAddressAuditLog = async (
  addressId: string,
  options: { limit?: number } = {}
): Promise<PersonLegalAuditLogEntry[]> => {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500)

  const rows = await query<AuditLogRow>(
    `
      SELECT audit_id, address_id, profile_id, action, actor_user_id,
             actor_email, reason, ip_address, user_agent, diff_json, created_at
      FROM greenhouse_core.person_address_audit_log
      WHERE address_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [addressId, limit]
  )

  return rows.map(r => ({
    auditId: r.audit_id,
    targetId: r.address_id!,
    targetKind: 'address' as const,
    profileId: r.profile_id,
    action: r.action,
    actorUserId: r.actor_user_id,
    actorEmail: r.actor_email,
    reason: r.reason,
    ipAddress: r.ip_address,
    userAgent: r.user_agent,
    diffJson: (r.diff_json && typeof r.diff_json === 'object'
      ? (r.diff_json as Record<string, unknown>)
      : {}),
    createdAt: r.created_at.toISOString()
  }))
}
