import 'server-only'

import { randomUUID } from 'node:crypto'

import { query } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { attachAssetToAggregate, getAssetById } from '@/lib/storage/greenhouse-assets'

import type {
  MemberCertification,
  CreateCertificationInput,
  UpdateCertificationInput,
  CertificationVerificationStatus,
  CertificationVisibility
} from '@/types/certifications'

type CertificationRow = {
  certification_id: string
  member_id: string
  name: string
  issuer: string
  issued_date: string | Date | null
  expiry_date: string | Date | null
  validation_url: string | null
  asset_id: string | null
  asset_mime_type: string | null
  visibility: string
  verification_status: string
  verified_by: string | null
  verified_at: string | Date | null
  rejection_reason: string | null
  notes: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

class CertificationValidationError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'CertificationValidationError'
    this.statusCode = statusCode
  }
}

const toDateString = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const toTimestamp = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const isExpired = (expiryDate: string | Date | null): boolean => {
  if (!expiryDate) return false
  const d = expiryDate instanceof Date ? expiryDate : new Date(expiryDate)

  return d < new Date()
}

const mapRow = (row: CertificationRow): MemberCertification => ({
  certificationId: row.certification_id,
  memberId: row.member_id,
  name: row.name,
  issuer: row.issuer,
  issuedDate: toDateString(row.issued_date),
  expiryDate: toDateString(row.expiry_date),
  validationUrl: row.validation_url,
  assetId: row.asset_id,
  assetDownloadUrl: row.asset_id ? `/api/assets/private/${encodeURIComponent(row.asset_id)}` : null,
  assetMimeType: row.asset_mime_type ?? null,
  visibility: row.visibility === 'client_visible' ? 'client_visible' : 'internal',
  verificationStatus: (['self_declared', 'pending_review', 'verified', 'rejected'].includes(row.verification_status)
    ? row.verification_status
    : 'self_declared') as CertificationVerificationStatus,
  verifiedBy: row.verified_by,
  verifiedAt: toTimestamp(row.verified_at),
  rejectionReason: row.rejection_reason,
  notes: row.notes,
  isExpired: isExpired(row.expiry_date),
  createdAt: toTimestamp(row.created_at),
  updatedAt: toTimestamp(row.updated_at)
})

const assertNonEmpty = (value: unknown, field: string): string => {
  const s = typeof value === 'string' ? value.trim() : ''

  if (!s) throw new CertificationValidationError(`${field} es requerido.`)

  return s
}

const assertOptionalDate = (value: unknown, field: string): string | null => {
  if (value === null || value === undefined) return null
  const s = String(value).trim()

  if (!s) return null

  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new CertificationValidationError(`${field} debe ser formato YYYY-MM-DD.`)
  }

  return s
}

/* ─── Reads ─── */

export const getMemberCertifications = async (memberId: string): Promise<MemberCertification[]> => {
  const rows = await query<CertificationRow>(
    `
      SELECT
        c.certification_id,
        c.member_id,
        c.name,
        c.issuer,
        c.issued_date,
        c.expiry_date,
        c.validation_url,
        c.asset_id,
        a.mime_type AS asset_mime_type,
        c.visibility,
        c.verification_status,
        c.verified_by,
        c.verified_at,
        c.rejection_reason,
        c.notes,
        c.created_at,
        c.updated_at
      FROM greenhouse_core.member_certifications c
      LEFT JOIN greenhouse_core.assets a ON a.asset_id = c.asset_id AND a.status <> 'deleted'
      WHERE c.member_id = $1
      ORDER BY c.verification_status = 'verified' DESC, c.created_at DESC
    `,
    [memberId]
  )

  return rows.map(mapRow)
}

/* ─── Create ─── */

