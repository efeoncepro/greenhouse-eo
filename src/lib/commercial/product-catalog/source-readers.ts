import 'server-only'

import type { PoolClient } from 'pg'

// TASK-546 Fase B — defensive readers for the 4 source catalogs that feed the
// product_catalog materializer.
//
// Each source catalog emits skinny events (usually just an id). The handlers
// re-query the source table to pick up the fresh state before materializing,
// so stale payloads (e.g. from retried events) never leak into downstream
// snapshots. Readers also apply the "sellable / visible" predicates at SQL
// level so handlers see a clean yes/no outcome.
//
// The shape returned is intentionally narrower than the full store row: only
// the fields that feed `GhOwnedFieldsSnapshot` + the flags needed to decide
// archival.

const normalizeBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 't' || value === 'true'

  return false
}

const normalizeString = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()

  return String(value).trim()
}

const normalizeOptionalString = (value: unknown): string | null => {
  const s = normalizeString(value)

  return s.length === 0 ? null : s
}

const normalizeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

// ── Sellable Role reader ───────────────────────────────────────────────────
export interface SellableRoleReadResult {
  roleId: string
  roleSku: string
  roleLabelEs: string
  notes: string | null
  category: string
  tier: string
  active: boolean

  // Latest USD pricing — may be null if the role has not been priced yet.
  // Non-priced roles still materialize, but with `default_unit_price=null`.
  hourlyPriceUsd: number | null
  effectivePriceDate: string | null
}

export const readSellableRoleForSync = async (
  client: PoolClient,
  roleId: string
): Promise<SellableRoleReadResult | null> => {
  const result = await client.query<{
    role_id: string
    role_sku: string | null
    role_label_es: string
    notes: string | null
    category: string
    tier: string
    active: boolean
    hourly_price_usd: string | null
    effective_from: string | null
  }>(
    `
      SELECT
        r.role_id,
        r.role_sku,
        r.role_label_es,
        r.notes,
        r.category,
        r.tier,
        r.active,
        p.hourly_price::text AS hourly_price_usd,
        p.effective_from::text AS effective_from
      FROM greenhouse_commercial.sellable_roles r
      LEFT JOIN LATERAL (
        SELECT hourly_price, effective_from
        FROM greenhouse_commercial.sellable_role_pricing_currency
        WHERE role_id = r.role_id
          AND currency_code = 'USD'
        ORDER BY effective_from DESC
        LIMIT 1
      ) p ON TRUE
      WHERE r.role_id = $1
    `,
    [roleId]
  )

  const row = result.rows[0]

  if (!row || !row.role_sku) return null

  return {
    roleId: row.role_id,
    roleSku: row.role_sku,
    roleLabelEs: normalizeString(row.role_label_es),
    notes: normalizeOptionalString(row.notes),
    category: normalizeString(row.category),
    tier: normalizeString(row.tier),
    active: normalizeBoolean(row.active),
    hourlyPriceUsd: normalizeNumber(row.hourly_price_usd),
    effectivePriceDate: normalizeOptionalString(row.effective_from)
  }
}

// ── Tool Catalog reader ────────────────────────────────────────────────────
export interface ToolReadResult {
  toolId: string
  toolSku: string
  toolName: string
  description: string | null
  providerId: string
  applicableBusinessLines: string[]
  proratedPriceUsd: number | null
  isActive: boolean
}

export const readToolForSync = async (
  client: PoolClient,
  toolId: string
): Promise<ToolReadResult | null> => {
  const result = await client.query<{
    tool_id: string
    tool_sku: string | null
    tool_name: string
    description: string | null
    provider_id: string | null
    applicable_business_lines: string[] | null
    prorated_price_usd: string | null
    is_active: boolean
  }>(
    `
      SELECT
        tool_id,
        tool_sku,
        tool_name,
        description,
        provider_id,
        applicable_business_lines,
        prorated_price_usd::text AS prorated_price_usd,
        is_active
      FROM greenhouse_ai.tool_catalog
      WHERE tool_id = $1
    `,
    [toolId]
  )

  const row = result.rows[0]

  if (!row || !row.tool_sku) return null

  return {
    toolId: row.tool_id,
    toolSku: row.tool_sku,
    toolName: normalizeString(row.tool_name),
    description: normalizeOptionalString(row.description),
    providerId: normalizeString(row.provider_id ?? ''),
    applicableBusinessLines: Array.isArray(row.applicable_business_lines)
      ? row.applicable_business_lines.map(normalizeString).filter(v => v.length > 0)
      : [],
    proratedPriceUsd: normalizeNumber(row.prorated_price_usd),
    isActive: normalizeBoolean(row.is_active)
  }
}

