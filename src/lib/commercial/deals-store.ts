import type { Insertable, Kysely, Selectable, Transaction } from 'kysely'
import { sql } from 'kysely'

import { getDb, query } from '@/lib/db'
import type { DB } from '@/types/db'

import {
  publishDealCreated,
  publishDealLost,
  publishDealStageChanged,
  publishDealSynced,
  publishDealWon
} from './deal-events'

type DbLike = Kysely<DB> | Transaction<DB>
type DealRow = Selectable<DB['greenhouse_commercial.deals']>

interface HubSpotDealSourceRow extends Record<string, unknown> {
  hubspot_deal_id: string
  hubspot_pipeline_id: string
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
  exchange_rate_to_clp: string | number | null
  close_date: string | Date | null
  probability_pct: string | number | null
  is_closed: boolean | null
  is_won: boolean | null
  is_deleted: boolean | null
  deal_owner_hubspot_user_id: string | null
  deal_owner_user_id: string | null
  deal_owner_email: string | null
  created_in_hubspot_at: string | Date | null
  hubspot_last_synced_at: string | Date | null
  source_payload: Record<string, unknown> | string | null
}

export interface CommercialDealEntry {
  dealId: string
  hubspotDealId: string
  hubspotPipelineId: string | null
  clientId: string | null
  organizationId: string | null
  spaceId: string | null
  dealName: string
  dealstage: string
  dealstageLabel: string | null
  pipelineName: string | null
  dealType: string | null
  amount: number | null
  amountClp: number | null
  currency: string
  exchangeRateToClp: number | null
  closeDate: string | null
  probabilityPct: number | null
  isClosed: boolean
  isWon: boolean
  isDeleted: boolean
  dealOwnerHubspotUserId: string | null
  dealOwnerUserId: string | null
  dealOwnerEmail: string | null
  createdInHubspotAt: string | null
  hubspotLastSyncedAt: string
  sourcePayload: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CommercialDealListItem {
  dealId: string
  hubspotDealId: string
  organizationId: string | null
  dealName: string
  dealstage: string
  dealstageLabel: string | null
  pipelineName: string | null
  amountClp: number | null
  currency: string
  isClosed: boolean
  isWon: boolean
  updatedAt: string
}

export interface DealQuoteLinkEntry {
  quotationId: string
  financeQuoteId: string | null
  quotationNumber: string
  status: string
  hubspotQuoteId: string | null
  hubspotDealId: string | null
  clientId: string | null
  organizationId: string | null
  spaceId: string | null
  totalAmountClp: number | null
  quoteDate: string | null
  sentAt: string | null
}

export interface DealTransitionSummary {
  action: 'created' | 'updated' | 'skipped'
  changedFields: string[]
  stageChanged: boolean
  wonTransition: boolean
  lostTransition: boolean
}

export interface UpsertCommercialDealResult {
  action: 'created' | 'updated' | 'skipped'
  changedFields: string[]
  deal: CommercialDealEntry
}

const toNumber = (value: string | number | null | undefined): number | null => {
  if (value == null) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toDateString = (value: Date | string | null | undefined) => {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)

  return value.toISOString().slice(0, 10)
}

const toTimestampString = (value: Date | string | null | undefined) => {
  if (!value) return null
  if (typeof value === 'string') return value

  return value.toISOString()
}

const toPayloadObject = (value: unknown): Record<string, unknown> => {
  if (!value) return {}

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      return parsed && typeof parsed === 'object'
        ? parsed as Record<string, unknown>
        : {}
    } catch {
      return {}
    }
  }

  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

const stringChanged = (left: string | null | undefined, right: string | null | undefined) =>
  (left ?? null) !== (right ?? null)

const booleanChanged = (left: boolean | null | undefined, right: boolean | null | undefined) =>
  Boolean(left) !== Boolean(right)

const numberChanged = (left: string | number | null | undefined, right: string | number | null | undefined, tolerance = 0.0001) => {
  const normalizedLeft = toNumber(left)
  const normalizedRight = toNumber(right)

  if (normalizedLeft == null && normalizedRight == null) return false
  if (normalizedLeft == null || normalizedRight == null) return true

  return Math.abs(normalizedLeft - normalizedRight) > tolerance
}