export const createMemberCertification = async ({
  memberId,
  input,
  actorUserId
}: {
  memberId: string
  input: CreateCertificationInput
  actorUserId: string
}): Promise<MemberCertification> => {
  const certId = `cert-${randomUUID()}`
  const name = assertNonEmpty(input.name, 'Nombre')
  const issuer = assertNonEmpty(input.issuer, 'Emisor')
  const issuedDate = assertOptionalDate(input.issuedDate, 'Fecha de emision')
  const expiryDate = assertOptionalDate(input.expiryDate, 'Fecha de vencimiento')
  const visibility: CertificationVisibility = input.visibility === 'client_visible' ? 'client_visible' : 'internal'
  const validationUrl = typeof input.validationUrl === 'string' ? input.validationUrl.trim() || null : null
  const notes = typeof input.notes === 'string' ? input.notes.trim() || null : null

  let assetId: string | null = null

  if (input.assetId) {
    const asset = await getAssetById(input.assetId)

    if (!asset) throw new CertificationValidationError('Archivo de evidencia no encontrado.', 404)

    if (asset.status === 'pending') {
      await attachAssetToAggregate({
        assetId: input.assetId,
        ownerAggregateType: 'certification',
        ownerAggregateId: certId,
        actorUserId,
        ownerMemberId: memberId
      })
    }

    assetId = input.assetId
  }

  const rows = await query<CertificationRow>(
    `
      INSERT INTO greenhouse_core.member_certifications (
        certification_id, member_id, name, issuer, issued_date, expiry_date,
        validation_url, asset_id, visibility, verification_status, notes,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'self_declared', $10,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *,
        NULL::text AS asset_mime_type
    `,
    [certId, memberId, name, issuer, issuedDate, expiryDate, validationUrl, assetId, visibility, notes]
  )

  await publishOutboxEvent({
    aggregateType: 'memberCertification',
    aggregateId: certId,
    eventType: 'memberCertificationCreated',
    payload: { certificationId: certId, memberId, name, actorUserId }
  })

  return mapRow(rows[0])
}

/* ─── Update ─── */

