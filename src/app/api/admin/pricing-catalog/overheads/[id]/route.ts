import { NextResponse } from 'next/server'

import type { OverheadAddonEntry } from '@/lib/commercial/overhead-addons-store'
import { recordPricingCatalogAudit, type PricingCatalogAction } from '@/lib/commercial/pricing-catalog-audit-store'
import { query } from '@/lib/db'
import { getServerAuthSession } from '@/lib/auth'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

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

interface PatchOverheadBody {
  active?: unknown
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

const getAddonById = async (addonId: string): Promise<OverheadRow | null> => {
  const rows = await query<OverheadRow>(
    `SELECT addon_id, addon_sku, category, addon_name, addon_type, unit,
            cost_internal_usd, margin_pct, final_price_usd, final_price_pct,
            pct_min, pct_max, minimum_amount_usd, applicable_to,
            description, conditions, visible_to_client, active, effective_from,
            notes, created_at, updated_at
       FROM greenhouse_commercial.overhead_addons
       WHERE addon_id = $1
       LIMIT 1`,
    [addonId]
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

  let body: PatchOverheadBody

  try {
    body = (await request.json()) as PatchOverheadBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const previous = await getAddonById(id)

  if (!previous) {
    return NextResponse.json({ error: 'Overhead addon not found.' }, { status: 404 })
  }

  const fields: string[] = []
  const values: unknown[] = []
  const newValues: Record<string, unknown> = {}
  const previousValues: Record<string, unknown> = {}
  const fieldsChanged: string[] = []
  let idx = 0

  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') {
      return NextResponse.json({ error: 'active must be a boolean.' }, { status: 400 })
    }

    idx += 1
    fields.push(`active = $${idx}`)
    values.push(body.active)
    newValues.active = body.active
    previousValues.active = previous.active

    if (previous.active !== body.active) fieldsChanged.push('active')
  }

  if (body.category !== undefined) {
    const value = pickString(body.category)

    if (!value) {
      return NextResponse.json({ error: 'category must be a non-empty string.' }, { status: 400 })
    }

    idx += 1
    fields.push(`category = $${idx}`)
    values.push(value)
    newValues.category = value
    previousValues.category = previous.category

    if (previous.category !== value) fieldsChanged.push('category')
  }

  if (body.addonName !== undefined) {
    const value = pickString(body.addonName)

    if (!value) {
      return NextResponse.json({ error: 'addonName must be a non-empty string.' }, { status: 400 })
    }

    idx += 1
    fields.push(`addon_name = $${idx}`)
    values.push(value)
    newValues.addonName = value
    previousValues.addonName = previous.addon_name

    if (previous.addon_name !== value) fieldsChanged.push('addonName')
  }

  if (body.addonType !== undefined) {
    const value = pickString(body.addonType)

    if (!value || !ALLOWED_ADDON_TYPES.includes(value as (typeof ALLOWED_ADDON_TYPES)[number])) {
      return NextResponse.json(
        { error: `addonType must be one of: ${ALLOWED_ADDON_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    idx += 1
    fields.push(`addon_type = $${idx}`)
    values.push(value)
    newValues.addonType = value
    previousValues.addonType = previous.addon_type

    if (previous.addon_type !== value) fieldsChanged.push('addonType')
  }

  const stringCols: Array<[keyof PatchOverheadBody, string, string | null]> = [
    ['unit', 'unit', previous.unit],
    ['description', 'description', previous.description],
    ['conditions', 'conditions', previous.conditions],
    ['notes', 'notes', previous.notes]
  ]

  for (const [key, column, prev] of stringCols) {
    if (body[key] === undefined) continue

    const value = pickString(body[key])

    idx += 1
    fields.push(`${column} = $${idx}`)
    values.push(value)
    newValues[key] = value
    previousValues[key] = prev

    if ((prev ?? null) !== value) fieldsChanged.push(String(key))
  }

  const numericCols: Array<[keyof PatchOverheadBody, string, string | number | null]> = [
    ['costInternalUsd', 'cost_internal_usd', previous.cost_internal_usd],
    ['marginPct', 'margin_pct', previous.margin_pct],
    ['finalPriceUsd', 'final_price_usd', previous.final_price_usd],
    ['finalPricePct', 'final_price_pct', previous.final_price_pct],
    ['pctMin', 'pct_min', previous.pct_min],
    ['pctMax', 'pct_max', previous.pct_max],
    ['minimumAmountUsd', 'minimum_amount_usd', previous.minimum_amount_usd]
  ]

  for (const [key, column, prev] of numericCols) {
    if (body[key] === undefined) continue

    const value = pickNumber(body[key])

    // cost_internal_usd is NOT NULL; coerce null to 0 for that column
    const finalValue = column === 'cost_internal_usd' && value === null ? 0 : value

    idx += 1
    fields.push(`${column} = $${idx}::numeric`)
    values.push(finalValue)
    newValues[key] = finalValue
    previousValues[key] = toNum(prev)

    if (toNum(prev) !== finalValue) fieldsChanged.push(String(key))
  }

  if (body.applicableTo !== undefined) {
    const value = pickStringArray(body.applicableTo)

    idx += 1
    fields.push(`applicable_to = $${idx}::text[]`)
    values.push(value)
    newValues.applicableTo = value
    previousValues.applicableTo = previous.applicable_to ?? []

    const prev = [...(previous.applicable_to || [])].sort()
    const curr = [...value].sort()
    const changed = prev.length !== curr.length || prev.some((v, i) => v !== curr[i])

    if (changed) fieldsChanged.push('applicableTo')
  }

  if (body.visibleToClient !== undefined) {
    if (typeof body.visibleToClient !== 'boolean') {
      return NextResponse.json({ error: 'visibleToClient must be a boolean.' }, { status: 400 })
    }

    idx += 1
    fields.push(`visible_to_client = $${idx}`)
    values.push(body.visibleToClient)
    newValues.visibleToClient = body.visibleToClient
    previousValues.visibleToClient = previous.visible_to_client

    if (previous.visible_to_client !== body.visibleToClient) fieldsChanged.push('visibleToClient')
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
  }

  fields.push('updated_at = CURRENT_TIMESTAMP')
  idx += 1
  values.push(id)

  let updated: OverheadRow

  try {
    const rows = await query<OverheadRow>(
      `UPDATE greenhouse_commercial.overhead_addons
         SET ${fields.join(', ')}
       WHERE addon_id = $${idx}
       RETURNING addon_id, addon_sku, category, addon_name, addon_type, unit,
                 cost_internal_usd, margin_pct, final_price_usd, final_price_pct,
                 pct_min, pct_max, minimum_amount_usd, applicable_to,
                 description, conditions, visible_to_client, active, effective_from,
                 notes, created_at, updated_at`,
      values
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Failed to update overhead addon.' }, { status: 422 })
    }

    updated = rows[0]
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error'

    return NextResponse.json({ error: `Failed to update overhead addon: ${message}` }, { status: 422 })
  }

  let action: PricingCatalogAction = 'updated'

  if (body.active !== undefined && previous.active !== updated.active) {
    action = updated.active ? 'reactivated' : 'deactivated'
  }

  const actorName = await resolveActorName(tenant.clientName || tenant.userId)

  await recordPricingCatalogAudit({
    entityType: 'overhead_addon',
    entityId: updated.addon_id,
    entitySku: updated.addon_sku,
    action,
    actorUserId: tenant.userId,
    actorName,
    changeSummary: {
      previous_values: previousValues,
      new_values: newValues,
      fields_changed: fieldsChanged
    }
  })

  return NextResponse.json(mapRow(updated))
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const previous = await getAddonById(id)

  if (!previous) {
    return NextResponse.json({ error: 'Overhead addon not found.' }, { status: 404 })
  }

  if (!previous.active) {
    return new NextResponse(null, { status: 204 })
  }

  const rows = await query<OverheadRow>(
    `UPDATE greenhouse_commercial.overhead_addons
       SET active = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE addon_id = $1
     RETURNING addon_id, addon_sku, category, addon_name, addon_type, unit,
               cost_internal_usd, margin_pct, final_price_usd, final_price_pct,
               pct_min, pct_max, minimum_amount_usd, applicable_to,
               description, conditions, visible_to_client, active, effective_from,
               notes, created_at, updated_at`,
    [id]
  )

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Failed to deactivate overhead addon.' }, { status: 422 })
  }

  const updated = rows[0]
  const actorName = await resolveActorName(tenant.clientName || tenant.userId)

  await recordPricingCatalogAudit({
    entityType: 'overhead_addon',
    entityId: updated.addon_id,
    entitySku: updated.addon_sku,
    action: 'deactivated',
    actorUserId: tenant.userId,
    actorName,
    changeSummary: {
      previous_values: { active: true },
      new_values: { active: false },
      fields_changed: ['active']
    }
  })

  return new NextResponse(null, { status: 204 })
}