const mapDeal = (row: DealRow): CommercialDealEntry => ({
  dealId: row.deal_id,
  hubspotDealId: row.hubspot_deal_id,
  hubspotPipelineId: row.hubspot_pipeline_id,
  clientId: row.client_id,
  organizationId: row.organization_id,
  spaceId: row.space_id,
  dealName: row.deal_name,
  dealstage: row.dealstage,
  dealstageLabel: row.dealstage_label,
  pipelineName: row.pipeline_name,
  dealType: row.deal_type,
  amount: toNumber(row.amount),
  amountClp: toNumber(row.amount_clp),
  currency: row.currency,
  exchangeRateToClp: toNumber(row.exchange_rate_to_clp),
  closeDate: toDateString(row.close_date),
  probabilityPct: toNumber(row.probability_pct),
  isClosed: row.is_closed,
  isWon: row.is_won,
  isDeleted: row.is_deleted,
  dealOwnerHubspotUserId: row.deal_owner_hubspot_user_id,
  dealOwnerUserId: row.deal_owner_user_id,
  dealOwnerEmail: row.deal_owner_email,
  createdInHubspotAt: toTimestampString(row.created_in_hubspot_at),
  hubspotLastSyncedAt: toTimestampString(row.hubspot_last_synced_at) ?? new Date(0).toISOString(),
  sourcePayload: toPayloadObject(row.source_payload),
  createdAt: toTimestampString(row.created_at) ?? new Date(0).toISOString(),
  updatedAt: toTimestampString(row.updated_at) ?? new Date(0).toISOString()
})

export const classifyDealTransition = (
  previous: CommercialDealEntry | null,
  next: CommercialDealEntry
): DealTransitionSummary => {
  if (!previous) {
    return {
      action: 'created',
      changedFields: ['created'],
      stageChanged: false,
      wonTransition: next.isWon,
      lostTransition: next.isClosed && !next.isWon
    }
  }

  const changedFields: string[] = []

  if (stringChanged(previous.hubspotPipelineId, next.hubspotPipelineId)) changedFields.push('hubspotPipelineId')
  if (stringChanged(previous.dealstage, next.dealstage)) changedFields.push('dealstage')
  if (stringChanged(previous.dealstageLabel, next.dealstageLabel)) changedFields.push('dealstageLabel')
  if (stringChanged(previous.pipelineName, next.pipelineName)) changedFields.push('pipelineName')
  if (stringChanged(previous.dealName, next.dealName)) changedFields.push('dealName')
  if (stringChanged(previous.dealType, next.dealType)) changedFields.push('dealType')
  if (stringChanged(previous.clientId, next.clientId)) changedFields.push('clientId')
  if (stringChanged(previous.organizationId, next.organizationId)) changedFields.push('organizationId')
  if (stringChanged(previous.spaceId, next.spaceId)) changedFields.push('spaceId')
  if (numberChanged(previous.amount, next.amount)) changedFields.push('amount')
  if (numberChanged(previous.amountClp, next.amountClp)) changedFields.push('amountClp')
  if (numberChanged(previous.exchangeRateToClp, next.exchangeRateToClp)) changedFields.push('exchangeRateToClp')
  if (numberChanged(previous.probabilityPct, next.probabilityPct)) changedFields.push('probabilityPct')
  if (stringChanged(previous.currency, next.currency)) changedFields.push('currency')
  if (stringChanged(previous.closeDate, next.closeDate)) changedFields.push('closeDate')
  if (booleanChanged(previous.isClosed, next.isClosed)) changedFields.push('isClosed')
  if (booleanChanged(previous.isWon, next.isWon)) changedFields.push('isWon')
  if (booleanChanged(previous.isDeleted, next.isDeleted)) changedFields.push('isDeleted')
  if (stringChanged(previous.dealOwnerHubspotUserId, next.dealOwnerHubspotUserId)) changedFields.push('dealOwnerHubspotUserId')
  if (stringChanged(previous.dealOwnerUserId, next.dealOwnerUserId)) changedFields.push('dealOwnerUserId')
  if (stringChanged(previous.dealOwnerEmail, next.dealOwnerEmail)) changedFields.push('dealOwnerEmail')
  if (stringChanged(previous.hubspotLastSyncedAt, next.hubspotLastSyncedAt)) changedFields.push('hubspotLastSyncedAt')

  const stageChanged =
    previous.hubspotPipelineId !== next.hubspotPipelineId
    || previous.dealstage !== next.dealstage
    || previous.dealstageLabel !== next.dealstageLabel

  return {
    action: changedFields.length > 0 ? 'updated' : 'skipped',
    changedFields,
    stageChanged,
    wonTransition: !previous.isWon && next.isWon,
    lostTransition: !previous.isClosed && next.isClosed && !next.isWon
  }
}

