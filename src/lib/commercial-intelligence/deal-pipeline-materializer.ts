import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import {
  getCommercialDealByHubSpotId,
  resolveDealForQuote
} from '@/lib/commercial/deals-store'

import type { DealPipelineSnapshotRow } from './contracts'

interface DealSnapshotSourceRow {
  deal_id: string
  hubspot_deal_id: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  deal_name: string
  dealstage: string
  dealstage_label: string | null
  pipeline_name: string | null
  deal_type: string | null
  amount: string | number | null
  amount_clp: string | number | null
  currency: string | null
  probability_pct: string | number | null
  close_date: string | Date | null
  is_closed: boolean | null
  is_won: boolean | null
  is_deleted: boolean | null
  deal_owner_email: string | null
}

export interface DealQuoteRollupRow {
  quotationId: string
  status: string
  pricingModel: string | null
  commercialModel: string | null
  staffingModel: string | null
  totalAmountClp: number | null
  createdAt: string
  hasApprovalEvidence: boolean
}

interface DealQuoteRollup {
  latestQuoteId: string | null
  latestQuoteStatus: string | null
  latestQuotePricingModel: string | null
  latestQuoteCommercialModel: string | null
  latestQuoteStaffingModel: string | null
  quoteCount: number
  approvedQuoteCount: number
  totalQuotesAmountClp: number | null
}

const ACTIVE_QUOTE_STATUSES = new Set([
  'draft',
  'pending_approval',
  'sent',
  'approved',
  'converted'
])

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toIsoDate = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const daysBetween = (fromIso: string | null, toIso: string | null): number | null => {
  if (!fromIso || !toIso) return null

  const from = new Date(fromIso)
  const to = new Date(toIso)

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null

  const msPerDay = 24 * 60 * 60 * 1000

  return Math.round((to.getTime() - from.getTime()) / msPerDay)
}

export const buildDealQuoteRollup = (rows: DealQuoteRollupRow[]): DealQuoteRollup => {
  if (rows.length === 0) {
    return {
      latestQuoteId: null,
      latestQuoteStatus: null,
      latestQuotePricingModel: null,
      latestQuoteCommercialModel: null,
      latestQuoteStaffingModel: null,
      quoteCount: 0,
      approvedQuoteCount: 0,
      totalQuotesAmountClp: null
    }
  }

  const latestSorted = [...rows].sort((left, right) => {
    if (left.createdAt === right.createdAt) {
      return right.quotationId.localeCompare(left.quotationId)
    }

    return right.createdAt.localeCompare(left.createdAt)
  })

  const latestActive = latestSorted.find(row => ACTIVE_QUOTE_STATUSES.has(row.status)) ?? null
  const latest = latestActive ?? latestSorted[0]

  let approvedQuoteCount = 0
  let totalQuotesAmountClp = 0
  let hasActiveQuoteAmount = false

  for (const row of rows) {
    if (row.hasApprovalEvidence) {
      approvedQuoteCount += 1
    }

    if (ACTIVE_QUOTE_STATUSES.has(row.status) && row.totalAmountClp !== null) {
      totalQuotesAmountClp += row.totalAmountClp
      hasActiveQuoteAmount = true
    }
  }

  return {
    latestQuoteId: latest.quotationId,
    latestQuoteStatus: latest.status,
    latestQuotePricingModel: latest.pricingModel,
    latestQuoteCommercialModel: latest.commercialModel,
    latestQuoteStaffingModel: latest.staffingModel,
    quoteCount: rows.length,
    approvedQuoteCount,
    totalQuotesAmountClp: hasActiveQuoteAmount ? Math.round(totalQuotesAmountClp * 100) / 100 : null
  }
}

const deleteDealPipelineSnapshot = async (dealId: string): Promise<void> => {
  const db = await getDb()

  await db
    .deleteFrom('greenhouse_serving.deal_pipeline_snapshots')
    .where('deal_id', '=', dealId)
    .execute()
}

const getDealSnapshotSource = async (dealId: string): Promise<DealSnapshotSourceRow | null> => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_commercial.deals as d')
    .leftJoin('greenhouse_commercial.hubspot_deal_pipeline_config as cfg', join =>
      join
        .onRef('cfg.stage_id', '=', 'd.dealstage')
        .on(eb =>
          eb(
            eb.fn.coalesce('d.hubspot_pipeline_id', eb.val('default')),
            '=',
            'cfg.pipeline_id'
          )
        )
    )
    .select(eb => [
      'd.deal_id',
      'd.hubspot_deal_id',
      'd.client_id',
      'd.organization_id',
      'd.space_id',
      'd.deal_name',
      'd.dealstage',
      'd.dealstage_label',
      'd.pipeline_name',
      'd.deal_type',
      'd.amount',
      'd.amount_clp',
      'd.currency',
      'd.close_date',
      'd.deal_owner_email',
      'd.is_deleted',
      eb.fn.coalesce('cfg.probability_pct', 'd.probability_pct').as('probability_pct'),
      eb.fn.coalesce('cfg.is_closed', 'd.is_closed').as('is_closed'),
      eb.fn.coalesce('cfg.is_won', 'd.is_won').as('is_won')
    ])
    .where('d.deal_id', '=', dealId)
    .executeTakeFirst()

  return row ? row as DealSnapshotSourceRow : null
}

