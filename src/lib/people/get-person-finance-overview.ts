import 'server-only'

import type { PersonFinanceOverview } from '@/types/people'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { PeopleValidationError, runPeopleQuery, toDateString, toNumber } from '@/lib/people/shared'
import { isGreenhousePostgresConfigured } from '@/lib/postgres/client'
import { getPersonFinanceOverviewFromPostgres } from '@/lib/person-360/get-person-finance'

type MemberRow = {
  member_id: string
  display_name: string | null
  identity_profile_id: string | null
}

type AssignmentRow = {
  assignment_id: string
  client_id: string
  client_name: string | null
  fte_allocation: unknown
  hours_per_month: unknown
  role_title_override: string | null
  start_date: unknown
  end_date: unknown
  active: boolean
}

type IdentityRow = {
  source_system: string | null
  source_object_id: string | null
  source_user_id: string | null
  source_email: string | null
  source_display_name: string | null
}

type PayrollRow = {
  entry_id: string
  period_id: string
  year: unknown
  month: unknown
  status: string | null
  currency: string | null
  gross_total: unknown
  net_total: unknown
  created_at: unknown
}

type ExpenseRow = {
  expense_id: string
  client_id: string | null
  client_name: string | null
  expense_type: string
  description: string
  currency: string
  total_amount: unknown
  total_amount_clp: unknown
  payment_status: string
  payment_date: unknown
  document_date: unknown
  supplier_name: string | null
  service_line: string | null
  payroll_entry_id: string | null
  created_at: unknown
}

type SummaryRow = {
  expense_count: unknown
  paid_expenses_count: unknown
  total_expenses_clp: unknown
  last_expense_date: unknown
}

const normalizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const toTimestampString = (value: unknown) => {
  if (!value) return null
  if (typeof value === 'string') return value

  if (typeof value === 'object' && value && 'value' in value) {
    const nested = (value as { value?: unknown }).value

    return typeof nested === 'string' ? nested : null
  }

  return null
}

