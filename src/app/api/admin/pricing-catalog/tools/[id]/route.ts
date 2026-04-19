import { NextResponse } from 'next/server'

import type { ToolCatalogEntry } from '@/lib/commercial/tool-catalog-store'
import {
  getBlockingConstraintIssues,
  validateToolCatalog
} from '@/lib/commercial/pricing-catalog-constraints'
import { recordPricingCatalogAudit, type PricingCatalogAction } from '@/lib/commercial/pricing-catalog-audit-store'
import { query } from '@/lib/db'
import { getServerAuthSession } from '@/lib/auth'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { requireIfMatch, withOptimisticLockHeaders } from '@/lib/tenant/optimistic-locking'

export const dynamic = 'force-dynamic'

interface ToolRow extends Record<string, unknown> {
  tool_id: string
  tool_sku: string | null
  tool_name: string
  provider_id: string
  vendor: string | null
  tool_category: string
  tool_subcategory: string | null
  cost_model: string
  subscription_amount: string | number | null
  subscription_currency: string | null
  subscription_billing_cycle: string | null
  subscription_seats: number | null
  prorating_qty: string | number | null
  prorating_unit: string | null
  prorated_cost_usd: string | number | null
  prorated_price_usd: string | number | null
  applicable_business_lines: string[] | null
  applicability_tags: string[] | null
  includes_in_addon: boolean
  notes_for_quoting: string | null
  description: string | null
  website_url: string | null
  icon_url: string | null
  is_active: boolean
  sort_order: number
  created_at: string | Date
  updated_at: string | Date
}

const toNum = (value: string | number | null | undefined): number | null => {
  if (value == null) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toTimestamp = (value: string | Date | null): string => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()

  return value
}

const mapRow = (row: ToolRow): ToolCatalogEntry => ({
  toolId: row.tool_id,
  toolSku: row.tool_sku,
  toolName: row.tool_name,
  providerId: row.provider_id,
  vendor: row.vendor,
  toolCategory: row.tool_category,
  toolSubcategory: row.tool_subcategory,
  costModel: row.cost_model,
  subscriptionAmount: toNum(row.subscription_amount),
  subscriptionCurrency: row.subscription_currency,
  subscriptionBillingCycle: row.subscription_billing_cycle,
  subscriptionSeats: row.subscription_seats,
  proratingQty: toNum(row.prorating_qty),
  proratingUnit: row.prorating_unit,
  proratedCostUsd: toNum(row.prorated_cost_usd),
  proratedPriceUsd: toNum(row.prorated_price_usd),
  applicableBusinessLines: row.applicable_business_lines || [],
  applicabilityTags: row.applicability_tags || [],
  includesInAddon: row.includes_in_addon,
  notesForQuoting: row.notes_for_quoting,
  description: row.description,
  websiteUrl: row.website_url,
  iconUrl: row.icon_url,
  isActive: row.is_active,
  sortOrder: row.sort_order,
  createdAt: toTimestamp(row.created_at),
  updatedAt: toTimestamp(row.updated_at)
})

const resolveActorName = async (fallback: string): Promise<string> => {
  const session = await getServerAuthSession()
  const user = session?.user

  return user?.name || user?.email || fallback || 'unknown'
}

const pickNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const pickString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

const pickStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map(item => item.trim())
}

interface PatchToolBody {
  isActive?: unknown
  toolName?: unknown
  toolCategory?: unknown
  toolSubcategory?: unknown
  vendor?: unknown
  providerId?: unknown
  costModel?: unknown
  subscriptionAmount?: unknown
  subscriptionCurrency?: unknown
  subscriptionBillingCycle?: unknown
  subscriptionSeats?: unknown
  proratingQty?: unknown
  proratingUnit?: unknown
  proratedCostUsd?: unknown
  proratedPriceUsd?: unknown
  applicableBusinessLines?: unknown
  applicabilityTags?: unknown
  includesInAddon?: unknown
  notesForQuoting?: unknown
  description?: unknown
  websiteUrl?: unknown
  iconUrl?: unknown
}

