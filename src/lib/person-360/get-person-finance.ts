import 'server-only'

import type { PersonFinanceOverview } from '@/types/people'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolvePersonIdentifier } from '@/lib/person-360/resolve-eo-id'

// ── Row types ──

type FinanceSummaryRow = {
  identity_profile_id: string
  eo_id: string
  member_id: string
  resolved_display_name: string
  member_email: string | null
  total_payroll_entries: number
  expense_count: number
  paid_expense_count: number
  total_expenses_clp: number
  last_expense_date: string | null
}

type PayrollRow = {
  entry_id: string
  period_id: string
  year: number
  month: number
  status: string | null
  currency: string | null
  gross_total: string | null
  net_total: string | null
  created_at: string | null
}

type ExpenseRow = {
  expense_id: string
  client_id: string | null
  client_name: string | null
  expense_type: string
  description: string
  currency: string
  total_amount: string | null
  total_amount_clp: string | null
  payment_status: string
  payment_date: string | null
  document_date: string | null
  supplier_name: string | null
  service_line: string | null
  payroll_entry_id: string | null
  created_at: string | null
}

type AssignmentRow = {
  assignment_id: string
  client_id: string
  client_name: string | null
  fte_allocation: string | number
  hours_per_month: string | number | null
  role_title_override: string | null
  start_date: string | null
  end_date: string | null
  active: boolean
}

type IdentityLinkRow = {
  source_system: string | null
  source_object_id: string | null
  source_user_id: string | null
  source_email: string | null
  source_display_name: string | null
}

type CostAttributionRow = {
  client_id: string
  client_name: string
  organization_name: string | null
  fte_allocation: string | number
  allocated_labor_clp: string | number
  period_year: string | number
  period_month: string | number
}

type LatestCostSnapshotRow = {
  period_year: string | number
  period_month: string | number
  closure_status: string | null
  period_closed: boolean | null
  snapshot_status: string | null
  loaded_cost_target: string | number | null
  total_labor_cost_target: string | number | null
  direct_overhead_target: string | number | null
  shared_overhead_target: string | number | null
}

type ExpenseSummaryRow = {
  expense_count: string | number
  paid_expense_count: string | number
  total_expenses_clp: string | number
  last_expense_date: string | null
}

// ── Helpers ──

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);



return Number.isFinite(n) ? n : 0 }

  return 0
}

const toDateStr = (v: string | null): string | null =>
  v ? v.slice(0, 10) : null

const str = (v: string | null | undefined): string | null =>
  v ? v.trim() || null : null

// ── Main function ──

/**
 * @deprecated Use `getPersonComplete360(identifier, { facets: ['payroll', 'costs', 'assignments'] })`
 * from `@/lib/person-360/person-complete-360` instead. This function will be removed
 * once all consumers are migrated to the federated 360 resolver (TASK-273).
 */
export const getPersonFinanceOverviewFromPostgres = async (
  identifier: string,
  options: {
    organizationId?: string | null
  } = {}
): Promise<PersonFinanceOverview> => {
  const resolved = await resolvePersonIdentifier(identifier)

  if (!resolved?.memberId) {
    // Try direct member lookup as fallback
    const directRows = await runGreenhousePostgresQuery<FinanceSummaryRow>(
      `SELECT
        ip.profile_id AS identity_profile_id,
        ip.public_id AS eo_id,
        m.member_id,
        COALESCE(m.display_name, ip.full_name, 'Sin nombre') AS resolved_display_name,
        m.primary_email AS member_email,
        0 AS total_payroll_entries,
        0 AS expense_count,
        0 AS paid_expense_count,
        0 AS total_expenses_clp,
        NULL AS last_expense_date
      FROM greenhouse_core.members m
      LEFT JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = m.identity_profile_id
      WHERE m.member_id = $1
      LIMIT 1`,
      [identifier]
    )

    if (!directRows[0]) {
      return {
        member: { memberId: identifier, displayName: null, identityProfileId: null },
        summary: {
          activeAssignmentsCount: 0, payrollEntriesCount: 0, expenseCount: 0,
          paidExpensesCount: 0, totalExpensesClp: 0, lastExpenseDate: null
        },
        assignments: [],
        identities: [],
        payrollHistory: [],
        expenses: []
      }
    }

    const row = directRows[0]

    return buildFinanceOverview(row.member_id, row.identity_profile_id, row.resolved_display_name, options)
  }

  return buildFinanceOverview(resolved.memberId, resolved.identityProfileId, null, options)
}

