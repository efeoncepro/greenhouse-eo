import { NextResponse } from 'next/server'

import { listOverheadAddons, type OverheadAddonEntry } from '@/lib/commercial/overhead-addons-store'
import {
  getBlockingConstraintIssues,
  validateOverheadAddon
} from '@/lib/commercial/pricing-catalog-constraints'
import { recordPricingCatalogAudit } from '@/lib/commercial/pricing-catalog-audit-store'
import { query } from '@/lib/db'
import { getServerAuthSession } from '@/lib/auth'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { withOptimisticLockHeaders } from '@/lib/tenant/optimistic-locking'

export const dynamic = 'force-dynamic'

const maxUpdatedAt = (values: Array<string | null | undefined>) =>
  values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null

const ALLOWED_ADDON_TYPES = [
  'overhead_fixed',
  'fee_percentage',
  'fee_fixed',
  'resource_month',
  'adjustment_pct'
] as const

interface OverheadRow extends Record<string, unknown> {
  addon_id: string
  addon_sku: string
  category: string
  addon_name: string
  addon_type: string
  unit: string | null
  cost_internal_usd: string | number
  margin_pct: string | number | null
  final_price_usd: string | number | null
  final_price_pct: string | number | null
  pct_min: string | number | null
  pct_max: string | number | null
  minimum_amount_usd: string | number | null
  applicable_to: string[] | null
  description: string | null
  conditions: string | null
  visible_to_client: boolean
  active: boolean
  effective_from: string | Date
  notes: string | null
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

const toDate = (value: string | Date | null): string => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

const mapRow = (row: OverheadRow): OverheadAddonEntry => ({
  addonId: row.addon_id,
  addonSku: row.addon_sku,
  category: row.category,
  addonName: row.addon_name,
  addonType: row.addon_type,
  unit: row.unit,
  costInternalUsd: toNum(row.cost_internal_usd) ?? 0,
  marginPct: toNum(row.margin_pct),
  finalPriceUsd: toNum(row.final_price_usd),
  finalPricePct: toNum(row.final_price_pct),
  pctMin: toNum(row.pct_min),
  pctMax: toNum(row.pct_max),
  minimumAmountUsd: toNum(row.minimum_amount_usd),
  applicableTo: row.applicable_to || [],
  description: row.description,
  conditions: row.conditions,
  visibleToClient: row.visible_to_client,
  active: row.active,
  effectiveFrom: toDate(row.effective_from),
  notes: row.notes,
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

interface CreateOverheadBody {
  category?: unknown
  addonName?: unknown
  addonType?: unknown
  unit?: unknown
  costInternalUsd?: unknown
  marginPct?: unknown
  finalPriceUsd?: unknown
  finalPricePct?: unknown
  pctMin?: unknown
  pctMax?: unknown
  minimumAmountUsd?: unknown
  applicableTo?: unknown
  description?: unknown
  conditions?: unknown
  visibleToClient?: unknown
  notes?: unknown
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

  const items = await listOverheadAddons({ active: false })

  const updatedAt = maxUpdatedAt(items.map(item => item.updatedAt))

  return withOptimisticLockHeaders(NextResponse.json({ items, updatedAt }), updatedAt)
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

  let body: CreateOverheadBody

  try {
    body = (await request.json()) as CreateOverheadBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const category = pickString(body.category)
  const addonName = pickString(body.addonName)
  const addonType = pickString(body.addonType)

  if (!category) {
    return NextResponse.json({ error: 'category is required.' }, { status: 400 })
  }

  if (!addonName) {
    return NextResponse.json({ error: 'addonName is required.' }, { status: 400 })
  }

  if (!addonType || !ALLOWED_ADDON_TYPES.includes(addonType as (typeof ALLOWED_ADDON_TYPES)[number])) {
    return NextResponse.json(
      { error: `addonType must be one of: ${ALLOWED_ADDON_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  const unit = pickString(body.unit)
  const costInternalUsd = pickNumber(body.costInternalUsd) ?? 0
  const marginPct = pickNumber(body.marginPct)
  const finalPriceUsd = pickNumber(body.finalPriceUsd)
  const finalPricePct = pickNumber(body.finalPricePct)
  const pctMin = pickNumber(body.pctMin)
  const pctMax = pickNumber(body.pctMax)
  const minimumAmountUsd = pickNumber(body.minimumAmountUsd)
  const applicableTo = pickStringArray(body.applicableTo)
  const description = pickString(body.description)
  const conditions = pickString(body.conditions)
  const visibleToClient = body.visibleToClient !== false
  const notes = pickString(body.notes)

  const issues = validateOverheadAddon({
    costInternalUsd,
    marginPct,
    finalPriceUsd,
    finalPricePct,
    pctMin,
    pctMax,
    minimumAmountUsd
  })

  if (getBlockingConstraintIssues(issues).length > 0) {
    return NextResponse.json({ issues }, { status: 422 })
  }

  let inserted: OverheadRow

  try {
    const rows = await query<OverheadRow>(
      `INSERT INTO greenhouse_commercial.overhead_addons (
         category, addon_name, addon_type, unit,
         cost_internal_usd, margin_pct, final_price_usd, final_price_pct,
         pct_min, pct_max, minimum_amount_usd, applicable_to,
         description, conditions, visible_to_client, active, notes
       ) VALUES (
         $1, $2, $3, $4,
         $5::numeric, $6::numeric, $7::numeric, $8::numeric,
         $9::numeric, $10::numeric, $11::numeric, $12::text[],
         $13, $14, $15, TRUE, $16
       )
       RETURNING addon_id, addon_sku, category, addon_name, addon_type, unit,
                 cost_internal_usd, margin_pct, final_price_usd, final_price_pct,
                 pct_min, pct_max, minimum_amount_usd, applicable_to,
                 description, conditions, visible_to_client, active, effective_from,
                 notes, created_at, updated_at`,
      [
        category,
        addonName,
        addonType,
        unit,
        costInternalUsd,
        marginPct,
        finalPriceUsd,
        finalPricePct,
        pctMin,
        pctMax,
        minimumAmountUsd,
        applicableTo,
        description,
        conditions,
        visibleToClient,
        notes
      ]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Failed to insert overhead addon.' }, { status: 422 })
    }

    inserted = rows[0]
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error'

    return NextResponse.json({ error: `Failed to create overhead addon: ${message}` }, { status: 422 })
  }

  const actorName = await resolveActorName(tenant.clientName || tenant.userId)

  await recordPricingCatalogAudit({
    entityType: 'overhead_addon',
    entityId: inserted.addon_id,
    entitySku: inserted.addon_sku,
    action: 'created',
    actorUserId: tenant.userId,
    actorName,
    changeSummary: {
      new_values: {
        category,
        addonName,
        addonType,
        unit,
        costInternalUsd,
        marginPct,
        finalPriceUsd,
        finalPricePct,
        pctMin,
        pctMax,
        minimumAmountUsd,
        applicableTo,
        description,
        conditions,
        visibleToClient,
        notes
      }
    }
  })

  return withOptimisticLockHeaders(NextResponse.json(mapRow(inserted), { status: 201 }), inserted.updated_at)
}
