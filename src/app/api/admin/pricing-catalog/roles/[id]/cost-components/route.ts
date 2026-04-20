import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import {
  getBlockingConstraintIssues,
  validateCostComponents
} from '@/lib/commercial/pricing-catalog-constraints'
import { recordPricingCatalogAudit } from '@/lib/commercial/pricing-catalog-audit-store'
import type { SellableRoleSeedRow } from '@/lib/commercial/sellable-roles-seed'
import { insertCostComponentsIfChanged } from '@/lib/commercial/sellable-roles-store'
import { query } from '@/lib/db'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { requireIfMatch, withOptimisticLockHeaders } from '@/lib/tenant/optimistic-locking'

export const dynamic = 'force-dynamic'

interface CostComponentRow extends Record<string, unknown> {
  role_id: string
  employment_type_code: string
  effective_from: string | Date
  base_salary_usd: string | number | null
  bonus_jit_usd: string | number | null
  bonus_rpa_usd: string | number | null
  bonus_ar_usd: string | number | null
  bonus_sobrecumplimiento_usd: string | number | null
  gastos_previsionales_usd: string | number | null
  fee_deel_usd: string | number | null
  fee_eor_usd: string | number | null
  hours_per_fte_month: number
  direct_overhead_pct: string | number | null
  shared_overhead_pct: string | number | null
  direct_overhead_amount_usd: string | number | null
  shared_overhead_amount_usd: string | number | null
  total_monthly_cost_usd: string | number | null
  hourly_cost_usd: string | number | null
  loaded_monthly_cost_usd: string | number | null
  loaded_hourly_cost_usd: string | number | null
  source_kind: string
  source_ref: string | null
  confidence_score: string | number | null
  confidence_label: 'high' | 'medium' | 'low' | null
  notes: string | null
  created_at: string | Date
}

interface RoleSkuRow extends Record<string, unknown> {
  role_sku: string
  updated_at: string | Date
}

interface PostCostComponentsBody {
  employmentTypeCode?: unknown
  effectiveFrom?: unknown
  baseSalaryUsd?: unknown
  bonusJitUsd?: unknown
  bonusRpaUsd?: unknown
  bonusArUsd?: unknown
  bonusSobrecumplimientoUsd?: unknown
  gastosPrevisionalesUsd?: unknown
  feeDeelUsd?: unknown
  feeEorUsd?: unknown
  hoursPerFteMonth?: unknown
  directOverheadPct?: unknown
  sharedOverheadPct?: unknown
  notes?: unknown
}

const toNumberValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const requirePct = (value: unknown, fieldName: string): number => {
  const parsed = toNumberValue(value)

  if (parsed === null || parsed < 0 || parsed > 10) {
    throw new Error(`${fieldName} must be a number between 0 and 10.`)
  }

  return parsed
}

const optionalPct = (value: unknown, fieldName: string): number => {
  if (value === undefined || value === null || value === '') return 0

  return requirePct(value, fieldName)
}