const buildUpsertValues = (row: HubSpotDealSourceRow): Insertable<DB['greenhouse_commercial.deals']> => ({
  hubspot_deal_id: row.hubspot_deal_id,
  hubspot_pipeline_id: row.hubspot_pipeline_id,
  client_id: row.client_id,
  organization_id: row.organization_id,
  space_id: row.space_id,
  deal_name: row.deal_name,
  dealstage: row.dealstage,
  dealstage_label: row.dealstage_label,
  pipeline_name: row.pipeline_name,
  deal_type: row.deal_type,
  amount: toNumber(row.amount),
  amount_clp: toNumber(row.amount_clp),
  currency: row.currency ?? 'CLP',
  exchange_rate_to_clp: toNumber(row.exchange_rate_to_clp),
  close_date: toDateString(row.close_date),
  probability_pct: toNumber(row.probability_pct),
  is_closed: Boolean(row.is_closed),
  is_won: Boolean(row.is_won),
  is_deleted: Boolean(row.is_deleted),
  deal_owner_hubspot_user_id: row.deal_owner_hubspot_user_id,
  deal_owner_user_id: row.deal_owner_user_id,
  deal_owner_email: row.deal_owner_email,
  created_in_hubspot_at: row.created_in_hubspot_at ? new Date(String(row.created_in_hubspot_at)) : null,
  hubspot_last_synced_at: row.hubspot_last_synced_at ? new Date(String(row.hubspot_last_synced_at)) : new Date(),
  source_payload: toPayloadObject(row.source_payload) as never
})

const getDbOrTx = async (dbOrTx?: DbLike) => dbOrTx ?? getDb()

const ensureHubSpotDealPipelineConfig = async (
  dbOrTx: DbLike,
  row: HubSpotDealSourceRow
) => {
  await dbOrTx
    .insertInto('greenhouse_commercial.hubspot_deal_pipeline_config')
    .values({
      pipeline_id: row.hubspot_pipeline_id,
      stage_id: row.dealstage,
      stage_label: row.dealstage_label ?? row.dealstage,
      probability_pct: toNumber(row.probability_pct),
      is_closed: Boolean(row.is_closed),
      is_won: Boolean(row.is_won),
      notes: 'Auto-bootstrapped from greenhouse_crm.deals during TASK-453 canonical sync'
    })
    .onConflict(oc => oc.columns(['pipeline_id', 'stage_id']).doNothing())
    .execute()
}