const listQuoteRollupRows = async ({
  hubspotDealId,
  spaceId
}: {
  hubspotDealId: string
  spaceId: string | null
}): Promise<DealQuoteRollupRow[]> => {
  const db = await getDb()

  const spaceFilter = spaceId !== null
    ? sql`AND q.space_id = ${spaceId}`
    : sql``

  const { rows } = await sql<{
    quotationId: string
    status: string
    pricingModel: string | null
    commercialModel: string | null
    staffingModel: string | null
    totalAmountClp: string | number | null
    createdAt: string | Date
    hasApprovalEvidence: boolean
  }>`
    SELECT
      q.quotation_id AS "quotationId",
      q.status,
      q.pricing_model AS "pricingModel",
      q.commercial_model AS "commercialModel",
      q.staffing_model AS "staffingModel",
      q.total_amount_clp AS "totalAmountClp",
      q.created_at AS "createdAt",
      CASE
        WHEN q.status = 'approved' THEN TRUE
        WHEN EXISTS (
          SELECT 1
          FROM greenhouse_commercial.approval_steps AS s
          WHERE s.quotation_id = q.quotation_id
            AND s.version_number = q.current_version
          GROUP BY s.quotation_id, s.version_number
          HAVING COUNT(*) > 0
             AND bool_and(s.status = 'approved')
        ) THEN TRUE
        ELSE FALSE
      END AS "hasApprovalEvidence"
    FROM greenhouse_commercial.quotations AS q
    WHERE q.hubspot_deal_id = ${hubspotDealId}
    ${spaceFilter}
  `.execute(db)

  return rows.map((row): DealQuoteRollupRow => ({
    quotationId: String(row.quotationId),
    status: String(row.status),
    pricingModel: row.pricingModel ? String(row.pricingModel) : null,
    commercialModel: row.commercialModel ? String(row.commercialModel) : null,
    staffingModel: row.staffingModel ? String(row.staffingModel) : null,
    totalAmountClp: toNumber(row.totalAmountClp),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    hasApprovalEvidence: Boolean(row.hasApprovalEvidence)
  }))
}

export const buildDealPipelineSnapshot = async ({
  dealId,
  sourceEvent
}: {
  dealId: string
  sourceEvent?: string | null
}): Promise<DealPipelineSnapshotRow | null> => {
  const deal = await getDealSnapshotSource(dealId)

  if (!deal || deal.is_deleted) {
    await deleteDealPipelineSnapshot(dealId)

    return null
  }

  const quoteRows = await listQuoteRollupRows({
    hubspotDealId: deal.hubspot_deal_id,
    spaceId: deal.space_id
  })

  const rollup = buildDealQuoteRollup(quoteRows)
  const closeDate = toIsoDate(deal.close_date)
  const today = new Date().toISOString().slice(0, 10)
  const isWon = Boolean(deal.is_won)
  const isClosed = Boolean(deal.is_closed)
  const isOpen = !isClosed

  return {
    dealId: deal.deal_id,
    hubspotDealId: deal.hubspot_deal_id,
    clientId: deal.client_id ? String(deal.client_id) : null,
    organizationId: deal.organization_id ? String(deal.organization_id) : null,
    spaceId: deal.space_id ? String(deal.space_id) : null,

    dealName: String(deal.deal_name),
    dealstage: String(deal.dealstage),
    dealstageLabel: deal.dealstage_label ? String(deal.dealstage_label) : null,
    pipelineName: deal.pipeline_name ? String(deal.pipeline_name) : null,
    dealType: deal.deal_type ? String(deal.deal_type) : null,

    amount: toNumber(deal.amount),
    amountClp: toNumber(deal.amount_clp),
    currency: deal.currency ? String(deal.currency) : null,
    probabilityPct: toNumber(deal.probability_pct),
    closeDate,
    daysUntilClose: daysBetween(today, closeDate),
    isOpen,
    isWon,

    dealOwnerEmail: deal.deal_owner_email ? String(deal.deal_owner_email) : null,

    latestQuoteId: rollup.latestQuoteId,
    latestQuoteStatus: rollup.latestQuoteStatus,
    latestQuotePricingModel: rollup.latestQuotePricingModel,
    latestQuoteCommercialModel: rollup.latestQuoteCommercialModel,
    latestQuoteStaffingModel: rollup.latestQuoteStaffingModel,
    quoteCount: rollup.quoteCount,
    approvedQuoteCount: rollup.approvedQuoteCount,
    totalQuotesAmountClp: rollup.totalQuotesAmountClp,

    snapshotSourceEvent: sourceEvent ?? null,
    materializedAt: new Date().toISOString()
  }
}

