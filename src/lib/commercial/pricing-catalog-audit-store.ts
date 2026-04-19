import 'server-only'

import { query } from '@/lib/db'

export type PricingCatalogEntityType =
  | 'sellable_role'
  | 'tool_catalog'
  | 'overhead_addon'
  | 'role_tier_margin'
  | 'service_tier_margin'
  | 'commercial_model_multiplier'
  | 'country_pricing_factor'
  | 'fte_hours_guide'
  | 'employment_type'

export type PricingCatalogAction =
  | 'created'
  | 'updated'
  | 'deactivated'
  | 'reactivated'
  | 'cost_updated'
  | 'pricing_updated'
  | 'bulk_imported'

export interface PricingCatalogAuditEntry {
  auditId: string
  entityType: PricingCatalogEntityType
  entityId: string
  entitySku: string | null
  action: PricingCatalogAction
  actorUserId: string
  actorName: string
  changeSummary: Record<string, unknown>
  effectiveFrom: string | null
  notes: string | null
  createdAt: string
}

interface AuditRow extends Record<string, unknown> {
  audit_id: string
  entity_type: string
  entity_id: string
  entity_sku: string | null
  action: string
  actor_user_id: string
  actor_name: string
  change_summary: unknown
  effective_from: string | Date | null
  notes: string | null
  created_at: string | Date
}

const PRICING_CATALOG_ENTITY_TYPES: readonly PricingCatalogEntityType[] = [
  'sellable_role',
  'tool_catalog',
  'overhead_addon',
  'role_tier_margin',
  'service_tier_margin',
  'commercial_model_multiplier',
  'country_pricing_factor',
  'fte_hours_guide',
  'employment_type'
]

const PRICING_CATALOG_ACTIONS: readonly PricingCatalogAction[] = [
  'created',
  'updated',
  'deactivated',
  'reactivated',
  'cost_updated',
  'pricing_updated',
  'bulk_imported'
]

const toChangeSummary = (value: unknown): Record<string, unknown> => {
  if (!value) return {}

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }

  if (typeof value === 'object') {
    return value as Record<string, unknown>
  }

  return {}
}

const toIso = (value: string | Date | null): string | null => {
  if (value === null || value === undefined) return null

  if (value instanceof Date) return value.toISOString()

  return value
}

const toDateOnly = (value: string | Date | null): string | null => {
  if (value === null || value === undefined) return null

  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.length >= 10 ? value.slice(0, 10) : value
}

const mapRow = (row: AuditRow): PricingCatalogAuditEntry => ({
  auditId: row.audit_id,
  entityType: row.entity_type as PricingCatalogEntityType,
  entityId: row.entity_id,
  entitySku: row.entity_sku,
  action: row.action as PricingCatalogAction,
  actorUserId: row.actor_user_id,
  actorName: row.actor_name,
  changeSummary: toChangeSummary(row.change_summary),
  effectiveFrom: toDateOnly(row.effective_from),
  notes: row.notes,
  createdAt: toIso(row.created_at) ?? ''
})

interface RecordPricingCatalogAuditInput {
  entityType: PricingCatalogEntityType
  entityId: string
  entitySku?: string | null
  action: PricingCatalogAction
  actorUserId: string
  actorName: string
  changeSummary?: Record<string, unknown>
  effectiveFrom?: string | null
  notes?: string | null
}

export const recordPricingCatalogAudit = async (
  input: RecordPricingCatalogAuditInput
): Promise<PricingCatalogAuditEntry> => {
  if (!PRICING_CATALOG_ENTITY_TYPES.includes(input.entityType)) {
    throw new Error(`Invalid pricing catalog audit entity_type: ${input.entityType}`)
  }

  if (!PRICING_CATALOG_ACTIONS.includes(input.action)) {
    throw new Error(`Invalid pricing catalog audit action: ${input.action}`)
  }

  const rows = await query<AuditRow>(
    `INSERT INTO greenhouse_commercial.pricing_catalog_audit_log (
       entity_type, entity_id, entity_sku, action,
       actor_user_id, actor_name, change_summary, effective_from, notes
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
     RETURNING audit_id, entity_type, entity_id, entity_sku, action,
               actor_user_id, actor_name, change_summary, effective_from, notes, created_at`,
    [
      input.entityType,
      input.entityId,
      input.entitySku ?? null,
      input.action,
      input.actorUserId,
      input.actorName,
      JSON.stringify(input.changeSummary ?? {}),
      input.effectiveFrom ?? null,
      input.notes ?? null
    ]
  )

  if (rows.length === 0) {
    throw new Error('Failed to insert pricing catalog audit row')
  }

  return mapRow(rows[0])
}

interface ListPricingCatalogAuditInput {
  entityType?: PricingCatalogEntityType
  entityId?: string
  actorUserId?: string
  limit?: number
}

export const listPricingCatalogAudit = async (
  input: ListPricingCatalogAuditInput = {}
): Promise<PricingCatalogAuditEntry[]> => {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  if (input.entityType) {
    idx += 1
    conditions.push(`entity_type = $${idx}`)
    values.push(input.entityType)
  }

  if (input.entityId) {
    idx += 1
    conditions.push(`entity_id = $${idx}`)
    values.push(input.entityId)
  }

  if (input.actorUserId) {
    idx += 1
    conditions.push(`actor_user_id = $${idx}`)
    values.push(input.actorUserId)
  }

  const limit = Math.min(500, Math.max(1, input.limit ?? 100))
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await query<AuditRow>(
    `SELECT audit_id, entity_type, entity_id, entity_sku, action,
            actor_user_id, actor_name, change_summary, effective_from, notes, created_at
       FROM greenhouse_commercial.pricing_catalog_audit_log
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${limit}`,
    values
  )

  return rows.map(mapRow)
}