export const listHubSpotDealSyncSourceRows = async ({
  includeClosed = true,
  hubspotDealIds = []
}: {
  includeClosed?: boolean
  hubspotDealIds?: string[]
} = {}): Promise<HubSpotDealSourceRow[]> => {
  const values: unknown[] = [includeClosed]

  const conditions = [
    `($1::boolean = TRUE OR NOT (COALESCE(d.is_closed_won, FALSE) OR COALESCE(d.is_closed_lost, FALSE)))`
  ]

  if (hubspotDealIds.length > 0) {
    values.push(hubspotDealIds)
    conditions.push(`d.hubspot_deal_id = ANY($${values.length}::text[])`)
  }

  return query<HubSpotDealSourceRow>(
    `WITH primary_org_space AS (
       SELECT DISTINCT ON (organization_id)
         organization_id,
         space_id
       FROM greenhouse_core.spaces
       WHERE active = TRUE
         AND organization_id IS NOT NULL
       ORDER BY organization_id, created_at ASC, space_id ASC
     ),
     primary_client_space AS (
       SELECT DISTINCT ON (client_id)
         client_id,
         space_id
       FROM greenhouse_core.spaces
       WHERE active = TRUE
         AND client_id IS NOT NULL
       ORDER BY client_id, created_at ASC, space_id ASC
     )
     SELECT
       d.hubspot_deal_id,
       COALESCE(NULLIF(trim(d.pipeline_id), ''), 'default') AS hubspot_pipeline_id,
       d.client_id,
       org.organization_id,
       COALESCE(pos.space_id, pcs.space_id) AS space_id,
       d.deal_name,
       COALESCE(NULLIF(trim(d.stage_id), ''), 'unknown') AS dealstage,
       COALESCE(NULLIF(trim(d.stage_name), ''), d.stage_id) AS dealstage_label,
       d.pipeline_id AS pipeline_name,
       NULL::text AS deal_type,
       d.amount,
       CASE
         WHEN COALESCE(NULLIF(trim(d.currency), ''), 'CLP') = 'CLP' THEN d.amount
         WHEN fx.rate IS NOT NULL AND d.amount IS NOT NULL THEN d.amount * fx.rate
         ELSE NULL
       END AS amount_clp,
       COALESCE(NULLIF(trim(d.currency), ''), 'CLP') AS currency,
       CASE
         WHEN COALESCE(NULLIF(trim(d.currency), ''), 'CLP') = 'CLP' THEN 1::numeric
         ELSE fx.rate
       END AS exchange_rate_to_clp,
       d.close_date::date AS close_date,
       CASE
         WHEN COALESCE(d.is_closed_won, FALSE) THEN 100::numeric
         WHEN COALESCE(d.is_closed_lost, FALSE) THEN 0::numeric
         ELSE NULL::numeric
       END AS probability_pct,
       (COALESCE(d.is_closed_won, FALSE) OR COALESCE(d.is_closed_lost, FALSE)) AS is_closed,
       COALESCE(d.is_closed_won, FALSE) AS is_won,
       COALESCE(d.is_deleted, FALSE) AS is_deleted,
       NULL::text AS deal_owner_hubspot_user_id,
       d.owner_user_id AS deal_owner_user_id,
       owner_user.email AS deal_owner_email,
       NULL::timestamptz AS created_in_hubspot_at,
       COALESCE(d.source_updated_at, d.synced_at, d.updated_at) AS hubspot_last_synced_at,
       jsonb_build_object(
         'sourceTable', 'greenhouse_crm.deals',
         'dealRecordId', d.deal_record_id,
         'companyRecordId', d.company_record_id,
         'hubspotCompanyId', d.hubspot_company_id,
         'syncRunId', d.sync_run_id,
         'payloadHash', d.payload_hash,
         'pipelineId', d.pipeline_id,
         'stageId', d.stage_id,
         'stageName', d.stage_name,
         'moduleId', d.module_id,
         'ownerUserId', d.owner_user_id,
         'ownerMemberId', d.owner_member_id,
         'sourceUpdatedAt', d.source_updated_at,
         'syncedAt', d.synced_at,
         'isDeleted', d.is_deleted
       ) AS source_payload
     FROM greenhouse_crm.deals AS d
     LEFT JOIN greenhouse_core.organizations AS org
       ON org.hubspot_company_id = d.hubspot_company_id
      AND org.active = TRUE
     LEFT JOIN primary_org_space AS pos
       ON pos.organization_id = org.organization_id
     LEFT JOIN primary_client_space AS pcs
       ON pcs.client_id = d.client_id
     LEFT JOIN greenhouse_core.client_users AS owner_user
       ON owner_user.user_id = d.owner_user_id
     LEFT JOIN LATERAL (
       SELECT er.rate
       FROM greenhouse_finance.exchange_rates AS er
       WHERE er.from_currency = COALESCE(NULLIF(trim(d.currency), ''), 'CLP')
         AND er.to_currency = 'CLP'
         AND er.rate_date::date <= COALESCE(d.close_date::date, CURRENT_DATE)
       ORDER BY er.rate_date DESC
       LIMIT 1
     ) AS fx ON TRUE
     WHERE ${conditions.join(' AND ')}
     ORDER BY COALESCE(d.source_updated_at, d.synced_at, d.updated_at) DESC NULLS LAST, d.hubspot_deal_id ASC`,
    values
  )
}

