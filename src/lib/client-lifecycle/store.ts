import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  type ClientLifecycleCase,
  type ClientLifecycleCaseEvent,
  type ClientLifecycleCaseKind,
  type ClientLifecycleChecklistItem,
  type ClientLifecycleTemplateItem
} from './types'

// Read helper that works standalone (shared pool) or inside a transaction (PoolClient).
const runQuery = async <T extends Record<string, unknown>>(
  sql: string,
  params: unknown[],
  client?: PoolClient
): Promise<T[]> => {
  if (client) {
    const result = await client.query<T>(sql, params)


    return result.rows
  }


  return runGreenhousePostgresQuery<T>(sql, params)
}

const toIso = (value: unknown): string | null => {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const toIsoRequired = (value: unknown): string => toIso(value) ?? ''

type CaseRow = {
  case_id: string
  organization_id: string
  client_id: string | null
  case_kind: ClientLifecycleCaseKind
  status: ClientLifecycleCase['status']
  trigger_source: ClientLifecycleCase['triggerSource']
  triggered_by_user_id: string | null
  reason: string | null
  effective_date: unknown
  target_completion_date: unknown
  completed_at: unknown
  cancelled_at: unknown
  cancellation_reason: string | null
  blocked_reason_codes: string[] | null
  previous_case_id: string | null
  template_code: string
  metadata_json: Record<string, unknown> | null
  created_at: unknown
  updated_at: unknown
}

const CASE_COLUMNS = `
  case_id, organization_id, client_id, case_kind, status, trigger_source,
  triggered_by_user_id, reason, effective_date, target_completion_date,
  completed_at, cancelled_at, cancellation_reason, blocked_reason_codes,
  previous_case_id, template_code, metadata_json, created_at, updated_at
`

export const mapCaseRow = (row: CaseRow): ClientLifecycleCase => ({
  caseId: row.case_id,
  organizationId: row.organization_id,
  clientId: row.client_id,
  caseKind: row.case_kind,
  status: row.status,
  triggerSource: row.trigger_source,
  triggeredByUserId: row.triggered_by_user_id,
  reason: row.reason,
  effectiveDate: toIsoRequired(row.effective_date).slice(0, 10),
  targetCompletionDate: toIso(row.target_completion_date)?.slice(0, 10) ?? null,
  completedAt: toIso(row.completed_at),
  cancelledAt: toIso(row.cancelled_at),
  cancellationReason: row.cancellation_reason,
  blockedReasonCodes: row.blocked_reason_codes ?? [],
  previousCaseId: row.previous_case_id,
  templateCode: row.template_code,
  metadataJson: row.metadata_json ?? {},
  createdAt: toIsoRequired(row.created_at),
  updatedAt: toIsoRequired(row.updated_at)
})

type ItemRow = {
  item_id: string
  case_id: string
  template_code: string
  item_code: string
  item_label: string
  required: boolean
  blocks_completion: boolean
  requires_evidence: boolean
  owner_role: ClientLifecycleChecklistItem['ownerRole']
  display_order: number
  status: ClientLifecycleChecklistItem['status']
  evidence_asset_id: string | null
  notes: string | null
  completed_at: unknown
  completed_by_user_id: string | null
  blocked_reason: string | null
  metadata_json: Record<string, unknown> | null
}

const ITEM_COLUMNS = `
  item_id, case_id, template_code, item_code, item_label, required,
  blocks_completion, requires_evidence, owner_role, display_order, status,
  evidence_asset_id, notes, completed_at, completed_by_user_id, blocked_reason, metadata_json
`

export const mapItemRow = (row: ItemRow): ClientLifecycleChecklistItem => ({
  itemId: row.item_id,
  caseId: row.case_id,
  templateCode: row.template_code,
  itemCode: row.item_code,
  itemLabel: row.item_label,
  required: row.required,
  blocksCompletion: row.blocks_completion,
  requiresEvidence: row.requires_evidence,
  ownerRole: row.owner_role,
  displayOrder: row.display_order,
  status: row.status,
  evidenceAssetId: row.evidence_asset_id,
  notes: row.notes,
  completedAt: toIso(row.completed_at),
  completedByUserId: row.completed_by_user_id,
  blockedReason: row.blocked_reason,
  metadataJson: row.metadata_json ?? {}
})

export const getActiveCaseForOrganization = async (
  organizationId: string,
  caseKind: ClientLifecycleCaseKind,
  client?: PoolClient,
  forUpdate = false
): Promise<ClientLifecycleCase | null> => {
  const rows = await runQuery<CaseRow>(
    `SELECT ${CASE_COLUMNS}
     FROM greenhouse_core.client_lifecycle_cases
     WHERE organization_id = $1 AND case_kind = $2 AND status NOT IN ('completed','cancelled')
     LIMIT 1
     ${forUpdate ? 'FOR UPDATE' : ''}`,
    [organizationId, caseKind],
    client
  )


  return rows[0] ? mapCaseRow(rows[0]) : null
}

export const getCaseById = async (
  caseId: string,
  client?: PoolClient,
  forUpdate = false
): Promise<ClientLifecycleCase | null> => {
  const rows = await runQuery<CaseRow>(
    `SELECT ${CASE_COLUMNS}
     FROM greenhouse_core.client_lifecycle_cases
     WHERE case_id = $1
     LIMIT 1
     ${forUpdate ? 'FOR UPDATE' : ''}`,
    [caseId],
    client
  )


  return rows[0] ? mapCaseRow(rows[0]) : null
}

export const getChecklistItems = async (
  caseId: string,
  client?: PoolClient
): Promise<ClientLifecycleChecklistItem[]> => {
  const rows = await runQuery<ItemRow>(
    `SELECT ${ITEM_COLUMNS}
     FROM greenhouse_core.client_lifecycle_checklist_items
     WHERE case_id = $1
     ORDER BY display_order ASC`,
    [caseId],
    client
  )


  return rows.map(mapItemRow)
}

export const getChecklistItemByCode = async (
  caseId: string,
  itemCode: string,
  client?: PoolClient,
  forUpdate = false
): Promise<ClientLifecycleChecklistItem | null> => {
  const rows = await runQuery<ItemRow>(
    `SELECT ${ITEM_COLUMNS}
     FROM greenhouse_core.client_lifecycle_checklist_items
     WHERE case_id = $1 AND item_code = $2
     LIMIT 1
     ${forUpdate ? 'FOR UPDATE' : ''}`,
    [caseId, itemCode],
    client
  )


  return rows[0] ? mapItemRow(rows[0]) : null
}

export const getCaseEvents = async (
  caseId: string,
  limit = 50
): Promise<ClientLifecycleCaseEvent[]> => {
  const rows = await runQuery<{
    event_id: string
    case_id: string
    event_kind: string
    from_status: string | null
    to_status: string | null
    payload_json: Record<string, unknown> | null
    actor_user_id: string | null
    occurred_at: unknown
  }>(
    `SELECT event_id, case_id, event_kind, from_status, to_status, payload_json, actor_user_id, occurred_at
     FROM greenhouse_core.client_lifecycle_case_events
     WHERE case_id = $1
     ORDER BY occurred_at DESC
     LIMIT $2`,
    [caseId, limit]
  )


  return rows.map((row) => ({
    eventId: row.event_id,
    caseId: row.case_id,
    eventKind: row.event_kind,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    payloadJson: row.payload_json ?? {},
    actorUserId: row.actor_user_id,
    occurredAt: toIsoRequired(row.occurred_at)
  }))
}

export interface ListLifecycleCasesFilters {
  status?: ClientLifecycleCase['status']
  caseKind?: ClientLifecycleCaseKind
  overdueOnly?: boolean
  limit?: number
  cursor?: string | null
}

export interface ListLifecycleCasesResult {
  items: ClientLifecycleCase[]
  nextCursor: string | null
  hasMore: boolean
}

export const listLifecycleCases = async (
  filters: ListLifecycleCasesFilters = {}
): Promise<ListLifecycleCasesResult> => {
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100)
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters.status) {
    params.push(filters.status)
    conditions.push(`status = $${params.length}`)
  }

  if (filters.caseKind) {
    params.push(filters.caseKind)
    conditions.push(`case_kind = $${params.length}`)
  }

  if (filters.overdueOnly) {
    conditions.push(`target_completion_date IS NOT NULL AND target_completion_date < CURRENT_DATE AND status NOT IN ('completed','cancelled')`)
  }

  if (filters.cursor) {
    params.push(filters.cursor)
    conditions.push(`created_at < $${params.length}`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  params.push(limit + 1)

  const rows = await runQuery<CaseRow>(
    `SELECT ${CASE_COLUMNS}
     FROM greenhouse_core.client_lifecycle_cases
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  )

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const items = page.map(mapCaseRow)
  const nextCursor = hasMore ? toIso(page[page.length - 1]?.created_at) : null

  return { items, nextCursor, hasMore }
}

export const listCasesForOrganization = async (
  organizationId: string
): Promise<ClientLifecycleCase[]> => {
  const rows = await runQuery<CaseRow>(
    `SELECT ${CASE_COLUMNS}
     FROM greenhouse_core.client_lifecycle_cases
     WHERE organization_id = $1
     ORDER BY created_at DESC`,
    [organizationId]
  )


  return rows.map(mapCaseRow)
}

export interface LifecycleHealthSummary {
  openCases: number
  overdue: number
  blocked: number
  byKind: Record<string, number>
}

export const getLifecycleHealthSummary = async (): Promise<LifecycleHealthSummary> => {
  const rows = await runQuery<{ case_kind: string; status: string; overdue: boolean }>(
    `SELECT case_kind,
            status,
            (target_completion_date IS NOT NULL AND target_completion_date < CURRENT_DATE) AS overdue
     FROM greenhouse_core.client_lifecycle_cases
     WHERE status NOT IN ('completed','cancelled')`,
    []
  )

  const byKind: Record<string, number> = {}
  let overdue = 0
  let blocked = 0

  for (const row of rows) {
    byKind[row.case_kind] = (byKind[row.case_kind] ?? 0) + 1
    if (row.overdue) overdue += 1
    if (row.status === 'blocked') blocked += 1
  }

  return { openCases: rows.length, overdue, blocked, byKind }
}

// Active template rows (snapshot source for materialization). Ordered by default_order.
export const readActiveTemplateItems = async (
  templateCode: string,
  client?: PoolClient
): Promise<ClientLifecycleTemplateItem[]> => {
  const rows = await runQuery<{
    template_code: string
    case_kind: ClientLifecycleCaseKind
    item_code: string
    item_label: string
    required: boolean
    default_order: number
    owner_role: ClientLifecycleTemplateItem['ownerRole']
    blocks_completion: boolean
    requires_evidence: boolean
  }>(
    `SELECT template_code, case_kind, item_code, item_label, required, default_order,
            owner_role, blocks_completion, requires_evidence
     FROM greenhouse_core.client_lifecycle_checklist_templates
     WHERE template_code = $1 AND effective_to IS NULL
     ORDER BY default_order ASC`,
    [templateCode],
    client
  )


  return rows.map((row) => ({
    templateCode: row.template_code,
    caseKind: row.case_kind,
    itemCode: row.item_code,
    itemLabel: row.item_label,
    required: row.required,
    defaultOrder: row.default_order,
    ownerRole: row.owner_role,
    blocksCompletion: row.blocks_completion,
    requiresEvidence: row.requires_evidence
  }))
}
