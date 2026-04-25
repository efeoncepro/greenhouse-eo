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

export type DealPipelineDefaultScope = 'global' | 'tenant' | 'business_line'

export interface DealCreationContextStage {
  stageId: string
  label: string
  displayOrder: number | null
  isClosed: boolean
  isWon: boolean
  isSelectableForCreate: boolean
  isDefault: boolean
}

export interface DealCreationContextPipeline {
  pipelineId: string
  label: string
  displayOrder: number | null
  active: boolean
  isDefault: boolean
  stages: DealCreationContextStage[]
}

export interface DealCreationContextOption {
  value: string
  label: string
  description: string | null
  displayOrder: number | null
  hidden: boolean
}

export interface DealCreationContextDefaultsSource {
  pipeline: 'tenant_policy' | 'business_line_policy' | 'global_policy' | 'single_option' | 'none'
  stage: 'tenant_policy' | 'business_line_policy' | 'global_policy' | 'pipeline_default' | 'single_option' | 'none'
  dealType: 'tenant_policy' | 'business_line_policy' | 'global_policy' | 'single_option' | 'none'
  priority: 'tenant_policy' | 'business_line_policy' | 'global_policy' | 'single_option' | 'none'
  owner: 'tenant_policy' | 'business_line_policy' | 'global_policy' | 'none'
}

export interface DealCreationContext {
  defaultPipelineId: string | null
  defaultStageId: string | null
  defaultDealType: string | null
  defaultPriority: string | null
  defaultOwnerHubspotUserId: string | null
  defaultsSource: DealCreationContextDefaultsSource
  readyToCreate: boolean
  blockingIssues: string[]
  dealTypeOptions: DealCreationContextOption[]
  priorityOptions: DealCreationContextOption[]
  pipelines: DealCreationContextPipeline[]
}

interface PipelineStageRow extends Record<string, unknown> {
  pipeline_id: string
  pipeline_label: string | null
  pipeline_display_order: number | null
  pipeline_active: boolean
  stage_id: string
  stage_label: string
  stage_display_order: number | null
  is_open_selectable: boolean
  is_closed: boolean
  is_won: boolean
  is_default_for_create: boolean
}

interface PipelineDefaultRow extends Record<string, unknown> {
  scope: DealPipelineDefaultScope
  scope_key: string
  pipeline_id: string
  stage_id: string | null
  deal_type: string | null
  priority: string | null
  owner_hubspot_user_id: string | null
}

interface DealPropertyConfigRow extends Record<string, unknown> {
  property_name: string
  hubspot_property_name: string
  label: string | null
  options_json: unknown
  missing_in_hubspot: boolean
}

const GLOBAL_DEFAULT_SCOPE_KEY = '__global__'

export interface GetDealCreationContextParams {
  tenantScope?: string | null
  businessLineCode?: string | null
}

/**
 * Reads the HubSpot deal pipeline registry and resolves which pipeline / stage
 * / owner should be used when creating a new deal. Tenant overrides win over
 * business-line, which win over global; within a pipeline the default stage is
 * the one flagged `is_default_for_create`, falling back to the first open
 * selectable stage by display order.
 */