export const upsertCommercialDealFromHubSpotSource = async (
  sourceRow: HubSpotDealSourceRow
): Promise<UpsertCommercialDealResult> => {
  const db = await getDb()

  return db.transaction().execute(async trx => {
    await ensureHubSpotDealPipelineConfig(trx, sourceRow)

    const previousRow = await trx
      .selectFrom('greenhouse_commercial.deals')
      .selectAll()
      .where('hubspot_deal_id', '=', sourceRow.hubspot_deal_id)
      .executeTakeFirst()

    const previous = previousRow ? mapDeal(previousRow) : null
    const upsertValues = buildUpsertValues(sourceRow)

    const currentRow = await trx
      .insertInto('greenhouse_commercial.deals')
      .values(upsertValues)
      .onConflict(oc => oc.column('hubspot_deal_id').doUpdateSet({
        hubspot_pipeline_id: upsertValues.hubspot_pipeline_id ?? null,
        client_id: upsertValues.client_id ?? null,
        organization_id: upsertValues.organization_id ?? null,
        space_id: upsertValues.space_id ?? null,
        deal_name: upsertValues.deal_name,
        dealstage: upsertValues.dealstage,
        dealstage_label: upsertValues.dealstage_label ?? null,
        pipeline_name: upsertValues.pipeline_name ?? null,
        deal_type: upsertValues.deal_type ?? null,
        amount: upsertValues.amount ?? null,
        amount_clp: upsertValues.amount_clp ?? null,
        currency: upsertValues.currency,
        exchange_rate_to_clp: upsertValues.exchange_rate_to_clp ?? null,
        close_date: upsertValues.close_date ?? null,
        probability_pct: upsertValues.probability_pct ?? null,
        is_closed: upsertValues.is_closed ?? false,
        is_won: upsertValues.is_won ?? false,
        is_deleted: upsertValues.is_deleted ?? false,
        deal_owner_hubspot_user_id: upsertValues.deal_owner_hubspot_user_id ?? null,
        deal_owner_user_id: upsertValues.deal_owner_user_id ?? null,
        deal_owner_email: upsertValues.deal_owner_email ?? null,
        created_in_hubspot_at: sql`COALESCE(EXCLUDED.created_in_hubspot_at, greenhouse_commercial.deals.created_in_hubspot_at)`,
        hubspot_last_synced_at: upsertValues.hubspot_last_synced_at ?? new Date(),
        source_payload: upsertValues.source_payload as never
      }))
      .returningAll()
      .executeTakeFirstOrThrow()

    const current = mapDeal(currentRow)
    const transition = classifyDealTransition(previous, current)

    if (transition.action === 'created') {
      await publishDealCreated(
        {
          dealId: current.dealId,
          hubspotDealId: current.hubspotDealId,
          hubspotPipelineId: current.hubspotPipelineId,
          dealstage: current.dealstage,
          clientId: current.clientId,
          organizationId: current.organizationId,
          spaceId: current.spaceId,
          amountClp: current.amountClp,
          currency: current.currency,
          closeDate: current.closeDate
        },
        trx
      )
    }

    if (transition.action !== 'skipped') {
      await publishDealSynced(
        {
          dealId: current.dealId,
          hubspotDealId: current.hubspotDealId,
          hubspotPipelineId: current.hubspotPipelineId,
          dealstage: current.dealstage,
          clientId: current.clientId,
          organizationId: current.organizationId,
          spaceId: current.spaceId,
          action: transition.action,
          amountClp: current.amountClp,
          currency: current.currency,
          closeDate: current.closeDate,
          isClosed: current.isClosed,
          isWon: current.isWon,
          changedFields: transition.changedFields
        },
        trx
      )
    }

    if (transition.stageChanged) {
      await publishDealStageChanged(
        {
          dealId: current.dealId,
          hubspotDealId: current.hubspotDealId,
          hubspotPipelineId: current.hubspotPipelineId,
          dealstage: current.dealstage,
          clientId: current.clientId,
          organizationId: current.organizationId,
          spaceId: current.spaceId,
          previousPipelineId: previous?.hubspotPipelineId ?? null,
          previousDealstage: previous?.dealstage ?? null,
          previousStageLabel: previous?.dealstageLabel ?? null,
          currentStageLabel: current.dealstageLabel
        },
        trx
      )
    }

    if (transition.wonTransition) {
      await publishDealWon(
        {
          dealId: current.dealId,
          hubspotDealId: current.hubspotDealId,
          hubspotPipelineId: current.hubspotPipelineId,
          dealstage: current.dealstage,
          clientId: current.clientId,
          organizationId: current.organizationId,
          spaceId: current.spaceId,
          amountClp: current.amountClp,
          closeDate: current.closeDate
        },
        trx
      )
    }

    if (transition.lostTransition) {
      await publishDealLost(
        {
          dealId: current.dealId,
          hubspotDealId: current.hubspotDealId,
          hubspotPipelineId: current.hubspotPipelineId,
          dealstage: current.dealstage,
          clientId: current.clientId,
          organizationId: current.organizationId,
          spaceId: current.spaceId,
          closeDate: current.closeDate
        },
        trx
      )
    }

    return {
      action: transition.action,
      changedFields: transition.changedFields,
      deal: current
    }
  })
}