export const updateMemberCertification = async ({
  certificationId,
  memberId,
  input,
  actorUserId
}: {
  certificationId: string
  memberId: string
  input: UpdateCertificationInput
  actorUserId: string
}): Promise<MemberCertification> => {
  const updates: string[] = []
  const params: unknown[] = [certificationId, memberId]
  let idx = 3

  if (input.name !== undefined) {
    updates.push(`name = $${idx++}`)
    params.push(assertNonEmpty(input.name, 'Nombre'))
  }

  if (input.issuer !== undefined) {
    updates.push(`issuer = $${idx++}`)
    params.push(assertNonEmpty(input.issuer, 'Emisor'))
  }

  if (input.issuedDate !== undefined) {
    updates.push(`issued_date = $${idx++}`)
    params.push(assertOptionalDate(input.issuedDate, 'Fecha de emision'))
  }

  if (input.expiryDate !== undefined) {
    updates.push(`expiry_date = $${idx++}`)
    params.push(assertOptionalDate(input.expiryDate, 'Fecha de vencimiento'))
  }

  if (input.validationUrl !== undefined) {
    updates.push(`validation_url = $${idx++}`)
    params.push(typeof input.validationUrl === 'string' ? input.validationUrl.trim() || null : null)
  }

  if (input.visibility !== undefined) {
    updates.push(`visibility = $${idx++}`)
    params.push(input.visibility === 'client_visible' ? 'client_visible' : 'internal')
  }

  if (input.notes !== undefined) {
    updates.push(`notes = $${idx++}`)
    params.push(typeof input.notes === 'string' ? input.notes.trim() || null : null)
  }

  if (input.assetId !== undefined) {
    if (input.assetId) {
      const asset = await getAssetById(input.assetId)

      if (!asset) throw new CertificationValidationError('Archivo de evidencia no encontrado.', 404)

      if (asset.status === 'pending') {
        await attachAssetToAggregate({
          assetId: input.assetId,
          ownerAggregateType: 'certification',
          ownerAggregateId: certificationId,
          actorUserId,
          ownerMemberId: memberId
        })
      }
    }

    updates.push(`asset_id = $${idx++}`)
    params.push(input.assetId || null)
  }

  if (updates.length === 0) {
    throw new CertificationValidationError('No hay campos para actualizar.')
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')

  const rows = await query<CertificationRow>(
    `
      UPDATE greenhouse_core.member_certifications
      SET ${updates.join(', ')}
      WHERE certification_id = $1 AND member_id = $2
      RETURNING *,
        NULL::text AS asset_mime_type
    `,
    params
  )

  if (rows.length === 0) {
    throw new CertificationValidationError('Certificacion no encontrada.', 404)
  }

  await publishOutboxEvent({
    aggregateType: 'memberCertification',
    aggregateId: certificationId,
    eventType: 'memberCertificationUpdated',
    payload: { certificationId, memberId, actorUserId }
  })

  return mapRow(rows[0])
}

/* ─── Delete ─── */

export const deleteMemberCertification = async ({
  certificationId,
  memberId,
  actorUserId
}: {
  certificationId: string
  memberId: string
  actorUserId: string
}): Promise<void> => {
  const result = await query<{ certification_id: string }>(
    `DELETE FROM greenhouse_core.member_certifications WHERE certification_id = $1 AND member_id = $2 RETURNING certification_id`,
    [certificationId, memberId]
  )

  if (result.length === 0) {
    throw new CertificationValidationError('Certificacion no encontrada.', 404)
  }

  await publishOutboxEvent({
    aggregateType: 'memberCertification',
    aggregateId: certificationId,
    eventType: 'memberCertificationDeleted',
    payload: { certificationId, memberId, actorUserId }
  })
}

/* ─── Verification (admin only) ─── */

export const verifyCertification = async ({
  certificationId,
  memberId,
  actorUserId
}: {
  certificationId: string
  memberId: string
  actorUserId: string
}): Promise<MemberCertification> => {
  const rows = await query<CertificationRow>(
    `
      UPDATE greenhouse_core.member_certifications
      SET verification_status = 'verified',
          verified_by = $3,
          verified_at = CURRENT_TIMESTAMP,
          rejection_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE certification_id = $1 AND member_id = $2
      RETURNING *,
        NULL::text AS asset_mime_type
    `,
    [certificationId, memberId, actorUserId]
  )

  if (rows.length === 0) {
    throw new CertificationValidationError('Certificacion no encontrada.', 404)
  }

  await publishOutboxEvent({
    aggregateType: 'memberCertification',
    aggregateId: certificationId,
    eventType: 'memberCertificationVerified',
    payload: { certificationId, memberId, verifiedBy: actorUserId }
  })

  return mapRow(rows[0])
}

export const rejectCertification = async ({
  certificationId,
  memberId,
  actorUserId,
  reason
}: {
  certificationId: string
  memberId: string
  actorUserId: string
  reason?: string | null
}): Promise<MemberCertification> => {
  const rows = await query<CertificationRow>(
    `
      UPDATE greenhouse_core.member_certifications
      SET verification_status = 'rejected',
          verified_by = $3,
          verified_at = CURRENT_TIMESTAMP,
          rejection_reason = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE certification_id = $1 AND member_id = $2
      RETURNING *,
        NULL::text AS asset_mime_type
    `,
    [certificationId, memberId, actorUserId, reason ?? null]
  )

  if (rows.length === 0) {
    throw new CertificationValidationError('Certificacion no encontrada.', 404)
  }

  await publishOutboxEvent({
    aggregateType: 'memberCertification',
    aggregateId: certificationId,
    eventType: 'memberCertificationRejected',
    payload: { certificationId, memberId, rejectedBy: actorUserId, reason }
  })

  return mapRow(rows[0])
}

export { CertificationValidationError }