const requireNumber = (value: unknown, fieldName: string): number => {
  const parsed = toNumberValue(value)

  if (parsed === null || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative number.`)
  }

  return parsed
}

const optionalNumber = (value: unknown, fieldName: string): number => {
  if (value === undefined || value === null || value === '') return 0

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

  const rows = await query<CostComponentRow>(
    `SELECT role_id, employment_type_code, effective_from,
            base_salary_usd, bonus_jit_usd, bonus_rpa_usd, bonus_ar_usd,
            bonus_sobrecumplimiento_usd, gastos_previsionales_usd,
            fee_deel_usd, fee_eor_usd, hours_per_fte_month,
            direct_overhead_pct, shared_overhead_pct,
            direct_overhead_amount_usd, shared_overhead_amount_usd,
            total_monthly_cost_usd, hourly_cost_usd,
            loaded_monthly_cost_usd, loaded_hourly_cost_usd,
            source_kind, source_ref, confidence_score, confidence_label,
            notes, created_at
       FROM greenhouse_commercial.sellable_role_cost_components
       WHERE role_id = $1
       ORDER BY employment_type_code ASC, effective_from DESC`,
    [id]
  )

  const items = rows.map(row => ({
    roleId: row.role_id,
    employmentTypeCode: row.employment_type_code,
    effectiveFrom: toIsoDate(row.effective_from as string | Date | null),
    baseSalaryUsd: toNumberValue(row.base_salary_usd) ?? 0,
    bonusJitUsd: toNumberValue(row.bonus_jit_usd) ?? 0,
    bonusRpaUsd: toNumberValue(row.bonus_rpa_usd) ?? 0,
    bonusArUsd: toNumberValue(row.bonus_ar_usd) ?? 0,
    bonusSobrecumplimientoUsd: toNumberValue(row.bonus_sobrecumplimiento_usd) ?? 0,
    gastosPrevisionalesUsd: toNumberValue(row.gastos_previsionales_usd) ?? 0,
    feeDeelUsd: toNumberValue(row.fee_deel_usd) ?? 0,
    feeEorUsd: toNumberValue(row.fee_eor_usd) ?? 0,
    hoursPerFteMonth: row.hours_per_fte_month,
    directOverheadPct: toNumberValue(row.direct_overhead_pct) ?? 0,
    sharedOverheadPct: toNumberValue(row.shared_overhead_pct) ?? 0,
    directOverheadAmountUsd: toNumberValue(row.direct_overhead_amount_usd),
    sharedOverheadAmountUsd: toNumberValue(row.shared_overhead_amount_usd),
    totalMonthlyCostUsd: toNumberValue(row.total_monthly_cost_usd),
    hourlyCostUsd: toNumberValue(row.hourly_cost_usd),
    loadedMonthlyCostUsd: toNumberValue(row.loaded_monthly_cost_usd),
    loadedHourlyCostUsd: toNumberValue(row.loaded_hourly_cost_usd),
    sourceKind: row.source_kind,
    sourceRef: row.source_ref,
    confidenceScore: toNumberValue(row.confidence_score),
    confidenceLabel: row.confidence_label,
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

  let body: PostCostComponentsBody

  try {
    body = (await request.json()) as PostCostComponentsBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const employmentTypeCode = typeof body.employmentTypeCode === 'string' ? body.employmentTypeCode.trim() : ''
  const effectiveFrom = typeof body.effectiveFrom === 'string' ? body.effectiveFrom.trim() : ''

  if (!employmentTypeCode) {
    return NextResponse.json({ error: 'employmentTypeCode is required.' }, { status: 400 })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
    return NextResponse.json({ error: 'effectiveFrom must be a valid date (YYYY-MM-DD).' }, { status: 400 })
  }

  let baseSalaryUsd: number
  let bonusJitUsd: number
  let bonusRpaUsd: number
  let bonusArUsd: number
  let bonusSobrecumplimientoUsd: number
  let gastosPrevisionalesUsd: number
  let feeDeelUsd: number
  let feeEorUsd: number
  let hoursPerFteMonth: number
  let directOverheadPct: number
  let sharedOverheadPct: number

  try {
    baseSalaryUsd = requireNumber(body.baseSalaryUsd, 'baseSalaryUsd')
    bonusJitUsd = optionalNumber(body.bonusJitUsd, 'bonusJitUsd')
    bonusRpaUsd = optionalNumber(body.bonusRpaUsd, 'bonusRpaUsd')
    bonusArUsd = optionalNumber(body.bonusArUsd, 'bonusArUsd')
    bonusSobrecumplimientoUsd = optionalNumber(body.bonusSobrecumplimientoUsd, 'bonusSobrecumplimientoUsd')
    gastosPrevisionalesUsd = optionalNumber(body.gastosPrevisionalesUsd, 'gastosPrevisionalesUsd')
    feeDeelUsd = optionalNumber(body.feeDeelUsd, 'feeDeelUsd')
    feeEorUsd = optionalNumber(body.feeEorUsd, 'feeEorUsd')
    hoursPerFteMonth = requireNumber(body.hoursPerFteMonth, 'hoursPerFteMonth')
    directOverheadPct = optionalPct(body.directOverheadPct, 'directOverheadPct')
    sharedOverheadPct = optionalPct(body.sharedOverheadPct, 'sharedOverheadPct')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid numeric field.'

    return NextResponse.json({ error: message }, { status: 400 })
  }

  const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

  const role = await getRoleLockRow(id)

  if (!role) {
    return NextResponse.json({ error: 'Sellable role not found.' }, { status: 404 })
  }

  const optimisticLock = requireIfMatch(request, role.updated_at)

  if (!optimisticLock.ok) {
    return optimisticLock.response
  }

  const roleSku = role.role_sku

  const issues = validateCostComponents({
    baseSalaryUsd,
    bonusJitUsd,
    bonusRpaUsd,
    bonusArUsd,
    bonusSobrecumplimientoUsd,
    gastosPrevisionalesUsd,
    feeDeelUsd,
    feeEorUsd,
    hoursPerFteMonth
  })

  if (getBlockingConstraintIssues(issues).length > 0) {
    return NextResponse.json({ issues }, { status: 422 })
  }

  const driftWarnings: string[] = []

  if (notes) driftWarnings.push(notes)

  // TASK-467 phase-2: pasamos `feeEorUsd` y `hoursPerFteMonth` como override
  // per-role. El store los usa directamente (defaults 0 y 180 si null/undefined),
  // ya no los hardcodea. Así el admin UI puede versionar horas billable custom
  // por rol — el pricing engine v2 ya consumía `hoursPerFteMonth` como fallback
  // del `fte_hours_guide` y divisor de hourly cost.
  const seedRow: SellableRoleSeedRow = {
    rowNumber: 0,
    roleSku,
    roleCode: '',
    roleLabelEs: '',
    category: 'consultoria',
    tier: '1',
    tierLabel: '',
    canSellAsStaff: false,
    canSellAsServiceComponent: false,
    baseSalaryUsd,
    bonusJitUsd,
    bonusRpaUsd,
    bonusArUsd,
    bonusSobrecumplimientoUsd,
    gastosPrevisionalesUsd,
    feeDeelUsd,
    feeEorUsd,
    hoursPerFteMonth,
    directOverheadPct,
    sharedOverheadPct,
    sourceKind: 'admin_manual',
    sourceRef: 'pricing_catalog_admin',
    confidenceScore: 0.75,
    totalMonthlyCostUsd: 0,
    hourlyCostUsd: 0,
    fteMonthlyCostUsd: 0,
    inferredEmploymentTypeCode: employmentTypeCode,
    reviewReasons: [],
    driftWarnings,
    pricingRows: []
  }

  let result: Awaited<ReturnType<typeof insertCostComponentsIfChanged>>

  try {
    result = await insertCostComponentsIfChanged(id, seedRow, effectiveFrom)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({ error: `Failed to insert cost components: ${message}` }, { status: 422 })
  }

  if (!result.entry) {
    return NextResponse.json({ error: 'Failed to insert cost components.' }, { status: 422 })
  }

  const actorName = await resolveActorName(tenant.clientName || tenant.userId)

  await recordPricingCatalogAudit({
    entityType: 'sellable_role',
    entityId: id,
    entitySku: roleSku,
    action: 'cost_updated',
    actorUserId: tenant.userId,
    actorName,
    changeSummary: {
      employment_type_code: employmentTypeCode,
      changed: result.changed,
      new_values: {
        employmentTypeCode,
        effectiveFrom,
        baseSalaryUsd,
        bonusJitUsd,
        bonusRpaUsd,
        bonusArUsd,
        bonusSobrecumplimientoUsd,
        gastosPrevisionalesUsd,
        feeDeelUsd,
        feeEorUsd,
        hoursPerFteMonth,
        directOverheadPct,
        sharedOverheadPct,
        sourceKind: 'admin_manual',
        sourceRef: 'pricing_catalog_admin',
        confidenceScore: 0.75,
        notes
      }
    },
    effectiveFrom
  })

  const updatedAt = await touchRoleUpdatedAt(id)

  return withOptimisticLockHeaders(
    NextResponse.json({ entry: result.entry, changed: result.changed }, { status: 201 }),
    updatedAt,
    { missingIfMatch: optimisticLock.missingIfMatch }
  )
}