export const getCommercialDealByHubSpotId = async (
  hubspotDealId: string,
  dbOrTx?: DbLike
): Promise<CommercialDealEntry | null> => {
  const db = await getDbOrTx(dbOrTx)

  const row = await db
    .selectFrom('greenhouse_commercial.deals')
    .selectAll()
    .where('hubspot_deal_id', '=', hubspotDealId)
    .executeTakeFirst()

  return row ? mapDeal(row) : null
}

export const listCommercialDealsForOrganization = async (
  organizationId: string
): Promise<CommercialDealListItem[]> => {
  const rows = await query<DealRow>(
    `SELECT *
       FROM greenhouse_commercial.deals
      WHERE organization_id = $1
        AND is_deleted = FALSE
      ORDER BY is_closed ASC, is_won DESC, updated_at DESC NULLS LAST, deal_name ASC`,
    [organizationId]
  )

  return rows.map(row => {
    const deal = mapDeal(row)

    return {
      dealId: deal.dealId,
      hubspotDealId: deal.hubspotDealId,
      organizationId: deal.organizationId,
      dealName: deal.dealName,
      dealstage: deal.dealstage,
      dealstageLabel: deal.dealstageLabel,
      pipelineName: deal.pipelineName,
      amountClp: deal.amountClp,
      currency: deal.currency,
      isClosed: deal.isClosed,
      isWon: deal.isWon,
      updatedAt: deal.updatedAt
    }
  })
}

export const resolveDealForQuote = async (
  quotationIdOrFinanceQuoteId: string
): Promise<CommercialDealEntry | null> => {
  const rows = await query<DealRow>(
    `SELECT d.*
     FROM greenhouse_commercial.quotations AS q
     JOIN greenhouse_commercial.deals AS d
       ON d.hubspot_deal_id = q.hubspot_deal_id
     WHERE q.quotation_id = $1
        OR q.finance_quote_id = $1
     ORDER BY q.updated_at DESC
     LIMIT 1`,
    [quotationIdOrFinanceQuoteId]
  )

  return rows[0] ? mapDeal(rows[0]) : null
}

export const listQuotesForDeal = async (
  dealIdOrHubSpotDealId: string
): Promise<DealQuoteLinkEntry[]> => {
  const rows = await query<{
    quotation_id: string
    finance_quote_id: string | null
    quotation_number: string
    status: string
    hubspot_quote_id: string | null
    hubspot_deal_id: string | null
    client_id: string | null
    organization_id: string | null
    space_id: string | null
    total_amount_clp: string | number | null
    quote_date: string | Date | null
    sent_at: string | Date | null
  }>(
    `WITH target_deal AS (
       SELECT hubspot_deal_id
       FROM greenhouse_commercial.deals
       WHERE deal_id = $1 OR hubspot_deal_id = $1
       LIMIT 1
     )
     SELECT
       q.quotation_id,
       q.finance_quote_id,
       q.quotation_number,
       q.status,
       q.hubspot_quote_id,
       q.hubspot_deal_id,
       q.client_id,
       q.organization_id,
       q.space_id,
       q.total_amount_clp,
       q.quote_date,
       q.sent_at
     FROM greenhouse_commercial.quotations AS q
     JOIN target_deal AS td
       ON td.hubspot_deal_id = q.hubspot_deal_id
     ORDER BY q.quote_date DESC NULLS LAST, q.updated_at DESC`,
    [dealIdOrHubSpotDealId]
  )

  return rows.map(row => ({
    quotationId: row.quotation_id,
    financeQuoteId: row.finance_quote_id,
    quotationNumber: row.quotation_number,
    status: row.status,
    hubspotQuoteId: row.hubspot_quote_id,
    hubspotDealId: row.hubspot_deal_id,
    clientId: row.client_id,
    organizationId: row.organization_id,
    spaceId: row.space_id,
    totalAmountClp: toNumber(row.total_amount_clp),
    quoteDate: toDateString(row.quote_date),
    sentAt: toTimestampString(row.sent_at)
  }))
}
