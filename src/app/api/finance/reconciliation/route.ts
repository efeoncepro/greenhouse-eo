import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import {
  listReconciliationPeriodsFromPostgres,
  createReconciliationPeriodInPostgres
} from '@/lib/finance/postgres-reconciliation'
import { listOrphanSnapshotsForPeriod } from '@/lib/finance/reconciliation/full-context'
import {
  assertNonEmptyString,
  normalizeString,
  toNumber,
  FinanceValidationError
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')
  const status = searchParams.get('status')
  const includeArchived = searchParams.get('includeArchived') === 'true'

  // TASK-722 — opcional: include orphan snapshots when (year, month) supplied.
  // Permite a la UI mostrar "snapshots declarados sin periodo" cuando el queue
  // de periodos del mes está vacío.
  const yearParam = searchParams.get('year')
  const monthParam = searchParams.get('month')
  const yearNum = yearParam ? Number(yearParam) : null
  const monthNum = monthParam ? Number(monthParam) : null
  const wantsOrphans = Number.isInteger(yearNum) && Number.isInteger(monthNum) && monthNum! >= 1 && monthNum! <= 12

  const [result, orphanSnapshots] = await Promise.all([
    listReconciliationPeriodsFromPostgres({ accountId, status, includeArchived }),
    wantsOrphans
      ? listOrphanSnapshotsForPeriod(yearNum as number, monthNum as number).catch(() => [])
      : Promise.resolve([])
  ])

  return NextResponse.json({
    ...result,
    orphanSnapshots
  })
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TASK-722 — granular guard: crear period es declarar conciliación.
  if (!can(tenant, 'finance.reconciliation.declare_snapshot', 'create', 'space')) {
    return NextResponse.json({ error: 'No tienes permiso para crear periodos de conciliación.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const accountId = assertNonEmptyString(body.accountId, 'accountId')
    const year = toNumber(body.year)
    const month = toNumber(body.month)

    if (year < 2020 || year > 2100) {
      throw new FinanceValidationError('year must be between 2020 and 2100.')
    }

    if (month < 1 || month > 12) {
      throw new FinanceValidationError('month must be between 1 and 12.')
    }

    const openingBalance = body.openingBalance == null || body.openingBalance === ''
      ? null
      : toNumber(body.openingBalance)

    const periodId = `${accountId}_${year}_${String(month).padStart(2, '0')}`
    const notes = body.notes ? normalizeString(body.notes) : null

    const result = await createReconciliationPeriodInPostgres({
      periodId, accountId, year, month, openingBalance, notes
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
