import 'server-only'

import type { PoolClient } from 'pg'

import {
  resolveQuoteDeliveryModel,
  type CommercialModel,
  type StaffingModel
} from '@/lib/commercial/delivery-model'
import { query } from '@/lib/db'
import {
  normalizeHubSpotLifecycleStage,
  type ClientLifecycleStage
} from '@/lib/hubspot/company-lifecycle-store'

type QueryableClient = Pick<PoolClient, 'query'>

const SALES_CONTEXT_CATEGORIES = ['deal', 'contract', 'pre-sales'] as const

export type SalesContextCategory = (typeof SALES_CONTEXT_CATEGORIES)[number]

const SALES_CONTEXT_CATEGORY_SET = new Set<string>(SALES_CONTEXT_CATEGORIES)

export interface SalesContextSnapshot {
  capturedAt: string
  lifecyclestage: ClientLifecycleStage
  dealstage: string | null
  dealId: string | null
  hubspotDealId: string | null
  hubspotLeadId: string | null
  pricingModel: string
  commercialModel: CommercialModel
  staffingModel: StaffingModel
  isStandalone: boolean
  categoryAtSent: SalesContextCategory
}

interface PersistedSalesContextSnapshot {
  captured_at: string
  lifecyclestage: string
  dealstage: string | null
  deal_id: string | null
  hubspot_deal_id: string | null
  hubspot_lead_id: string | null
  pricing_model: string
  commercial_model: CommercialModel
  staffing_model: StaffingModel
  is_standalone: boolean
  category_at_sent: SalesContextCategory
}

interface SalesContextSourceRow extends Record<string, unknown> {
  quotation_id: string
  organization_id: string | null
  space_id: string | null
  client_id: string | null
  hubspot_deal_id: string | null
  sales_context_at_sent: unknown
  pricing_model: string | null
  commercial_model: string | null
  staffing_model: string | null
  lifecyclestage: string | null
  deal_id: string | null
  dealstage: string | null
}

const SALES_CONTEXT_SOURCE_SQL = `SELECT
  q.quotation_id,
  q.organization_id,
  q.space_id,
  q.client_id,
  q.hubspot_deal_id,
  q.sales_context_at_sent,
  q.pricing_model,
  q.commercial_model,
  q.staffing_model,
  c.lifecyclestage,
  d.deal_id,
  d.dealstage
FROM greenhouse_commercial.quotations AS q
LEFT JOIN greenhouse_core.clients AS c
  ON c.client_id = q.client_id
LEFT JOIN greenhouse_commercial.deals AS d
  ON d.hubspot_deal_id = q.hubspot_deal_id
 AND (
   (q.space_id IS NOT NULL AND d.space_id = q.space_id)
   OR (
     q.space_id IS NULL
     AND q.organization_id IS NOT NULL
     AND d.organization_id = q.organization_id
   )
 )
WHERE q.quotation_id = $1`

const SALES_CONTEXT_LOCK_SQL = `SELECT q.quotation_id
FROM greenhouse_commercial.quotations AS q
WHERE q.quotation_id = $1`

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toIsoString = (value: unknown): string | null => {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value

  return null
}

const normalizeSalesContextCategory = (value: unknown): SalesContextCategory => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''

  return SALES_CONTEXT_CATEGORY_SET.has(normalized)
    ? normalized as SalesContextCategory
    : 'pre-sales'
}

const toPersistedSalesContextSnapshot = (
  snapshot: SalesContextSnapshot
): PersistedSalesContextSnapshot => ({
  captured_at: snapshot.capturedAt,
  lifecyclestage: snapshot.lifecyclestage,
  dealstage: snapshot.dealstage,
  deal_id: snapshot.dealId,
  hubspot_deal_id: snapshot.hubspotDealId,
  hubspot_lead_id: snapshot.hubspotLeadId,
  pricing_model: snapshot.pricingModel,
  commercial_model: snapshot.commercialModel,
  staffing_model: snapshot.staffingModel,
  is_standalone: snapshot.isStandalone,
  category_at_sent: snapshot.categoryAtSent
})

