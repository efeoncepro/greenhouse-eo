import 'server-only'

import { randomUUID } from 'node:crypto'

import { query } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { attachAssetToAggregate, getAssetById } from '@/lib/storage/greenhouse-assets'

import type {
  MemberEvidence,
  CreateEvidenceInput,
  UpdateEvidenceInput,
  EvidenceType,
  EvidenceVisibility
} from '@/types/reputation'

/* ─── Row type (matches PG columns + JOINed names) ─── */

type EvidenceRow = {
  evidence_id: string
  member_id: string
  title: string
  description: string | null
  evidence_type: string
  related_skill_code: string | null
  related_skill_name: string | null
  related_tool_code: string | null
  related_tool_name: string | null
  asset_id: string | null
  external_url: string | null
  visibility: string
  created_at: string | Date | null
  updated_at: string | Date | null
}

/* ─── Error class ─── */

export class EvidenceValidationError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'EvidenceValidationError'
    this.statusCode = statusCode
  }
}

/* ─── Helpers ─── */

const toTimestamp = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const assertNonEmpty = (value: unknown, field: string): string => {
  const s = typeof value === 'string' ? value.trim() : ''

  if (!s) throw new EvidenceValidationError(`${field} es requerido.`)

  return s
}

const VALID_EVIDENCE_TYPES: readonly string[] = [
  'project_highlight',
  'work_sample',
  'case_study',
  'publication',
  'award',
  'other'
]

const VALID_VISIBILITY: readonly string[] = ['internal', 'client_visible']

const safeEvidenceType = (value: unknown): EvidenceType => {
  const s = typeof value === 'string' ? value.trim() : ''

  return VALID_EVIDENCE_TYPES.includes(s) ? (s as EvidenceType) : 'project_highlight'
}

const safeVisibility = (value: unknown): EvidenceVisibility => {
  const s = typeof value === 'string' ? value.trim() : ''

  return VALID_VISIBILITY.includes(s) ? (s as EvidenceVisibility) : 'internal'
}

/* ─── Row → response mapper ─── */

const mapRow = (row: EvidenceRow): MemberEvidence => ({
  evidenceId: row.evidence_id,
  memberId: row.member_id,
  title: row.title,
  description: row.description,
  evidenceType: safeEvidenceType(row.evidence_type),
  relatedSkillCode: row.related_skill_code,
  relatedSkillName: row.related_skill_name,
  relatedToolCode: row.related_tool_code,
  relatedToolName: row.related_tool_name,
  assetId: row.asset_id,
  assetDownloadUrl: row.asset_id ? `/api/assets/private/${encodeURIComponent(row.asset_id)}` : null,
  externalUrl: row.external_url,
  visibility: safeVisibility(row.visibility),
  createdAt: toTimestamp(row.created_at),
  updatedAt: toTimestamp(row.updated_at)
})

/* ─── Reads ─── */

export const getMemberEvidence = async (memberId: string): Promise<MemberEvidence[]> => {
  const rows = await query<EvidenceRow>(
    `
      SELECT
        e.evidence_id,
        e.member_id,
        e.title,
        e.description,
        e.evidence_type,
        e.related_skill_code,
        sc.skill_name  AS related_skill_name,
        e.related_tool_code,
        tc.tool_name   AS related_tool_name,
        e.asset_id,
        e.external_url,
        e.visibility,
        e.created_at,
        e.updated_at
      FROM greenhouse_core.member_evidence e
      LEFT JOIN greenhouse_core.skill_catalog sc ON sc.skill_code = e.related_skill_code
      LEFT JOIN greenhouse_core.tool_catalog  tc ON tc.tool_code  = e.related_tool_code
      WHERE e.member_id = $1
      ORDER BY e.created_at DESC
    `,
    [memberId]
  )

  return rows.map(mapRow)
}

/* ─── Create ─── */

export const createMemberEvidence = async ({
  memberId,
  input,
  actorUserId
}: {
  memberId: string
  input: CreateEvidenceInput
  actorUserId: string
}): Promise<MemberEvidence> => {
  const evidenceId = `evd-${randomUUID()}`
  const title = assertNonEmpty(input.title, 'Titulo')
  const description = typeof input.description === 'string' ? input.description.trim() || null : null
  const evidenceType = safeEvidenceType(input.evidenceType)
  const visibility = safeVisibility(input.visibility)
  const relatedSkillCode = typeof input.relatedSkillCode === 'string' ? input.relatedSkillCode.trim() || null : null
  const relatedToolCode = typeof input.relatedToolCode === 'string' ? input.relatedToolCode.trim() || null : null
  const externalUrl = typeof input.externalUrl === 'string' ? input.externalUrl.trim() || null : null

  let assetId: string | null = null

  if (input.assetId) {
    const asset = await getAssetById(input.assetId)

    if (!asset) throw new EvidenceValidationError('Archivo de evidencia no encontrado.', 404)

    if (asset.status === 'pending') {
      await attachAssetToAggregate({
        assetId: input.assetId,
        ownerAggregateType: 'evidence',
        ownerAggregateId: evidenceId,
        actorUserId,
        ownerMemberId: memberId
      })
    }

    assetId = input.assetId
  }

  const rows = await query<EvidenceRow>(
    `
      INSERT INTO greenhouse_core.member_evidence (
        evidence_id, member_id, title, description, evidence_type,
        related_skill_code, related_tool_code, asset_id, external_url,
        visibility, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *,
        NULL::text AS related_skill_name,
        NULL::text AS related_tool_name
    `,
    [
      evidenceId, memberId, title, description, evidenceType,
      relatedSkillCode, relatedToolCode, assetId, externalUrl, visibility
    ]
  )

  await publishOutboxEvent({
    aggregateType: 'memberEvidence',
    aggregateId: evidenceId,
    eventType: 'memberEvidenceCreated',
    payload: { evidenceId, memberId, title, actorUserId }
  })

  return mapRow(rows[0])
}

