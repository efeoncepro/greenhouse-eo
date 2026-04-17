import 'server-only'

import type { PoolClient, QueryResult } from 'pg'

import { query } from '@/lib/db'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

type QueryableClient = Pick<PoolClient, 'query'>

type CanonicalQuoteListRow = {
  quote_id: string
  client_id: string | null
  client_name: string | null
  quote_number: string | null
  quote_date: string | Date | null
  due_date: string | Date | null
  total_amount: string | number | null
  total_amount_clp: string | number | null
  currency: string | null
  status: string | null
  converted_to_income_id: string | null
  nubox_document_id: string | null
  source_system: string | null
  hubspot_quote_id: string | null
  hubspot_deal_id: string | null
}

type CanonicalQuoteDetailRow = CanonicalQuoteListRow & {
  organization_id: string | null
  expiry_date: string | Date | null
  description: string | null
  subtotal: string | number | null
  tax_rate: string | number | null
  tax_amount: string | number | null
  exchange_rate_to_clp: string | number | null
  nubox_sii_track_id: string | null
  nubox_emission_status: string | null
  dte_type_code: string | null
  dte_folio: string | null
  notes: string | null
  current_version: number | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

type CanonicalQuoteLineRow = {
  line_item_id: string
  quote_id: string
  product_id: string | null
  source_system: string | null
  line_number: number | null
  name: string
  description: string | null
  quantity: string | number | null
  unit_price: string | number | null
  discount_percent: string | number | null
  discount_amount: string | number | null
  tax_amount: string | number | null
  total_amount: string | number | null
  hubspot_line_item_id: string | null
  hubspot_product_id: string | null
  product_name: string | null
  product_sku: string | null
}

type TenantSpaceRow = { space_id: string }

const runQuery = async <T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
  client?: QueryableClient
) => {
  if (client) {
    const result = await client.query(text, values) as QueryResult<T>

    return result.rows
  }

  return query<T>(text, values)
}

const normalizeStatusForFinance = (status: string | null, legacyStatus: string | null) => {
  if (status === 'approved') {
    return 'accepted'
  }

  return legacyStatus || status || 'draft'
}

export const resolveFinanceQuoteTenantSpaceIds = async (tenant: TenantContext) => {
  const explicitSpaceId = tenant.spaceId?.trim()
  const organizationId = tenant.organizationId?.trim()
  const clientId = tenant.clientId?.trim()

  if (explicitSpaceId) {
    return [explicitSpaceId]
  }

  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  if (organizationId) {
    idx += 1
    conditions.push(`organization_id = $${idx}`)
    values.push(organizationId)
  }

  if (clientId) {
    idx += 1
    conditions.push(`client_id = $${idx}`)
    values.push(clientId)
  }

  if (conditions.length === 0) {
    return [] as string[]
  }

  const rows = await query<TenantSpaceRow>(
    `SELECT DISTINCT space_id
     FROM greenhouse_core.spaces
     WHERE active = TRUE
       AND (${conditions.join(' OR ')})
     ORDER BY space_id ASC`,
    values
  )

  return rows.map(row => row.space_id)
}

export const listFinanceQuotesFromCanonical = async ({
  tenant,
  status,
  clientId,
  source
}: {
  tenant: TenantContext
  status?: string | null
  clientId?: string | null
  source?: string | null
}) => {
  const spaceIds = await resolveFinanceQuoteTenantSpaceIds(tenant)

  if (spaceIds.length === 0) {
    return [] as CanonicalQuoteListRow[]
  }

  const values: unknown[] = [spaceIds]
  const conditions = ['q.space_id = ANY($1::text[])']

  if (status) {
    values.push(status)
    conditions.push(`COALESCE(q.legacy_status, q.status) = $${values.length}`)
  }

  if (clientId) {
    values.push(clientId)
    conditions.push(`q.client_id = $${values.length}`)
  }

  if (source) {
    values.push(source)
    conditions.push(`q.source_system = $${values.length}`)
  }

  return query<CanonicalQuoteListRow>(
    `SELECT
       COALESCE(q.finance_quote_id, q.quotation_id) AS quote_id,
       q.client_id,
       COALESCE(q.client_name_cache, org.organization_name, org.legal_name) AS client_name,
       q.quotation_number AS quote_number,
       q.quote_date,
       q.due_date,
       COALESCE(q.total_amount, q.total_price) AS total_amount,
       COALESCE(q.total_amount_clp, q.total_amount, q.total_price) AS total_amount_clp,
       q.currency,
       q.status,
       q.converted_to_income_id,
       q.nubox_document_id,
       q.source_system,
       q.hubspot_quote_id,
       q.hubspot_deal_id
     FROM greenhouse_commercial.quotations q
     LEFT JOIN greenhouse_core.organizations org
       ON org.organization_id = q.organization_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY q.quote_date DESC NULLS LAST, q.updated_at DESC
     LIMIT 200`,
    values
  )
}

