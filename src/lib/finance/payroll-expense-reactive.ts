import 'server-only'

import { buildMonthlySequenceIdFromPostgres, createFinanceExpenseInPostgres } from '@/lib/finance/postgres-store-slice2'
import { resolveExchangeRateToClp } from '@/lib/finance/shared'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

type PayrollExpenseRow = {
  entry_id: string
  period_id: string
  member_id: string
  display_name: string | null
  currency: string
  net_total: number | string
  chile_employer_total_cost: number | string | null
}

type ExistingExpenseRow = {
  expense_id: string
}

type SupplierRow = {
  supplier_id: string
  legal_name: string | null
  trade_name: string | null
}

const pad2 = (value: number) => String(value).padStart(2, '0')

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const getPeriodDate = (year: number, month: number) => `${year}-${pad2(month)}-01`

const findPreviredSupplier = async () => {
  const rows = await runGreenhousePostgresQuery<SupplierRow>(
    `
      SELECT supplier_id, legal_name, trade_name
      FROM greenhouse_finance.suppliers
      WHERE is_active = TRUE
        AND (
          LOWER(COALESCE(trade_name, '')) LIKE '%previred%'
          OR LOWER(COALESCE(legal_name, '')) LIKE '%previred%'
        )
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, supplier_id ASC
      LIMIT 1
    `
  ).catch(() => [])

  return rows[0] ?? null
}

