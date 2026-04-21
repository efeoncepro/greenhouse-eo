import 'server-only'

import { query } from '@/lib/db'

import { LIFECYCLE_STAGES, type LifecycleStage } from './types'
import { parseLifecycleStage } from './lifecycle-state-machine'

interface SnapshotMaterializedRow extends Record<string, unknown> {
  organization_id: string
  commercial_party_id: string
  hubspot_company_id: string | null
  organization_name: string
  lifecycle_stage: string
  lifecycle_stage_since: string | Date
  lifecycle_stage_source: string
  lifecycle_stage_by: string | null
  first_seen_at: string | Date
  latest_history_id: string | null
  latest_transition_at: string | Date
  latest_transition_source: string | null
  latest_transition_by: string | null
  latest_reason: string | null
  prospect_at: string | Date | null
  opportunity_at: string | Date | null
  active_client_at: string | Date | null
  inactive_at: string | Date | null
  churned_at: string | Date | null
  provider_only_at: string | Date | null
  disqualified_at: string | Date | null
  total_transitions: string | number
  unresolved_conflicts_count: string | number
  last_conflict_at: string | Date | null
  last_conflict_type: string | null
  last_quote_at: string | Date | null
  active_quotes_count: string | number
  last_contract_at: string | Date | null
  active_contracts_count: string | number
  materialized_at: string | Date
}

interface SnapshotListRow extends SnapshotMaterializedRow {
  last_activity_at: string | Date | null
  current_stage_days: string | number | null
}

interface SnapshotFunnelRow extends Record<string, unknown> {
  prospect_count: string | number
  opportunity_count: string | number
  active_client_count: string | number
  inactive_count: string | number
  churned_count: string | number
  provider_only_count: string | number
  disqualified_count: string | number
  avg_days_prospect_to_opportunity: string | number | null
  avg_days_prospect_to_active_client: string | number | null
  avg_days_opportunity_to_active_client: string | number | null
  avg_days_in_current_stage: string | number | null
  prospect_drop_off_rate: string | number | null
  churn_rate: string | number | null
  inactive_rate: string | number | null
  unresolved_conflicts_total: string | number
}

interface HistoryRow extends Record<string, unknown> {
  history_id: string
  from_stage: string | null
  to_stage: string
  transition_source: string
  transitioned_by: string | null
  trigger_entity_type: string | null
  trigger_entity_id: string | null
  metadata: Record<string, unknown> | null
  transitioned_at: string | Date
}

interface ConflictRow extends Record<string, unknown> {
  conflict_id: string
  organization_id: string | null
  commercial_party_id: string | null
  hubspot_company_id: string | null
  conflict_type: string
  detected_at: string | Date
  conflicting_fields: Record<string, unknown> | null
  resolution_status: string
  resolution_applied_at: string | Date | null
  resolved_by: string | null
  metadata: Record<string, unknown> | null
}

interface QuotationRow extends Record<string, unknown> {
  quotation_id: string
  status: string
  quote_date: string | Date | null
  issued_at: string | Date | null
  total_amount_clp: string | number | null
  hubspot_deal_id: string | null
}

interface DealRow extends Record<string, unknown> {
  deal_id: string
  hubspot_deal_id: string
  dealstage: string
  amount_clp: string | number | null
  close_date: string | Date | null
  updated_at: string | Date | null
}

interface ContractRow extends Record<string, unknown> {
  contract_id: string
  status: string
  start_date: string | Date | null
  end_date: string | Date | null
  signed_at: string | Date | null
  updated_at: string | Date | null
}

export interface PartyLifecycleSnapshotRecord {
  organizationId: string
  commercialPartyId: string
  hubspotCompanyId: string | null
  organizationName: string
  lifecycleStage: LifecycleStage
  lifecycleStageSince: string
  lifecycleStageSource: string
  lifecycleStageBy: string | null
  firstSeenAt: string
  latestHistoryId: string | null
  latestTransitionAt: string
  latestTransitionSource: string | null
  latestTransitionBy: string | null
  latestReason: string | null
  stageTimestamps: Partial<Record<LifecycleStage, string>>
  totalTransitions: number
  unresolvedConflictsCount: number
  lastConflictAt: string | null
  lastConflictType: string | null
  lastQuoteAt: string | null
  activeQuotesCount: number
  lastContractAt: string | null
  activeContractsCount: number
  materializedAt: string
}

export interface PartyLifecycleListItem extends PartyLifecycleSnapshotRecord {
  lastActivityAt: string | null
  currentStageDays: number | null
}