// ── Overhead Addon reader ──────────────────────────────────────────────────
export interface OverheadAddonReadResult {
  addonId: string
  addonSku: string
  addonName: string
  description: string | null
  addonType: string
  unit: string | null
  finalPriceUsd: number | null
  active: boolean
  visibleToClient: boolean
}

export const readOverheadAddonForSync = async (
  client: PoolClient,
  addonId: string
): Promise<OverheadAddonReadResult | null> => {
  const result = await client.query<{
    addon_id: string
    addon_sku: string | null
    addon_name: string
    description: string | null
    addon_type: string
    unit: string | null
    final_price_usd: string | null
    active: boolean
    visible_to_client: boolean
  }>(
    `
      SELECT
        addon_id,
        addon_sku,
        addon_name,
        description,
        addon_type,
        unit,
        final_price_usd::text AS final_price_usd,
        active,
        visible_to_client
      FROM greenhouse_commercial.overhead_addons
      WHERE addon_id = $1
    `,
    [addonId]
  )

  const row = result.rows[0]

  if (!row || !row.addon_sku) return null

  return {
    addonId: row.addon_id,
    addonSku: row.addon_sku,
    addonName: normalizeString(row.addon_name),
    description: normalizeOptionalString(row.description),
    addonType: normalizeString(row.addon_type),
    unit: normalizeOptionalString(row.unit),
    finalPriceUsd: normalizeNumber(row.final_price_usd),
    active: normalizeBoolean(row.active),
    visibleToClient: normalizeBoolean(row.visible_to_client)
  }
}

// ── Service reader ─────────────────────────────────────────────────────────
// Service pricing in Greenhouse is compositional (role recipe + tool recipe +
// tier margins). There is no canonical `default_unit_price_usd` on the
// service_pricing row — pricing is computed per-quote. For the product
// catalog we persist the service as a sellable product with `default_unit_price=null`,
// which is the same thing HubSpot consumers see today when a service doesn't
// have a flat list price. Downstream consumers (quote builder, TASK-547 outbound)
// are expected to resolve the price contextually, not from this snapshot.
export interface ServiceReadResult {
  moduleId: string
  serviceSku: string
  serviceName: string
  description: string | null
  serviceUnit: string
  commercialModel: string
  businessLineCode: string | null
  active: boolean
}

export const readServiceForSync = async (
  client: PoolClient,
  moduleId: string
): Promise<ServiceReadResult | null> => {
  const result = await client.query<{
    module_id: string
    service_sku: string | null
    service_name: string | null
    description: string | null
    service_unit: string
    commercial_model: string
    business_line_code: string | null
    active: boolean
  }>(
    `
      SELECT
        sp.module_id,
        sp.service_sku,
        COALESCE(sp.display_name, sm.module_name) AS service_name,
        COALESCE(sp.default_description, sm.description) AS description,
        sp.service_unit,
        sp.commercial_model,
        sp.business_line_code,
        sp.active
      FROM greenhouse_commercial.service_pricing sp
      JOIN greenhouse_core.service_modules sm ON sm.module_id = sp.module_id
      WHERE sp.module_id = $1
    `,
    [moduleId]
  )

  const row = result.rows[0]

  if (!row || !row.service_sku) return null

  return {
    moduleId: row.module_id,
    serviceSku: row.service_sku,
    serviceName: normalizeString(row.service_name ?? ''),
    description: normalizeOptionalString(row.description),
    serviceUnit: normalizeString(row.service_unit),
    commercialModel: normalizeString(row.commercial_model),
    businessLineCode: normalizeOptionalString(row.business_line_code),
    active: normalizeBoolean(row.active)
  }
}