export const getFinanceQuoteDetailFromCanonical = async ({
  tenant,
  quoteId
}: {
  tenant: TenantContext
  quoteId: string
}) => {
  const spaceIds = await resolveFinanceQuoteTenantSpaceIds(tenant)

  if (spaceIds.length === 0) {
    return null as CanonicalQuoteDetailRow | null
  }

  const rows = await query<CanonicalQuoteDetailRow>(
    `SELECT
       COALESCE(q.finance_quote_id, q.quotation_id) AS quote_id,
       q.client_id,
       q.organization_id,
       COALESCE(q.client_name_cache, org.organization_name, org.legal_name) AS client_name,
       q.quotation_number AS quote_number,
       q.quote_date,
       q.due_date,
       q.expiry_date,
       q.description,
       q.currency,
       q.subtotal,
       q.tax_rate,
       q.tax_amount,
       COALESCE(q.total_amount, q.total_price) AS total_amount,
       COALESCE(q.total_amount_clp, q.total_amount, q.total_price) AS total_amount_clp,
       q.exchange_rate_to_clp,
       q.status,
       q.converted_to_income_id,
       q.nubox_document_id,
       q.nubox_sii_track_id,
       q.nubox_emission_status,
       q.dte_type_code,
       q.dte_folio,
       q.source_system,
       q.hubspot_quote_id,
       q.hubspot_deal_id,
       q.notes,
       q.current_version,
       q.created_at,
       q.updated_at,
       q.legacy_status
     FROM greenhouse_commercial.quotations q
     LEFT JOIN greenhouse_core.organizations org
       ON org.organization_id = q.organization_id
     WHERE q.space_id = ANY($1::text[])
       AND (
         q.finance_quote_id = $2
         OR q.quotation_id = $2
         OR q.hubspot_quote_id = $2
         OR q.nubox_document_id = $2
       )
     LIMIT 1`,
    [spaceIds, quoteId]
  )

  return rows[0] ?? null
}

export const listFinanceQuoteLinesFromCanonical = async ({
  tenant,
  quoteId
}: {
  tenant: TenantContext
  quoteId: string
}) => {
  const spaceIds = await resolveFinanceQuoteTenantSpaceIds(tenant)

  if (spaceIds.length === 0) {
    return [] as CanonicalQuoteLineRow[]
  }

  return query<CanonicalQuoteLineRow>(
    `SELECT
       COALESCE(qli.finance_line_item_id, qli.line_item_id) AS line_item_id,
       COALESCE(q.finance_quote_id, q.quotation_id) AS quote_id,
       COALESCE(qli.finance_product_id, pc.finance_product_id, pc.product_id) AS product_id,
       qli.source_system,
       qli.line_number,
       qli.label AS name,
       qli.description,
       qli.quantity,
       qli.unit_price,
       qli.discount_value AS discount_percent,
       qli.discount_amount,
       qli.legacy_tax_amount AS tax_amount,
       COALESCE(qli.legacy_total_amount, qli.subtotal_after_discount, qli.subtotal_price) AS total_amount,
       qli.hubspot_line_item_id,
       qli.hubspot_product_id,
       pc.product_name,
       pc.legacy_sku AS product_sku
     FROM greenhouse_commercial.quotation_line_items qli
     JOIN greenhouse_commercial.quotations q
       ON q.quotation_id = qli.quotation_id
     LEFT JOIN greenhouse_commercial.product_catalog pc
       ON pc.product_id = qli.product_id
     WHERE q.space_id = ANY($1::text[])
       AND (
         q.finance_quote_id = $2
         OR q.quotation_id = $2
         OR q.hubspot_quote_id = $2
         OR q.nubox_document_id = $2
       )
     ORDER BY qli.sort_order ASC, qli.created_at ASC`,
    [spaceIds, quoteId]
  )
}