export interface ListPartyLifecycleSnapshotsOptions {
  query?: string | null
  stages?: readonly LifecycleStage[]
  hasConflicts?: boolean | null
  limit?: number
  offset?: number
}

export interface PartyLifecycleHistoryEntry {
  historyId: string
  fromStage: LifecycleStage | null
  toStage: LifecycleStage
  transitionSource: string
  transitionedBy: string | null
  triggerEntityType: string | null
  triggerEntityId: string | null
  metadata: Record<string, unknown>
  transitionedAt: string
}

export interface PartyLifecycleConflictEntry {
  conflictId: string
  organizationId: string | null
  commercialPartyId: string | null
  hubspotCompanyId: string | null
  conflictType: string
  detectedAt: string
  conflictingFields: Record<string, unknown> | null
  resolutionStatus: string
  resolutionAppliedAt: string | null
  resolvedBy: string | null
  metadata: Record<string, unknown>
}

export interface PartyLifecycleQuotationSummary {
  quotationId: string
  status: string
  quoteDate: string | null
  issuedAt: string | null
  totalAmountClp: number | null
  hubspotDealId: string | null
}

export interface PartyLifecycleDealSummary {
  dealId: string
  hubspotDealId: string
  dealStage: string
  amountClp: number | null
  closeDate: string | null
  updatedAt: string | null
}

export interface PartyLifecycleContractSummary {
  contractId: string
  status: string
  startDate: string | null
  endDate: string | null
  signedAt: string | null
  updatedAt: string | null
}

export interface PartyLifecycleDetail {
  snapshot: PartyLifecycleSnapshotRecord
  history: PartyLifecycleHistoryEntry[]
  conflicts: PartyLifecycleConflictEntry[]
  quotations: PartyLifecycleQuotationSummary[]
  deals: PartyLifecycleDealSummary[]
  contracts: PartyLifecycleContractSummary[]
}

export interface PartyLifecycleFunnelMetrics {
  generatedAt: string
  stageCounts: Record<LifecycleStage, number>
  avgDaysProspectToOpportunity: number | null
  avgDaysProspectToActiveClient: number | null
  avgDaysOpportunityToActiveClient: number | null
  avgDaysInCurrentStage: number | null
  prospectDropOffRate: number | null
  churnRate: number | null
  inactiveRate: number | null
  unresolvedConflictsTotal: number
}

const ACTIVE_QUOTE_STATUSES = ['issued', 'approved', 'sent'] as const

