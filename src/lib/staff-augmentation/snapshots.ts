import 'server-only'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { readMemberDirectToolCosts } from '@/lib/team-capacity/tool-cost-reader'

type Period = { year: number; month: number }

type PlacementRow = {
  placement_id: string
  assignment_id: string
  client_id: string
  client_name: string | null
  space_id: string | null
  space_name: string | null
  organization_id: string | null
  organization_name: string | null
  member_id: string
  member_name: string | null
  provider_id: string | null
  provider_name: string | null
  status: string
  billing_rate_amount: string | number | null
  billing_rate_currency: string | null
  billing_frequency: string | null
  cost_rate_amount: string | number | null
  cost_rate_currency: string | null
}

type ExchangeRateRow = {
  rate: string | number | null
}

type PayrollRow = {
  entry_id: string
  gross_total: string | number | null
  chile_employer_total_cost: string | number | null
}

type CommercialCostRow = {
  commercial_loaded_cost_target: string | number | null
}

type ProviderSnapshotRow = {
  snapshot_id: string
}

type SnapshotRow = {
  snapshot_id: string
  placement_id: string
  assignment_id: string
  client_id: string
  client_name: string | null
  space_id: string | null
  space_name: string | null
  organization_id: string | null
  organization_name: string | null
  member_id: string
  member_name: string | null
  provider_id: string | null
  provider_name: string | null
  period_year: string | number
  period_month: string | number
  period_id: string
  placement_status: string
  billing_rate_amount: string | number | null
  billing_rate_currency: string | null
  projected_revenue_clp: string | number | null
  cost_rate_amount: string | number | null
  cost_rate_currency: string | null
  payroll_gross_clp: string | number | null
  payroll_employer_cost_clp: string | number | null
  commercial_loaded_cost_clp: string | number | null
  member_direct_expense_clp: string | number | null
  tooling_cost_clp: string | number | null
  gross_margin_proxy_clp: string | number | null
  gross_margin_proxy_pct: string | number | null
  provider_tooling_snapshot_id: string | null
  source_compensation_version_id: string | null
  source_payroll_entry_id: string | null
  snapshot_status: 'partial' | 'complete'
  updated_at: string | Date | null
}

export type StaffAugPlacementSnapshot = {
  snapshotId: string
  placementId: string
  assignmentId: string
  clientId: string
  clientName: string | null
  spaceId: string | null
  spaceName: string | null
  organizationId: string | null
  organizationName: string | null
  memberId: string
  memberName: string | null
  providerId: string | null
  providerName: string | null
  periodYear: number
  periodMonth: number
  periodId: string
  placementStatus: string
  billingRateAmount: number | null
  billingRateCurrency: string | null
  projectedRevenueClp: number
  costRateAmount: number | null
  costRateCurrency: string | null
  payrollGrossClp: number
  payrollEmployerCostClp: number
  commercialLoadedCostClp: number
  memberDirectExpenseClp: number
  toolingCostClp: number
  grossMarginProxyClp: number
  grossMarginProxyPct: number | null
  providerToolingSnapshotId: string | null
  sourceCompensationVersionId: string | null
  sourcePayrollEntryId: string | null
  snapshotStatus: 'partial' | 'complete'
  materializedAt: string | null
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toNullableNumber = (value: unknown) => {
  if (value == null || value === '') return null

  return toNumber(value)
}

const toTimestamp = (value: string | Date | null) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return value
}

const pad2 = (value: number) => String(value).padStart(2, '0')

const getPeriodEnd = ({ year, month }: Period) => new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
const getPeriodId = ({ year, month }: Period) => `${year}-${pad2(month)}`
const buildSnapshotId = (placementId: string, period: Period) => `${placementId}:${getPeriodId(period)}`