export const syncCanonicalFinanceProduct = async ({
  productId,
  client
}: {
  productId: string
  client?: QueryableClient
}) => {
  await runQuery(
    `INSERT INTO greenhouse_commercial.product_catalog (
       finance_product_id,
       hubspot_product_id,
       product_code,
       product_name,
       product_type,
       pricing_model,
       default_currency,
       default_unit_price,
       default_unit,
       description,
       active,
       sync_status,
       sync_direction,
       source_system,
       legacy_sku,
       legacy_category,
       created_by,
       last_synced_at,
       created_at,
       updated_at
     )
     SELECT
       p.product_id,
       p.hubspot_product_id,
       'EO-PRD-' || upper(substr(md5(p.product_id), 1, 12)),
       p.name,
       CASE
         WHEN COALESCE(p.category, '') IN ('license', 'licenses', 'software') THEN 'license'
         WHEN COALESCE(p.category, '') IN ('infrastructure', 'hosting') THEN 'infrastructure'
         ELSE 'service'
       END,
       CASE
         WHEN p.is_recurring = TRUE THEN 'retainer'
         ELSE 'fixed'
       END,
       COALESCE(NULLIF(trim(p.currency), ''), 'CLP'),
       p.unit_price,
       CASE
         WHEN p.is_recurring = TRUE THEN 'month'
         ELSE 'unit'
       END,
       p.description,
       COALESCE(p.is_active, TRUE),
       CASE
         WHEN p.hubspot_product_id IS NOT NULL THEN 'synced'
         ELSE 'local_only'
       END,
       CASE
         WHEN p.hubspot_product_id IS NOT NULL THEN 'bidirectional'
         ELSE 'greenhouse_only'
       END,
       COALESCE(NULLIF(trim(p.source_system), ''), 'manual'),
       p.sku,
       p.category,
       COALESCE(NULLIF(trim(p.created_by), ''), 'task-345-bridge'),
       p.hubspot_last_synced_at,
       COALESCE(p.created_at, CURRENT_TIMESTAMP),
       COALESCE(p.updated_at, CURRENT_TIMESTAMP)
     FROM greenhouse_finance.products p
     WHERE p.product_id = $1
     ON CONFLICT (finance_product_id) DO UPDATE SET
       hubspot_product_id = EXCLUDED.hubspot_product_id,
       product_name = EXCLUDED.product_name,
       default_currency = EXCLUDED.default_currency,
       default_unit_price = EXCLUDED.default_unit_price,
       default_unit = EXCLUDED.default_unit,
       description = EXCLUDED.description,
       active = EXCLUDED.active,
       sync_status = EXCLUDED.sync_status,
       sync_direction = EXCLUDED.sync_direction,
       source_system = EXCLUDED.source_system,
       legacy_sku = EXCLUDED.legacy_sku,
       legacy_category = EXCLUDED.legacy_category,
       last_synced_at = EXCLUDED.last_synced_at,
       updated_at = EXCLUDED.updated_at`,
    [productId],
    client
  )
}

const syncCanonicalQuoteProducts = async ({
  quoteId,
  client
}: {
  quoteId: string
  client?: QueryableClient
}) => {
  await runQuery(
    `INSERT INTO greenhouse_commercial.product_catalog (
       finance_product_id,
       hubspot_product_id,
       product_code,
       product_name,
       product_type,
       pricing_model,
       default_currency,
       default_unit_price,
       default_unit,
       description,
       active,
       sync_status,
       sync_direction,
       source_system,
       legacy_sku,
       legacy_category,
       created_by,
       last_synced_at,
       created_at,
       updated_at
     )
     SELECT DISTINCT
       p.product_id,
       p.hubspot_product_id,
       'EO-PRD-' || upper(substr(md5(p.product_id), 1, 12)),
       p.name,
       CASE
         WHEN COALESCE(p.category, '') IN ('license', 'licenses', 'software') THEN 'license'
         WHEN COALESCE(p.category, '') IN ('infrastructure', 'hosting') THEN 'infrastructure'
         ELSE 'service'
       END,
       CASE
         WHEN p.is_recurring = TRUE THEN 'retainer'
         ELSE 'fixed'
       END,
       COALESCE(NULLIF(trim(p.currency), ''), 'CLP'),
       p.unit_price,
       CASE
         WHEN p.is_recurring = TRUE THEN 'month'
         ELSE 'unit'
       END,
       p.description,
       COALESCE(p.is_active, TRUE),
       CASE
         WHEN p.hubspot_product_id IS NOT NULL THEN 'synced'
         ELSE 'local_only'
       END,
       CASE
         WHEN p.hubspot_product_id IS NOT NULL THEN 'bidirectional'
         ELSE 'greenhouse_only'
       END,
       COALESCE(NULLIF(trim(p.source_system), ''), 'manual'),
       p.sku,
       p.category,
       COALESCE(NULLIF(trim(p.created_by), ''), 'task-345-bridge'),
       p.hubspot_last_synced_at,
       COALESCE(p.created_at, CURRENT_TIMESTAMP),
       COALESCE(p.updated_at, CURRENT_TIMESTAMP)
     FROM greenhouse_finance.quote_line_items li
     JOIN greenhouse_finance.products p
       ON p.product_id = li.product_id
     WHERE li.quote_id = $1
     ON CONFLICT (finance_product_id) DO UPDATE SET
       hubspot_product_id = EXCLUDED.hubspot_product_id,
       product_name = EXCLUDED.product_name,
       default_currency = EXCLUDED.default_currency,
       default_unit_price = EXCLUDED.default_unit_price,
       default_unit = EXCLUDED.default_unit,
       description = EXCLUDED.description,
       active = EXCLUDED.active,
       sync_status = EXCLUDED.sync_status,
       sync_direction = EXCLUDED.sync_direction,
       source_system = EXCLUDED.source_system,
       legacy_sku = EXCLUDED.legacy_sku,
       legacy_category = EXCLUDED.legacy_category,
       last_synced_at = EXCLUDED.last_synced_at,
       updated_at = EXCLUDED.updated_at`,
    [quoteId],
    client
  )
}