export const getPersonFinanceOverview = async (memberId: string): Promise<PersonFinanceOverview> => {
  // Postgres-first: use person_finance_360 view when Postgres is configured
  if (isGreenhousePostgresConfigured()) {
    return getPersonFinanceOverviewFromPostgres(memberId)
  }

  // BigQuery fallback
  await ensureFinanceInfrastructure()

  const projectId = getBigQueryProjectId()

  const [member] = await runPeopleQuery<MemberRow>(
    `
      SELECT member_id, display_name, identity_profile_id
      FROM \`${projectId}.greenhouse.team_members\`
      WHERE member_id = @memberId
      LIMIT 1
    `,
    { memberId }
  )

  if (!member) {
    throw new PeopleValidationError('Person not found.', 404, { memberId })
  }

  const [assignments, identities, payrollHistory, expenses, summaryRows] = await Promise.all([
    runPeopleQuery<AssignmentRow>(
      `
        SELECT
          a.assignment_id,
          a.client_id,
          COALESCE(c.client_name, a.client_id) AS client_name,
          a.fte_allocation,
          a.hours_per_month,
          a.role_title_override,
          a.start_date,
          a.end_date,
          a.active
        FROM \`${projectId}.greenhouse.client_team_assignments\` AS a
        LEFT JOIN \`${projectId}.greenhouse.clients\` AS c
          ON c.client_id = a.client_id
        WHERE a.member_id = @memberId
        ORDER BY a.active DESC, a.start_date DESC, client_name ASC
      `,
      { memberId }
    ),
    member.identity_profile_id
      ? runPeopleQuery<IdentityRow>(
        `
          SELECT
            source_system,
            source_object_id,
            source_user_id,
            source_email,
            source_display_name
          FROM \`${projectId}.greenhouse.identity_profile_source_links\`
          WHERE active = TRUE
            AND profile_id = @identityProfileId
          ORDER BY source_system ASC, source_email ASC
        `,
        { identityProfileId: member.identity_profile_id }
      )
      : Promise.resolve([] as IdentityRow[]),
    runPeopleQuery<PayrollRow>(
      `
        SELECT
          e.entry_id,
          e.period_id,
          p.year,
          p.month,
          p.status,
          e.currency,
          e.gross_total,
          e.net_total,
          e.created_at
        FROM \`${projectId}.greenhouse.payroll_entries\` AS e
        LEFT JOIN \`${projectId}.greenhouse.payroll_periods\` AS p
          ON p.period_id = e.period_id
        WHERE e.member_id = @memberId
        ORDER BY p.year DESC, p.month DESC, e.created_at DESC
        LIMIT 12
      `,
      { memberId }
    ),
    runPeopleQuery<ExpenseRow>(
      `
        SELECT
          e.expense_id,
          e.client_id,
          c.client_name,
          e.expense_type,
          e.description,
          e.currency,
          e.total_amount,
          e.total_amount_clp,
          e.payment_status,
          e.payment_date,
          e.document_date,
          e.supplier_name,
          e.service_line,
          e.payroll_entry_id,
          e.created_at
        FROM \`${projectId}.greenhouse.fin_expenses\` AS e
        LEFT JOIN \`${projectId}.greenhouse.clients\` AS c
          ON c.client_id = e.client_id
        WHERE e.member_id = @memberId
        ORDER BY COALESCE(e.document_date, e.payment_date, DATE(e.created_at)) DESC, e.created_at DESC
        LIMIT 50
      `,
      { memberId }
    ),
    runPeopleQuery<SummaryRow>(
      `
        SELECT
          COUNT(*) AS expense_count,
          COUNTIF(payment_status = 'paid') AS paid_expenses_count,
          COALESCE(SUM(total_amount_clp), 0) AS total_expenses_clp,
          MAX(COALESCE(payment_date, document_date)) AS last_expense_date
        FROM \`${projectId}.greenhouse.fin_expenses\`
        WHERE member_id = @memberId
      `,
      { memberId }
    )
  ])

  const summary = summaryRows[0]

  return {
    member: {
      memberId: member.member_id,
      displayName: member.display_name ? normalizeString(member.display_name) : null,
      identityProfileId: member.identity_profile_id ? normalizeString(member.identity_profile_id) : null
    },
    summary: {
      activeAssignmentsCount: assignments.filter(item => item.active).length,
      payrollEntriesCount: payrollHistory.length,
      expenseCount: toNumber(summary?.expense_count),
      paidExpensesCount: toNumber(summary?.paid_expenses_count),
      totalExpensesClp: toNumber(summary?.total_expenses_clp),
      lastExpenseDate: toDateString(summary?.last_expense_date as string | { value?: string } | null)
    },
    assignments: assignments.map(item => ({
      assignmentId: item.assignment_id,
      clientId: item.client_id,
      clientName: item.client_name ? normalizeString(item.client_name) : item.client_id,
      fteAllocation: toNumber(item.fte_allocation),
      hoursPerMonth: toNumber(item.hours_per_month),
      roleTitleOverride: item.role_title_override ? normalizeString(item.role_title_override) : null,
      startDate: toDateString(item.start_date as string | { value?: string } | null),
      endDate: toDateString(item.end_date as string | { value?: string } | null),
      active: Boolean(item.active)
    })),
    identities: identities.map(item => ({
      sourceSystem: item.source_system ? normalizeString(item.source_system) : null,
      sourceObjectId: item.source_object_id ? normalizeString(item.source_object_id) : null,
      sourceUserId: item.source_user_id ? normalizeString(item.source_user_id) : null,
      sourceEmail: item.source_email ? normalizeString(item.source_email) : null,
      sourceDisplayName: item.source_display_name ? normalizeString(item.source_display_name) : null
    })),
    payrollHistory: payrollHistory.map(item => ({
      entryId: item.entry_id,
      periodId: item.period_id,
      year: toNumber(item.year),
      month: toNumber(item.month),
      status: item.status ? normalizeString(item.status) : null,
      currency: item.currency ? normalizeString(item.currency) : null,
      grossTotal: toNumber(item.gross_total),
      netTotal: toNumber(item.net_total),
      createdAt: toTimestampString(item.created_at)
    })),
    expenses: expenses.map(item => ({
      expenseId: item.expense_id,
      clientId: item.client_id ? normalizeString(item.client_id) : null,
      clientName: item.client_name ? normalizeString(item.client_name) : null,
      expenseType: normalizeString(item.expense_type),
      description: normalizeString(item.description),
      currency: normalizeString(item.currency),
      totalAmount: toNumber(item.total_amount),
      totalAmountClp: toNumber(item.total_amount_clp),
      paymentStatus: normalizeString(item.payment_status),
      paymentDate: toDateString(item.payment_date as string | { value?: string } | null),
      documentDate: toDateString(item.document_date as string | { value?: string } | null),
      supplierName: item.supplier_name ? normalizeString(item.supplier_name) : null,
      serviceLine: item.service_line ? normalizeString(item.service_line) : null,
      payrollEntryId: item.payroll_entry_id ? normalizeString(item.payroll_entry_id) : null,
      createdAt: toTimestampString(item.created_at)
    }))
  }
}