const toMonthlyFactor = (billingFrequency: string | null) => {
  switch (String(billingFrequency || 'monthly').trim().toLowerCase()) {
    case 'quarterly':
      return 1 / 3
    case 'annual':
      return 1 / 12
    default:
      return 1
  }
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100

const readLatestExchangeRate = async (fromCurrency: string | null, date: string) => {
  const currency = String(fromCurrency || 'CLP').trim().toUpperCase()

  if (currency === 'CLP') return 1

  const rows = await runGreenhousePostgresQuery<ExchangeRateRow>(
    `
      SELECT rate
      FROM greenhouse_finance.exchange_rates
      WHERE from_currency = $1
        AND to_currency = 'CLP'
        AND rate_date <= $2::date
      ORDER BY rate_date DESC
      LIMIT 1
    `,
    [currency, date]
  ).catch(() => [])

  return Math.max(1, toNumber(rows[0]?.rate))
}

const normalizeStoredSnapshot = (row: SnapshotRow): StaffAugPlacementSnapshot => ({
  snapshotId: row.snapshot_id,
  placementId: row.placement_id,
  assignmentId: row.assignment_id,
  clientId: row.client_id,
  clientName: row.client_name,
  spaceId: row.space_id,
  spaceName: row.space_name,
  organizationId: row.organization_id,
  organizationName: row.organization_name,
  memberId: row.member_id,
  memberName: row.member_name,
  providerId: row.provider_id,
  providerName: row.provider_name,
  periodYear: toNumber(row.period_year),
  periodMonth: toNumber(row.period_month),
  periodId: row.period_id,
  placementStatus: row.placement_status,
  billingRateAmount: toNullableNumber(row.billing_rate_amount),
  billingRateCurrency: row.billing_rate_currency,
  projectedRevenueClp: roundCurrency(toNumber(row.projected_revenue_clp)),
  costRateAmount: toNullableNumber(row.cost_rate_amount),
  costRateCurrency: row.cost_rate_currency,
  payrollGrossClp: roundCurrency(toNumber(row.payroll_gross_clp)),
  payrollEmployerCostClp: roundCurrency(toNumber(row.payroll_employer_cost_clp)),
  commercialLoadedCostClp: roundCurrency(toNumber(row.commercial_loaded_cost_clp)),
  memberDirectExpenseClp: roundCurrency(toNumber(row.member_direct_expense_clp)),
  toolingCostClp: roundCurrency(toNumber(row.tooling_cost_clp)),
  grossMarginProxyClp: roundCurrency(toNumber(row.gross_margin_proxy_clp)),
  grossMarginProxyPct: toNullableNumber(row.gross_margin_proxy_pct),
  providerToolingSnapshotId: row.provider_tooling_snapshot_id,
  sourceCompensationVersionId: row.source_compensation_version_id,
  sourcePayrollEntryId: row.source_payroll_entry_id,
  snapshotStatus: row.snapshot_status,
  materializedAt: toTimestamp(row.updated_at)
})

export const materializeStaffAugPlacementSnapshotsForPeriod = async (
  year: number,
  month: number,
  reason: string
): Promise<StaffAugPlacementSnapshot[]> => {
  const period = { year, month }
  const periodId = getPeriodId(period)
  const periodEnd = getPeriodEnd(period)

  const placements = await runGreenhousePostgresQuery<PlacementRow>(
    `
      SELECT
        p.placement_id,
        p.assignment_id,
        p.client_id,
        c.client_name,
        p.space_id,
        s.space_name,
        p.organization_id,
        o.organization_name,
        p.member_id,
        m.display_name AS member_name,
        p.provider_id,
        provider.provider_name,
        p.status,
        p.billing_rate_amount,
        p.billing_rate_currency,
        p.billing_frequency,
        p.cost_rate_amount,
        p.cost_rate_currency
      FROM greenhouse_delivery.staff_aug_placements p
      INNER JOIN greenhouse_core.clients c ON c.client_id = p.client_id
      INNER JOIN greenhouse_core.members m ON m.member_id = p.member_id
      LEFT JOIN greenhouse_core.spaces s ON s.space_id = p.space_id
      LEFT JOIN greenhouse_core.organizations o ON o.organization_id = p.organization_id
      LEFT JOIN greenhouse_core.providers provider ON provider.provider_id = p.provider_id
      ORDER BY p.created_at ASC
    `
  ).catch(() => [])

  const snapshots: StaffAugPlacementSnapshot[] = []

  for (const placement of placements) {
    const [billingFxRate, payrollRows, costRows, providerSnapshotRows, toolCosts] = await Promise.all([
      readLatestExchangeRate(placement.billing_rate_currency, periodEnd),
      runGreenhousePostgresQuery<PayrollRow>(
        `
          SELECT entry_id, gross_total, chile_employer_total_cost
          FROM greenhouse_payroll.payroll_entries
          WHERE member_id = $1
            AND period_id = $2
            AND is_active = TRUE
          LIMIT 1
        `,
        [placement.member_id, periodId]
      ).catch(() => []),
      runGreenhousePostgresQuery<CommercialCostRow>(
        `
          SELECT commercial_loaded_cost_target
          FROM greenhouse_serving.commercial_cost_attribution
          WHERE member_id = $1
            AND client_id = $2
            AND period_year = $3
            AND period_month = $4
          LIMIT 1
        `,
        [placement.member_id, placement.client_id, year, month]
      ).catch(() => []),
      placement.provider_id
        ? runGreenhousePostgresQuery<ProviderSnapshotRow>(
            `
              SELECT snapshot_id
              FROM greenhouse_serving.provider_tooling_snapshots
              WHERE provider_id = $1
                AND period_year = $2
                AND period_month = $3
              LIMIT 1
            `,
            [placement.provider_id, year, month]
          ).catch(() => [])
        : Promise.resolve([]),
      readMemberDirectToolCosts(placement.member_id, period, { targetCurrency: 'CLP' }).catch(() => ({
        licenses: [],
        toolingCostTarget: 0,
        memberDirectExpensesTarget: 0,
        targetCurrency: 'CLP' as const,
        fxByCurrency: {}
      }))
    ])

    const payroll = payrollRows[0]
    const commercialCost = costRows[0]
    const providerSnapshot = providerSnapshotRows[0]

    const projectedRevenueClp = roundCurrency(
      toNumber(placement.billing_rate_amount) * toMonthlyFactor(placement.billing_frequency) * billingFxRate
    )

    const payrollGrossClp = roundCurrency(toNumber(payroll?.gross_total))
    const payrollEmployerCostClp = roundCurrency(toNumber(payroll?.chile_employer_total_cost))
    const commercialLoadedCostClp = roundCurrency(toNumber(commercialCost?.commercial_loaded_cost_target))
    const toolingCostClp = roundCurrency(toolCosts.toolingCostTarget)
    const memberDirectExpenseClp = roundCurrency(toolCosts.memberDirectExpensesTarget)

    const baselineCost = commercialLoadedCostClp > 0
      ? commercialLoadedCostClp
      : payrollEmployerCostClp > 0
        ? payrollEmployerCostClp
        : payrollGrossClp

    const totalCostProxy = roundCurrency(baselineCost + toolingCostClp + memberDirectExpenseClp)
    const grossMarginProxyClp = roundCurrency(projectedRevenueClp - totalCostProxy)

    const grossMarginProxyPct = projectedRevenueClp > 0
      ? roundCurrency((grossMarginProxyClp / projectedRevenueClp) * 100)
      : null

    const snapshotStatus = baselineCost > 0 ? 'complete' : 'partial'

    snapshots.push({
      snapshotId: buildSnapshotId(placement.placement_id, period),
      placementId: placement.placement_id,
      assignmentId: placement.assignment_id,
      clientId: placement.client_id,
      clientName: placement.client_name,
      spaceId: placement.space_id,
      spaceName: placement.space_name,
      organizationId: placement.organization_id,
      organizationName: placement.organization_name,
      memberId: placement.member_id,
      memberName: placement.member_name,
      providerId: placement.provider_id,
      providerName: placement.provider_name,
      periodYear: year,
      periodMonth: month,
      periodId,
      placementStatus: placement.status,
      billingRateAmount: toNullableNumber(placement.billing_rate_amount),
      billingRateCurrency: placement.billing_rate_currency,
      projectedRevenueClp,
      costRateAmount: toNullableNumber(placement.cost_rate_amount),
      costRateCurrency: placement.cost_rate_currency,
      payrollGrossClp,
      payrollEmployerCostClp,
      commercialLoadedCostClp,
      memberDirectExpenseClp,
      toolingCostClp,
      grossMarginProxyClp,
      grossMarginProxyPct,
      providerToolingSnapshotId: providerSnapshot?.snapshot_id || null,
      sourceCompensationVersionId: null,
      sourcePayrollEntryId: payroll?.entry_id || null,
      snapshotStatus,
      materializedAt: null
    })
  }

  await withGreenhousePostgresTransaction(async client => {
    for (const snapshot of snapshots) {
      const rows = await client.query(
        `
          INSERT INTO greenhouse_serving.staff_aug_placement_snapshots (
            snapshot_id,
            placement_id,
            assignment_id,
            client_id,
            client_name,
            space_id,
            space_name,
            organization_id,
            organization_name,
            member_id,
            member_name,
            provider_id,
            provider_name,
            period_year,
            period_month,
            period_id,
            placement_status,
            billing_rate_amount,
            billing_rate_currency,
            projected_revenue_clp,
            cost_rate_amount,
            cost_rate_currency,
            payroll_gross_clp,
            payroll_employer_cost_clp,
            commercial_loaded_cost_clp,
            member_direct_expense_clp,
            tooling_cost_clp,
            gross_margin_proxy_clp,
            gross_margin_proxy_pct,
            provider_tooling_snapshot_id,
            source_compensation_version_id,
            source_payroll_entry_id,
            snapshot_status,
            refresh_reason,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
            $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
            $33, $34, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT (placement_id, period_year, period_month)
          DO UPDATE SET
            snapshot_id = EXCLUDED.snapshot_id,
            assignment_id = EXCLUDED.assignment_id,
            client_id = EXCLUDED.client_id,
            client_name = EXCLUDED.client_name,
            space_id = EXCLUDED.space_id,
            space_name = EXCLUDED.space_name,
            organization_id = EXCLUDED.organization_id,
            organization_name = EXCLUDED.organization_name,
            member_id = EXCLUDED.member_id,
            member_name = EXCLUDED.member_name,
            provider_id = EXCLUDED.provider_id,
            provider_name = EXCLUDED.provider_name,
            placement_status = EXCLUDED.placement_status,
            billing_rate_amount = EXCLUDED.billing_rate_amount,
            billing_rate_currency = EXCLUDED.billing_rate_currency,
            projected_revenue_clp = EXCLUDED.projected_revenue_clp,
            cost_rate_amount = EXCLUDED.cost_rate_amount,
            cost_rate_currency = EXCLUDED.cost_rate_currency,
            payroll_gross_clp = EXCLUDED.payroll_gross_clp,
            payroll_employer_cost_clp = EXCLUDED.payroll_employer_cost_clp,
            commercial_loaded_cost_clp = EXCLUDED.commercial_loaded_cost_clp,
            member_direct_expense_clp = EXCLUDED.member_direct_expense_clp,
            tooling_cost_clp = EXCLUDED.tooling_cost_clp,
            gross_margin_proxy_clp = EXCLUDED.gross_margin_proxy_clp,
            gross_margin_proxy_pct = EXCLUDED.gross_margin_proxy_pct,
            provider_tooling_snapshot_id = EXCLUDED.provider_tooling_snapshot_id,
            source_compensation_version_id = EXCLUDED.source_compensation_version_id,
            source_payroll_entry_id = EXCLUDED.source_payroll_entry_id,
            snapshot_status = EXCLUDED.snapshot_status,
            refresh_reason = EXCLUDED.refresh_reason,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `,
        [
          snapshot.snapshotId,
          snapshot.placementId,
          snapshot.assignmentId,
          snapshot.clientId,
          snapshot.clientName,
          snapshot.spaceId,
          snapshot.spaceName,
          snapshot.organizationId,
          snapshot.organizationName,
          snapshot.memberId,
          snapshot.memberName,
          snapshot.providerId,
          snapshot.providerName,
          snapshot.periodYear,
          snapshot.periodMonth,
          snapshot.periodId,
          snapshot.placementStatus,
          snapshot.billingRateAmount,
          snapshot.billingRateCurrency,
          snapshot.projectedRevenueClp,
          snapshot.costRateAmount,
          snapshot.costRateCurrency,
          snapshot.payrollGrossClp,
          snapshot.payrollEmployerCostClp,
          snapshot.commercialLoadedCostClp,
          snapshot.memberDirectExpenseClp,
          snapshot.toolingCostClp,
          snapshot.grossMarginProxyClp,
          snapshot.grossMarginProxyPct,
          snapshot.providerToolingSnapshotId,
          snapshot.sourceCompensationVersionId,
          snapshot.sourcePayrollEntryId,
          snapshot.snapshotStatus,
          reason
        ]
      )

      snapshot.materializedAt = normalizeStoredSnapshot(rows.rows[0] as SnapshotRow).materializedAt

      await client.query(
        `
          UPDATE greenhouse_delivery.staff_aug_placements
          SET latest_snapshot_id = $1, updated_at = CURRENT_TIMESTAMP
          WHERE placement_id = $2
        `,
        [snapshot.snapshotId, snapshot.placementId]
      )
    }
  })

  return snapshots
}

export const getLatestStaffAugPlacementSnapshot = async (placementId: string) => {
  const rows = await runGreenhousePostgresQuery<SnapshotRow>(
    `
      SELECT *
      FROM greenhouse_serving.staff_aug_placement_snapshots
      WHERE placement_id = $1
      ORDER BY period_year DESC, period_month DESC
      LIMIT 1
    `,
    [placementId]
  ).catch(() => [])

  return rows[0] ? normalizeStoredSnapshot(rows[0]) : null
}
