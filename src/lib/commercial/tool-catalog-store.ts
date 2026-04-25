import type { PoolClient } from 'pg'
import type { Selectable } from 'kysely'

import { getDb, query, withTransaction } from '@/lib/db'
import type { DB } from '@/types/db'

import type {
  CanonicalBusinessLine,
  CommercialProviderType,
  ToolCatalogSeedRow
} from './tool-catalog-seed'
import {
  publishAiToolDeactivated,
  publishAiToolReactivated,
  publishToolCatalogSeedEvents
} from './tool-catalog-events'

type ToolRow = Selectable<DB['greenhouse_ai.tool_catalog']>

export interface ToolCatalogEntry {
  toolId: string
  toolSku: string | null
  toolName: string
  providerId: string
  vendor: string | null
  toolCategory: string
  toolSubcategory: string | null
  costModel: string
  subscriptionAmount: number | null
  subscriptionCurrency: string | null
  subscriptionBillingCycle: string | null
  subscriptionSeats: number | null
  proratingQty: number | null
  proratingUnit: string | null
  proratedCostUsd: number | null
  proratedPriceUsd: number | null
  applicableBusinessLines: string[]
  applicabilityTags: string[]
  includesInAddon: boolean
  notesForQuoting: string | null
  description: string | null
  websiteUrl: string | null
  iconUrl: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ListToolCatalogInput {
  businessLine?: CanonicalBusinessLine | null
  includesInAddon?: boolean | null
  active?: boolean | null
}

export interface ToolCatalogProviderInput {
  providerId: string
  providerName: string
  providerType: CommercialProviderType
  websiteUrl: string | null
}

export interface UpsertToolCatalogResult {
  toolId: string
  toolSku: string
  created: boolean
  changed: boolean
  costImpactChanged: boolean
}

const toNumber = (value: string | number | null | undefined): number | null => {
  if (value == null) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toTimestampString = (value: string | Date | null | undefined) => {
  if (!value) return ''
  if (typeof value === 'string') return value

  return value.toISOString()
}

const arraysEqual = (left: string[] | null | undefined, right: string[] | null | undefined) => {
  const a = [...(left || [])].sort()
  const b = [...(right || [])].sort()

  if (a.length !== b.length) return false

  return a.every((value, index) => value === b[index])
}

const numberChanged = (left: number | null | undefined, right: number | null | undefined, tolerance = 0.0001) => {
  const normalizedLeft = left ?? 0
  const normalizedRight = right ?? 0

  return Math.abs(normalizedLeft - normalizedRight) > tolerance
}

const mapTool = (row: ToolRow): ToolCatalogEntry => ({
  toolId: row.tool_id,
  toolSku: row.tool_sku,
  toolName: row.tool_name,
  providerId: row.provider_id,
  vendor: row.vendor,
  toolCategory: row.tool_category,
  toolSubcategory: row.tool_subcategory,
  costModel: row.cost_model,
  subscriptionAmount: toNumber(row.subscription_amount),
  subscriptionCurrency: row.subscription_currency,
  subscriptionBillingCycle: row.subscription_billing_cycle,
  subscriptionSeats: row.subscription_seats,
  proratingQty: toNumber(row.prorating_qty),
  proratingUnit: row.prorating_unit,
  proratedCostUsd: toNumber(row.prorated_cost_usd),
  proratedPriceUsd: toNumber(row.prorated_price_usd),
  applicableBusinessLines: row.applicable_business_lines || [],
  applicabilityTags: row.applicability_tags || [],
  includesInAddon: row.includes_in_addon,
  notesForQuoting: row.notes_for_quoting,
  description: row.description,
  websiteUrl: row.website_url,
  iconUrl: row.icon_url,
  isActive: row.is_active,
  sortOrder: row.sort_order,
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at)
})

const businessLineMatches = (entry: ToolCatalogEntry, businessLine: CanonicalBusinessLine) =>
  entry.applicableBusinessLines.includes(businessLine) ||
  entry.applicabilityTags.includes('all_business_lines')

export const listToolCatalog = async (input: ListToolCatalogInput = {}): Promise<ToolCatalogEntry[]> => {
  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_ai.tool_catalog')
    .selectAll()
    .orderBy('sort_order', 'asc')
    .orderBy('tool_name', 'asc')
    .execute()

  return rows
    .map(mapTool)
    .filter(entry => (input.active === false ? true : entry.isActive))
    .filter(entry => (input.includesInAddon == null ? true : entry.includesInAddon === input.includesInAddon))
    .filter(entry => (input.businessLine ? businessLineMatches(entry, input.businessLine) : true))
}

export const getToolBySku = async (toolSku: string): Promise<ToolCatalogEntry | null> => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_ai.tool_catalog')
    .selectAll()
    .where('tool_sku', '=', toolSku)
    .executeTakeFirst()

  return row ? mapTool(row) : null
}

export const getToolsForBusinessLine = async (businessLine: CanonicalBusinessLine) =>
  listToolCatalog({ businessLine, active: true })