const toIsoString = (value: string | Date | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

const toRequiredIsoString = (value: string | Date | null | undefined, fallback: string): string =>
  toIsoString(value) ?? fallback

const toNumber = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toNullableNumber = (value: string | number | null | undefined): number | null => {
  if (value == null) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const mapSnapshotRow = (row: SnapshotMaterializedRow): PartyLifecycleSnapshotRecord => {
  const lifecycleStage = parseLifecycleStage(row.lifecycle_stage)

  if (!lifecycleStage) {
    throw new Error(
      `Unsupported lifecycle_stage ${String(row.lifecycle_stage)} for organization ${row.organization_id}.`
    )
  }

  const fallbackTimestamp =
    toIsoString(row.latest_transition_at) ??
    toIsoString(row.lifecycle_stage_since) ??
    new Date(0).toISOString()

  return {
    organizationId: row.organization_id,
    commercialPartyId: String(row.commercial_party_id),
    hubspotCompanyId: row.hubspot_company_id ?? null,
    organizationName: row.organization_name,
    lifecycleStage,
    lifecycleStageSince: toRequiredIsoString(row.lifecycle_stage_since, fallbackTimestamp),
    lifecycleStageSource: row.lifecycle_stage_source,
    lifecycleStageBy: row.lifecycle_stage_by ?? null,
    firstSeenAt: toRequiredIsoString(row.first_seen_at, fallbackTimestamp),
    latestHistoryId: row.latest_history_id ?? null,
    latestTransitionAt: toRequiredIsoString(row.latest_transition_at, fallbackTimestamp),
    latestTransitionSource: row.latest_transition_source ?? null,
    latestTransitionBy: row.latest_transition_by ?? null,
    latestReason: row.latest_reason ?? null,
    stageTimestamps: {
      ...(toIsoString(row.prospect_at) ? { prospect: toIsoString(row.prospect_at)! } : {}),
      ...(toIsoString(row.opportunity_at) ? { opportunity: toIsoString(row.opportunity_at)! } : {}),
      ...(toIsoString(row.active_client_at) ? { active_client: toIsoString(row.active_client_at)! } : {}),
      ...(toIsoString(row.inactive_at) ? { inactive: toIsoString(row.inactive_at)! } : {}),
      ...(toIsoString(row.churned_at) ? { churned: toIsoString(row.churned_at)! } : {}),
      ...(toIsoString(row.provider_only_at) ? { provider_only: toIsoString(row.provider_only_at)! } : {}),
      ...(toIsoString(row.disqualified_at) ? { disqualified: toIsoString(row.disqualified_at)! } : {})
    },
    totalTransitions: toNumber(row.total_transitions),
    unresolvedConflictsCount: toNumber(row.unresolved_conflicts_count),
    lastConflictAt: toIsoString(row.last_conflict_at),
    lastConflictType: row.last_conflict_type ?? null,
    lastQuoteAt: toIsoString(row.last_quote_at),
    activeQuotesCount: toNumber(row.active_quotes_count),
    lastContractAt: toIsoString(row.last_contract_at),
    activeContractsCount: toNumber(row.active_contracts_count),
    materializedAt: toRequiredIsoString(row.materialized_at, fallbackTimestamp)
  }
}

const MATERIALIZE_SQL = `
  WITH history_rollup AS (
    SELECT
      h.organization_id,
      MIN(h.transitioned_at) AS first_seen_at,
      MIN(h.transitioned_at) FILTER (WHERE h.to_stage = 'prospect') AS prospect_at,
      MIN(h.transitioned_at) FILTER (WHERE h.to_stage = 'opportunity') AS opportunity_at,
      MIN(h.transitioned_at) FILTER (WHERE h.to_stage = 'active_client') AS active_client_at,
      MIN(h.transitioned_at) FILTER (WHERE h.to_stage = 'inactive') AS inactive_at,
      MIN(h.transitioned_at) FILTER (WHERE h.to_stage = 'churned') AS churned_at,
      MIN(h.transitioned_at) FILTER (WHERE h.to_stage = 'provider_only') AS provider_only_at,
      MIN(h.transitioned_at) FILTER (WHERE h.to_stage = 'disqualified') AS disqualified_at,
      COUNT(*)::integer AS total_transitions
    FROM greenhouse_core.organization_lifecycle_history h
    GROUP BY h.organization_id
  ),
  latest_history AS (
    SELECT DISTINCT ON (h.organization_id)
      h.organization_id,
      h.history_id::text AS latest_history_id,
      h.transitioned_at AS latest_transition_at,
      h.transition_source AS latest_transition_source,
      h.transitioned_by AS latest_transition_by,
      NULLIF(COALESCE(h.metadata ->> 'reason', h.metadata ->> 'backfill_task'), '') AS latest_reason
    FROM greenhouse_core.organization_lifecycle_history h
    ORDER BY h.organization_id, h.transitioned_at DESC, h.history_id DESC
  ),
  conflict_rollup AS (
    SELECT
      c.organization_id,
      COUNT(*) FILTER (WHERE c.resolution_status = 'pending')::integer AS unresolved_conflicts_count,
      MAX(c.detected_at) AS last_conflict_at,
      (ARRAY_AGG(c.conflict_type ORDER BY c.detected_at DESC, c.conflict_id DESC))[1] AS last_conflict_type
    FROM greenhouse_commercial.party_sync_conflicts c
    WHERE c.organization_id IS NOT NULL
    GROUP BY c.organization_id
  ),
  quote_summary AS (
    SELECT
      q.organization_id,
      MAX(COALESCE(q.issued_at, q.quote_date::timestamp, q.created_at)) FILTER (
        WHERE q.status = ANY($2::text[])
      ) AS last_quote_at,
      COUNT(*) FILTER (WHERE q.status = ANY($2::text[]))::integer AS active_quotes_count
    FROM greenhouse_commercial.quotations q
    WHERE q.organization_id IS NOT NULL
    GROUP BY q.organization_id
  ),
  contract_summary AS (
    SELECT
      c.organization_id,
      MAX(COALESCE(c.signed_at, c.start_date::timestamp, c.created_at)) AS last_contract_at,
      COUNT(*) FILTER (WHERE c.status = 'active')::integer AS active_contracts_count
    FROM greenhouse_commercial.contracts c
    WHERE c.organization_id IS NOT NULL
    GROUP BY c.organization_id
  ),
  upserted AS (
    INSERT INTO greenhouse_serving.party_lifecycle_snapshots (
      organization_id,
      commercial_party_id,
      hubspot_company_id,
      organization_name,
      lifecycle_stage,
      lifecycle_stage_since,
      lifecycle_stage_source,
      lifecycle_stage_by,
      first_seen_at,
      latest_history_id,
      latest_transition_at,
      latest_transition_source,
      latest_transition_by,
      latest_reason,
      prospect_at,
      opportunity_at,
      active_client_at,
      inactive_at,
      churned_at,
      provider_only_at,
      disqualified_at,
      total_transitions,
      unresolved_conflicts_count,
      last_conflict_at,
      last_conflict_type,
      last_quote_at,
      active_quotes_count,
      last_contract_at,
      active_contracts_count,
      materialized_at
    )
    SELECT
      o.organization_id,
      o.commercial_party_id,
      o.hubspot_company_id,
      o.organization_name,
      o.lifecycle_stage,
      o.lifecycle_stage_since,
      o.lifecycle_stage_source,
      o.lifecycle_stage_by,
      COALESCE(hr.first_seen_at, o.created_at, NOW()) AS first_seen_at,
      lh.latest_history_id::uuid,
      COALESCE(lh.latest_transition_at, o.lifecycle_stage_since, o.created_at, NOW()) AS latest_transition_at,
      lh.latest_transition_source,
      lh.latest_transition_by,
      lh.latest_reason,
      hr.prospect_at,
      hr.opportunity_at,
      hr.active_client_at,
      hr.inactive_at,
      hr.churned_at,
      hr.provider_only_at,
      hr.disqualified_at,
      COALESCE(hr.total_transitions, 0),
      COALESCE(cr.unresolved_conflicts_count, 0),
      cr.last_conflict_at,
      cr.last_conflict_type,
      qs.last_quote_at,
      COALESCE(qs.active_quotes_count, 0),
      cs.last_contract_at,
      COALESCE(cs.active_contracts_count, 0),
      NOW()
    FROM greenhouse_core.organizations o
    LEFT JOIN history_rollup hr
      ON hr.organization_id = o.organization_id
    LEFT JOIN latest_history lh
      ON lh.organization_id = o.organization_id
    LEFT JOIN conflict_rollup cr
      ON cr.organization_id = o.organization_id
    LEFT JOIN quote_summary qs
      ON qs.organization_id = o.organization_id
    LEFT JOIN contract_summary cs
      ON cs.organization_id = o.organization_id
    WHERE o.active = TRUE
      AND ($1::text IS NULL OR o.organization_id = $1)
    ON CONFLICT (organization_id) DO UPDATE SET
      commercial_party_id = EXCLUDED.commercial_party_id,
      hubspot_company_id = EXCLUDED.hubspot_company_id,
      organization_name = EXCLUDED.organization_name,
      lifecycle_stage = EXCLUDED.lifecycle_stage,
      lifecycle_stage_since = EXCLUDED.lifecycle_stage_since,
      lifecycle_stage_source = EXCLUDED.lifecycle_stage_source,
      lifecycle_stage_by = EXCLUDED.lifecycle_stage_by,
      first_seen_at = EXCLUDED.first_seen_at,
      latest_history_id = EXCLUDED.latest_history_id,
      latest_transition_at = EXCLUDED.latest_transition_at,
      latest_transition_source = EXCLUDED.latest_transition_source,
      latest_transition_by = EXCLUDED.latest_transition_by,
      latest_reason = EXCLUDED.latest_reason,
      prospect_at = EXCLUDED.prospect_at,
      opportunity_at = EXCLUDED.opportunity_at,
      active_client_at = EXCLUDED.active_client_at,
      inactive_at = EXCLUDED.inactive_at,
      churned_at = EXCLUDED.churned_at,
      provider_only_at = EXCLUDED.provider_only_at,
      disqualified_at = EXCLUDED.disqualified_at,
      total_transitions = EXCLUDED.total_transitions,
      unresolved_conflicts_count = EXCLUDED.unresolved_conflicts_count,
      last_conflict_at = EXCLUDED.last_conflict_at,
      last_conflict_type = EXCLUDED.last_conflict_type,
      last_quote_at = EXCLUDED.last_quote_at,
      active_quotes_count = EXCLUDED.active_quotes_count,
      last_contract_at = EXCLUDED.last_contract_at,
      active_contracts_count = EXCLUDED.active_contracts_count,
      materialized_at = NOW()
    RETURNING
      organization_id,
      commercial_party_id::text,
      hubspot_company_id,
      organization_name,
      lifecycle_stage,
      lifecycle_stage_since,
      lifecycle_stage_source,
      lifecycle_stage_by,
      first_seen_at,
      latest_history_id::text,
      latest_transition_at,
      latest_transition_source,
      latest_transition_by,
      latest_reason,
      prospect_at,
      opportunity_at,
      active_client_at,
      inactive_at,
      churned_at,
      provider_only_at,
      disqualified_at,
      total_transitions,
      unresolved_conflicts_count,
      last_conflict_at,
      last_conflict_type,
      last_quote_at,
      active_quotes_count,
      last_contract_at,
      active_contracts_count,
      materialized_at
  )
  SELECT *
  FROM upserted
  ORDER BY organization_id ASC
`

export const materializePartyLifecycleSnapshots = async (
  organizationId?: string | null
): Promise<PartyLifecycleSnapshotRecord[]> => {
  const rows = await query<SnapshotMaterializedRow>(
    MATERIALIZE_SQL,
    [organizationId ?? null, [...ACTIVE_QUOTE_STATUSES]]
  )

  return rows.map(mapSnapshotRow)
}

export const materializePartyLifecycleSnapshot = async (
  organizationId: string
): Promise<PartyLifecycleSnapshotRecord | null> => {
  const rows = await materializePartyLifecycleSnapshots(organizationId)

  return rows[0] ?? null
}

export const materializeAllPartyLifecycleSnapshots = async (): Promise<number> => {
  const rows = await materializePartyLifecycleSnapshots()

  return rows.length
}

export const resolvePartyLifecycleOrganizationId = async (
  identifier: string
): Promise<string | null> => {
  const normalizedId = identifier.trim()

  if (!normalizedId) return null

  const snapshotRows = await query<{ organization_id: string }>(
    `SELECT organization_id
       FROM greenhouse_serving.party_lifecycle_snapshots
      WHERE organization_id = $1
         OR commercial_party_id::text = $1
      LIMIT 1`,
    [normalizedId]
  )

  if (snapshotRows[0]?.organization_id) {
    return snapshotRows[0].organization_id
  }

  const organizationRows = await query<{ organization_id: string }>(
    `SELECT organization_id
       FROM greenhouse_core.organizations
      WHERE organization_id = $1
         OR commercial_party_id::text = $1
      LIMIT 1`,
    [normalizedId]
  )

  return organizationRows[0]?.organization_id ?? null
}

export const listPartyLifecycleSnapshots = async (
  options: ListPartyLifecycleSnapshotsOptions = {}
): Promise<{ items: PartyLifecycleListItem[]; total: number }> => {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  const push = (fragment: string, value: unknown) => {
    idx += 1
    conditions.push(fragment.replaceAll('?', String(idx)))
    values.push(value)
  }

  const q = options.query?.trim()

  if (q) {
    push(
      `(s.organization_name ILIKE $? OR COALESCE(s.hubspot_company_id, '') ILIKE $? OR s.commercial_party_id::text ILIKE $? OR s.organization_id ILIKE $?)`,
      `%${q}%`
    )
    values.push(`%${q}%`, `%${q}%`, `%${q}%`)
    idx += 3
  }

  if (options.stages && options.stages.length > 0) {
    push(`s.lifecycle_stage = ANY($?::text[])`, [...options.stages])
  }

  if (options.hasConflicts === true) {
    conditions.push('s.unresolved_conflicts_count > 0')
  } else if (options.hasConflicts === false) {
    conditions.push('s.unresolved_conflicts_count = 0')
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = Math.max(1, Math.min(options.limit ?? 50, 200))
  const offset = Math.max(0, options.offset ?? 0)

  const countRows = await query<{ total: string | number }>(
    `SELECT COUNT(*)::bigint AS total
       FROM greenhouse_serving.party_lifecycle_snapshots s
       ${whereClause}`,
    values
  )

  const rows = await query<SnapshotListRow>(
    `SELECT
       s.organization_id,
       s.commercial_party_id::text,
       s.hubspot_company_id,
       s.organization_name,
       s.lifecycle_stage,
       s.lifecycle_stage_since,
       s.lifecycle_stage_source,
       s.lifecycle_stage_by,
       s.first_seen_at,
       s.latest_history_id::text,
       s.latest_transition_at,
       s.latest_transition_source,
       s.latest_transition_by,
       s.latest_reason,
       s.prospect_at,
       s.opportunity_at,
       s.active_client_at,
       s.inactive_at,
       s.churned_at,
       s.provider_only_at,
       s.disqualified_at,
       s.total_transitions,
       s.unresolved_conflicts_count,
       s.last_conflict_at,
       s.last_conflict_type,
       s.last_quote_at,
       s.active_quotes_count,
       s.last_contract_at,
       s.active_contracts_count,
       s.materialized_at,
       GREATEST(
         COALESCE(s.latest_transition_at, to_timestamp(0)),
         COALESCE(s.last_conflict_at, to_timestamp(0)),
         COALESCE(s.last_quote_at, to_timestamp(0)),
         COALESCE(s.last_contract_at, to_timestamp(0))
       ) AS last_activity_at,
       ROUND(EXTRACT(EPOCH FROM (NOW() - s.lifecycle_stage_since)) / 86400.0, 2) AS current_stage_days
     FROM greenhouse_serving.party_lifecycle_snapshots s
     ${whereClause}
     ORDER BY last_activity_at DESC NULLS LAST, s.organization_name ASC
     LIMIT $${idx + 1}
     OFFSET $${idx + 2}`,
    [...values, limit, offset]
  )

  return {
    items: rows.map(row => ({
      ...mapSnapshotRow(row),
      lastActivityAt: toIsoString(row.last_activity_at),
      currentStageDays: toNullableNumber(row.current_stage_days)
    })),
    total: toNumber(countRows[0]?.total ?? 0)
  }
}

const mapHistoryRow = (row: HistoryRow): PartyLifecycleHistoryEntry => {
  const toStage = parseLifecycleStage(row.to_stage)

  if (!toStage) {
    throw new Error(`Unsupported history to_stage ${String(row.to_stage)} for row ${row.history_id}.`)
  }

  return {
    historyId: row.history_id,
    fromStage: parseLifecycleStage(row.from_stage),
    toStage,
    transitionSource: row.transition_source,
    transitionedBy: row.transitioned_by ?? null,
    triggerEntityType: row.trigger_entity_type ?? null,
    triggerEntityId: row.trigger_entity_id ?? null,
    metadata: row.metadata ?? {},
    transitionedAt: toRequiredIsoString(row.transitioned_at, new Date(0).toISOString())
  }
}

const mapConflictRow = (row: ConflictRow): PartyLifecycleConflictEntry => ({
  conflictId: row.conflict_id,
  organizationId: row.organization_id ?? null,
  commercialPartyId: row.commercial_party_id ?? null,
  hubspotCompanyId: row.hubspot_company_id ?? null,
  conflictType: row.conflict_type,
  detectedAt: toRequiredIsoString(row.detected_at, new Date(0).toISOString()),
  conflictingFields: row.conflicting_fields,
  resolutionStatus: row.resolution_status,
  resolutionAppliedAt: toIsoString(row.resolution_applied_at),
  resolvedBy: row.resolved_by ?? null,
  metadata: row.metadata ?? {}
})

export const getPartyLifecycleDetail = async (
  identifier: string
): Promise<PartyLifecycleDetail | null> => {
  const organizationId = await resolvePartyLifecycleOrganizationId(identifier)

  if (!organizationId) return null

  let snapshotRow = (
    await query<SnapshotMaterializedRow>(
      `SELECT
         organization_id,
         commercial_party_id::text,
         hubspot_company_id,
         organization_name,
         lifecycle_stage,
         lifecycle_stage_since,
         lifecycle_stage_source,
         lifecycle_stage_by,
         first_seen_at,
         latest_history_id::text,
         latest_transition_at,
         latest_transition_source,
         latest_transition_by,
         latest_reason,
         prospect_at,
         opportunity_at,
         active_client_at,
         inactive_at,
         churned_at,
         provider_only_at,
         disqualified_at,
         total_transitions,
         unresolved_conflicts_count,
         last_conflict_at,
         last_conflict_type,
         last_quote_at,
         active_quotes_count,
         last_contract_at,
         active_contracts_count,
         materialized_at
       FROM greenhouse_serving.party_lifecycle_snapshots
      WHERE organization_id = $1
      LIMIT 1`,
      [organizationId]
    )
  )[0]

  if (!snapshotRow) {
    await materializePartyLifecycleSnapshot(organizationId)

    snapshotRow = (
      await query<SnapshotMaterializedRow>(
        `SELECT
           organization_id,
           commercial_party_id::text,
           hubspot_company_id,
           organization_name,
           lifecycle_stage,
           lifecycle_stage_since,
           lifecycle_stage_source,
           lifecycle_stage_by,
           first_seen_at,
           latest_history_id::text,
           latest_transition_at,
           latest_transition_source,
           latest_transition_by,
           latest_reason,
           prospect_at,
           opportunity_at,
           active_client_at,
           inactive_at,
           churned_at,
           provider_only_at,
           disqualified_at,
           total_transitions,
           unresolved_conflicts_count,
           last_conflict_at,
           last_conflict_type,
           last_quote_at,
           active_quotes_count,
           last_contract_at,
           active_contracts_count,
           materialized_at
         FROM greenhouse_serving.party_lifecycle_snapshots
        WHERE organization_id = $1
        LIMIT 1`,
        [organizationId]
      )
    )[0]
  }

  if (!snapshotRow) return null

  const [historyRows, conflictRows, quotationRows, dealRows, contractRows] = await Promise.all([
    query<HistoryRow>(
      `SELECT
         history_id::text,
         from_stage,
         to_stage,
         transition_source,
         transitioned_by,
         trigger_entity_type,
         trigger_entity_id,
         metadata,
         transitioned_at
       FROM greenhouse_core.organization_lifecycle_history
      WHERE organization_id = $1
      ORDER BY transitioned_at DESC, history_id DESC
      LIMIT 50`,
      [organizationId]
    ),
    query<ConflictRow>(
      `SELECT
         conflict_id::text,
         organization_id,
         commercial_party_id,
         hubspot_company_id,
         conflict_type,
         detected_at,
         conflicting_fields,
         resolution_status,
         resolution_applied_at,
         resolved_by,
         metadata
       FROM greenhouse_commercial.party_sync_conflicts
      WHERE organization_id = $1
      ORDER BY detected_at DESC, conflict_id DESC
      LIMIT 50`,
      [organizationId]
    ),
    query<QuotationRow>(
      `SELECT
         quotation_id,
         status,
         quote_date,
         issued_at,
         total_amount_clp,
         hubspot_deal_id
       FROM greenhouse_commercial.quotations
      WHERE organization_id = $1
      ORDER BY COALESCE(issued_at, quote_date::timestamp, created_at) DESC
      LIMIT 10`,
      [organizationId]
    ),
    query<DealRow>(
      `SELECT
         deal_id,
         hubspot_deal_id,
         dealstage,
         amount_clp,
         close_date,
         updated_at
       FROM greenhouse_commercial.deals
      WHERE organization_id = $1
      ORDER BY close_date DESC NULLS LAST, updated_at DESC NULLS LAST
      LIMIT 10`,
      [organizationId]
    ),
    query<ContractRow>(
      `SELECT
         contract_id,
         status,
         start_date,
         end_date,
         signed_at,
         updated_at
       FROM greenhouse_commercial.contracts
      WHERE organization_id = $1
      ORDER BY COALESCE(signed_at, start_date::timestamp, created_at) DESC
      LIMIT 10`,
      [organizationId]
    )
  ])

  return {
    snapshot: mapSnapshotRow(snapshotRow),
    history: historyRows.map(mapHistoryRow),
    conflicts: conflictRows.map(mapConflictRow),
    quotations: quotationRows.map(row => ({
      quotationId: row.quotation_id,
      status: row.status,
      quoteDate: toIsoString(row.quote_date),
      issuedAt: toIsoString(row.issued_at),
      totalAmountClp: toNullableNumber(row.total_amount_clp),
      hubspotDealId: row.hubspot_deal_id ?? null
    })),
    deals: dealRows.map(row => ({
      dealId: row.deal_id,
      hubspotDealId: row.hubspot_deal_id,
      dealStage: row.dealstage,
      amountClp: toNullableNumber(row.amount_clp),
      closeDate: toIsoString(row.close_date),
      updatedAt: toIsoString(row.updated_at)
    })),
    contracts: contractRows.map(row => ({
      contractId: row.contract_id,
      status: row.status,
      startDate: toIsoString(row.start_date),
      endDate: toIsoString(row.end_date),
      signedAt: toIsoString(row.signed_at),
      updatedAt: toIsoString(row.updated_at)
    }))
  }
}

const roundMetric = (value: string | number | null | undefined): number | null => {
  const parsed = toNullableNumber(value)

  if (parsed == null) return null

  return Math.round(parsed * 100) / 100
}

export const getPartyLifecycleFunnelMetrics = async (): Promise<PartyLifecycleFunnelMetrics> => {
  const row = (
    await query<SnapshotFunnelRow>(
      `SELECT
         COUNT(*) FILTER (WHERE lifecycle_stage = 'prospect')::integer AS prospect_count,
         COUNT(*) FILTER (WHERE lifecycle_stage = 'opportunity')::integer AS opportunity_count,
         COUNT(*) FILTER (WHERE lifecycle_stage = 'active_client')::integer AS active_client_count,
         COUNT(*) FILTER (WHERE lifecycle_stage = 'inactive')::integer AS inactive_count,
         COUNT(*) FILTER (WHERE lifecycle_stage = 'churned')::integer AS churned_count,
         COUNT(*) FILTER (WHERE lifecycle_stage = 'provider_only')::integer AS provider_only_count,
         COUNT(*) FILTER (WHERE lifecycle_stage = 'disqualified')::integer AS disqualified_count,
         AVG(EXTRACT(EPOCH FROM (opportunity_at - prospect_at)) / 86400.0) FILTER (
           WHERE opportunity_at IS NOT NULL
             AND prospect_at IS NOT NULL
             AND opportunity_at >= prospect_at
         ) AS avg_days_prospect_to_opportunity,
         AVG(EXTRACT(EPOCH FROM (active_client_at - prospect_at)) / 86400.0) FILTER (
           WHERE active_client_at IS NOT NULL
             AND prospect_at IS NOT NULL
             AND active_client_at >= prospect_at
         ) AS avg_days_prospect_to_active_client,
         AVG(EXTRACT(EPOCH FROM (active_client_at - opportunity_at)) / 86400.0) FILTER (
           WHERE active_client_at IS NOT NULL
             AND opportunity_at IS NOT NULL
             AND active_client_at >= opportunity_at
         ) AS avg_days_opportunity_to_active_client,
         AVG(EXTRACT(EPOCH FROM (NOW() - lifecycle_stage_since)) / 86400.0) AS avg_days_in_current_stage,
         (
           COUNT(*) FILTER (
             WHERE prospect_at IS NOT NULL
               AND disqualified_at IS NOT NULL
               AND opportunity_at IS NULL
               AND active_client_at IS NULL
           )::numeric
           / NULLIF(COUNT(*) FILTER (WHERE prospect_at IS NOT NULL), 0)
         ) AS prospect_drop_off_rate,
         (
           COUNT(*) FILTER (WHERE churned_at IS NOT NULL)::numeric
           / NULLIF(COUNT(*) FILTER (WHERE active_client_at IS NOT NULL), 0)
         ) AS churn_rate,
         (
           COUNT(*) FILTER (WHERE inactive_at IS NOT NULL)::numeric
           / NULLIF(COUNT(*) FILTER (WHERE active_client_at IS NOT NULL), 0)
         ) AS inactive_rate,
         COALESCE(SUM(unresolved_conflicts_count), 0)::integer AS unresolved_conflicts_total
       FROM greenhouse_serving.party_lifecycle_snapshots`
    )
  )[0]

  const stageCounts = Object.fromEntries(
    LIFECYCLE_STAGES.map(stage => [stage, 0])
  ) as Record<LifecycleStage, number>

  if (row) {
    stageCounts.prospect = toNumber(row.prospect_count)
    stageCounts.opportunity = toNumber(row.opportunity_count)
    stageCounts.active_client = toNumber(row.active_client_count)
    stageCounts.inactive = toNumber(row.inactive_count)
    stageCounts.churned = toNumber(row.churned_count)
    stageCounts.provider_only = toNumber(row.provider_only_count)
    stageCounts.disqualified = toNumber(row.disqualified_count)
  }

  return {
    generatedAt: new Date().toISOString(),
    stageCounts,
    avgDaysProspectToOpportunity: roundMetric(row?.avg_days_prospect_to_opportunity),
    avgDaysProspectToActiveClient: roundMetric(row?.avg_days_prospect_to_active_client),
    avgDaysOpportunityToActiveClient: roundMetric(row?.avg_days_opportunity_to_active_client),
    avgDaysInCurrentStage: roundMetric(row?.avg_days_in_current_stage),
    prospectDropOffRate: roundMetric(row?.prospect_drop_off_rate),
    churnRate: roundMetric(row?.churn_rate),
    inactiveRate: roundMetric(row?.inactive_rate),
    unresolvedConflictsTotal: toNumber(row?.unresolved_conflicts_total ?? 0)
  }
}