export const getDealCreationContext = async (
  params: GetDealCreationContextParams = {}
): Promise<DealCreationContext> => {
  const tenantScope = params.tenantScope?.trim() || null
  const businessLineCode = params.businessLineCode?.trim() || null

  const structureRows = await query<PipelineStageRow>(
    `SELECT pipeline_id,
            pipeline_label,
            pipeline_display_order,
            pipeline_active,
            stage_id,
            stage_label,
            stage_display_order,
            is_open_selectable,
            is_closed,
            is_won,
            is_default_for_create
       FROM greenhouse_commercial.hubspot_deal_pipeline_config
      ORDER BY
        COALESCE(pipeline_display_order, 999999),
        pipeline_id,
        COALESCE(stage_display_order, 999999),
        stage_id`
  )

  const defaultRows = await query<PipelineDefaultRow>(
    `SELECT scope, scope_key, pipeline_id, stage_id, deal_type, priority, owner_hubspot_user_id
       FROM greenhouse_commercial.hubspot_deal_pipeline_defaults
      WHERE (scope = 'global' AND scope_key = $1)
         OR (scope = 'tenant' AND scope_key = COALESCE($2, ''))
         OR (scope = 'business_line' AND scope_key = COALESCE($3, ''))`,
    [GLOBAL_DEFAULT_SCOPE_KEY, tenantScope ?? '', businessLineCode ?? '']
  )

  const propertyRows = await query<DealPropertyConfigRow>(
    `SELECT property_name,
            hubspot_property_name,
            label,
            options_json,
            missing_in_hubspot
       FROM greenhouse_commercial.hubspot_deal_property_config
      WHERE property_name IN ('dealType', 'priority')`
  )

  const pipelineMap = new Map<string, DealCreationContextPipeline>()

  for (const row of structureRows) {
    let pipeline = pipelineMap.get(row.pipeline_id)

    if (!pipeline) {
      pipeline = {
        pipelineId: row.pipeline_id,
        label: row.pipeline_label && row.pipeline_label.trim().length > 0
          ? row.pipeline_label
          : row.pipeline_id,
        displayOrder: row.pipeline_display_order,
        active: Boolean(row.pipeline_active),
        isDefault: false,
        stages: []
      }
      pipelineMap.set(row.pipeline_id, pipeline)
    }

    pipeline.stages.push({
      stageId: row.stage_id,
      label: row.stage_label,
      displayOrder: row.stage_display_order,
      isClosed: Boolean(row.is_closed),
      isWon: Boolean(row.is_won),
      isSelectableForCreate: Boolean(row.is_open_selectable) && !row.is_closed,
      isDefault: Boolean(row.is_default_for_create)
    })
  }

  const pipelines = Array.from(pipelineMap.values())
  const activePipelines = pipelines.filter(p => p.active)

  const policyByScope: Record<DealPipelineDefaultScope, PipelineDefaultRow | null> = {
    tenant: null,
    business_line: null,
    global: null
  }

  for (const row of defaultRows) {
    if (row.scope === 'tenant' && row.scope_key === tenantScope) policyByScope.tenant = row
    else if (row.scope === 'business_line' && row.scope_key === businessLineCode) policyByScope.business_line = row
    else if (row.scope === 'global' && row.scope_key === GLOBAL_DEFAULT_SCOPE_KEY) policyByScope.global = row
  }

  let defaultPipelineId: string | null = null
  let defaultsSourcePipeline: DealCreationContextDefaultsSource['pipeline'] = 'none'
  let defaultsSourceDealType: DealCreationContextDefaultsSource['dealType'] = 'none'
  let defaultsSourcePriority: DealCreationContextDefaultsSource['priority'] = 'none'
  let defaultsSourceOwner: DealCreationContextDefaultsSource['owner'] = 'none'
  let defaultOwnerHubspotUserId: string | null = null
  let defaultDealType: string | null = null
  let defaultPriority: string | null = null
  const blockingIssues: string[] = []

  const resolvePipelineFromPolicy = (
    row: PipelineDefaultRow | null,
    source: Exclude<DealCreationContextDefaultsSource['pipeline'], 'single_option' | 'first_active' | 'none'>
  ) => {
    if (!row) return false
    const match = activePipelines.find(p => p.pipelineId === row.pipeline_id)

    if (!match) return false
    defaultPipelineId = match.pipelineId
    defaultsSourcePipeline = source

    if (row.owner_hubspot_user_id) {
      defaultOwnerHubspotUserId = row.owner_hubspot_user_id
      defaultsSourceOwner = source === 'tenant_policy'
        ? 'tenant_policy'
        : source === 'business_line_policy'
          ? 'business_line_policy'
          : 'global_policy'
    }

    return true
  }

  if (!resolvePipelineFromPolicy(policyByScope.tenant, 'tenant_policy')) {
    if (!resolvePipelineFromPolicy(policyByScope.business_line, 'business_line_policy')) {
      if (!resolvePipelineFromPolicy(policyByScope.global, 'global_policy')) {
        if (activePipelines.length === 1) {
          defaultPipelineId = activePipelines[0].pipelineId
          defaultsSourcePipeline = 'single_option'
        }
      }
    }
  }

  let defaultStageId: string | null = null
  let defaultsSourceStage: DealCreationContextDefaultsSource['stage'] = 'none'

  if (defaultPipelineId) {
    const chosenPipeline = pipelineMap.get(defaultPipelineId)!

    chosenPipeline.isDefault = true

    const selectableStages = chosenPipeline.stages.filter(s => s.isSelectableForCreate)

    const policyStageId =
      policyByScope.tenant?.pipeline_id === defaultPipelineId ? policyByScope.tenant?.stage_id
      : policyByScope.business_line?.pipeline_id === defaultPipelineId ? policyByScope.business_line?.stage_id
      : policyByScope.global?.pipeline_id === defaultPipelineId ? policyByScope.global?.stage_id
      : null

    const policyStageSource: DealCreationContextDefaultsSource['stage'] =
      policyByScope.tenant?.pipeline_id === defaultPipelineId && policyByScope.tenant?.stage_id
        ? 'tenant_policy'
        : policyByScope.business_line?.pipeline_id === defaultPipelineId && policyByScope.business_line?.stage_id
          ? 'business_line_policy'
          : policyByScope.global?.pipeline_id === defaultPipelineId && policyByScope.global?.stage_id
            ? 'global_policy'
            : 'none'

    if (policyStageId && selectableStages.some(s => s.stageId === policyStageId)) {
      defaultStageId = policyStageId
      defaultsSourceStage = policyStageSource
    } else {
      const pipelineDefaultStage = selectableStages.find(s => s.isDefault)

      if (pipelineDefaultStage) {
        defaultStageId = pipelineDefaultStage.stageId
        defaultsSourceStage = 'pipeline_default'
      } else if (selectableStages.length === 1) {
        defaultStageId = selectableStages[0].stageId
        defaultsSourceStage = 'single_option'
      } else if (selectableStages.length === 0) {
        blockingIssues.push(`pipeline:${defaultPipelineId}:no_selectable_stage`)
      }
    }

    if (defaultStageId) {
      const resolvedStage = chosenPipeline.stages.find(s => s.stageId === defaultStageId)

      if (resolvedStage) resolvedStage.isDefault = true
    }
  }

  const propertyMap = new Map(propertyRows.map(row => [row.property_name, row]))

  const parseOptions = (propertyName: 'dealType' | 'priority'): DealCreationContextOption[] => {
    const row = propertyMap.get(propertyName)

    if (!row || row.missing_in_hubspot) return []

    const payload = Array.isArray(row.options_json)
      ? row.options_json
      : typeof row.options_json === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(row.options_json)

              
return Array.isArray(parsed) ? parsed : []
            } catch {
              return []
            }
          })()
        : []

    return payload
      .filter(option => option && typeof option === 'object' && typeof option.value === 'string' && typeof option.label === 'string')
      .map(option => ({
        value: String(option.value),
        label: String(option.label),
        description: typeof option.description === 'string' ? option.description : null,
        displayOrder: typeof option.displayOrder === 'number' ? option.displayOrder : null,
        hidden: Boolean(option.hidden)
      }))
      .filter(option => !option.hidden)
      .sort((left, right) => {
        const leftOrder = left.displayOrder ?? Number.MAX_SAFE_INTEGER
        const rightOrder = right.displayOrder ?? Number.MAX_SAFE_INTEGER

        return leftOrder - rightOrder || left.label.localeCompare(right.label, 'es')
      })
  }

  const dealTypeOptions = parseOptions('dealType')
  const priorityOptions = parseOptions('priority')

  const resolveScopedPropertyDefault = (
    key: 'deal_type' | 'priority',
    options: DealCreationContextOption[],
    sourceSetter: (source: DealCreationContextDefaultsSource['dealType']) => void
  ) => {
    const candidates: Array<{
      value: string | null
      source: DealCreationContextDefaultsSource['dealType']
    }> = [
      { value: policyByScope.tenant?.[key] ?? null, source: 'tenant_policy' },
      { value: policyByScope.business_line?.[key] ?? null, source: 'business_line_policy' },
      { value: policyByScope.global?.[key] ?? null, source: 'global_policy' }
    ]

    for (const candidate of candidates) {
      if (candidate.value && options.some(option => option.value === candidate.value)) {
        sourceSetter(candidate.source)
        
return candidate.value
      }
    }

    if (options.length === 1) {
      sourceSetter('single_option')
      
return options[0].value
    }

    return null
  }

  defaultDealType = resolveScopedPropertyDefault('deal_type', dealTypeOptions, source => {
    defaultsSourceDealType = source
  })
  defaultPriority = resolveScopedPropertyDefault('priority', priorityOptions, source => {
    defaultsSourcePriority = source
  })

  if (activePipelines.length === 0) {
    blockingIssues.push('no_active_pipeline')
  }

  return {
    defaultPipelineId,
    defaultStageId,
    defaultDealType,
    defaultPriority,
    defaultOwnerHubspotUserId,
    defaultsSource: {
      pipeline: defaultsSourcePipeline,
      stage: defaultsSourceStage,
      dealType: defaultsSourceDealType,
      priority: defaultsSourcePriority,
      owner: defaultsSourceOwner
    },
    readyToCreate: blockingIssues.length === 0,
    blockingIssues,
    dealTypeOptions,
    priorityOptions,
    pipelines
  }
}