const findExistingTool = async (toolSku: string, toolName: string, client: PoolClient) => {
  const result = await client.query<ToolRow>(
    `
      SELECT *
      FROM greenhouse_ai.tool_catalog
      WHERE tool_sku = $1
         OR lower(tool_name) = lower($2)
      ORDER BY CASE WHEN tool_sku = $1 THEN 0 ELSE 1 END, created_at ASC
      LIMIT 1
    `,
    [toolSku, toolName]
  )

  return result.rows[0] ?? null
}

export const ensureToolCatalogProvider = async (input: ToolCatalogProviderInput, client: PoolClient) => {
  await client.query(
    `
      INSERT INTO greenhouse_core.providers (
        provider_id,
        provider_name,
        legal_name,
        provider_type,
        website_url,
        status,
        active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $2, $3, $4, 'active', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (provider_id) DO UPDATE
      SET
        provider_name = EXCLUDED.provider_name,
        legal_name = EXCLUDED.legal_name,
        provider_type = COALESCE(greenhouse_core.providers.provider_type, EXCLUDED.provider_type),
        website_url = COALESCE(EXCLUDED.website_url, greenhouse_core.providers.website_url),
        status = 'active',
        active = TRUE,
        updated_at = CURRENT_TIMESTAMP
    `,
    [input.providerId, input.providerName, input.providerType, input.websiteUrl]
  )
}

export const upsertToolCatalogEntry = async (row: ToolCatalogSeedRow): Promise<UpsertToolCatalogResult> =>
  withTransaction(async client => {
    await ensureToolCatalogProvider(
      {
        providerId: row.providerId,
        providerName: row.providerName,
        providerType: row.providerType,
        websiteUrl: row.websiteUrl
      },
      client
    )

    const existing = await findExistingTool(row.toolSku, row.toolName, client)

    const costImpactChanged =
      !existing ||
      existing.cost_model !== row.costModel ||
      numberChanged(toNumber(existing.subscription_amount), row.subscriptionAmount) ||
      existing.subscription_currency !== row.subscriptionCurrency ||
      existing.subscription_billing_cycle !== row.subscriptionBillingCycle ||
      (existing.subscription_seats ?? null) !== row.subscriptionSeats

    if (!existing) {
      await client.query(
        `
          INSERT INTO greenhouse_ai.tool_catalog (
            tool_id,
            tool_sku,
            tool_name,
            provider_id,
            vendor,
            tool_category,
            tool_subcategory,
            cost_model,
            subscription_amount,
            subscription_currency,
            subscription_billing_cycle,
            subscription_seats,
            description,
            website_url,
            icon_url,
            prorating_qty,
            prorating_unit,
            prorated_cost_usd,
            prorated_price_usd,
            applicable_business_lines,
            applicability_tags,
            includes_in_addon,
            notes_for_quoting,
            is_active,
            sort_order,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9::numeric, $10, $11, $12, $13, $14, $15,
            $16::numeric, $17, $18::numeric, $19::numeric, $20::text[], $21::text[],
            $22, $23, $24, $25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `,
        [
          row.toolId,
          row.toolSku,
          row.toolName,
          row.providerId,
          row.vendor,
          row.toolCategory,
          row.toolSubcategory,
          row.costModel,
          row.subscriptionAmount,
          row.subscriptionCurrency,
          row.subscriptionBillingCycle,
          row.subscriptionSeats,
          row.description,
          row.websiteUrl,
          row.iconUrl,
          row.proratingQty,
          row.proratingUnit,
          row.proratedCostUsd,
          row.proratedPriceUsd,
          row.applicableBusinessLines,
          row.applicabilityTags,
          row.includesInAddon,
          row.notesForQuoting,
          row.isActive,
          row.sortOrder
        ]
      )

      await publishToolCatalogSeedEvents({
        client,
        toolId: row.toolId,
        providerId: row.providerId,
        created: true,
        costImpactChanged: true
      })

      return {
        toolId: row.toolId,
        toolSku: row.toolSku,
        created: true,
        changed: true,
        costImpactChanged: true
      }
    }

    const changed =
      existing.tool_sku !== row.toolSku ||
      existing.tool_name !== row.toolName ||
      existing.provider_id !== row.providerId ||
      (existing.vendor || null) !== row.vendor ||
      existing.tool_category !== row.toolCategory ||
      (existing.tool_subcategory || null) !== row.toolSubcategory ||
      existing.cost_model !== row.costModel ||
      numberChanged(toNumber(existing.subscription_amount), row.subscriptionAmount) ||
      (existing.subscription_currency || null) !== row.subscriptionCurrency ||
      (existing.subscription_billing_cycle || null) !== row.subscriptionBillingCycle ||
      (existing.subscription_seats ?? null) !== row.subscriptionSeats ||
      (existing.description || null) !== row.description ||
      (existing.website_url || null) !== row.websiteUrl ||
      (existing.icon_url || null) !== row.iconUrl ||
      numberChanged(toNumber(existing.prorating_qty), row.proratingQty) ||
      (existing.prorating_unit || null) !== row.proratingUnit ||
      numberChanged(toNumber(existing.prorated_cost_usd), row.proratedCostUsd) ||
      numberChanged(toNumber(existing.prorated_price_usd), row.proratedPriceUsd) ||
      !arraysEqual(existing.applicable_business_lines, row.applicableBusinessLines) ||
      !arraysEqual(existing.applicability_tags, row.applicabilityTags) ||
      existing.includes_in_addon !== row.includesInAddon ||
      (existing.notes_for_quoting || null) !== row.notesForQuoting ||
      existing.is_active !== row.isActive ||
      existing.sort_order !== row.sortOrder

    if (!changed) {
      return {
        toolId: existing.tool_id,
        toolSku: row.toolSku,
        created: false,
        changed: false,
        costImpactChanged
      }
    }

    await client.query(
      `
        UPDATE greenhouse_ai.tool_catalog
        SET
          tool_sku = $2,
          tool_name = $3,
          provider_id = $4,
          vendor = $5,
          tool_category = $6,
          tool_subcategory = $7,
          cost_model = $8,
          subscription_amount = $9::numeric,
          subscription_currency = $10,
          subscription_billing_cycle = $11,
          subscription_seats = $12,
          description = $13,
          website_url = $14,
          icon_url = $15,
          prorating_qty = $16::numeric,
          prorating_unit = $17,
          prorated_cost_usd = $18::numeric,
          prorated_price_usd = $19::numeric,
          applicable_business_lines = $20::text[],
          applicability_tags = $21::text[],
          includes_in_addon = $22,
          notes_for_quoting = $23,
          is_active = $24,
          sort_order = $25,
          updated_at = CURRENT_TIMESTAMP
        WHERE tool_id = $1
      `,
      [
        existing.tool_id,
        row.toolSku,
        row.toolName,
        row.providerId,
        row.vendor,
        row.toolCategory,
        row.toolSubcategory,
        row.costModel,
        row.subscriptionAmount,
        row.subscriptionCurrency,
        row.subscriptionBillingCycle,
        row.subscriptionSeats,
        row.description,
        row.websiteUrl,
        row.iconUrl,
        row.proratingQty,
        row.proratingUnit,
        row.proratedCostUsd,
        row.proratedPriceUsd,
        row.applicableBusinessLines,
        row.applicabilityTags,
        row.includesInAddon,
        row.notesForQuoting,
        row.isActive,
        row.sortOrder
      ]
    )

    await publishToolCatalogSeedEvents({
      client,
      toolId: existing.tool_id,
      providerId: row.providerId,
      created: false,
      costImpactChanged
    })

    return {
      toolId: existing.tool_id,
      toolSku: row.toolSku,
      created: false,
      changed: true,
      costImpactChanged
    }
  })

