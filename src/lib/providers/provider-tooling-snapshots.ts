import 'server-only'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

type Period = {
  year: number
  month: number
}

type ProviderBaseRow = {
  provider_id: string
  provider_name: string
  provider_type: string | null
  supplier_id: string | null
  supplier_category: string | null
  payment_currency: string | null
}

type ToolInventoryRow = {
  provider_id: string
  tool_count: string | number
  active_tool_count: string | number
}

type ActiveLicenseRow = {
  provider_id: string
  license_id: string
  member_id: string
  subscription_amount: string | number | null
  subscription_currency: string | null
  subscription_billing_cycle: string | null
  subscription_seats: string | number | null
  updated_at: string | Date | null
  activated_at: string | Date | null
}

type ExchangeRateRow = {
  from_currency: string
  rate: string | number | null
}

type WalletInventoryRow = {
  provider_id: string
  wallet_count: string | number
  active_wallet_count: string | number
}

type UsageCostRow = {
  provider_id: string
  usage_cost_total_clp: string | number | null
}

type FinanceExpenseRow = {
  provider_id: string
  finance_expense_count: string | number
  finance_expense_total_clp: string | number | null
  latest_expense_date: string | Date | null
}

type PayrollImpactRow = {
  provider_id: string
  payroll_member_count: string | number
  licensed_member_payroll_cost_clp: string | number | null
}

type StoredProviderToolingSnapshotRow = {
  snapshot_id: string
  provider_id: string
  provider_name: string
  provider_type: string | null
  supplier_id: string | null
  supplier_category: string | null
  payment_currency: string | null
  period_year: string | number
  period_month: string | number
  period_id: string
  tool_count: string | number
  active_tool_count: string | number
  active_license_count: string | number
  active_member_count: string | number
  wallet_count: string | number
  active_wallet_count: string | number
  subscription_cost_total_clp: string | number | null
  usage_cost_total_clp: string | number | null
  finance_expense_count: string | number
  finance_expense_total_clp: string | number | null
  payroll_member_count: string | number
  licensed_member_payroll_cost_clp: string | number | null
  total_provider_cost_clp: string | number | null
  latest_expense_date: string | Date | null
  latest_license_change_at: string | Date | null
  snapshot_status: 'complete'
  updated_at: string | Date | null
}

export type ProviderToolingSnapshot = {
  snapshotId: string
  providerId: string
  providerName: string
  providerType: string | null
  supplierId: string | null
  supplierCategory: string | null
  paymentCurrency: string | null
  periodYear: number
  periodMonth: number
  periodId: string
  toolCount: number
  activeToolCount: number
  activeLicenseCount: number
  activeMemberCount: number
  walletCount: number
  activeWalletCount: number
  subscriptionCostTotalClp: number
  usageCostTotalClp: number
  financeExpenseCount: number
  financeExpenseTotalClp: number
  payrollMemberCount: number
  licensedMemberPayrollCostClp: number
  totalProviderCostClp: number
  latestExpenseDate: string | null
  latestLicenseChangeAt: string | null
  snapshotStatus: 'complete'
  materializedAt: string | null
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toDateString = (value: string | Date | null) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

const toTimestampString = (value: string | Date | null) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return value
}

const pad2 = (value: number) => String(value).padStart(2, '0')

const getPeriodStartDate = ({ year, month }: Period) => `${year}-${pad2(month)}-01`

const getPeriodEndDate = ({ year, month }: Period) => {
  const end = new Date(Date.UTC(year, month, 0))

  return end.toISOString().slice(0, 10)
}

const getLastBusinessDay = (period: Period) => {
  const end = new Date(`${getPeriodEndDate(period)}T00:00:00Z`)

  while (end.getUTCDay() === 0 || end.getUTCDay() === 6) {
    end.setUTCDate(end.getUTCDate() - 1)
  }

  return end.toISOString().slice(0, 10)
}