export const upsertDealPipelineSnapshot = async (row: DealPipelineSnapshotRow): Promise<void> => {
  const db = await getDb()

  await db
    .insertInto('greenhouse_serving.deal_pipeline_snapshots')
    .values({
      deal_id: row.dealId,
      hubspot_deal_id: row.hubspotDealId,
      client_id: row.clientId,
      organization_id: row.organizationId,
      space_id: row.spaceId,
      deal_name: row.dealName,
      dealstage: row.dealstage,
      dealstage_label: row.dealstageLabel,
      pipeline_name: row.pipelineName,
      deal_type: row.dealType,
      amount: row.amount,
      amount_clp: row.amountClp,
      currency: row.currency,
      probability_pct: row.probabilityPct,
      close_date: row.closeDate,
      days_until_close: row.daysUntilClose,
      is_open: row.isOpen,
      is_won: row.isWon,
      deal_owner_email: row.dealOwnerEmail,
      latest_quote_id: row.latestQuoteId,
      latest_quote_status: row.latestQuoteStatus,
      latest_quote_pricing_model: row.latestQuotePricingModel,
      latest_quote_commercial_model: row.latestQuoteCommercialModel,
      latest_quote_staffing_model: row.latestQuoteStaffingModel,
      quote_count: row.quoteCount,
      approved_quote_count: row.approvedQuoteCount,
      total_quotes_amount_clp: row.totalQuotesAmountClp,
      snapshot_source_event: row.snapshotSourceEvent,
      materialized_at: row.materializedAt
    })
    .onConflict(oc => oc.column('deal_id').doUpdateSet({
      hubspot_deal_id: row.hubspotDealId,
      client_id: row.clientId,
      organization_id: row.organizationId,
      space_id: row.spaceId,
      deal_name: row.dealName,
      dealstage: row.dealstage,
      dealstage_label: row.dealstageLabel,
      pipeline_name: row.pipelineName,
      deal_type: row.dealType,
      amount: row.amount,
      amount_clp: row.amountClp,
      currency: row.currency,
      probability_pct: row.probabilityPct,
      close_date: row.closeDate,
      days_until_close: row.daysUntilClose,
      is_open: row.isOpen,
      is_won: row.isWon,
      deal_owner_email: row.dealOwnerEmail,
      latest_quote_id: row.latestQuoteId,
      latest_quote_status: row.latestQuoteStatus,
      latest_quote_pricing_model: row.latestQuotePricingModel,
      latest_quote_commercial_model: row.latestQuoteCommercialModel,
      latest_quote_staffing_model: row.latestQuoteStaffingModel,
      quote_count: row.quoteCount,
      approved_quote_count: row.approvedQuoteCount,
      total_quotes_amount_clp: row.totalQuotesAmountClp,
      snapshot_source_event: row.snapshotSourceEvent,
      materialized_at: row.materializedAt
    }))
    .execute()
}

export const materializeDealPipelineSnapshot = async ({
  dealId,
  sourceEvent
}: {
  dealId: string
  sourceEvent?: string | null
}): Promise<DealPipelineSnapshotRow | null> => {
  const row = await buildDealPipelineSnapshot({ dealId, sourceEvent })

  if (!row) return null

  await upsertDealPipelineSnapshot(row)

  return row
}

export const materializeDealPipelineSnapshotForQuotation = async ({
  quotationId,
  sourceEvent
}: {
  quotationId: string
  sourceEvent?: string | null
}): Promise<DealPipelineSnapshotRow | null> => {
  const deal = await resolveDealForQuote(quotationId)

  if (!deal) return null

  return materializeDealPipelineSnapshot({
    dealId: deal.dealId,
    sourceEvent
  })
}

export const materializeDealPipelineSnapshotForHubSpotDeal = async ({
  hubspotDealId,
  sourceEvent
}: {
  hubspotDealId: string
  sourceEvent?: string | null
}): Promise<DealPipelineSnapshotRow | null> => {
  const deal = await getCommercialDealByHubSpotId(hubspotDealId)

  if (!deal) return null

  return materializeDealPipelineSnapshot({
    dealId: deal.dealId,
    sourceEvent
  })
}
