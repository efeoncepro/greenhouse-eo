import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { recordPricingCatalogAudit } from '@/lib/commercial/pricing-catalog-audit-store'
import type { SellableRoleSeedRow } from '@/lib/commercial/sellable-roles-seed'
import { insertCostComponentsIfChanged } from '@/lib/commercial/sellable-roles-store'
import { query } from '@/lib/db'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'

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
  total_monthly_cost_usd: string | number | null
  hourly_cost_usd: string | number | null
  notes: string | null
  created_at: string | Date
}

interface RoleSkuRow extends Record<string, unknown> {
  role_sku: string
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
  notes?: unknown
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

  const rows = await query<CostComponentRow>(
    `SELECT role_id, employment_type_code, effective_from,
            base_salary_usd, bonus_jit_usd, bonus_rpa_usd, bonus_ar_usd,
            bonus_sobrecumplimiento_usd, gastos_previsionales_usd,
            fee_deel_usd, fee_eor_usd, hours_per_fte_month,
            total_monthly_cost_usd, hourly_cost_usd, notes, created_at
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
    totalMonthlyCostUsd: toNumberValue(row.total_monthly_cost_usd),
    hourlyCostUsd: toNumberValue(row.hourly_cost_usd),
    notes: row.notes,
    createdAt: toIsoTimestamp(row.created_at as string | Date | null)
  }))

  return NextResponse.json({ items })
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid numeric field.'

    return NextResponse.json({ error: message }, { status: 400 })
  }

  const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

  const roleRows = await query<RoleSkuRow>(
    `SELECT role_sku
       FROM greenhouse_commercial.sellable_roles
       WHERE role_id = $1
       LIMIT 1`,
    [id]
  )

  if (roleRows.length === 0) {
    return NextResponse.json({ error: 'Sellable role not found.' }, { status: 404 })
  }

  const roleSku = roleRows[0].role_sku

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
        notes
      }
    },
    effectiveFrom
  })

  return NextResponse.json({ entry: result.entry, changed: result.changed }, { status: 201 })
}
