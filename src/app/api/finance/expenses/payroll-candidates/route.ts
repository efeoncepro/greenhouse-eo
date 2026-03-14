import { NextResponse } from 'next/server'

import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { ensurePayrollInfrastructure } from '@/lib/payroll/schema'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import {
  getFinanceProjectId,
  normalizeString,
  runFinanceQuery,
  toDateString,
  toNumber
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface PayrollCandidateRow {
  payroll_entry_id: string
  payroll_period_id: string
  payroll_status: string
  approved_at: unknown
  member_id: string
  member_name: string | null
  currency: string
  gross_total: unknown
  net_total: unknown
  linked_expense_id: string | null
  linked_payment_status: string | null
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()
  await ensurePayrollInfrastructure()

  const { searchParams } = new URL(request.url)
  const periodId = normalizeString(searchParams.get('periodId'))
  const memberId = normalizeString(searchParams.get('memberId'))
  const linkStatus = normalizeString(searchParams.get('linkStatus')) || 'available'
  const projectId = getFinanceProjectId()

  let filters = `WHERE pp.status IN ('approved', 'exported')`
  const params: Record<string, unknown> = {}

  if (periodId) {
    filters += ' AND pe.period_id = @periodId'
    params.periodId = periodId
  }

  if (memberId) {
    filters += ' AND pe.member_id = @memberId'
    params.memberId = memberId
  }

  if (linkStatus === 'available') {
    filters += ' AND fe.expense_id IS NULL'
  } else if (linkStatus === 'linked') {
    filters += ' AND fe.expense_id IS NOT NULL'
  }

  const rows = await runFinanceQuery<PayrollCandidateRow>(`
    SELECT
      pe.entry_id AS payroll_entry_id,
      pe.period_id AS payroll_period_id,
      pp.status AS payroll_status,
      pp.approved_at,
      pe.member_id,
      tm.display_name AS member_name,
      pe.currency,
      pe.gross_total,
      pe.net_total,
      fe.expense_id AS linked_expense_id,
      fe.payment_status AS linked_payment_status
    FROM \`${projectId}.greenhouse.payroll_entries\` pe
    JOIN \`${projectId}.greenhouse.payroll_periods\` pp
      ON pp.period_id = pe.period_id
    LEFT JOIN \`${projectId}.greenhouse.team_members\` tm
      ON tm.member_id = pe.member_id
    LEFT JOIN \`${projectId}.greenhouse.fin_expenses\` fe
      ON fe.payroll_entry_id = pe.entry_id
    ${filters}
    ORDER BY pe.period_id DESC, COALESCE(tm.display_name, pe.member_id) ASC
    LIMIT 300
  `, params)

  return NextResponse.json({
    items: rows.map(row => ({
      payrollEntryId: normalizeString(row.payroll_entry_id),
      payrollPeriodId: normalizeString(row.payroll_period_id),
      payrollStatus: normalizeString(row.payroll_status),
      approvedAt: toDateString(row.approved_at as string | { value?: string } | null),
      memberId: normalizeString(row.member_id),
      memberName: row.member_name ? normalizeString(row.member_name) : normalizeString(row.member_id),
      currency: normalizeString(row.currency),
      grossTotal: toNumber(row.gross_total),
      netTotal: toNumber(row.net_total),
      linkedExpenseId: row.linked_expense_id ? normalizeString(row.linked_expense_id) : null,
      linkedPaymentStatus: row.linked_payment_status ? normalizeString(row.linked_payment_status) : null,
      isLinked: Boolean(row.linked_expense_id)
    })),
    total: rows.length
  })
}