/* ─── Update ─── */

export const updateMemberEvidence = async ({
  evidenceId,
  memberId,
  input,
  actorUserId
}: {
  evidenceId: string
  memberId: string
  input: UpdateEvidenceInput
  actorUserId: string
}): Promise<MemberEvidence> => {
  const updates: string[] = []
  const params: unknown[] = [evidenceId, memberId]
  let idx = 3

  if (input.title !== undefined) {
    updates.push(`title = $${idx++}`)
    params.push(assertNonEmpty(input.title, 'Titulo'))
  }

  if (input.description !== undefined) {
    updates.push(`description = $${idx++}`)
    params.push(typeof input.description === 'string' ? input.description.trim() || null : null)
  }

  if (input.evidenceType !== undefined) {
    updates.push(`evidence_type = $${idx++}`)
    params.push(safeEvidenceType(input.evidenceType))
  }

  if (input.relatedSkillCode !== undefined) {
    updates.push(`related_skill_code = $${idx++}`)
    params.push(typeof input.relatedSkillCode === 'string' ? input.relatedSkillCode.trim() || null : null)
  }

  if (input.relatedToolCode !== undefined) {
    updates.push(`related_tool_code = $${idx++}`)
    params.push(typeof input.relatedToolCode === 'string' ? input.relatedToolCode.trim() || null : null)
  }

  if (input.externalUrl !== undefined) {
    updates.push(`external_url = $${idx++}`)
    params.push(typeof input.externalUrl === 'string' ? input.externalUrl.trim() || null : null)
  }

  if (input.visibility !== undefined) {
    updates.push(`visibility = $${idx++}`)
    params.push(safeVisibility(input.visibility))
  }

  if (input.assetId !== undefined) {
    if (input.assetId) {
      const asset = await getAssetById(input.assetId)

      if (!asset) throw new EvidenceValidationError('Archivo de evidencia no encontrado.', 404)

      if (asset.status === 'pending') {
        await attachAssetToAggregate({
          assetId: input.assetId,
          ownerAggregateType: 'evidence',
          ownerAggregateId: evidenceId,
          actorUserId,
          ownerMemberId: memberId
        })
      }
    }

    updates.push(`asset_id = $${idx++}`)
    params.push(input.assetId || null)
  }

  if (updates.length === 0) {
    throw new EvidenceValidationError('No hay campos para actualizar.')
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')

  const rows = await query<EvidenceRow>(
    `
      UPDATE greenhouse_core.member_evidence
      SET ${updates.join(', ')}
      WHERE evidence_id = $1 AND member_id = $2
      RETURNING *,
        NULL::text AS related_skill_name,
        NULL::text AS related_tool_name
    `,
    params
  )

  if (rows.length === 0) {
    throw new EvidenceValidationError('Evidencia no encontrada.', 404)
  }

  await publishOutboxEvent({
    aggregateType: 'memberEvidence',
    aggregateId: evidenceId,
    eventType: 'memberEvidenceUpdated',
    payload: { evidenceId, memberId, actorUserId }
  })

  return mapRow(rows[0])
}

/* ─── Delete ─── */

export const deleteMemberEvidence = async ({
  evidenceId,
  memberId,
  actorUserId
}: {
  evidenceId: string
  memberId: string
  actorUserId: string
}): Promise<void> => {
  const result = await query<{ evidence_id: string }>(
    `DELETE FROM greenhouse_core.member_evidence WHERE evidence_id = $1 AND member_id = $2 RETURNING evidence_id`,
    [evidenceId, memberId]
  )

  if (result.length === 0) {
    throw new EvidenceValidationError('Evidencia no encontrada.', 404)
  }

  await publishOutboxEvent({
    aggregateType: 'memberEvidence',
    aggregateId: evidenceId,
    eventType: 'memberEvidenceDeleted',
    payload: { evidenceId, memberId, actorUserId }
  })
}
