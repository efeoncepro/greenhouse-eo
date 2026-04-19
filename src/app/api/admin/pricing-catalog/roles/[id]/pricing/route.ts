import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import {
  getBlockingConstraintIssues,
  validatePricingRow
} from '@/lib/commercial/pricing-catalog-constraints'
import { recordPricingCatalogAudit } from '@/lib/commercial/pricing-catalog-audit-store'
import {
  SELLABLE_ROLE_PRICING_CURRENCIES,
  type SellableRolePricingCurrency,
  type SellableRoleSeedPricingRow
} from '@/lib/commercial/sellable-roles-seed'
import { insertPricingRowsIfChanged } from '@/lib/commercial/sellable-roles-store'
import { query } from '@/lib/db'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { requireIfMatch, withOptimisticLockHeaders } from '@/lib/tenant/optimistic-locking'

export const dynamic = 'force-dynamic'

interface PricingRow extends Record<string, unknown> {
  role_id: string
  currency_code: string
  effective_from: string | Date
  margin_pct: string | number | null
  hourly_price: string | number | null
  fte_monthly_price: string | number | null
  notes: string | null
  created_at: string | Date
}

interface RoleSkuRow extends Record<string, unknown> {
  role_sku: string
  updated_at: string | Date
}

interface PricingInputItem {
  currencyCode?: unknown
  marginPct?: unknown
  hourlyPrice?: unknown
  fteMonthlyPrice?: unknown
}

interface PostPricingBody {
  effectiveFrom?: unknown
  pricing?: unknown
}

const toNumberValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const requireNumber = (value: unknown, fieldName: string): number => {
  const parsed = toNumberValue(value)

  if (parsed === null || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative number.`)
  }

  return parsed
}

const resolveActorName = async (fallback: string): Promise<string> => {
  const session = await getServerAuthSession()
  const user = session?.user

  return user?.name || user?.email || fallback || 'unknown'
}

const toIsoTimestamp = (value: string | Date | null): string => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()

  return value
}

const toIsoDate = (value: string | Date | null): string => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.length >= 10 ? value.slice(0, 10) : value
}

const getRoleLockRow = async (roleId: string) => {
  const rows = await query<RoleSkuRow>(
    `SELECT role_sku, updated_at
       FROM greenhouse_commercial.sellable_roles
       WHERE role_id = $1
       LIMIT 1`,
    [roleId]
  )

  return rows[0] ?? null
}

const touchRoleUpdatedAt = async (roleId: string) => {
  const rows = await query<{ updated_at: string | Date }>(
    `UPDATE greenhouse_commercial.sellable_roles
        SET updated_at = CURRENT_TIMESTAMP
      WHERE role_id = $1
      RETURNING updated_at`,
    [roleId]
  )

  return rows[0]?.updated_at ?? null
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const role = await getRoleLockRow(id)

  if (!role) {
    return NextResponse.json({ error: 'Sellable role not found.' }, { status: 404 })
  }

  const rows = await query<PricingRow>(
    `SELECT role_id, currency_code, effective_from,
            margin_pct, hourly_price, fte_monthly_price, notes, created_at
       FROM greenhouse_commercial.sellable_role_pricing_currency
       WHERE role_id = $1
       ORDER BY currency_code ASC, effective_from DESC`,
    [id]
  )

  const items = rows.map(row => ({
    roleId: row.role_id,
    currencyCode: row.currency_code,
    effectiveFrom: toIsoDate(row.effective_from as string | Date | null),
    marginPct: toNumberValue(row.margin_pct) ?? 0,
    hourlyPrice: toNumberValue(row.hourly_price) ?? 0,
    fteMonthlyPrice: toNumberValue(row.fte_monthly_price) ?? 0,
    notes: row.notes,
    createdAt: toIsoTimestamp(row.created_at as string | Date | null)
  }))

  return withOptimisticLockHeaders(
    NextResponse.json({ items, updatedAt: toIsoTimestamp(role.updated_at) }),
    role.updated_at
  )
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  let body: PostPricingBody

  try {
    body = (await request.json()) as PostPricingBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const effectiveFrom = typeof body.effectiveFrom === 'string' ? body.effectiveFrom.trim() : ''

  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
    return NextResponse.json({ error: 'effectiveFrom must be a valid date (YYYY-MM-DD).' }, { status: 400 })
  }

  if (!Array.isArray(body.pricing) || body.pricing.length === 0) {
    return NextResponse.json({ error: 'pricing must be a non-empty array.' }, { status: 400 })
  }

  const pricingRows: SellableRoleSeedPricingRow[] = []
  const seenCurrencies = new Set<string>()

  for (const rawItem of body.pricing as PricingInputItem[]) {
    if (!rawItem || typeof rawItem !== 'object') {
      return NextResponse.json({ error: 'Each pricing row must be an object.' }, { status: 400 })
    }

    const currencyCodeRaw = typeof rawItem.currencyCode === 'string' ? rawItem.currencyCode.trim().toUpperCase() : ''

    if (!SELLABLE_ROLE_PRICING_CURRENCIES.includes(currencyCodeRaw as SellableRolePricingCurrency)) {
      return NextResponse.json(
        { error: `currencyCode must be one of: ${SELLABLE_ROLE_PRICING_CURRENCIES.join(', ')}` },
        { status: 400 }
      )
    }

    if (seenCurrencies.has(currencyCodeRaw)) {
      return NextResponse.json({ error: `Duplicate currency in pricing array: ${currencyCodeRaw}` }, { status: 400 })
    }

    seenCurrencies.add(currencyCodeRaw)

    let marginPct: number
    let hourlyPrice: number
    let fteMonthlyPrice: number

    try {
      marginPct = requireNumber(rawItem.marginPct, 'marginPct')
      hourlyPrice = requireNumber(rawItem.hourlyPrice, 'hourlyPrice')
      fteMonthlyPrice = requireNumber(rawItem.fteMonthlyPrice, 'fteMonthlyPrice')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid pricing numeric field.'

      return NextResponse.json({ error: message }, { status: 400 })
    }

    pricingRows.push({
      currencyCode: currencyCodeRaw as SellableRolePricingCurrency,
      marginPct,
      hourlyPrice,
      fteMonthlyPrice
    })
  }

  const role = await getRoleLockRow(id)

  if (!role) {
    return NextResponse.json({ error: 'Sellable role not found.' }, { status: 404 })
  }

  const optimisticLock = requireIfMatch(request, role.updated_at)

  if (!optimisticLock.ok) {
    return optimisticLock.response
  }

  const roleSku = role.role_sku

  const issues = pricingRows.flatMap(row => validatePricingRow(row as unknown as Record<string, unknown>))

  if (getBlockingConstraintIssues(issues).length > 0) {
    return NextResponse.json({ issues }, { status: 422 })
  }

  let results: Awaited<ReturnType<typeof insertPricingRowsIfChanged>>

  try {
    results = await insertPricingRowsIfChanged(id, pricingRows, effectiveFrom)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({ error: `Failed to insert pricing rows: ${message}` }, { status: 422 })
  }

  const currenciesChanged = results
    .filter(result => result.changed)
    .map(result => result.entry.currencyCode)

  const actorName = await resolveActorName(tenant.clientName || tenant.userId)

  await recordPricingCatalogAudit({
    entityType: 'sellable_role',
    entityId: id,
    entitySku: roleSku,
    action: 'pricing_updated',
    actorUserId: tenant.userId,
    actorName,
    changeSummary: {
      currencies_changed: currenciesChanged,
      new_values: pricingRows
    },
    effectiveFrom
  })

  const updatedAt = await touchRoleUpdatedAt(id)

  return withOptimisticLockHeaders(
    NextResponse.json({ items: results.map(result => result.entry), changed: currenciesChanged }, { status: 201 }),
    updatedAt,
    { missingIfMatch: optimisticLock.missingIfMatch }
  )
}