const refreshCanonicalQuotationLines = async ({
  quoteId,
  client
}: {
  quoteId: string
  client?: QueryableClient
}) => {
  await runQuery(
    `DELETE FROM greenhouse_commercial.quotation_line_items
     WHERE finance_quote_id = $1
       AND finance_line_item_id IS NOT NULL
       AND finance_line_item_id NOT IN (
         SELECT line_item_id
         FROM greenhouse_finance.quote_line_items
         WHERE quote_id = $1
       )`,
    [quoteId],
    client
  )

  await runQuery(
    `INSERT INTO greenhouse_commercial.quotation_line_items (
       finance_line_item_id,
       finance_quote_id,
       quotation_id,
       version_number,
       product_id,
       finance_product_id,
       hubspot_line_item_id,
       hubspot_product_id,
       source_system,
       line_type,
       sort_order,
       line_number,
       label,
       description,
       unit,
       quantity,
       unit_cost,
       cost_breakdown,
       subtotal_cost,
       unit_price,
       subtotal_price,
       discount_type,
       discount_value,
       discount_amount,
       subtotal_after_discount,
       effective_margin_pct,
       recurrence_type,
       currency,
       legacy_tax_amount,
       legacy_total_amount,
       created_at,
       updated_at
     )
     SELECT
       li.line_item_id,
       li.quote_id,
       q.quotation_id,
       q.current_version,
       pc.product_id,
       li.product_id,
       li.hubspot_line_item_id,
       li.hubspot_product_id,
       COALESCE(NULLIF(trim(li.source_system), ''), 'manual'),
       'deliverable',
       COALESCE(li.line_number, ROW_NUMBER() OVER (PARTITION BY li.quote_id ORDER BY li.line_item_id)),
       li.line_number,
       li.name,
       li.description,
       CASE
         WHEN p.is_recurring = TRUE THEN 'month'
         ELSE 'unit'
       END,
       COALESCE(li.quantity, 1),
       p.cost_of_goods_sold,
       CASE
         WHEN p.cost_of_goods_sold IS NOT NULL THEN jsonb_build_object('legacyCostOfGoodsSold', p.cost_of_goods_sold)
         ELSE '{}'::jsonb
       END,
       CASE
         WHEN p.cost_of_goods_sold IS NOT NULL THEN p.cost_of_goods_sold * COALESCE(li.quantity, 1)
         ELSE NULL
       END,
       li.unit_price,
       CASE
         WHEN li.unit_price IS NOT NULL THEN li.unit_price * COALESCE(li.quantity, 1)
         ELSE NULL
       END,
       CASE
         WHEN COALESCE(li.discount_percent, 0) > 0 THEN 'percentage'
         WHEN COALESCE(li.discount_amount, 0) > 0 THEN 'fixed_amount'
         ELSE NULL
       END,
       CASE
         WHEN COALESCE(li.discount_percent, 0) > 0 THEN li.discount_percent
         WHEN COALESCE(li.discount_amount, 0) > 0 THEN li.discount_amount
         ELSE NULL
       END,
       COALESCE(li.discount_amount, 0),
       (COALESCE(li.unit_price, 0) * COALESCE(li.quantity, 1)) - COALESCE(li.discount_amount, 0),
       CASE
         WHEN (COALESCE(li.unit_price, 0) * COALESCE(li.quantity, 1)) - COALESCE(li.discount_amount, 0) > 0
              AND p.cost_of_goods_sold IS NOT NULL
         THEN ROUND((((COALESCE(li.unit_price, 0) * COALESCE(li.quantity, 1)) - COALESCE(li.discount_amount, 0) - (p.cost_of_goods_sold * COALESCE(li.quantity, 1)))
           / NULLIF((COALESCE(li.unit_price, 0) * COALESCE(li.quantity, 1)) - COALESCE(li.discount_amount, 0), 0)) * 100, 2)
         ELSE NULL
       END,
       CASE
         WHEN p.is_recurring = TRUE THEN 'recurring'
         ELSE 'inherit'
       END,
       COALESCE(NULLIF(trim(p.currency), ''), q.currency),
       li.tax_amount,
       li.total_amount,
       COALESCE(li.created_at, CURRENT_TIMESTAMP),
       COALESCE(li.updated_at, CURRENT_TIMESTAMP)
     FROM greenhouse_finance.quote_line_items li
     JOIN greenhouse_commercial.quotations q
       ON q.finance_quote_id = li.quote_id
     LEFT JOIN greenhouse_finance.products p
       ON p.product_id = li.product_id
     LEFT JOIN greenhouse_commercial.product_catalog pc
       ON pc.finance_product_id = li.product_id
     WHERE li.quote_id = $1
     ON CONFLICT (finance_line_item_id) DO UPDATE SET
       finance_quote_id = EXCLUDED.finance_quote_id,
       quotation_id = EXCLUDED.quotation_id,
       version_number = EXCLUDED.version_number,
       product_id = EXCLUDED.product_id,
       finance_product_id = EXCLUDED.finance_product_id,
       hubspot_line_item_id = EXCLUDED.hubspot_line_item_id,
       hubspot_product_id = EXCLUDED.hubspot_product_id,
       source_system = EXCLUDED.source_system,
       sort_order = EXCLUDED.sort_order,
       line_number = EXCLUDED.line_number,
       label = EXCLUDED.label,
       description = EXCLUDED.description,
       unit = EXCLUDED.unit,
       quantity = EXCLUDED.quantity,
       unit_cost = EXCLUDED.unit_cost,
       cost_breakdown = EXCLUDED.cost_breakdown,
       subtotal_cost = EXCLUDED.subtotal_cost,
       unit_price = EXCLUDED.unit_price,
       subtotal_price = EXCLUDED.subtotal_price,
       discount_type = EXCLUDED.discount_type,
       discount_value = EXCLUDED.discount_value,
       discount_amount = EXCLUDED.discount_amount,
       subtotal_after_discount = EXCLUDED.subtotal_after_discount,
       effective_margin_pct = EXCLUDED.effective_margin_pct,
       recurrence_type = EXCLUDED.recurrence_type,
       currency = EXCLUDED.currency,
       legacy_tax_amount = EXCLUDED.legacy_tax_amount,
       legacy_total_amount = EXCLUDED.legacy_total_amount,
       updated_at = EXCLUDED.updated_at`,
    [quoteId],
    client
  )
}