const buildFinanceOverview = async (
  memberId: string,
  identityProfileId: string | null,
  displayNameHint: string | null,
  options: {
    organizationId?: string | null
  }
): Promise<PersonFinanceOverview> => {
  const organizationId = str(options.organizationId)

  // Run summary + detail queries in parallel
  const [summaryRows, payrollRows, expenseRows, expenseSummaryRows, identityRows, assignmentRows, costAttributionRows, latestCostSnapshotRows] = await Promise.all([
    runGreenhousePostgresQuery<FinanceSummaryRow>(
      `SELECT * FROM greenhouse_serving.person_finance_360
       WHERE member_id = $1
       LIMIT 1`,
      [memberId]
    ),
    runGreenhousePostgresQuery<PayrollRow>(
      `SELECT
        pe.entry_id,
        pe.period_id,
        pp.year,
        pp.month,
        pp.status,
        pe.currency,
        pe.gross_total::text,
        pe.net_total::text,
        pe.created_at::text
      FROM greenhouse_payroll.payroll_entries pe
      JOIN greenhouse_payroll.payroll_periods pp ON pp.period_id = pe.period_id
      WHERE pe.member_id = $1
      ORDER BY pp.year DESC, pp.month DESC, pe.created_at DESC
      LIMIT 12`,
      [memberId]
    ),
    runGreenhousePostgresQuery<ExpenseRow>(
      `SELECT
        e.expense_id,
        e.client_id,
        c.client_name,
        e.expense_type,
        e.description,
        e.currency,
        e.total_amount::text,
        e.total_amount_clp::text,
        e.payment_status,
        e.payment_date::text,
        e.document_date::text,
        e.supplier_name,
        e.service_line,
        e.payroll_entry_id,
        e.created_at::text
      FROM greenhouse_finance.expenses e
      LEFT JOIN greenhouse_core.clients c ON c.client_id = e.client_id
      LEFT JOIN greenhouse_core.spaces sp
        ON sp.client_id = e.client_id
       AND sp.active = TRUE
      WHERE e.member_id = $1
        AND ($2::text IS NULL OR sp.organization_id = $2 OR e.space_id IN (
          SELECT s2.space_id
          FROM greenhouse_core.spaces s2
          WHERE s2.organization_id = $2
            AND s2.active = TRUE
        ))
      ORDER BY COALESCE(e.document_date, e.payment_date, e.created_at::date) DESC, e.created_at DESC
      LIMIT 50`,
      [memberId, organizationId]
    ),
    runGreenhousePostgresQuery<ExpenseSummaryRow>(
      `SELECT
         COUNT(*)::text AS expense_count,
         COUNT(*) FILTER (WHERE e.payment_status = 'paid')::text AS paid_expense_count,
         COALESCE(SUM(e.total_amount_clp), 0)::text AS total_expenses_clp,
         MAX(COALESCE(e.payment_date, e.document_date)::text) AS last_expense_date
       FROM greenhouse_finance.expenses e
       LEFT JOIN greenhouse_core.spaces sp
         ON sp.client_id = e.client_id
        AND sp.active = TRUE
       WHERE e.member_id = $1
         AND ($2::text IS NULL OR sp.organization_id = $2 OR e.space_id IN (
           SELECT s2.space_id
           FROM greenhouse_core.spaces s2
           WHERE s2.organization_id = $2
             AND s2.active = TRUE
         ))`,
      [memberId, organizationId]
    ),
    identityProfileId
      ? runGreenhousePostgresQuery<IdentityLinkRow>(
        `SELECT source_system, source_object_id, source_user_id, source_email, source_display_name
         FROM greenhouse_core.identity_profile_source_links
         WHERE active = TRUE AND profile_id = $1
         ORDER BY source_system ASC, source_email ASC`,
        [identityProfileId]
      )
      : Promise.resolve([] as IdentityLinkRow[]),
    runGreenhousePostgresQuery<AssignmentRow>(
      `SELECT
        a.assignment_id,
        a.client_id,
        COALESCE(c.client_name, a.client_id) AS client_name,
        a.fte_allocation::text,
        a.hours_per_month,
        a.role_title_override,
        a.start_date::text,
        a.end_date::text,
        a.active
      FROM greenhouse_core.client_team_assignments a
      LEFT JOIN greenhouse_core.clients c ON c.client_id = a.client_id
      WHERE a.member_id = $1
        AND ($2::text IS NULL OR EXISTS (
          SELECT 1
          FROM greenhouse_core.spaces s
          WHERE s.client_id = a.client_id
            AND s.organization_id = $2
            AND s.active = TRUE
        ))
      ORDER BY a.active DESC, a.start_date DESC`,
      [memberId, organizationId]
    ).catch(() => [] as AssignmentRow[]),
    runGreenhousePostgresQuery<CostAttributionRow>(
      `SELECT
        cca.client_id,
        cca.client_name,
        o.organization_name,
        cca.fte_contribution AS fte_allocation,
        cca.commercial_labor_cost_target AS allocated_labor_clp,
        cca.period_year,
        cca.period_month
      FROM greenhouse_serving.commercial_cost_attribution cca
      LEFT JOIN greenhouse_core.spaces sp ON sp.client_id = cca.client_id AND sp.active = TRUE
      LEFT JOIN greenhouse_core.organizations o ON o.organization_id = sp.organization_id
      WHERE cca.member_id = $1
        AND ($2::text IS NULL OR COALESCE(cca.organization_id, sp.organization_id) = $2)
      ORDER BY cca.period_year DESC, cca.period_month DESC, cca.commercial_labor_cost_target DESC
      LIMIT 20`,
      [memberId, organizationId]
    ).catch(() => [] as CostAttributionRow[]),
    runGreenhousePostgresQuery<LatestCostSnapshotRow>(
      `SELECT
         mce.period_year,
         mce.period_month,
         pcs.closure_status,
         COALESCE(pcs.closure_status = 'closed', FALSE) AS period_closed,
         mce.snapshot_status,
         mce.loaded_cost_target,
         mce.total_labor_cost_target,
         mce.direct_overhead_target,
         mce.shared_overhead_target
       FROM greenhouse_serving.member_capacity_economics mce
       LEFT JOIN greenhouse_serving.period_closure_status pcs
         ON pcs.period_year = mce.period_year
        AND pcs.period_month = mce.period_month
       WHERE mce.member_id = $1
       ORDER BY mce.period_year DESC, mce.period_month DESC
       LIMIT 1`,
      [memberId]
    ).catch(() => [] as LatestCostSnapshotRow[])
  ])

  const summary = summaryRows[0]
  const expenseSummary = expenseSummaryRows[0]
  const latestCostSnapshot = latestCostSnapshotRows[0]

  return {
    member: {
      memberId,
      displayName: summary?.resolved_display_name ?? displayNameHint,
      identityProfileId: summary?.identity_profile_id ?? identityProfileId
    },
    summary: {
      activeAssignmentsCount: assignmentRows.filter(r => r.active).length,
      payrollEntriesCount: toNum(summary?.total_payroll_entries),
      expenseCount: toNum(expenseSummary?.expense_count ?? summary?.expense_count),
      paidExpensesCount: toNum(expenseSummary?.paid_expense_count ?? summary?.paid_expense_count),
      totalExpensesClp: toNum(expenseSummary?.total_expenses_clp ?? summary?.total_expenses_clp),
      lastExpenseDate: toDateStr(expenseSummary?.last_expense_date ?? summary?.last_expense_date ?? null)
    },
    assignments: assignmentRows.map(r => ({
      assignmentId: r.assignment_id,
      clientId: r.client_id,
      clientName: r.client_name?.trim() || r.client_id,
      fteAllocation: toNum(r.fte_allocation),
      hoursPerMonth: toNum(r.hours_per_month),
      roleTitleOverride: str(r.role_title_override),
      startDate: toDateStr(r.start_date),
      endDate: toDateStr(r.end_date),
      active: Boolean(r.active)
    })),
    identities: identityRows.map(r => ({
      sourceSystem: str(r.source_system),
      sourceObjectId: str(r.source_object_id),
      sourceUserId: str(r.source_user_id),
      sourceEmail: str(r.source_email),
      sourceDisplayName: str(r.source_display_name)
    })),
    payrollHistory: payrollRows.map(r => ({
      entryId: r.entry_id,
      periodId: r.period_id,
      year: toNum(r.year),
      month: toNum(r.month),
      status: str(r.status),
      currency: str(r.currency),
      grossTotal: toNum(r.gross_total),
      netTotal: toNum(r.net_total),
      createdAt: r.created_at
    })),
    expenses: expenseRows.map(r => ({
      expenseId: r.expense_id,
      clientId: str(r.client_id),
      clientName: str(r.client_name),
      expenseType: r.expense_type?.trim() || '',
      description: r.description?.trim() || '',
      currency: r.currency?.trim() || '',
      totalAmount: toNum(r.total_amount),
      totalAmountClp: toNum(r.total_amount_clp),
      paymentStatus: r.payment_status?.trim() || '',
      paymentDate: toDateStr(r.payment_date),
      documentDate: toDateStr(r.document_date),
      supplierName: str(r.supplier_name),
      serviceLine: str(r.service_line),
      payrollEntryId: str(r.payroll_entry_id),
      createdAt: r.created_at
    })),
    costAttribution: costAttributionRows.map(r => ({
      clientId: r.client_id,
      clientName: r.client_name,
      organizationName: r.organization_name || null,
      fteAllocation: toNum(r.fte_allocation),
      attributedCostClp: toNum(r.allocated_labor_clp),
      periodYear: toNum(r.period_year),
      periodMonth: toNum(r.period_month)
    })),
    latestCostSnapshot: latestCostSnapshot
      ? {
          periodYear: toNum(latestCostSnapshot.period_year),
          periodMonth: toNum(latestCostSnapshot.period_month),
          closureStatus: str(latestCostSnapshot.closure_status),
          periodClosed: latestCostSnapshot.period_closed === true,
          snapshotStatus: str(latestCostSnapshot.snapshot_status),
          loadedCostTarget: toNum(latestCostSnapshot.loaded_cost_target),
          laborCostTarget: toNum(latestCostSnapshot.total_labor_cost_target),
          directOverheadTarget: toNum(latestCostSnapshot.direct_overhead_target),
          sharedOverheadTarget: toNum(latestCostSnapshot.shared_overhead_target)
        }
      : null
  }
}
