import { NextResponse } from 'next/server'

import { listToolCatalog, type ToolCatalogEntry } from '@/lib/commercial/tool-catalog-store'
import { recordPricingCatalogAudit } from '@/lib/commercial/pricing-catalog-audit-store'
import { query } from '@/lib/db'
import { getServerAuthSession } from '@/lib/auth'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'

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

interface CreateToolBody {
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

export async function GET() {
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

  const items = await listToolCatalog({ active: false })

  return NextResponse.json({ items })
}

export async function POST(request: Request) {
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

  let body: CreateToolBody

  try {
    body = (await request.json()) as CreateToolBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const toolName = pickString(body.toolName)
  const toolCategory = pickString(body.toolCategory)
  const providerId = pickString(body.providerId)
  const costModel = pickString(body.costModel)
  const vendor = pickString(body.vendor)

  if (!toolName) {
    return NextResponse.json({ error: 'toolName is required.' }, { status: 400 })
  }

  if (!toolCategory) {
    return NextResponse.json({ error: 'toolCategory is required.' }, { status: 400 })
  }

  if (!providerId) {
    return NextResponse.json(
      { error: 'providerId is required (must reference an existing greenhouse_core.providers.provider_id).' },
      { status: 400 }
    )
  }

  if (!costModel) {
    return NextResponse.json({ error: 'costModel is required.' }, { status: 400 })
  }

  // Derive a deterministic tool_id slug from tool_name + timestamp fragment
  const slug = toolName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  const toolId = slug ? `${slug}-${Date.now().toString(36)}` : `tool-${Date.now().toString(36)}`

  const subscriptionAmount = pickNumber(body.subscriptionAmount)
  const subscriptionCurrency = pickString(body.subscriptionCurrency)
  const subscriptionBillingCycle = pickString(body.subscriptionBillingCycle)
  const subscriptionSeats = pickNumber(body.subscriptionSeats)
  const proratingQty = pickNumber(body.proratingQty)
  const proratingUnit = pickString(body.proratingUnit)
  const proratedCostUsd = pickNumber(body.proratedCostUsd)
  const proratedPriceUsd = pickNumber(body.proratedPriceUsd)
  const applicableBusinessLines = pickStringArray(body.applicableBusinessLines)
  const applicabilityTags = pickStringArray(body.applicabilityTags)
  const includesInAddon = body.includesInAddon === true
  const notesForQuoting = pickString(body.notesForQuoting)
  const description = pickString(body.description)
  const websiteUrl = pickString(body.websiteUrl)
  const iconUrl = pickString(body.iconUrl)
  const toolSubcategory = pickString(body.toolSubcategory)

  let inserted: ToolRow

  try {
    const rows = await query<ToolRow>(
      `INSERT INTO greenhouse_ai.tool_catalog (
         tool_id, tool_name, provider_id, vendor, tool_category, tool_subcategory,
         cost_model, subscription_amount, subscription_currency, subscription_billing_cycle,
         subscription_seats, description, website_url, icon_url,
         prorating_qty, prorating_unit, prorated_cost_usd, prorated_price_usd,
         applicable_business_lines, applicability_tags, includes_in_addon,
         notes_for_quoting, is_active, sort_order
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8::numeric, $9, $10,
         $11, $12, $13, $14,
         $15::numeric, $16, $17::numeric, $18::numeric,
         $19::text[], $20::text[], $21,
         $22, TRUE, 0
       )
       RETURNING tool_id, tool_sku, tool_name, provider_id, vendor, tool_category, tool_subcategory,
                 cost_model, subscription_amount, subscription_currency, subscription_billing_cycle,
                 subscription_seats, prorating_qty, prorating_unit, prorated_cost_usd, prorated_price_usd,
                 applicable_business_lines, applicability_tags, includes_in_addon,
                 notes_for_quoting, description, website_url, icon_url, is_active, sort_order,
                 created_at, updated_at`,
      [
        toolId,
        toolName,
        providerId,
        vendor,
        toolCategory,
        toolSubcategory,
        costModel,
        subscriptionAmount,
        subscriptionCurrency,
        subscriptionBillingCycle,
        subscriptionSeats,
        description,
        websiteUrl,
        iconUrl,
        proratingQty,
        proratingUnit,
        proratedCostUsd,
        proratedPriceUsd,
        applicableBusinessLines,
        applicabilityTags,
        includesInAddon,
        notesForQuoting
      ]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Failed to insert tool catalog entry.' }, { status: 422 })
    }

    inserted = rows[0]
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error'

    if (message.includes('violates foreign key')) {
      return NextResponse.json(
        { error: `providerId '${providerId}' does not exist in greenhouse_core.providers.` },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: `Failed to create tool: ${message}` }, { status: 422 })
  }

  const actorName = await resolveActorName(tenant.clientName || tenant.userId)

  await recordPricingCatalogAudit({
    entityType: 'tool_catalog',
    entityId: inserted.tool_id,
    entitySku: inserted.tool_sku,
    action: 'created',
    actorUserId: tenant.userId,
    actorName,
    changeSummary: {
      new_values: {
        toolName,
        toolCategory,
        toolSubcategory,
        vendor,
        providerId,
        costModel,
        subscriptionAmount,
        subscriptionCurrency,
        subscriptionBillingCycle,
        subscriptionSeats,
        proratingQty,
        proratingUnit,
        proratedCostUsd,
        proratedPriceUsd,
        applicableBusinessLines,
        applicabilityTags,
        includesInAddon,
        notesForQuoting,
        description,
        websiteUrl,
        iconUrl
      }
    }
  })

  return NextResponse.json(mapRow(inserted), { status: 201 })
}