const refreshCanonicalQuotationSnapshot = async ({
  quoteId,
  client
}: {
  quoteId: string
  client?: QueryableClient
}) => {
  await runQuery(
    `UPDATE greenhouse_commercial.quotations q
     SET
       total_cost = agg.total_cost,
       total_price_before_discount = COALESCE(agg.total_price_before_discount, q.total_price_before_discount),
       total_discount = COALESCE(agg.total_discount, q.total_discount),
       total_price = COALESCE(agg.total_price_after_discount, q.total_price, q.total_amount),
       effective_margin_pct = CASE
         WHEN COALESCE(agg.total_price_after_discount, q.total_price, q.total_amount) > 0
              AND agg.total_cost IS NOT NULL
         THEN ROUND(((COALESCE(agg.total_price_after_discount, q.total_price, q.total_amount) - agg.total_cost)
           / NULLIF(COALESCE(agg.total_price_after_discount, q.total_price, q.total_amount), 0)) * 100, 2)
         ELSE q.effective_margin_pct
       END,
       updated_at = CURRENT_TIMESTAMP
     FROM (
       SELECT
         quotation_id,
         SUM(subtotal_cost) AS total_cost,
         SUM(subtotal_price) AS total_price_before_discount,
         SUM(discount_amount) AS total_discount,
         SUM(subtotal_after_discount) AS total_price_after_discount
       FROM greenhouse_commercial.quotation_line_items
       WHERE finance_quote_id = $1
       GROUP BY quotation_id
     ) agg
     WHERE q.quotation_id = agg.quotation_id`,
    [quoteId],
    client
  )

  await runQuery(
    `INSERT INTO greenhouse_commercial.quotation_versions (
       quotation_id,
       finance_quote_id,
       version_number,
       snapshot_json,
       total_cost,
       total_price,
       total_discount,
       effective_margin_pct,
       created_by,
       notes,
       created_at
     )
     SELECT
       q.quotation_id,
       q.finance_quote_id,
       q.current_version,
       COALESCE(
         jsonb_agg(
           jsonb_build_object(
             'lineItemId', COALESCE(qli.finance_line_item_id, qli.line_item_id),
             'label', qli.label,
             'description', qli.description,
             'quantity', qli.quantity,
             'unit', qli.unit,
             'unitPrice', qli.unit_price,
             'subtotalPrice', qli.subtotal_price,
             'discountAmount', qli.discount_amount,
             'subtotalAfterDiscount', qli.subtotal_after_discount,
             'sourceSystem', qli.source_system,
             'financeProductId', qli.finance_product_id,
             'productId', qli.product_id
           )
           ORDER BY qli.sort_order ASC, qli.created_at ASC
         ) FILTER (WHERE qli.line_item_id IS NOT NULL),
         '[]'::jsonb
       ),
       q.total_cost,
       COALESCE(q.total_price, q.total_amount),
       q.total_discount,
       q.effective_margin_pct,
       q.created_by,
       'TASK-345 compatibility snapshot refresh',
       q.updated_at
     FROM greenhouse_commercial.quotations q
     LEFT JOIN greenhouse_commercial.quotation_line_items qli
       ON qli.quotation_id = q.quotation_id
      AND qli.version_number = q.current_version
     WHERE q.finance_quote_id = $1
     GROUP BY
       q.quotation_id,
       q.finance_quote_id,
       q.current_version,
       q.total_cost,
       q.total_price,
       q.total_amount,
       q.total_discount,
       q.effective_margin_pct,
       q.created_by,
       q.updated_at
     ON CONFLICT (quotation_id, version_number) DO UPDATE SET
       finance_quote_id = EXCLUDED.finance_quote_id,
       snapshot_json = EXCLUDED.snapshot_json,
       total_cost = EXCLUDED.total_cost,
       total_price = EXCLUDED.total_price,
       total_discount = EXCLUDED.total_discount,
       effective_margin_pct = EXCLUDED.effective_margin_pct,
       created_by = EXCLUDED.created_by,
       notes = EXCLUDED.notes,
       created_at = EXCLUDED.created_at`,
    [quoteId],
    client
  )
}