const buildSalesContextScopeClause = ({
  tableAlias = 'q',
  organizationId,
  spaceId,
  startIndex
}: {
  tableAlias?: string
  organizationId?: string | null
  spaceId?: string | null
  startIndex: number
}) => {
  const params: string[] = []
  const conditions: string[] = []
  let nextIndex = startIndex

  if (organizationId) {
    params.push(organizationId)
    conditions.push(`${tableAlias}.organization_id = $${nextIndex}`)
    nextIndex += 1
  }

  if (spaceId) {
    params.push(spaceId)
    conditions.push(`${tableAlias}.space_id = $${nextIndex}`)
    nextIndex += 1
  }

  return {
    params,
    sql: conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : ''
  }
}

const loadSalesContextSource = async ({
  quotationId,
  organizationId,
  spaceId,
  client,
  lockForUpdate = false
}: {
  quotationId: string
  organizationId?: string | null
  spaceId?: string | null
  client?: QueryableClient
  lockForUpdate?: boolean
}) => {
  const scope = buildSalesContextScopeClause({
    tableAlias: 'q',
    organizationId,
    spaceId,
    startIndex: 2
  })

  const params: unknown[] = [quotationId, ...scope.params]

  if (client && lockForUpdate) {
    const lockSql = `${SALES_CONTEXT_LOCK_SQL}${scope.sql}\nFOR UPDATE`
    const lockResult = await client.query<{ quotation_id: string }>(lockSql, params)

    if (lockResult.rows.length === 0) {
      return null
    }

    const result = await client.query<SalesContextSourceRow>(
      `${SALES_CONTEXT_SOURCE_SQL}${scope.sql}`,
      params
    )

    return result.rows[0] ?? null
  }

  const sql = `${SALES_CONTEXT_SOURCE_SQL}${scope.sql}`

  if (client) {
    const result = await client.query<SalesContextSourceRow>(sql, params)

    return result.rows[0] ?? null
  }

  const rows = await query<SalesContextSourceRow>(sql, params)

  return rows[0] ?? null
}

export const deriveSalesContextCategory = ({
  lifecyclestage,
  dealId,
  hubspotDealId
}: {
  lifecyclestage: ClientLifecycleStage
  dealId: string | null
  hubspotDealId: string | null
}): SalesContextCategory => {
  if (dealId || hubspotDealId) {
    return 'deal'
  }

  if (lifecyclestage === 'customer' || lifecyclestage === 'evangelist') {
    return 'contract'
  }

  return 'pre-sales'
}

export const normalizeQuoteSalesContext = (
  value: unknown
): SalesContextSnapshot | null => {
  if (!isRecord(value)) return null

  const capturedAt =
    toIsoString(value.captured_at) ??
    toIsoString(value.capturedAt) ??
    new Date().toISOString()

  const lifecyclestage = normalizeHubSpotLifecycleStage(
    typeof value.lifecyclestage === 'string'
      ? value.lifecyclestage
      : typeof value.lifecycleStage === 'string'
        ? value.lifecycleStage
        : null
  )

  const dealId =
    typeof value.deal_id === 'string'
      ? value.deal_id
      : typeof value.dealId === 'string'
        ? value.dealId
        : null

  const hubspotDealId =
    typeof value.hubspot_deal_id === 'string'
      ? value.hubspot_deal_id
      : typeof value.hubspotDealId === 'string'
        ? value.hubspotDealId
        : null

  const dealstage =
    typeof value.dealstage === 'string'
      ? value.dealstage
      : null

  const hubspotLeadId =
    typeof value.hubspot_lead_id === 'string'
      ? value.hubspot_lead_id
      : typeof value.hubspotLeadId === 'string'
        ? value.hubspotLeadId
        : null

  const deliveryModel = resolveQuoteDeliveryModel({
    pricingModel:
      typeof value.pricing_model === 'string'
        ? value.pricing_model
        : typeof value.pricingModel === 'string'
          ? value.pricingModel
          : undefined,
    commercialModel:
      typeof value.commercial_model === 'string'
        ? value.commercial_model
        : typeof value.commercialModel === 'string'
          ? value.commercialModel
          : undefined,
    staffingModel:
      typeof value.staffing_model === 'string'
        ? value.staffing_model
        : typeof value.staffingModel === 'string'
          ? value.staffingModel
          : undefined
  })

  const isStandalone =
    typeof value.is_standalone === 'boolean'
      ? value.is_standalone
      : typeof value.isStandalone === 'boolean'
        ? value.isStandalone
        : !(dealId || hubspotDealId)

  return {
    capturedAt,
    lifecyclestage,
    dealstage,
    dealId,
    hubspotDealId,
    hubspotLeadId,
    pricingModel: deliveryModel.pricingModel,
    commercialModel: deliveryModel.commercialModel,
    staffingModel: deliveryModel.staffingModel,
    isStandalone,
    categoryAtSent: normalizeSalesContextCategory(
      value.category_at_sent ?? value.categoryAtSent
    )
  }
}