const getToolById = async (toolId: string): Promise<ToolRow | null> => {
  const rows = await query<ToolRow>(
    `SELECT tool_id, tool_sku, tool_name, provider_id, vendor, tool_category, tool_subcategory,
            cost_model, subscription_amount, subscription_currency, subscription_billing_cycle,
            subscription_seats, prorating_qty, prorating_unit, prorated_cost_usd, prorated_price_usd,
            applicable_business_lines, applicability_tags, includes_in_addon,
            notes_for_quoting, description, website_url, icon_url, is_active, sort_order,
            created_at, updated_at
       FROM greenhouse_ai.tool_catalog
       WHERE tool_id = $1
       LIMIT 1`,
    [toolId]
  )

  return rows[0] ?? null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json(
      { error: 'Forbidden — requires efeonce_admin or finance_admin' },
      { status: 403 }
    )
  }

  const { id } = await params

  let body: PatchToolBody

  try {
    body = (await request.json()) as PatchToolBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const previous = await getToolById(id)

  if (!previous) {
    return NextResponse.json({ error: 'Tool catalog entry not found.' }, { status: 404 })
  }

  const optimisticLock = requireIfMatch(request, previous.updated_at)

  if (!optimisticLock.ok) {
    return optimisticLock.response
  }

  const fields: string[] = []
  const values: unknown[] = []
  const newValues: Record<string, unknown> = {}
  const previousValues: Record<string, unknown> = {}
  const fieldsChanged: string[] = []
  let idx = 0

  const trackNumeric = (
    column: string,
    key: keyof PatchToolBody,
    prevValue: string | number | null,
    cast = '::numeric'
  ) => {
    if (body[key] === undefined) return

    const value = pickNumber(body[key])

    idx += 1
    fields.push(`${column} = $${idx}${cast}`)
    values.push(value)
    newValues[key] = value
    previousValues[key] = toNum(prevValue)

    if (toNum(prevValue) !== value) fieldsChanged.push(String(key))
  }

  const trackString = (
    column: string,
    key: keyof PatchToolBody,
    prevValue: string | null,
    nullable = true
  ) => {
    if (body[key] === undefined) return

    const value = pickString(body[key])

    if (!nullable && value === null) {
      throw new Error(`${String(key)} must be a non-empty string.`)
    }

    idx += 1
    fields.push(`${column} = $${idx}`)
    values.push(value)
    newValues[key] = value
    previousValues[key] = prevValue

    if ((prevValue ?? null) !== value) fieldsChanged.push(String(key))
  }

  const trackBool = (column: string, key: keyof PatchToolBody, prevValue: boolean) => {
    if (body[key] === undefined) return

    const value = body[key] === true

    idx += 1
    fields.push(`${column} = $${idx}`)
    values.push(value)
    newValues[key] = value
    previousValues[key] = prevValue

    if (prevValue !== value) fieldsChanged.push(String(key))
  }

  const trackArray = (column: string, key: keyof PatchToolBody, prevValue: string[] | null) => {
    if (body[key] === undefined) return

    const value = pickStringArray(body[key])

    idx += 1
    fields.push(`${column} = $${idx}::text[]`)
    values.push(value)
    newValues[key] = value
    previousValues[key] = prevValue ?? []

    const prev = [...(prevValue || [])].sort()
    const curr = [...value].sort()
    const changed = prev.length !== curr.length || prev.some((v, i) => v !== curr[i])

    if (changed) fieldsChanged.push(String(key))
  }

  try {
    trackBool('is_active', 'isActive', previous.is_active)
    trackString('tool_name', 'toolName', previous.tool_name, false)
    trackString('tool_category', 'toolCategory', previous.tool_category, false)
    trackString('tool_subcategory', 'toolSubcategory', previous.tool_subcategory)
    trackString('vendor', 'vendor', previous.vendor)
    trackString('provider_id', 'providerId', previous.provider_id, false)
    trackString('cost_model', 'costModel', previous.cost_model, false)
    trackNumeric('subscription_amount', 'subscriptionAmount', previous.subscription_amount)
    trackString('subscription_currency', 'subscriptionCurrency', previous.subscription_currency)
    trackString('subscription_billing_cycle', 'subscriptionBillingCycle', previous.subscription_billing_cycle)

    if (body.subscriptionSeats !== undefined) {
      const value = pickNumber(body.subscriptionSeats)
      const intValue = value === null ? null : Math.trunc(value)

      idx += 1
      fields.push(`subscription_seats = $${idx}`)
      values.push(intValue)
      newValues.subscriptionSeats = intValue
      previousValues.subscriptionSeats = previous.subscription_seats

      if (previous.subscription_seats !== intValue) fieldsChanged.push('subscriptionSeats')
    }

    trackNumeric('prorating_qty', 'proratingQty', previous.prorating_qty)
    trackString('prorating_unit', 'proratingUnit', previous.prorating_unit)
    trackNumeric('prorated_cost_usd', 'proratedCostUsd', previous.prorated_cost_usd)
    trackNumeric('prorated_price_usd', 'proratedPriceUsd', previous.prorated_price_usd)
    trackArray('applicable_business_lines', 'applicableBusinessLines', previous.applicable_business_lines)
    trackArray('applicability_tags', 'applicabilityTags', previous.applicability_tags)
    trackBool('includes_in_addon', 'includesInAddon', previous.includes_in_addon)
    trackString('notes_for_quoting', 'notesForQuoting', previous.notes_for_quoting)
    trackString('description', 'description', previous.description)
    trackString('website_url', 'websiteUrl', previous.website_url)
    trackString('icon_url', 'iconUrl', previous.icon_url)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid field value.' },
      { status: 400 }
    )
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
  }

  const issues = validateToolCatalog({
    toolName: newValues.toolName ?? previous.tool_name,
    toolCategory: newValues.toolCategory ?? previous.tool_category,
    providerId: newValues.providerId ?? previous.provider_id,
    costModel: newValues.costModel ?? previous.cost_model,
    subscriptionAmount: newValues.subscriptionAmount ?? previous.subscription_amount,
    subscriptionSeats: newValues.subscriptionSeats ?? previous.subscription_seats,
    proratingQty: newValues.proratingQty ?? previous.prorating_qty,
    proratedCostUsd: newValues.proratedCostUsd ?? previous.prorated_cost_usd,
    proratedPriceUsd: newValues.proratedPriceUsd ?? previous.prorated_price_usd
  })

  if (getBlockingConstraintIssues(issues).length > 0) {
    return NextResponse.json({ issues }, { status: 422 })
  }

  fields.push('updated_at = CURRENT_TIMESTAMP')
  idx += 1
  values.push(id)

  let updated: ToolRow

  try {
    const rows = await query<ToolRow>(
      `UPDATE greenhouse_ai.tool_catalog
         SET ${fields.join(', ')}
       WHERE tool_id = $${idx}
       RETURNING tool_id, tool_sku, tool_name, provider_id, vendor, tool_category, tool_subcategory,
                 cost_model, subscription_amount, subscription_currency, subscription_billing_cycle,
                 subscription_seats, prorating_qty, prorating_unit, prorated_cost_usd, prorated_price_usd,
                 applicable_business_lines, applicability_tags, includes_in_addon,
                 notes_for_quoting, description, website_url, icon_url, is_active, sort_order,
                 created_at, updated_at`,
      values
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Failed to update tool catalog entry.' }, { status: 422 })
    }

    updated = rows[0]
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error'

    if (message.includes('violates foreign key')) {
      return NextResponse.json({ error: `providerId does not exist in greenhouse_core.providers.` }, { status: 400 })
    }

    return NextResponse.json({ error: `Failed to update tool: ${message}` }, { status: 422 })
  }

  let action: PricingCatalogAction = 'updated'

  if (body.isActive !== undefined && previous.is_active !== updated.is_active) {
    action = updated.is_active ? 'reactivated' : 'deactivated'
  }

  const actorName = await resolveActorName(tenant.clientName || tenant.userId)

  await recordPricingCatalogAudit({
    entityType: 'tool_catalog',
    entityId: updated.tool_id,
    entitySku: updated.tool_sku,
    action,
    actorUserId: tenant.userId,
    actorName,
    changeSummary: {
      previous_values: previousValues,
      new_values: newValues,
      fields_changed: fieldsChanged
    }
  })

  return withOptimisticLockHeaders(
    NextResponse.json(mapRow(updated)),
    updated.updated_at,
    { missingIfMatch: optimisticLock.missingIfMatch }
  )
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json(
      { error: 'Forbidden — requires efeonce_admin or finance_admin' },
      { status: 403 }
    )
  }

  const { id } = await params

  const previous = await getToolById(id)

  if (!previous) {
    return NextResponse.json({ error: 'Tool catalog entry not found.' }, { status: 404 })
  }

  const optimisticLock = requireIfMatch(request, previous.updated_at)

  if (!optimisticLock.ok) {
    return optimisticLock.response
  }

  if (!previous.is_active) {
    return withOptimisticLockHeaders(new NextResponse(null, { status: 204 }), previous.updated_at, {
      missingIfMatch: optimisticLock.missingIfMatch
    })
  }

  const rows = await query<ToolRow>(
    `UPDATE greenhouse_ai.tool_catalog
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE tool_id = $1
     RETURNING tool_id, tool_sku, tool_name, provider_id, vendor, tool_category, tool_subcategory,
               cost_model, subscription_amount, subscription_currency, subscription_billing_cycle,
               subscription_seats, prorating_qty, prorating_unit, prorated_cost_usd, prorated_price_usd,
               applicable_business_lines, applicability_tags, includes_in_addon,
               notes_for_quoting, description, website_url, icon_url, is_active, sort_order,
               created_at, updated_at`,
    [id]
  )

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Failed to deactivate tool.' }, { status: 422 })
  }

  const updated = rows[0]
  const actorName = await resolveActorName(tenant.clientName || tenant.userId)

  await recordPricingCatalogAudit({
    entityType: 'tool_catalog',
    entityId: updated.tool_id,
    entitySku: updated.tool_sku,
    action: 'deactivated',
    actorUserId: tenant.userId,
    actorName,
    changeSummary: {
      previous_values: { isActive: true },
      new_values: { isActive: false },
      fields_changed: ['isActive']
    }
  })

  return withOptimisticLockHeaders(new NextResponse(null, { status: 204 }), updated.updated_at, {
    missingIfMatch: optimisticLock.missingIfMatch
  })
}