const toMonthlyFactor = (billingCycle: string | null) => {
  const normalized = String(billingCycle || 'monthly').trim().toLowerCase()

  switch (normalized) {
    case '':
    case 'monthly':
      return 1
    case 'quarterly':
      return 1 / 3
    case 'annual':
    case 'yearly':
      return 1 / 12
    default:
      return null
  }
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100

const buildSnapshotId = (providerId: string, period: Period) => `${providerId}:${period.year}-${pad2(period.month)}`

export const materializeProviderToolingSnapshotsForPeriod = async (
  year: number,
  month: number,
  reason: string
): Promise<ProviderToolingSnapshot[]> => {
  const period = { year, month }
  const periodId = `${year}-${pad2(month)}`
  const periodStart = getPeriodStartDate(period)
  const periodEnd = getPeriodEndDate(period)
  const lastBusinessDay = getLastBusinessDay(period)

  const providerRows = await runGreenhousePostgresQuery<ProviderBaseRow>(
    `
      SELECT
        p.provider_id,
        p.provider_name,
        p.provider_type,
        supplier.supplier_id,
        supplier.category AS supplier_category,
        supplier.payment_currency
      FROM greenhouse_core.providers AS p
      LEFT JOIN LATERAL (
        SELECT
          s.supplier_id,
          s.category,
          s.payment_currency
        FROM greenhouse_finance.suppliers AS s
        WHERE s.provider_id = p.provider_id
        ORDER BY s.is_active DESC, s.updated_at DESC, s.created_at DESC
        LIMIT 1
      ) AS supplier ON TRUE
      WHERE p.active = TRUE
      ORDER BY p.provider_name ASC, p.provider_id ASC
    `
  )

  if (providerRows.length === 0) {
    return []
  }

  const [
    toolInventoryRows,
    activeLicenseRows,
    walletInventoryRows,
    usageCostRows,
    financeExpenseRows,
    payrollImpactRows
  ] = await Promise.all([
    runGreenhousePostgresQuery<ToolInventoryRow>(
      `
        SELECT
          provider_id,
          COUNT(*)::text AS tool_count,
          COUNT(*) FILTER (WHERE is_active = TRUE)::text AS active_tool_count
        FROM greenhouse_ai.tool_catalog
        GROUP BY provider_id
      `
    ).catch(() => []),
    runGreenhousePostgresQuery<ActiveLicenseRow>(
      `
        SELECT
          t.provider_id,
          l.license_id,
          l.member_id,
          t.subscription_amount,
          t.subscription_currency,
          t.subscription_billing_cycle,
          t.subscription_seats,
          l.updated_at,
          l.activated_at
        FROM greenhouse_ai.member_tool_licenses AS l
        INNER JOIN greenhouse_ai.tool_catalog AS t
          ON t.tool_id = l.tool_id
        WHERE l.license_status = 'active'
          AND COALESCE(l.activated_at, $1::date) <= $2::date
          AND (l.expires_at IS NULL OR l.expires_at >= $1::date)
          AND t.is_active = TRUE
      `,
      [periodStart, periodEnd]
    ).catch(() => []),
    runGreenhousePostgresQuery<WalletInventoryRow>(
      `
        SELECT
          provider_id,
          COUNT(*)::text AS wallet_count,
          COUNT(*) FILTER (WHERE wallet_status = 'active')::text AS active_wallet_count
        FROM greenhouse_ai.credit_wallets
        GROUP BY provider_id
      `
    ).catch(() => []),
    runGreenhousePostgresQuery<UsageCostRow>(
      `
        SELECT
          w.provider_id,
          COALESCE(SUM(COALESCE(l.total_cost_clp, 0)), 0) AS usage_cost_total_clp
        FROM greenhouse_ai.credit_ledger AS l
        INNER JOIN greenhouse_ai.credit_wallets AS w
          ON w.wallet_id = l.wallet_id
        WHERE l.entry_type = 'debit'
          AND l.created_at::date >= $1::date
          AND l.created_at::date <= $2::date
          AND w.provider_id IS NOT NULL
        GROUP BY w.provider_id
      `,
      [periodStart, periodEnd]
    ).catch(() => []),
    runGreenhousePostgresQuery<FinanceExpenseRow>(
      `
        SELECT
          s.provider_id,
          COUNT(*)::text AS finance_expense_count,
          COALESCE(SUM(COALESCE(e.total_amount_clp, 0)), 0) AS finance_expense_total_clp,
          MAX(COALESCE(e.document_date, e.payment_date)) AS latest_expense_date
        FROM greenhouse_finance.expenses AS e
        INNER JOIN greenhouse_finance.suppliers AS s
          ON s.supplier_id = e.supplier_id
        WHERE s.provider_id IS NOT NULL
          AND COALESCE(e.document_date, e.payment_date) >= $1::date
          AND COALESCE(e.document_date, e.payment_date) <= $2::date
        GROUP BY s.provider_id
      `,
      [periodStart, periodEnd]
    ).catch(() => []),
    runGreenhousePostgresQuery<PayrollImpactRow>(
      `
        WITH licensed_members AS (
          SELECT DISTINCT
            t.provider_id,
            l.member_id
          FROM greenhouse_ai.member_tool_licenses AS l
          INNER JOIN greenhouse_ai.tool_catalog AS t
            ON t.tool_id = l.tool_id
          WHERE l.license_status = 'active'
            AND COALESCE(l.activated_at, $1::date) <= $2::date
            AND (l.expires_at IS NULL OR l.expires_at >= $1::date)
            AND t.is_active = TRUE
        )
        SELECT
          lm.provider_id,
          COUNT(DISTINCT lm.member_id)::text AS payroll_member_count,
          COALESCE(SUM(COALESCE(pe.gross_total, 0) + COALESCE(pe.chile_employer_total_cost, 0)), 0) AS licensed_member_payroll_cost_clp
        FROM licensed_members AS lm
        INNER JOIN greenhouse_payroll.payroll_entries AS pe
          ON pe.member_id = lm.member_id
        INNER JOIN greenhouse_payroll.payroll_periods AS pp
          ON pp.period_id = pe.period_id
        WHERE pp.year = $3
          AND pp.month = $4
          AND pp.status IN ('calculated', 'approved', 'exported')
          AND pe.is_active = TRUE
        GROUP BY lm.provider_id
      `,
      [periodStart, periodEnd, year, month]
    ).catch(() => [])
  ])

  const neededCurrencies = Array.from(
    new Set(
      activeLicenseRows
        .map(row => String(row.subscription_currency || 'CLP').trim().toUpperCase())
        .filter(currency => currency && currency !== 'CLP')
    )
  )

  const exchangeRateRows = neededCurrencies.length > 0
    ? await runGreenhousePostgresQuery<ExchangeRateRow>(
        `
          SELECT DISTINCT ON (from_currency)
            from_currency,
            rate
          FROM greenhouse_finance.exchange_rates
          WHERE from_currency = ANY($1::text[])
            AND to_currency = 'CLP'
            AND rate_date <= $2::date
          ORDER BY from_currency, rate_date DESC
        `,
        [neededCurrencies, lastBusinessDay]
      ).catch(() => [])
    : []

  const toolInventoryByProvider = new Map(
    toolInventoryRows.map(row => [
      row.provider_id,
      {
        toolCount: toNumber(row.tool_count),
        activeToolCount: toNumber(row.active_tool_count)
      }
    ])
  )

  const walletInventoryByProvider = new Map(
    walletInventoryRows.map(row => [
      row.provider_id,
      {
        walletCount: toNumber(row.wallet_count),
        activeWalletCount: toNumber(row.active_wallet_count)
      }
    ])
  )

  const usageCostByProvider = new Map(
    usageCostRows.map(row => [row.provider_id, roundCurrency(toNumber(row.usage_cost_total_clp))])
  )

  const financeExpenseByProvider = new Map(
    financeExpenseRows.map(row => [
      row.provider_id,
      {
        financeExpenseCount: toNumber(row.finance_expense_count),
        financeExpenseTotalClp: roundCurrency(toNumber(row.finance_expense_total_clp)),
        latestExpenseDate: toDateString(row.latest_expense_date)
      }
    ])
  )

  const payrollImpactByProvider = new Map(
    payrollImpactRows.map(row => [
      row.provider_id,
      {
        payrollMemberCount: toNumber(row.payroll_member_count),
        licensedMemberPayrollCostClp: roundCurrency(toNumber(row.licensed_member_payroll_cost_clp))
      }
    ])
  )

  const fxByCurrency = new Map(
    exchangeRateRows.map(row => [String(row.from_currency || '').trim().toUpperCase(), toNumber(row.rate)])
  )

  const licenseSummaryByProvider = new Map<string, {
    activeLicenseCount: number
    memberIds: Set<string>
    subscriptionCostTotalClp: number
    latestLicenseChangeAt: string | null
  }>()

  for (const row of activeLicenseRows) {
    const providerId = row.provider_id

    if (!licenseSummaryByProvider.has(providerId)) {
      licenseSummaryByProvider.set(providerId, {
        activeLicenseCount: 0,
        memberIds: new Set<string>(),
        subscriptionCostTotalClp: 0,
        latestLicenseChangeAt: null
      })
    }

    const summary = licenseSummaryByProvider.get(providerId)

    if (!summary) continue

    summary.activeLicenseCount += 1
    summary.memberIds.add(row.member_id)

    const monthlyFactor = toMonthlyFactor(row.subscription_billing_cycle)
    const subscriptionAmount = toNumber(row.subscription_amount)
    const seatDivisor = Math.max(1, toNumber(row.subscription_seats) || 1)

    if (subscriptionAmount > 0 && monthlyFactor != null) {
      const monthlySourceCost = roundCurrency((subscriptionAmount * monthlyFactor) / seatDivisor)
      const currency = String(row.subscription_currency || 'CLP').trim().toUpperCase()

      if (currency === 'CLP') {
        summary.subscriptionCostTotalClp = roundCurrency(summary.subscriptionCostTotalClp + monthlySourceCost)
      } else {
        const fxRate = fxByCurrency.get(currency)

        if (fxRate && fxRate > 0) {
          summary.subscriptionCostTotalClp = roundCurrency(summary.subscriptionCostTotalClp + (monthlySourceCost * fxRate))
        }
      }
    }

    const changedAt = toTimestampString(row.updated_at) || toTimestampString(row.activated_at)

    if (!summary.latestLicenseChangeAt || (changedAt && changedAt > summary.latestLicenseChangeAt)) {
      summary.latestLicenseChangeAt = changedAt
    }
  }

  const snapshots: ProviderToolingSnapshot[] = providerRows.map(row => {
    const toolInventory = toolInventoryByProvider.get(row.provider_id)
    const walletInventory = walletInventoryByProvider.get(row.provider_id)
    const financeExpense = financeExpenseByProvider.get(row.provider_id)
    const payrollImpact = payrollImpactByProvider.get(row.provider_id)
    const licenseSummary = licenseSummaryByProvider.get(row.provider_id)
    const subscriptionCostTotalClp = roundCurrency(licenseSummary?.subscriptionCostTotalClp ?? 0)
    const usageCostTotalClp = roundCurrency(usageCostByProvider.get(row.provider_id) ?? 0)
    const financeExpenseTotalClp = roundCurrency(financeExpense?.financeExpenseTotalClp ?? 0)
    const totalProviderCostClp = roundCurrency(subscriptionCostTotalClp + usageCostTotalClp + financeExpenseTotalClp)

    return {
      snapshotId: buildSnapshotId(row.provider_id, period),
      providerId: row.provider_id,
      providerName: row.provider_name,
      providerType: row.provider_type,
      supplierId: row.supplier_id,
      supplierCategory: row.supplier_category,
      paymentCurrency: row.payment_currency,
      periodYear: year,
      periodMonth: month,
      periodId,
      toolCount: toolInventory?.toolCount ?? 0,
      activeToolCount: toolInventory?.activeToolCount ?? 0,
      activeLicenseCount: licenseSummary?.activeLicenseCount ?? 0,
      activeMemberCount: licenseSummary?.memberIds.size ?? 0,
      walletCount: walletInventory?.walletCount ?? 0,
      activeWalletCount: walletInventory?.activeWalletCount ?? 0,
      subscriptionCostTotalClp,
      usageCostTotalClp,
      financeExpenseCount: financeExpense?.financeExpenseCount ?? 0,
      financeExpenseTotalClp,
      payrollMemberCount: payrollImpact?.payrollMemberCount ?? 0,
      licensedMemberPayrollCostClp: payrollImpact?.licensedMemberPayrollCostClp ?? 0,
      totalProviderCostClp,
      latestExpenseDate: financeExpense?.latestExpenseDate ?? null,
      latestLicenseChangeAt: licenseSummary?.latestLicenseChangeAt ?? null,
      snapshotStatus: 'complete',
      materializedAt: null
    }
  })

  await withGreenhousePostgresTransaction(async client => {
    for (const snapshot of snapshots) {
      await client.query(
        `
          INSERT INTO greenhouse_serving.provider_tooling_snapshots (
            snapshot_id,
            provider_id,
            provider_name,
            provider_type,
            supplier_id,
            supplier_category,
            payment_currency,
            period_year,
            period_month,
            period_id,
            tool_count,
            active_tool_count,
            active_license_count,
            active_member_count,
            wallet_count,
            active_wallet_count,
            subscription_cost_total_clp,
            usage_cost_total_clp,
            finance_expense_count,
            finance_expense_total_clp,
            payroll_member_count,
            licensed_member_payroll_cost_clp,
            total_provider_cost_clp,
            latest_expense_date,
            latest_license_change_at,
            snapshot_status,
            refresh_reason,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24::date, $25::timestamptz, $26, $27, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT (provider_id, period_year, period_month) DO UPDATE
          SET
            snapshot_id = EXCLUDED.snapshot_id,
            provider_name = EXCLUDED.provider_name,
            provider_type = EXCLUDED.provider_type,
            supplier_id = EXCLUDED.supplier_id,
            supplier_category = EXCLUDED.supplier_category,
            payment_currency = EXCLUDED.payment_currency,
            period_id = EXCLUDED.period_id,
            tool_count = EXCLUDED.tool_count,
            active_tool_count = EXCLUDED.active_tool_count,
            active_license_count = EXCLUDED.active_license_count,
            active_member_count = EXCLUDED.active_member_count,
            wallet_count = EXCLUDED.wallet_count,
            active_wallet_count = EXCLUDED.active_wallet_count,
            subscription_cost_total_clp = EXCLUDED.subscription_cost_total_clp,
            usage_cost_total_clp = EXCLUDED.usage_cost_total_clp,
            finance_expense_count = EXCLUDED.finance_expense_count,
            finance_expense_total_clp = EXCLUDED.finance_expense_total_clp,
            payroll_member_count = EXCLUDED.payroll_member_count,
            licensed_member_payroll_cost_clp = EXCLUDED.licensed_member_payroll_cost_clp,
            total_provider_cost_clp = EXCLUDED.total_provider_cost_clp,
            latest_expense_date = EXCLUDED.latest_expense_date,
            latest_license_change_at = EXCLUDED.latest_license_change_at,
            snapshot_status = EXCLUDED.snapshot_status,
            refresh_reason = EXCLUDED.refresh_reason,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          snapshot.snapshotId,
          snapshot.providerId,
          snapshot.providerName,
          snapshot.providerType,
          snapshot.supplierId,
          snapshot.supplierCategory,
          snapshot.paymentCurrency,
          snapshot.periodYear,
          snapshot.periodMonth,
          snapshot.periodId,
          snapshot.toolCount,
          snapshot.activeToolCount,
          snapshot.activeLicenseCount,
          snapshot.activeMemberCount,
          snapshot.walletCount,
          snapshot.activeWalletCount,
          snapshot.subscriptionCostTotalClp,
          snapshot.usageCostTotalClp,
          snapshot.financeExpenseCount,
          snapshot.financeExpenseTotalClp,
          snapshot.payrollMemberCount,
          snapshot.licensedMemberPayrollCostClp,
          snapshot.totalProviderCostClp,
          snapshot.latestExpenseDate,
          snapshot.latestLicenseChangeAt,
          snapshot.snapshotStatus,
          reason
        ]
      )
    }
  })

  return snapshots
}

export const getLatestProviderToolingSnapshot = async (providerId: string): Promise<ProviderToolingSnapshot | null> => {
  const rows = await runGreenhousePostgresQuery<StoredProviderToolingSnapshotRow>(
    `
      SELECT
        snapshot_id,
        provider_id,
        provider_name,
        provider_type,
        supplier_id,
        supplier_category,
        payment_currency,
        period_year,
        period_month,
        period_id,
        tool_count,
        active_tool_count,
        active_license_count,
        active_member_count,
        wallet_count,
        active_wallet_count,
        subscription_cost_total_clp,
        usage_cost_total_clp,
        finance_expense_count,
        finance_expense_total_clp,
        payroll_member_count,
        licensed_member_payroll_cost_clp,
        total_provider_cost_clp,
        latest_expense_date,
        latest_license_change_at,
        snapshot_status,
        updated_at
      FROM greenhouse_serving.provider_tooling_snapshots
      WHERE provider_id = $1
      ORDER BY period_year DESC, period_month DESC, updated_at DESC
      LIMIT 1
    `,
    [providerId]
  ).catch(() => [])

  const row = rows[0]

  if (!row) {
    return null
  }

  return {
    snapshotId: row.snapshot_id,
    providerId: row.provider_id,
    providerName: row.provider_name,
    providerType: row.provider_type,
    supplierId: row.supplier_id,
    supplierCategory: row.supplier_category,
    paymentCurrency: row.payment_currency,
    periodYear: toNumber(row.period_year),
    periodMonth: toNumber(row.period_month),
    periodId: row.period_id,
    toolCount: toNumber(row.tool_count),
    activeToolCount: toNumber(row.active_tool_count),
    activeLicenseCount: toNumber(row.active_license_count),
    activeMemberCount: toNumber(row.active_member_count),
    walletCount: toNumber(row.wallet_count),
    activeWalletCount: toNumber(row.active_wallet_count),
    subscriptionCostTotalClp: roundCurrency(toNumber(row.subscription_cost_total_clp)),
    usageCostTotalClp: roundCurrency(toNumber(row.usage_cost_total_clp)),
    financeExpenseCount: toNumber(row.finance_expense_count),
    financeExpenseTotalClp: roundCurrency(toNumber(row.finance_expense_total_clp)),
    payrollMemberCount: toNumber(row.payroll_member_count),
    licensedMemberPayrollCostClp: roundCurrency(toNumber(row.licensed_member_payroll_cost_clp)),
    totalProviderCostClp: roundCurrency(toNumber(row.total_provider_cost_clp)),
    latestExpenseDate: toDateString(row.latest_expense_date),
    latestLicenseChangeAt: toTimestampString(row.latest_license_change_at),
    snapshotStatus: row.snapshot_status,
    materializedAt: toTimestampString(row.updated_at)
  }
}