const buildSnapshotFromRow = (
  row: Pick<
    SalesContextSourceRow,
    | 'lifecyclestage'
    | 'deal_id'
    | 'dealstage'
    | 'hubspot_deal_id'
    | 'pricing_model'
    | 'commercial_model'
    | 'staffing_model'
  >,
  capturedAt: string
): SalesContextSnapshot => {
  const lifecyclestage = normalizeHubSpotLifecycleStage(row.lifecyclestage)
  const dealId = row.deal_id
  const hubspotDealId = row.hubspot_deal_id

  const deliveryModel = resolveQuoteDeliveryModel({
    pricingModel: row.pricing_model,
    commercialModel: row.commercial_model,
    staffingModel: row.staffing_model
  })

  return {
    capturedAt,
    lifecyclestage,
    dealstage: row.dealstage,
    dealId,
    hubspotDealId,
    hubspotLeadId: null,
    pricingModel: deliveryModel.pricingModel,
    commercialModel: deliveryModel.commercialModel,
    staffingModel: deliveryModel.staffingModel,
    isStandalone: !(dealId || hubspotDealId),
    categoryAtSent: deriveSalesContextCategory({
      lifecyclestage,
      dealId,
      hubspotDealId
    })
  }
}

export const buildSalesContextSnapshot = async ({
  quotationId,
  organizationId,
  spaceId,
  capturedAt
}: {
  quotationId: string
  organizationId?: string | null
  spaceId?: string | null
  capturedAt?: string
}): Promise<SalesContextSnapshot> => {
  const row = await loadSalesContextSource({
    quotationId,
    organizationId,
    spaceId
  })

  if (!row) {
    throw new Error('Quotation not found for sales context snapshot')
  }

  return buildSnapshotFromRow(row as SalesContextSourceRow, capturedAt ?? new Date().toISOString())
}

export const getQuoteSalesContext = async ({
  quotationId,
  organizationId,
  spaceId
}: {
  quotationId: string
  organizationId?: string | null
  spaceId?: string | null
}): Promise<SalesContextSnapshot | null> => {
  const row = await loadSalesContextSource({
    quotationId,
    organizationId,
    spaceId
  })

  return normalizeQuoteSalesContext(row?.sales_context_at_sent ?? null)
}

export const captureSalesContextAtSent = async ({
  quotationId,
  organizationId,
  spaceId,
  client,
  capturedAt
}: {
  quotationId: string
  organizationId?: string | null
  spaceId?: string | null
  client: QueryableClient
  capturedAt?: string
}): Promise<SalesContextSnapshot> => {
  const row = await loadSalesContextSource({
    quotationId,
    organizationId,
    spaceId,
    client,
    lockForUpdate: true
  })

  if (!row) {
    throw new Error('Quotation not found for sales context snapshot')
  }

  const existing = normalizeQuoteSalesContext(row.sales_context_at_sent)

  if (existing) {
    return existing
  }

  const snapshot = buildSnapshotFromRow(
    row,
    capturedAt ?? new Date().toISOString()
  )

  const scope = buildSalesContextScopeClause({
    tableAlias: 'greenhouse_commercial.quotations',
    organizationId,
    spaceId,
    startIndex: 2
  })

  const snapshotPlaceholder = scope.params.length + 2

  await client.query(
    `UPDATE greenhouse_commercial.quotations
        SET sales_context_at_sent = $${snapshotPlaceholder}::jsonb
      WHERE quotation_id = $1
        ${scope.sql ? scope.sql.replace(/^ AND /, 'AND ') : ''}
        AND sales_context_at_sent IS NULL`,
    [
      quotationId,
      ...scope.params,
      JSON.stringify(toPersistedSalesContextSnapshot(snapshot))
    ]
  )

  return snapshot
}
