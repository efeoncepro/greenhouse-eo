import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

interface PayrollCandidateRow extends Record<string, unknown> {
  payroll_entry_id: string
  payroll_period_id: string
  period_year: number
  period_month: number
  payroll_status: string
  member_id: string
  member_name: string | null
  currency: string
  gross_total: string | number
  net_total: string | number
  linked_expense_id: string | null
  linked_payment_status: string | null
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }

  return 0
}

const str = (v: unknown): string => {
  if (typeof v === 'string') return v.trim()

  return v ? String(v).trim() : ''
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const periodId = searchParams.get('periodId')?.trim() || null
  const memberId = searchParams.get('memberId')?.trim() || null
  const linkStatus = searchParams.get('linkStatus')?.trim() || 'available'

  const params: unknown[] = []
  let filters = `WHERE pp.status IN ('approved', 'exported') AND pe.is_active = TRUE`
  let idx = 1

  if (periodId) {
    filters += ` AND pe.period_id = $${idx}`
    params.push(periodId)
    idx++
  }

  if (memberId) {
    filters += ` AND pe.member_id = $${idx}`
    params.push(memberId)
    idx++
  }

  if (linkStatus === 'available') {
    filters += ' AND fe.expense_id IS NULL'
  } else if (linkStatus === 'linked') {
    filters += ' AND fe.expense_id IS NOT NULL'
  }

  try {
    const rows = await runGreenhousePostgresQuery<PayrollCandidateRow>(
      `SELECT
        pe.entry_id AS payroll_entry_id,
        pe.period_id AS payroll_period_id,
        pp.period_year,
        pp.period_month,
        pp.status AS payroll_status,
        pe.member_id,
        m.display_name AS member_name,
        pe.currency,
        pe.gross_total,
        pe.net_total,
        fe.expense_id AS linked_expense_id,
        fe.payment_status AS linked_payment_status
      FROM greenhouse_payroll.payroll_entries pe
      JOIN greenhouse_payroll.payroll_periods pp ON pp.period_id = pe.period_id
      LEFT JOIN greenhouse_core.members m ON m.member_id = pe.member_id
      LEFT JOIN greenhouse_finance.expenses fe ON fe.payroll_entry_id = pe.entry_id
      ${filters}
      ORDER BY pp.period_year DESC, pp.period_month DESC, COALESCE(m.display_name, pe.member_id) ASC
      LIMIT 300`,
      params
    )

    return NextResponse.json({
      items: rows.map(row => ({
        payrollEntryId: str(row.payroll_entry_id),
        payrollPeriodId: str(row.payroll_period_id),
        periodYear: Number(row.period_year),
        periodMonth: Number(row.period_month),
        payrollStatus: str(row.payroll_status),
        memberId: str(row.member_id),
        memberName: row.member_name ? str(row.member_name) : str(row.member_id),
        currency: str(row.currency),
        grossTotal: toNum(row.gross_total),
        netTotal: toNum(row.net_total),
        linkedExpenseId: row.linked_expense_id ? str(row.linked_expense_id) : null,
        linkedPaymentStatus: row.linked_payment_status ? str(row.linked_payment_status) : null,
        isLinked: Boolean(row.linked_expense_id)
      })),
      total: rows.length
    })
  } catch (error) {
    console.error('GET /api/finance/expenses/payroll-candidates failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