// TASK-546 Fase B — lifecycle transitions for AI tools. `upsertToolCatalogEntry`
// preserves the existing `is_active` on update, so active → inactive
// transitions only happen through explicit admin paths. These helpers make
// the event emission canonical and idempotent.
export const deactivateToolCatalogEntry = async (toolId: string): Promise<{ changed: boolean }> =>
  withTransaction(async client => {
    const existing = await client.query<{
      tool_id: string
      provider_id: string
      is_active: boolean
    }>(
      `SELECT tool_id, provider_id, is_active FROM greenhouse_ai.tool_catalog WHERE tool_id = $1`,
      [toolId]
    )

    const row = existing.rows[0]

    if (!row) return { changed: false }
    if (!row.is_active) return { changed: false }

    await client.query(
      `UPDATE greenhouse_ai.tool_catalog SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE tool_id = $1`,
      [toolId]
    )

    await publishAiToolDeactivated(
      {
        toolId: row.tool_id,
        providerId: row.provider_id,
        deactivatedAt: new Date().toISOString()
      },
      client
    )

    return { changed: true }
  })

export const reactivateToolCatalogEntry = async (toolId: string): Promise<{ changed: boolean }> =>
  withTransaction(async client => {
    const existing = await client.query<{
      tool_id: string
      provider_id: string
      is_active: boolean
    }>(
      `SELECT tool_id, provider_id, is_active FROM greenhouse_ai.tool_catalog WHERE tool_id = $1`,
      [toolId]
    )

    const row = existing.rows[0]

    if (!row) return { changed: false }
    if (row.is_active) return { changed: false }

    await client.query(
      `UPDATE greenhouse_ai.tool_catalog SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE tool_id = $1`,
      [toolId]
    )

    await publishAiToolReactivated(
      {
        toolId: row.tool_id,
        providerId: row.provider_id,
        reactivatedAt: new Date().toISOString()
      },
      client
    )

    return { changed: true }
  })

export const syncToolCatalogSkuSequence = async () => {
  await query(
    `
      SELECT setval(
        'greenhouse_ai.tool_sku_seq',
        GREATEST(
          COALESCE((
            SELECT MAX(CAST(SUBSTRING(tool_sku FROM 5) AS integer))
            FROM greenhouse_ai.tool_catalog
            WHERE tool_sku ~ '^ETG-[0-9]+$'
          ), 0),
          26
        ),
        TRUE
      )
    `
  )
}