export const materializePayrollExpensesForExportedPeriod = async ({
  periodId,
  year,
  month
}: {
  periodId: string
  year: number
  month: number
}) => {
  const payrollRows = await runGreenhousePostgresQuery<PayrollExpenseRow>(
    `
      SELECT
        e.entry_id,
        e.period_id,
        e.member_id,
        m.display_name,
        e.currency,
        e.net_total,
        e.chile_employer_total_cost
      FROM greenhouse_payroll.payroll_entries AS e
      INNER JOIN greenhouse_core.members AS m
        ON m.member_id = e.member_id
      WHERE e.period_id = $1
      ORDER BY m.display_name ASC NULLS LAST, e.entry_id ASC
    `,
    [periodId]
  )

  if (payrollRows.length === 0) {
    return {
      payrollCreated: 0,
      payrollSkipped: 0,
      socialSecurityCreated: false,
      socialSecuritySkipped: true
    }
  }

  const periodDate = getPeriodDate(year, month)
  const sequencePeriod = `${year}${pad2(month)}`
  let payrollCreated = 0
  let payrollSkipped = 0

  for (const row of payrollRows) {
    const existing = await runGreenhousePostgresQuery<ExistingExpenseRow>(
      `
        SELECT expense_id
        FROM greenhouse_finance.expenses
        WHERE payroll_entry_id = $1
        LIMIT 1
      `,
      [row.entry_id]
    )

    if (existing.length > 0) {
      payrollSkipped++

      continue
    }

    const amount = toNumber(row.net_total)

    const exchangeRateToClp = await resolveExchangeRateToClp({
      currency: row.currency === 'USD' ? 'USD' : 'CLP',
      requestedRate: null
    })

    const expenseId = await buildMonthlySequenceIdFromPostgres({
      tableName: 'expenses',
      idColumn: 'expense_id',
      prefix: 'EXP',
      period: sequencePeriod
    })

    await createFinanceExpenseInPostgres({
      expenseId,
      clientId: null,
      spaceId: null,
      expenseType: 'payroll',
      sourceType: 'payroll_generated',
      description: `Nomina neta — ${row.display_name || row.member_id}`,
      currency: row.currency,
      subtotal: amount,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: amount,
      exchangeRateToClp,
      totalAmountClp: amount * exchangeRateToClp,
      paymentDate: periodDate,
      paymentStatus: 'pending',
      paymentMethod: null,
      paymentProvider: null,
      paymentRail: 'payroll_file',
      paymentAccountId: null,
      paymentReference: null,
      documentNumber: null,
      documentDate: periodDate,
      dueDate: null,
      supplierId: null,
      supplierName: null,
      supplierInvoiceNumber: null,
      payrollPeriodId: row.period_id,
      payrollEntryId: row.entry_id,
      memberId: row.member_id,
      memberName: row.display_name || row.member_id,
      socialSecurityType: null,
      socialSecurityInstitution: null,
      socialSecurityPeriod: null,
      taxType: null,
      taxPeriod: null,
      taxFormNumber: null,
      miscellaneousCategory: null,
      serviceLine: null,
      isRecurring: true,
      recurrenceFrequency: 'monthly',
      costCategory: 'direct_labor',
      costIsDirect: false,
      allocatedClientId: null,
      directOverheadScope: 'none',
      directOverheadKind: null,
      directOverheadMemberId: null,
      notes: 'System-generated from payroll_period.exported',
      actorUserId: null
    })

    payrollCreated++
  }

  const existingSocialSecurity = await runGreenhousePostgresQuery<ExistingExpenseRow>(
    `
      SELECT expense_id
      FROM greenhouse_finance.expenses
      WHERE payroll_period_id = $1
        AND expense_type = 'social_security'
      LIMIT 1
    `,
    [periodId]
  )

  if (existingSocialSecurity.length > 0) {
    return {
      payrollCreated,
      payrollSkipped,
      socialSecurityCreated: false,
      socialSecuritySkipped: true
    }
  }

  const previredTotal = payrollRows.reduce((sum, row) => sum + toNumber(row.chile_employer_total_cost), 0)

  if (previredTotal <= 0) {
    return {
      payrollCreated,
      payrollSkipped,
      socialSecurityCreated: false,
      socialSecuritySkipped: true
    }
  }

  const previredSupplier = await findPreviredSupplier()

  const socialSecurityExpenseId = await buildMonthlySequenceIdFromPostgres({
    tableName: 'expenses',
    idColumn: 'expense_id',
    prefix: 'EXP',
    period: sequencePeriod
  })

  await createFinanceExpenseInPostgres({
    expenseId: socialSecurityExpenseId,
    clientId: null,
    spaceId: null,
    expenseType: 'social_security',
    sourceType: 'payroll_generated',
    description: `Previred consolidado — ${periodId}`,
    currency: 'CLP',
    subtotal: previredTotal,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: previredTotal,
    exchangeRateToClp: 1,
    totalAmountClp: previredTotal,
    paymentDate: periodDate,
    paymentStatus: 'pending',
    paymentMethod: 'transfer',
    paymentProvider: 'previred',
    paymentRail: 'previred',
    paymentAccountId: null,
    paymentReference: periodId,
    documentNumber: null,
    documentDate: periodDate,
    dueDate: null,
    supplierId: previredSupplier?.supplier_id ?? null,
    supplierName: previredSupplier?.trade_name || previredSupplier?.legal_name || 'Previred',
    supplierInvoiceNumber: null,
    payrollPeriodId: periodId,
    payrollEntryId: null,
    memberId: null,
    memberName: null,
    socialSecurityType: 'previred',
    socialSecurityInstitution: 'Previred',
    socialSecurityPeriod: `${year}-${pad2(month)}`,
    taxType: null,
    taxPeriod: null,
    taxFormNumber: null,
    miscellaneousCategory: null,
    serviceLine: null,
    isRecurring: true,
    recurrenceFrequency: 'monthly',
    costCategory: 'tax_social',
    costIsDirect: false,
    allocatedClientId: null,
    directOverheadScope: 'none',
    directOverheadKind: null,
    directOverheadMemberId: null,
    notes: 'System-generated from payroll_period.exported',
    actorUserId: null
  })

  return {
    payrollCreated,
    payrollSkipped,
    socialSecurityCreated: true,
    socialSecuritySkipped: false
  }
}