export const syncCanonicalFinanceQuote = async ({
  quoteId,
  client
}: {
  quoteId: string
  client?: QueryableClient
}) => {
  await syncCanonicalQuoteProducts({ quoteId, client })

  await runQuery(
    `INSERT INTO greenhouse_commercial.quotations (
       finance_quote_id,
       quotation_number,
       legacy_status,
       client_name_cache,
       organization_id,
       space_id,
       client_id,
       pricing_model,
       status,
       current_version,
       currency,
       exchange_rate_to_clp,
       exchange_rates,
       exchange_snapshot_date,
       subtotal,
       tax_rate,
       tax_amount,
       total_amount,
       total_amount_clp,
       total_price_before_discount,
       total_discount,
       total_price,
       revenue_type,
       tcv,
       acv,
       quote_date,
       due_date,
       valid_until,
       expiry_date,
       billing_frequency,
       payment_terms_days,
       description,
       internal_notes,
       notes,
       converted_to_income_id,
       source_system,
       source_quote_id,
       hubspot_quote_id,
       hubspot_deal_id,
       hubspot_last_synced_at,
       nubox_document_id,
       nubox_sii_track_id,
       nubox_emission_status,
       dte_type_code,
       dte_folio,
       nubox_emitted_at,
       nubox_last_synced_at,
       space_resolution_source,
       created_by,
       created_at,
       updated_at
     )
     SELECT
       q.quote_id,
       COALESCE(NULLIF(trim(q.quote_number), ''), 'EO-QUO-' || upper(substr(md5(q.quote_id), 1, 12))),
       q.status,
       q.client_name,
       COALESCE(q.organization_id, scope.organization_id),
       scope.space_id,
       q.client_id,
       'project',
       CASE
         WHEN q.status = 'accepted' THEN 'approved'
         WHEN q.status = 'draft' THEN 'draft'
         WHEN q.status = 'sent' THEN 'sent'
         WHEN q.status = 'rejected' THEN 'rejected'
         WHEN q.status = 'expired' THEN 'expired'
         WHEN q.status = 'converted' THEN 'converted'
         ELSE 'draft'
       END,
       1,
       COALESCE(NULLIF(trim(q.currency), ''), 'CLP'),
       q.exchange_rate_to_clp,
       CASE
         WHEN q.exchange_rate_to_clp IS NOT NULL THEN jsonb_build_object('CLP', q.exchange_rate_to_clp)
         ELSE '{}'::jsonb
       END,
       q.quote_date,
       q.subtotal,
       q.tax_rate,
       q.tax_amount,
       q.total_amount,
       q.total_amount_clp,
       COALESCE(q.subtotal, q.total_amount),
       0,
       COALESCE(q.total_amount, q.total_amount_clp),
       'one_time',
       COALESCE(q.total_amount, q.total_amount_clp),
       COALESCE(q.total_amount, q.total_amount_clp),
       q.quote_date,
       q.due_date,
       COALESCE(q.due_date, q.expiry_date),
       q.expiry_date,
       'one_time',
       CASE
         WHEN q.quote_date IS NOT NULL AND q.due_date IS NOT NULL THEN GREATEST((q.due_date - q.quote_date), 0)
         ELSE 30
       END,
       q.description,
       q.notes,
       q.notes,
       q.converted_to_income_id,
       COALESCE(NULLIF(trim(q.source_system), ''), 'manual'),
       CASE
         WHEN COALESCE(NULLIF(trim(q.source_system), ''), 'manual') = 'hubspot' AND q.hubspot_quote_id IS NOT NULL THEN q.hubspot_quote_id
         WHEN COALESCE(NULLIF(trim(q.source_system), ''), 'manual') = 'nubox' AND q.nubox_document_id IS NOT NULL THEN q.nubox_document_id
         ELSE q.quote_id
       END,
       q.hubspot_quote_id,
       q.hubspot_deal_id,
       q.hubspot_last_synced_at,
       q.nubox_document_id,
       q.nubox_sii_track_id,
       q.nubox_emission_status,
       q.dte_type_code,
       q.dte_folio,
       q.nubox_emitted_at,
       q.nubox_last_synced_at,
       CASE
         WHEN scope.space_id IS NOT NULL AND q.organization_id IS NOT NULL THEN 'organization'
         WHEN scope.space_id IS NOT NULL AND q.client_id IS NOT NULL THEN 'client'
         ELSE 'unresolved'
       END,
       COALESCE(NULLIF(trim(q.created_by), ''), 'task-345-bridge'),
       COALESCE(q.created_at, CURRENT_TIMESTAMP),
       COALESCE(q.updated_at, CURRENT_TIMESTAMP)
     FROM greenhouse_finance.quotes q
     LEFT JOIN LATERAL (
       SELECT
         s.space_id,
         s.organization_id
       FROM greenhouse_core.spaces s
       WHERE s.active = TRUE
         AND (
           (q.organization_id IS NOT NULL AND s.organization_id = q.organization_id)
           OR (q.organization_id IS NULL AND q.client_id IS NOT NULL AND s.client_id = q.client_id)
         )
       ORDER BY
         CASE
           WHEN q.organization_id IS NOT NULL AND s.organization_id = q.organization_id THEN 0
           ELSE 1
         END,
         s.updated_at DESC NULLS LAST,
         s.created_at DESC NULLS LAST,
         s.space_id ASC
       LIMIT 1
     ) scope ON TRUE
     WHERE q.quote_id = $1
     ON CONFLICT (finance_quote_id) DO UPDATE SET
       quotation_number = EXCLUDED.quotation_number,
       legacy_status = EXCLUDED.legacy_status,
       client_name_cache = EXCLUDED.client_name_cache,
       organization_id = EXCLUDED.organization_id,
       space_id = EXCLUDED.space_id,
       client_id = EXCLUDED.client_id,
       status = EXCLUDED.status,
       currency = EXCLUDED.currency,
       exchange_rate_to_clp = EXCLUDED.exchange_rate_to_clp,
       exchange_rates = EXCLUDED.exchange_rates,
       exchange_snapshot_date = EXCLUDED.exchange_snapshot_date,
       subtotal = EXCLUDED.subtotal,
       tax_rate = EXCLUDED.tax_rate,
       tax_amount = EXCLUDED.tax_amount,
       total_amount = EXCLUDED.total_amount,
       total_amount_clp = EXCLUDED.total_amount_clp,
       total_price_before_discount = EXCLUDED.total_price_before_discount,
       total_discount = EXCLUDED.total_discount,
       total_price = EXCLUDED.total_price,
       revenue_type = EXCLUDED.revenue_type,
       tcv = EXCLUDED.tcv,
       acv = EXCLUDED.acv,
       quote_date = EXCLUDED.quote_date,
       due_date = EXCLUDED.due_date,
       valid_until = EXCLUDED.valid_until,
       expiry_date = EXCLUDED.expiry_date,
       payment_terms_days = EXCLUDED.payment_terms_days,
       description = EXCLUDED.description,
       internal_notes = EXCLUDED.internal_notes,
       notes = EXCLUDED.notes,
       converted_to_income_id = EXCLUDED.converted_to_income_id,
       source_system = EXCLUDED.source_system,
       source_quote_id = EXCLUDED.source_quote_id,
       hubspot_quote_id = EXCLUDED.hubspot_quote_id,
       hubspot_deal_id = EXCLUDED.hubspot_deal_id,
       hubspot_last_synced_at = EXCLUDED.hubspot_last_synced_at,
       nubox_document_id = EXCLUDED.nubox_document_id,
       nubox_sii_track_id = EXCLUDED.nubox_sii_track_id,
       nubox_emission_status = EXCLUDED.nubox_emission_status,
       dte_type_code = EXCLUDED.dte_type_code,
       dte_folio = EXCLUDED.dte_folio,
       nubox_emitted_at = EXCLUDED.nubox_emitted_at,
       nubox_last_synced_at = EXCLUDED.nubox_last_synced_at,
       space_resolution_source = EXCLUDED.space_resolution_source,
       updated_at = EXCLUDED.updated_at`,
    [quoteId],
    client
  )

  await refreshCanonicalQuotationLines({ quoteId, client })
  await refreshCanonicalQuotationSnapshot({ quoteId, client })
}

