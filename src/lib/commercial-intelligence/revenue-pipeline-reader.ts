import 'server-only'

import { query } from '@/lib/db'

import {
  listDealPipelineSnapshots,
  type DealPipelineFilters
} from './intelligence-store'
import type { DealPipelineSnapshotRow } from './contracts'

/**
 * TASK-457 — Unified Revenue Pipeline reader.
 *
 * Reads two disjoint sources and merges them into a single unified stream:
 *   1. Open deals  (greenhouse_serving.deal_pipeline_snapshots)
 *   2. Standalone quotes (greenhouse_serving.quotation_pipeline_snapshots)
 *      - Quotes without a linked HubSpot deal
 *      - Quotes whose linked deal is closed-won (revenue under execution)
 *
 * Classification rules (see TASK-457 Slice 1):
 *   - Deal row                               → category = 'deal'
 *   - Standalone quote + deal won            → category = 'contract'
 *   - Standalone quote, no deal, customer    → category = 'contract'
 *   - Standalone quote, no deal, lead/mql/…  → category = 'pre-sales'
 *   - Deal closed-lost + linked quote        → excluded
 *   - Expired or rejected quote              → excluded
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type UnifiedPipelineCategory = 'deal' | 'contract' | 'pre-sales'

export interface UnifiedPipelineRow {
  id: string
  grain: 'deal' | 'quote'
  category: UnifiedPipelineCategory
  entityName: string
  clientId: string | null
  clientName: string | null
  organizationId: string | null
  spaceId: string | null
  stage: string
  stageLabel: string
  amountClp: number | null
  probabilityPct: number
  closeDate: string | null
  expiryDate: string | null
  daysUntilClose: number | null
  isOpen: boolean
  quoteCount: number | null
  approvedQuoteCount: number | null
  lifecyclestage: string | null
  businessLineCode: string | null
  commercialModel: string | null
  staffingModel: string | null
  linkUrl: string
  updatedAt: string
}

export interface RevenuePipelineTotals {
  openPipelineClp: number
  weightedPipelineClp: number
  mtdWonClp: number
  mtdLostClp: number
  byCategory: Record<UnifiedPipelineCategory, { count: number; totalClp: number; weightedClp: number }>
  dealCount: number
  standaloneCount: number
}

export interface UnifiedPipelineFilters {
  clientId?: string | null
  organizationId?: string | null
  spaceId?: string | null
  businessLineCode?: string | null
  category?: UnifiedPipelineCategory | null
  stage?: string | null
  lifecyclestage?: string | null
}

export interface UnifiedPipelineResult {
  items: UnifiedPipelineRow[]
  totals: RevenuePipelineTotals
  count: number
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const toNum = (value: unknown): number | null => {
  if (value === null || value === undefined) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toIsoDate = (value: string | Date | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const toIsoTs = (value: string | Date | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const round2 = (value: number) => Math.round(value * 100) / 100

// Lightweight label helper for quote pipeline stages.
// Mirrors the UI nomenclature used elsewhere; kept inline to avoid
// cross-importing presentation helpers into the reader.
const QUOTE_STAGE_LABELS: Record<string, string> = {
  draft: 'Borrador',
  in_review: 'En revisión',
  sent: 'Enviada',
  approved: 'Aprobada',
  converted: 'Convertida',
  rejected: 'Rechazada',
  expired: 'Expirada'
}

const labelQuoteStage = (stage: string): string => QUOTE_STAGE_LABELS[stage] ?? stage

const PRE_SALES_LIFECYCLE_STAGES = new Set([
  'lead',
  'marketingqualifiedlead',
  'salesqualifiedlead',
  'opportunity',
  'subscriber',
  'evangelist',
  'other',
  'unknown'
])

// ─────────────────────────────────────────────────────────────
// Deal mapping
// ─────────────────────────────────────────────────────────────

const mapDealRow = (row: DealPipelineSnapshotRow): UnifiedPipelineRow => ({
  id: row.dealId,
  grain: 'deal',
  category: 'deal',
  entityName: row.dealName,
  clientId: row.clientId,
  clientName: null,
  organizationId: row.organizationId,
  spaceId: row.spaceId,
  stage: row.dealstage,
  stageLabel: row.dealstageLabel ?? row.dealstage,
  amountClp: row.amountClp,
  probabilityPct: row.probabilityPct ?? 0,
  closeDate: row.closeDate,
  expiryDate: null,
  daysUntilClose: row.daysUntilClose,
  isOpen: row.isOpen,
  quoteCount: row.quoteCount ?? 0,
  approvedQuoteCount: row.approvedQuoteCount ?? 0,
  lifecyclestage: null,
  businessLineCode: null,
  commercialModel: row.latestQuoteCommercialModel,
  staffingModel: row.latestQuoteStaffingModel,
  linkUrl: `/finance/quotes?dealId=${encodeURIComponent(row.dealId)}`,
  updatedAt: row.materializedAt
})

// ─────────────────────────────────────────────────────────────
// Standalone quote query
// ─────────────────────────────────────────────────────────────

interface StandaloneQuoteDbRow extends Record<string, unknown> {
  quotation_id: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  pipeline_stage: string
  probability_pct: string | number | null
  total_amount_clp: string | number | null
  business_line_code: string | null
  expiry_date: string | Date | null
  days_until_expiry: number | null
  materialized_at: string | Date
  quotation_number: string | null
  hubspot_deal_id: string | null
  commercial_model: string | null
  staffing_model: string | null
  deal_is_open: boolean | null
  deal_is_won: boolean | null
  client_name: string | null
  lifecyclestage: string | null
}

const buildStandaloneWhere = (filters: UnifiedPipelineFilters) => {
  // Base predicates:
  //   1) standalone (no linked deal) OR linked to a closed-won deal (contract)
  //   2) exclude quotes flagged expired
  //   3) exclude closed quote statuses
  const conditions: string[] = [
    '(q.hubspot_deal_id IS NULL OR (d.is_closed = TRUE AND d.is_won = TRUE))',
    'qps.is_expired = FALSE',
    "qps.pipeline_stage NOT IN ('rejected', 'expired')"
  ]

  const values: unknown[] = []
  let idx = 0

  const push = (clause: string, value: unknown) => {
    idx++
    conditions.push(clause.replace('$$', `$${idx}`))
    values.push(value)
  }

  if (filters.clientId) push('qps.client_id = $$', filters.clientId)
  if (filters.organizationId) push('qps.organization_id = $$', filters.organizationId)
  if (filters.spaceId) push('qps.space_id = $$', filters.spaceId)
  if (filters.businessLineCode) push('qps.business_line_code = $$', filters.businessLineCode)
  if (filters.stage) push('qps.pipeline_stage = $$', filters.stage)
  if (filters.lifecyclestage) push('c.lifecyclestage = $$', filters.lifecyclestage)

  return { where: `WHERE ${conditions.join(' AND ')}`, values }
}

const fetchStandaloneQuotes = async (
  filters: UnifiedPipelineFilters
): Promise<StandaloneQuoteDbRow[]> => {
  const { where, values } = buildStandaloneWhere(filters)

  return query<StandaloneQuoteDbRow>(
    `SELECT qps.quotation_id,
            qps.client_id,
            qps.organization_id,
            qps.space_id,
            qps.pipeline_stage,
            qps.probability_pct,
            qps.total_amount_clp,
            qps.business_line_code,
            qps.expiry_date,
            qps.days_until_expiry,
            qps.materialized_at,
            q.quotation_number,
            q.hubspot_deal_id,
            q.commercial_model,
            q.staffing_model,
            (d.is_closed = FALSE) AS deal_is_open,
            d.is_won AS deal_is_won,
            c.client_name,
            c.lifecyclestage
       FROM greenhouse_serving.quotation_pipeline_snapshots qps
       JOIN greenhouse_commercial.quotations q
         ON q.quotation_id = qps.quotation_id
  LEFT JOIN greenhouse_commercial.deals d
         ON d.hubspot_deal_id = q.hubspot_deal_id
  LEFT JOIN greenhouse_core.clients c
         ON c.client_id = qps.client_id
       ${where}
       ORDER BY qps.expiry_date ASC NULLS LAST, qps.quotation_id ASC`,
    values
  )
}

const classifyStandaloneRow = (row: StandaloneQuoteDbRow): UnifiedPipelineCategory | 'excluded' => {
  const hasDeal = Boolean(row.hubspot_deal_id)
  const dealWon = row.deal_is_won === true
  const dealOpen = row.deal_is_open === true
  const lifecyclestage = (row.lifecyclestage ?? '').toLowerCase() || null

  // Quote linked to a deal
  if (hasDeal) {
    if (dealWon) return 'contract' // deal closed-won → revenue under execution
    if (!dealOpen && !dealWon) return 'excluded' // deal closed-lost → drop

    // Deal is still open → the deal row already represents this opportunity
    return 'excluded'
  }

  // Standalone quote (no deal linkage)
  if (lifecyclestage === 'customer') return 'contract'
  if (lifecyclestage && PRE_SALES_LIFECYCLE_STAGES.has(lifecyclestage)) return 'pre-sales'

  // Unknown / null lifecyclestage → conservative default
  return 'pre-sales'
}

const mapStandaloneRow = (
  row: StandaloneQuoteDbRow,
  category: UnifiedPipelineCategory
): UnifiedPipelineRow => {
  const quotationNumber = row.quotation_number ?? row.quotation_id

  return {
    id: String(row.quotation_id),
    grain: 'quote',
    category,
    entityName: String(quotationNumber),
    clientId: row.client_id ? String(row.client_id) : null,
    clientName: row.client_name ? String(row.client_name) : null,
    organizationId: row.organization_id ? String(row.organization_id) : null,
    spaceId: row.space_id ? String(row.space_id) : null,
    stage: String(row.pipeline_stage),
    stageLabel: labelQuoteStage(String(row.pipeline_stage)),
    amountClp: toNum(row.total_amount_clp),
    probabilityPct: toNum(row.probability_pct) ?? 0,
    closeDate: null,
    expiryDate: toIsoDate(row.expiry_date),
    daysUntilClose: row.days_until_expiry ?? null,
    isOpen: true,
    quoteCount: null,
    approvedQuoteCount: null,
    lifecyclestage: row.lifecyclestage ? String(row.lifecyclestage) : null,
    businessLineCode: row.business_line_code ? String(row.business_line_code) : null,
    commercialModel: row.commercial_model ? String(row.commercial_model) : null,
    staffingModel: row.staffing_model ? String(row.staffing_model) : null,
    linkUrl: `/finance/quotes/${encodeURIComponent(String(row.quotation_id))}`,
    updatedAt: toIsoTs(row.materialized_at) ?? new Date().toISOString()
  }
}

// ─────────────────────────────────────────────────────────────
// MTD won/lost query
// ─────────────────────────────────────────────────────────────

interface MtdTotalsRow extends Record<string, unknown> {
  mtd_won_clp: string | number | null
  mtd_lost_clp: string | number | null
}

const fetchMtdTotals = async (filters: UnifiedPipelineFilters) => {
  const conditions: string[] = [`close_date >= date_trunc('month', CURRENT_DATE)`]
  const values: unknown[] = []
  let idx = 0

  const push = (clause: string, value: unknown) => {
    idx++
    conditions.push(clause.replace('$$', `$${idx}`))
    values.push(value)
  }

  if (filters.clientId) push('client_id = $$', filters.clientId)
  if (filters.organizationId) push('organization_id = $$', filters.organizationId)
  if (filters.spaceId) push('space_id = $$', filters.spaceId)

  const where = `WHERE ${conditions.join(' AND ')}`

  const rows = await query<MtdTotalsRow>(
    `SELECT COALESCE(SUM(CASE WHEN is_won THEN amount_clp ELSE 0 END), 0) AS mtd_won_clp,
            COALESCE(SUM(CASE WHEN NOT is_won AND NOT is_open THEN amount_clp ELSE 0 END), 0) AS mtd_lost_clp
       FROM greenhouse_serving.deal_pipeline_snapshots
       ${where}`,
    values
  )

  const row = rows[0]

  return {
    mtdWonClp: row ? toNum(row.mtd_won_clp) ?? 0 : 0,
    mtdLostClp: row ? toNum(row.mtd_lost_clp) ?? 0 : 0
  }
}

// ─────────────────────────────────────────────────────────────
// Totals
// ─────────────────────────────────────────────────────────────

const emptyCategoryTotals = (): RevenuePipelineTotals['byCategory'] => ({
  deal: { count: 0, totalClp: 0, weightedClp: 0 },
  contract: { count: 0, totalClp: 0, weightedClp: 0 },
  'pre-sales': { count: 0, totalClp: 0, weightedClp: 0 }
})

const buildTotals = (
  items: UnifiedPipelineRow[],
  mtd: { mtdWonClp: number; mtdLostClp: number }
): RevenuePipelineTotals => {
  const byCategory = emptyCategoryTotals()
  let openPipelineClp = 0
  let weightedPipelineClp = 0
  let dealCount = 0
  let standaloneCount = 0

  for (const row of items) {
    const amount = row.amountClp ?? 0
    const weighted = amount * ((row.probabilityPct ?? 0) / 100)

    const bucket = byCategory[row.category]

    bucket.count += 1
    bucket.totalClp = round2(bucket.totalClp + amount)
    bucket.weightedClp = round2(bucket.weightedClp + weighted)

    if (row.isOpen) {
      openPipelineClp += amount
      weightedPipelineClp += weighted
    }

    if (row.grain === 'deal') {
      dealCount += 1
    } else {
      standaloneCount += 1
    }
  }

  return {
    openPipelineClp: round2(openPipelineClp),
    weightedPipelineClp: round2(weightedPipelineClp),
    mtdWonClp: round2(mtd.mtdWonClp),
    mtdLostClp: round2(mtd.mtdLostClp),
    byCategory,
    dealCount,
    standaloneCount
  }
}

// ─────────────────────────────────────────────────────────────
// Public reader
// ─────────────────────────────────────────────────────────────

export const listRevenuePipelineUnified = async (
  filters: UnifiedPipelineFilters = {}
): Promise<UnifiedPipelineResult> => {
  const dealFilters: DealPipelineFilters = {
    clientId: filters.clientId ?? null,
    organizationId: filters.organizationId ?? null,
    spaceId: filters.spaceId ?? null,
    dealstage: filters.stage ?? null,
    isOpenOnly: true
  }

  const wantDeals = !filters.category || filters.category === 'deal'
  const wantStandalone = !filters.category || filters.category !== 'deal'

  const [dealSnapshots, standaloneRows] = await Promise.all([
    wantDeals ? listDealPipelineSnapshots(dealFilters) : Promise.resolve([] as DealPipelineSnapshotRow[]),
    wantStandalone ? fetchStandaloneQuotes(filters) : Promise.resolve([] as StandaloneQuoteDbRow[])
  ])

  const dealItems: UnifiedPipelineRow[] = dealSnapshots.map(mapDealRow)

  const standaloneItems: UnifiedPipelineRow[] = []

  for (const raw of standaloneRows) {
    const category = classifyStandaloneRow(raw)

    if (category === 'excluded') continue

    if (filters.category && filters.category !== category) continue

    standaloneItems.push(mapStandaloneRow(raw, category))
  }

  const items = [...dealItems, ...standaloneItems]

  const mtd = await fetchMtdTotals(filters)
  const totals = buildTotals(items, mtd)

  return {
    items,
    totals,
    count: items.length
  }
}
