import 'server-only'

import { randomUUID } from 'node:crypto'

import { query } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type {
  MemberEndorsement,
  CreateEndorsementInput,
  EndorsementStatus,
  EvidenceVisibility
} from '@/types/reputation'

/* ─── Row type (matches PG columns + JOINed names) ─── */

type EndorsementRow = {
  endorsement_id: string
  member_id: string
  endorsed_by_member_id: string
  endorsed_by_display_name: string
  endorsed_by_avatar_url: string | null
  skill_code: string | null
  skill_name: string | null
  tool_code: string | null
  tool_name: string | null
  comment: string | null
  visibility: string
  status: string
  created_at: string | Date | null
}

/* ─── Error class ─── */

export class EndorsementValidationError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'EndorsementValidationError'
    this.statusCode = statusCode
  }
}

/* ─── Helpers ─── */

const toTimestamp = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const VALID_VISIBILITY: readonly string[] = ['internal', 'client_visible']
const VALID_STATUSES: readonly string[] = ['active', 'moderated', 'removed']

const safeVisibility = (value: unknown): EvidenceVisibility => {
  const s = typeof value === 'string' ? value.trim() : ''

  return VALID_VISIBILITY.includes(s) ? (s as EvidenceVisibility) : 'internal'
}

const safeStatus = (value: unknown): EndorsementStatus => {
  const s = typeof value === 'string' ? value.trim() : ''

  return VALID_STATUSES.includes(s) ? (s as EndorsementStatus) : 'active'
}

/* ─── Row → response mapper ─── */

const mapRow = (row: EndorsementRow): MemberEndorsement => ({
  endorsementId: row.endorsement_id,
  memberId: row.member_id,
  endorsedByMemberId: row.endorsed_by_member_id,
  endorsedByDisplayName: row.endorsed_by_display_name,
  endorsedByAvatarUrl: row.endorsed_by_avatar_url,
  skillCode: row.skill_code,
  skillName: row.skill_name,
  toolCode: row.tool_code,
  toolName: row.tool_name,
  comment: row.comment,
  visibility: safeVisibility(row.visibility),
  status: safeStatus(row.status),
  createdAt: toTimestamp(row.created_at)
})

/* ─── Reads ─── */

export const getMemberEndorsements = async (memberId: string): Promise<MemberEndorsement[]> => {
  const rows = await query<EndorsementRow>(
    `
      SELECT
        e.endorsement_id,
        e.member_id,
        e.endorsed_by_member_id,
        m.display_name   AS endorsed_by_display_name,
        m.avatar_url     AS endorsed_by_avatar_url,
        e.skill_code,
        sc.skill_name,
        e.tool_code,
        tc.tool_name,
        e.comment,
        e.visibility,
        e.status,
        e.created_at
      FROM greenhouse_core.member_endorsements e
      INNER JOIN greenhouse_core.members m ON m.member_id = e.endorsed_by_member_id
      LEFT JOIN greenhouse_core.skill_catalog sc ON sc.skill_code = e.skill_code
      LEFT JOIN greenhouse_core.tool_catalog  tc ON tc.tool_code  = e.tool_code
      WHERE e.member_id = $1
        AND e.status <> 'removed'
      ORDER BY e.created_at DESC
    `,
    [memberId]
  )

  return rows.map(mapRow)
}

/* ─── Create ─── */

export const createEndorsement = async ({
  memberId,
  endorsedByMemberId,
  input
}: {
  memberId: string
  endorsedByMemberId: string
  input: CreateEndorsementInput
}): Promise<MemberEndorsement> => {
  if (memberId === endorsedByMemberId) {
    throw new EndorsementValidationError('No puedes endorsar tu propio perfil.')
  }

  const skillCode = typeof input.skillCode === 'string' ? input.skillCode.trim() || null : null
  const toolCode = typeof input.toolCode === 'string' ? input.toolCode.trim() || null : null

  if (!skillCode && !toolCode) {
    throw new EndorsementValidationError('Debes indicar al menos un skill o tool.')
  }

  const comment = typeof input.comment === 'string' ? input.comment.trim() || null : null
  const visibility = safeVisibility(input.visibility)
  const endorsementId = `end-${randomUUID()}`

  await query(
    `
      INSERT INTO greenhouse_core.member_endorsements (
        endorsement_id, member_id, endorsed_by_member_id,
        skill_code, tool_code, comment, visibility, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', CURRENT_TIMESTAMP)
    `,
    [endorsementId, memberId, endorsedByMemberId, skillCode, toolCode, comment, visibility]
  )

  await publishOutboxEvent({
    aggregateType: 'memberEndorsement',
    aggregateId: endorsementId,
    eventType: 'memberEndorsementCreated',
    payload: { endorsementId, memberId, endorsedByMemberId, skillCode, toolCode }
  })

  // Fetch the full row with JOINs to return the complete response
  const rows = await query<EndorsementRow>(
    `
      SELECT
        e.endorsement_id,
        e.member_id,
        e.endorsed_by_member_id,
        m.display_name   AS endorsed_by_display_name,
        m.avatar_url     AS endorsed_by_avatar_url,
        e.skill_code,
        sc.skill_name,
        e.tool_code,
        tc.tool_name,
        e.comment,
        e.visibility,
        e.status,
        e.created_at
      FROM greenhouse_core.member_endorsements e
      INNER JOIN greenhouse_core.members m ON m.member_id = e.endorsed_by_member_id
      LEFT JOIN greenhouse_core.skill_catalog sc ON sc.skill_code = e.skill_code
      LEFT JOIN greenhouse_core.tool_catalog  tc ON tc.tool_code  = e.tool_code
      WHERE e.endorsement_id = $1
    `,
    [endorsementId]
  )

  if (rows.length === 0) {
    throw new EndorsementValidationError('Error al crear endorsement.', 500)
  }

  return mapRow(rows[0])
}

/* ─── Moderate ─── */

export const moderateEndorsement = async ({
  endorsementId,
  status,
  actorUserId
}: {
  endorsementId: string
  status: 'moderated' | 'removed'
  actorUserId: string
}): Promise<MemberEndorsement> => {
  if (status !== 'moderated' && status !== 'removed') {
    throw new EndorsementValidationError('Estado de moderacion invalido. Debe ser "moderated" o "removed".')
  }

  const rows = await query<EndorsementRow>(
    `
      UPDATE greenhouse_core.member_endorsements
      SET status = $2
      WHERE endorsement_id = $1
      RETURNING
        endorsement_id,
        member_id,
        endorsed_by_member_id,
        NULL::text AS endorsed_by_display_name,
        NULL::text AS endorsed_by_avatar_url,
        skill_code,
        NULL::text AS skill_name,
        tool_code,
        NULL::text AS tool_name,
        comment,
        visibility,
        status,
        created_at
    `,
    [endorsementId, status]
  )

  if (rows.length === 0) {
    throw new EndorsementValidationError('Endorsement no encontrado.', 404)
  }

  await publishOutboxEvent({
    aggregateType: 'memberEndorsement',
    aggregateId: endorsementId,
    eventType: 'memberEndorsementModerated',
    payload: { endorsementId, memberId: rows[0].member_id, status, actorUserId }
  })

  return mapRow(rows[0])
}
