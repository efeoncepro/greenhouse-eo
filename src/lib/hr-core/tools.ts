import 'server-only'

import { query } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type {
  ToolCatalogItem,
  ToolCategory,
  MemberTool,
  ToolProficiencyLevel,
  ToolVisibility
} from '@/types/talent-taxonomy'

type CatalogRow = {
  tool_code: string
  tool_name: string
  tool_category: string
  icon_key: string | null
  description: string | null
  active: boolean
  display_order: number
}

type MemberToolRow = {
  member_id: string
  tool_code: string
  tool_name: string
  tool_category: string
  icon_key: string | null
  proficiency_level: string
  visibility: string
  notes: string | null
  verified_by: string | null
  verified_at: string | Date | null
}

class ToolValidationError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'ToolValidationError'
    this.statusCode = statusCode
  }
}

const toTimestamp = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const mapCatalogRow = (row: CatalogRow): ToolCatalogItem => ({
  toolCode: row.tool_code,
  toolName: row.tool_name,
  toolCategory: row.tool_category as ToolCategory,
  iconKey: row.icon_key,
  description: row.description,
  active: row.active,
  displayOrder: row.display_order
})

const mapMemberToolRow = (row: MemberToolRow): MemberTool => ({
  memberId: row.member_id,
  toolCode: row.tool_code,
  toolName: row.tool_name,
  toolCategory: row.tool_category as ToolCategory,
  iconKey: row.icon_key,
  proficiencyLevel: (['beginner', 'intermediate', 'advanced', 'expert'].includes(row.proficiency_level)
    ? row.proficiency_level
    : 'intermediate') as ToolProficiencyLevel,
  visibility: row.visibility === 'client_visible' ? 'client_visible' : 'internal',
  notes: row.notes,
  verifiedBy: row.verified_by,
  verifiedAt: toTimestamp(row.verified_at)
})

/* ─── Catalog ─── */

export const listToolCatalog = async (options?: {
  category?: ToolCategory
  activeOnly?: boolean
}): Promise<ToolCatalogItem[]> => {
  const conditions = ['TRUE']
  const params: unknown[] = []
  let idx = 1

  if (options?.activeOnly !== false) {
    conditions.push(`active = TRUE`)
  }

  if (options?.category) {
    conditions.push(`tool_category = $${idx++}`)
    params.push(options.category)
  }

  const rows = await query<CatalogRow>(
    `
      SELECT tool_code, tool_name, tool_category, icon_key, description, active, display_order
      FROM greenhouse_core.tool_catalog
      WHERE ${conditions.join(' AND ')}
      ORDER BY display_order ASC, tool_name ASC
    `,
    params
  )

  return rows.map(mapCatalogRow)
}

/* ─── Member Tools ─── */

export const getMemberTools = async (memberId: string): Promise<MemberTool[]> => {
  const rows = await query<MemberToolRow>(
    `
      SELECT
        mt.member_id,
        mt.tool_code,
        tc.tool_name,
        tc.tool_category,
        tc.icon_key,
        mt.proficiency_level,
        mt.visibility,
        mt.notes,
        mt.verified_by,
        mt.verified_at
      FROM greenhouse_core.member_tools mt
      INNER JOIN greenhouse_core.tool_catalog tc ON tc.tool_code = mt.tool_code
      WHERE mt.member_id = $1
      ORDER BY tc.display_order ASC, tc.tool_name ASC
    `,
    [memberId]
  )

  return rows.map(mapMemberToolRow)
}

export const upsertMemberTool = async ({
  memberId,
  input,
  actorUserId
}: {
  memberId: string
  input: { toolCode: string; proficiencyLevel?: string; visibility?: string; notes?: string | null }
  actorUserId?: string | null
}): Promise<MemberTool[]> => {
  const toolCode = String(input.toolCode || '').trim().toLowerCase()

  if (!toolCode) throw new ToolValidationError('toolCode es requerido.')

  const existing = await query<{ tool_code: string }>(
    `SELECT tool_code FROM greenhouse_core.tool_catalog WHERE tool_code = $1`,
    [toolCode]
  )

  if (existing.length === 0) throw new ToolValidationError(`Herramienta '${toolCode}' no encontrada en el catálogo.`, 404)

  const proficiency: ToolProficiencyLevel = (['beginner', 'intermediate', 'advanced', 'expert'] as const)
    .includes(input.proficiencyLevel as ToolProficiencyLevel)
    ? (input.proficiencyLevel as ToolProficiencyLevel)
    : 'intermediate'

  const visibility: ToolVisibility = input.visibility === 'client_visible' ? 'client_visible' : 'internal'

  await query(
    `
      INSERT INTO greenhouse_core.member_tools (
        member_id, tool_code, proficiency_level, visibility, notes,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (member_id, tool_code) DO UPDATE SET
        proficiency_level = EXCLUDED.proficiency_level,
        visibility = EXCLUDED.visibility,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
    `,
    [memberId, toolCode, proficiency, visibility, input.notes ?? null]
  )

  await publishOutboxEvent({
    aggregateType: 'memberTool',
    aggregateId: `${memberId}:${toolCode}`,
    eventType: 'memberToolUpserted',
    payload: { memberId, toolCode, proficiencyLevel: proficiency, visibility, actorUserId }
  })

  return getMemberTools(memberId)
}

export const removeMemberTool = async ({
  memberId,
  toolCode,
  actorUserId
}: {
  memberId: string
  toolCode: string
  actorUserId?: string | null
}): Promise<MemberTool[]> => {
  const normalized = String(toolCode || '').trim().toLowerCase()

  await query(
    `DELETE FROM greenhouse_core.member_tools WHERE member_id = $1 AND tool_code = $2`,
    [memberId, normalized]
  )

  await publishOutboxEvent({
    aggregateType: 'memberTool',
    aggregateId: `${memberId}:${normalized}`,
    eventType: 'memberToolDeleted',
    payload: { memberId, toolCode: normalized, actorUserId }
  })

  return getMemberTools(memberId)
}

export { ToolValidationError }
