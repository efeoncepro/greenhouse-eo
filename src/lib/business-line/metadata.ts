import 'server-only'

import { query } from '@/lib/db'
import type { BusinessLineMetadata, BusinessLineMetadataSummary } from '@/types/business-line'

// ── Row shape from PG ───────────────────────────────────────────────

type MetadataRow = {
  module_code: string
  label: string
  label_full: string | null
  claim: string | null
  loop_phase: string | null
  loop_phase_label: string | null
  lead_identity_profile_id: string | null
  lead_name: string | null
  color_hex: string
  color_bg: string | null
  icon_name: string | null
  hubspot_enum_value: string
  notion_label: string | null
  is_active: boolean
  sort_order: number
  description: string | null
}

const toBusinessLineMetadata = (row: MetadataRow): BusinessLineMetadata => ({
  moduleCode: row.module_code,
  label: row.label,
  labelFull: row.label_full,
  claim: row.claim,
  loopPhase: row.loop_phase,
  loopPhaseLabel: row.loop_phase_label,
  leadIdentityProfileId: row.lead_identity_profile_id,
  leadName: row.lead_name,
  colorHex: row.color_hex,
  colorBg: row.color_bg,
  iconName: row.icon_name,
  hubspotEnumValue: row.hubspot_enum_value,
  notionLabel: row.notion_label,
  isActive: row.is_active,
  sortOrder: row.sort_order,
  description: row.description
})

// ── Queries ─────────────────────────────────────────────────────────

/** Load all active business line metadata, ordered by sort_order. */
export const loadBusinessLineMetadata = async (): Promise<BusinessLineMetadata[]> => {
  const rows = await query<MetadataRow>(
    `SELECT * FROM greenhouse_core.business_line_metadata
     WHERE is_active = TRUE
     ORDER BY sort_order`
  )

  return rows.map(toBusinessLineMetadata)
}

/** Load a single business line's metadata by module_code. */
export const loadBusinessLineMetadataByCode = async (moduleCode: string): Promise<BusinessLineMetadata | null> => {
  const rows = await query<MetadataRow>(
    `SELECT * FROM greenhouse_core.business_line_metadata WHERE module_code = $1`,
    [moduleCode]
  )

  return rows[0] ? toBusinessLineMetadata(rows[0]) : null
}

/** Update editable fields of a business line's metadata. */
export const updateBusinessLineMetadata = async (
  moduleCode: string,
  patch: Partial<Pick<BusinessLineMetadata, 'label' | 'labelFull' | 'claim' | 'leadIdentityProfileId' | 'leadName' | 'description' | 'iconName' | 'colorHex' | 'colorBg' | 'isActive' | 'sortOrder'>>
): Promise<BusinessLineMetadata | null> => {
  const setClauses: string[] = []
  const params: unknown[] = []
  let idx = 1

  const fieldMap: Record<string, string> = {
    label: 'label',
    labelFull: 'label_full',
    claim: 'claim',
    leadIdentityProfileId: 'lead_identity_profile_id',
    leadName: 'lead_name',
    description: 'description',
    iconName: 'icon_name',
    colorHex: 'color_hex',
    colorBg: 'color_bg',
    isActive: 'is_active',
    sortOrder: 'sort_order'
  }

  for (const [key, column] of Object.entries(fieldMap)) {
    if (key in patch) {
      setClauses.push(`${column} = $${idx}`)
      params.push(patch[key as keyof typeof patch])
      idx++
    }
  }

  if (setClauses.length === 0) return loadBusinessLineMetadataByCode(moduleCode)

  setClauses.push(`updated_at = NOW()`)
  params.push(moduleCode)

  const rows = await query<MetadataRow>(
    `UPDATE greenhouse_core.business_line_metadata
     SET ${setClauses.join(', ')}
     WHERE module_code = $${idx}
     RETURNING *`,
    params
  )

  return rows[0] ? toBusinessLineMetadata(rows[0]) : null
}

// ── Convenience accessors ───────────────────────────────────────────

/** Build a lookup map from module_code → metadata. */
export const buildBusinessLineMap = async (): Promise<Map<string, BusinessLineMetadata>> => {
  const all = await loadBusinessLineMetadata()

  return new Map(all.map(bl => [bl.moduleCode, bl]))
}

// ── Cached summary for TenantContext enrichment ─────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 min
let cachedSummaries: BusinessLineMetadataSummary[] | null = null
let cacheTimestamp = 0

/**
 * Returns lightweight BL summaries for TenantContext enrichment.
 * Cached globally (not per-tenant) with 5 min TTL — BL metadata
 * is static reference data that changes infrequently.
 */
export const getCachedBusinessLineSummaries = async (): Promise<BusinessLineMetadataSummary[]> => {
  const now = Date.now()

  if (cachedSummaries && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSummaries
  }

  try {
    const all = await loadBusinessLineMetadata()

    cachedSummaries = all.map(bl => ({
      moduleCode: bl.moduleCode,
      label: bl.label,
      colorHex: bl.colorHex,
      loopPhase: bl.loopPhase
    }))
    cacheTimestamp = now
  } catch {
    // If PG is unavailable or table doesn't exist yet, return empty gracefully
    if (!cachedSummaries) cachedSummaries = []
  }

  return cachedSummaries
}
