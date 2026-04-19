import 'server-only'

import type { PoolClient } from 'pg'

import { getDb } from '@/lib/db'
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
  is_standalone: boolean
  category_at_sent: SalesContextCategory
}

interface SalesContextSourceRow {
  quotation_id: string
  space_id: string
  client_id: string | null
  hubspot_deal_id: string | null
  sales_context_at_sent: unknown
  lifecyclestage: string | null
  deal_id: string | null
  dealstage: string | null
}

const SALES_CONTEXT_SOURCE_SQL = `SELECT
  q.quotation_id,
  q.space_id,
  q.client_id,
  q.hubspot_deal_id,
  q.sales_context_at_sent,
  c.lifecyclestage,
  d.deal_id,
  d.dealstage
FROM greenhouse_commercial.quotations AS q
LEFT JOIN greenhouse_core.clients AS c
  ON c.client_id = q.client_id
LEFT JOIN greenhouse_commercial.deals AS d
  ON d.hubspot_deal_id = q.hubspot_deal_id
 AND d.space_id = q.space_id
WHERE q.quotation_id = $1
  AND q.space_id = $2`

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
  is_standalone: snapshot.isStandalone,
  category_at_sent: snapshot.categoryAtSent
})

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
    isStandalone,
    categoryAtSent: normalizeSalesContextCategory(
      value.category_at_sent ?? value.categoryAtSent
    )
  }
}

const buildSnapshotFromRow = (
  row: Pick<SalesContextSourceRow, 'lifecyclestage' | 'deal_id' | 'dealstage' | 'hubspot_deal_id'>,
  capturedAt: string
): SalesContextSnapshot => {
  const lifecyclestage = normalizeHubSpotLifecycleStage(row.lifecyclestage)
  const dealId = row.deal_id
  const hubspotDealId = row.hubspot_deal_id

  return {
    capturedAt,
    lifecyclestage,
    dealstage: row.dealstage,
    dealId,
    hubspotDealId,
    hubspotLeadId: null,
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
  spaceId,
  capturedAt
}: {
  quotationId: string
  spaceId: string
  capturedAt?: string
}): Promise<SalesContextSnapshot> => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_commercial.quotations as q')
    .leftJoin('greenhouse_core.clients as c', 'c.client_id', 'q.client_id')
    .leftJoin('greenhouse_commercial.deals as d', join =>
      join
        .onRef('d.hubspot_deal_id', '=', 'q.hubspot_deal_id')
        .onRef('d.space_id', '=', 'q.space_id')
    )
    .select([
      'q.quotation_id',
      'q.space_id',
      'q.client_id',
      'q.hubspot_deal_id',
      'q.sales_context_at_sent',
      'c.lifecyclestage',
      'd.deal_id',
      'd.dealstage'
    ])
    .where('q.quotation_id', '=', quotationId)
    .where('q.space_id', '=', spaceId)
    .executeTakeFirst()

  if (!row) {
    throw new Error('Quotation not found for sales context snapshot')
  }

  return buildSnapshotFromRow(row as SalesContextSourceRow, capturedAt ?? new Date().toISOString())
}

export const getQuoteSalesContext = async ({
  quotationId,
  spaceId
}: {
  quotationId: string
  spaceId: string
}): Promise<SalesContextSnapshot | null> => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_commercial.quotations')
    .select(['sales_context_at_sent'])
    .where('quotation_id', '=', quotationId)
    .where('space_id', '=', spaceId)
    .executeTakeFirst()

  return normalizeQuoteSalesContext(row?.sales_context_at_sent ?? null)
}

export const captureSalesContextAtSent = async ({
  quotationId,
  spaceId,
  client,
  capturedAt
}: {
  quotationId: string
  spaceId: string
  client: QueryableClient
  capturedAt?: string
}): Promise<SalesContextSnapshot> => {
  const source = await client.query<SalesContextSourceRow>(
    `${SALES_CONTEXT_SOURCE_SQL}
     FOR UPDATE`,
    [quotationId, spaceId]
  )

  const row = source.rows[0]

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

  await client.query(
    `UPDATE greenhouse_commercial.quotations
        SET sales_context_at_sent = $3::jsonb
      WHERE quotation_id = $1
        AND space_id = $2
        AND sales_context_at_sent IS NULL`,
    [quotationId, spaceId, JSON.stringify(toPersistedSalesContextSnapshot(snapshot))]
  )

  return snapshot
}