export const mapCanonicalQuoteListRow = (row: CanonicalQuoteListRow) => ({
  quoteId: String(row.quote_id),
  clientId: row.client_id ? String(row.client_id) : null,
  clientName: row.client_name ? String(row.client_name) : null,
  quoteNumber: row.quote_number ? String(row.quote_number) : null,
  quoteDate: row.quote_date ? new Date(String(row.quote_date)).toISOString().slice(0, 10) : null,
  dueDate: row.due_date ? new Date(String(row.due_date)).toISOString().slice(0, 10) : null,
  totalAmount: Number(row.total_amount ?? 0),
  totalAmountClp: Number(row.total_amount_clp ?? row.total_amount ?? 0),
  currency: String(row.currency || 'CLP'),
  status: normalizeStatusForFinance(row.status, null),
  convertedToIncomeId: row.converted_to_income_id ? String(row.converted_to_income_id) : null,
  nuboxDocumentId: row.nubox_document_id ? String(row.nubox_document_id) : null,
  source: String(row.source_system || 'manual'),
  hubspotQuoteId: row.hubspot_quote_id ? String(row.hubspot_quote_id) : null,
  hubspotDealId: row.hubspot_deal_id ? String(row.hubspot_deal_id) : null,
  isFromNubox: Boolean(row.nubox_document_id)
})