export interface DealSelectionValidationInput {
  pipelineId: string
  stageId: string
  context?: DealCreationContext | null
}

export interface DealSelectionValidationResult {
  valid: boolean
  errorCode?:
    | 'pipeline_unknown'
    | 'pipeline_inactive'
    | 'stage_unknown'
    | 'stage_not_in_pipeline'
    | 'stage_closed'
    | 'stage_not_selectable'
  pipelineLabel?: string | null
  stageLabel?: string | null
}

/**
 * Validates that a pipeline+stage pair is coherent for creating a new deal.
 * Uses the context resolver so readers can reuse the same truth.
 */
export const validateDealCreationSelection = async (
  input: DealSelectionValidationInput
): Promise<DealSelectionValidationResult> => {
  const context = input.context ?? await getDealCreationContext()
  const pipeline = context.pipelines.find(p => p.pipelineId === input.pipelineId)

  if (!pipeline) return { valid: false, errorCode: 'pipeline_unknown' }
  if (!pipeline.active) return { valid: false, errorCode: 'pipeline_inactive', pipelineLabel: pipeline.label }

  const stage = pipeline.stages.find(s => s.stageId === input.stageId)

  if (!stage) {
    const stillInConfig = context.pipelines
      .flatMap(p => p.stages.map(s => ({ pipelineId: p.pipelineId, ...s })))
      .find(s => s.stageId === input.stageId)

    if (stillInConfig && stillInConfig.pipelineId !== pipeline.pipelineId) {
      return { valid: false, errorCode: 'stage_not_in_pipeline', pipelineLabel: pipeline.label }
    }

    return { valid: false, errorCode: 'stage_unknown', pipelineLabel: pipeline.label }
  }

  if (stage.isClosed) {
    return {
      valid: false,
      errorCode: 'stage_closed',
      pipelineLabel: pipeline.label,
      stageLabel: stage.label
    }
  }

  if (!stage.isSelectableForCreate) {
    return {
      valid: false,
      errorCode: 'stage_not_selectable',
      pipelineLabel: pipeline.label,
      stageLabel: stage.label
    }
  }

  return { valid: true, pipelineLabel: pipeline.label, stageLabel: stage.label }
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