export const mapCanonicalQuoteDetailRow = (row: CanonicalQuoteDetailRow & { legacy_status?: string | null }) => ({
  quoteId: String(row.quote_id),
  clientId: row.client_id ? String(row.client_id) : null,
  organizationId: row.organization_id ? String(row.organization_id) : null,
  clientName: row.client_name ? String(row.client_name) : null,
  quoteNumber: row.quote_number ? String(row.quote_number) : null,
  quoteDate: row.quote_date ? new Date(String(row.quote_date)).toISOString().slice(0, 10) : null,
  dueDate: row.due_date ? new Date(String(row.due_date)).toISOString().slice(0, 10) : null,
  expiryDate: row.expiry_date ? new Date(String(row.expiry_date)).toISOString().slice(0, 10) : null,
  description: row.description ? String(row.description) : null,
  currency: String(row.currency || 'CLP'),
  subtotal: row.subtotal !== null ? Number(row.subtotal) : null,
  taxRate: row.tax_rate !== null ? Number(row.tax_rate) : null,
  taxAmount: row.tax_amount !== null ? Number(row.tax_amount) : null,
  totalAmount: Number(row.total_amount ?? 0),
  totalAmountClp: Number(row.total_amount_clp ?? row.total_amount ?? 0),
  exchangeRateToClp: row.exchange_rate_to_clp !== null ? Number(row.exchange_rate_to_clp) : null,
  status: normalizeStatusForFinance(row.status, row.legacy_status ?? null),
  convertedToIncomeId: row.converted_to_income_id ? String(row.converted_to_income_id) : null,
  nuboxDocumentId: row.nubox_document_id ? String(row.nubox_document_id) : null,
  nuboxSiiTrackId: row.nubox_sii_track_id ? String(row.nubox_sii_track_id) : null,
  nuboxEmissionStatus: row.nubox_emission_status ? String(row.nubox_emission_status) : null,
  dteTypeCode: row.dte_type_code ? String(row.dte_type_code) : null,
  dteFolio: row.dte_folio ? String(row.dte_folio) : null,
  source: String(row.source_system || 'manual'),
  hubspotQuoteId: row.hubspot_quote_id ? String(row.hubspot_quote_id) : null,
  hubspotDealId: row.hubspot_deal_id ? String(row.hubspot_deal_id) : null,
  notes: row.notes ? String(row.notes) : null,
  currentVersion: row.current_version !== null && row.current_version !== undefined ? Number(row.current_version) : null,
  createdAt: row.created_at ? String(row.created_at) : null,
  updatedAt: row.updated_at ? String(row.updated_at) : null
})

export const mapCanonicalQuoteLineRow = (row: CanonicalQuoteLineRow) => ({
  lineItemId: String(row.line_item_id),
  quoteId: String(row.quote_id),
  productId: row.product_id ? String(row.product_id) : null,
  source: String(row.source_system || 'manual'),
  lineNumber: row.line_number ? Number(row.line_number) : null,
  name: String(row.name),
  description: row.description ? String(row.description) : null,
  quantity: Number(row.quantity ?? 0),
  unitPrice: Number(row.unit_price ?? 0),
  discountPercent: row.discount_percent !== null ? Number(row.discount_percent) : null,
  discountAmount: row.discount_amount !== null ? Number(row.discount_amount) : null,
  taxAmount: row.tax_amount !== null ? Number(row.tax_amount) : null,
  totalAmount: row.total_amount !== null ? Number(row.total_amount) : null,
  hubspotLineItemId: row.hubspot_line_item_id ? String(row.hubspot_line_item_id) : null,
  hubspotProductId: row.hubspot_product_id ? String(row.hubspot_product_id) : null,
  product: row.product_name ? { name: String(row.product_name), sku: row.product_sku ? String(row.product_sku) : null } : null
})
