import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import { getFinanceCurrentPeriod } from '@/lib/finance/reporting'
import { getServicesBySpace } from '@/lib/services/service-store'
import type {
  AgencyEconomicsPeriod,
  AgencyEconomicsRankingItem,
  AgencyEconomicsResponse,
  AgencyEconomicsServiceSummary,
  AgencyEconomicsSpaceRow,
  AgencyEconomicsTotals,
  AgencyEconomicsTrendPoint
} from '@/types/agency-economics'

const DEFAULT_TREND_MONTHS = 6
const MAX_TREND_MONTHS = 12

type SpaceSnapshotRow = {
  space_id: string
  space_name: string
  organization_id: string | null
  organization_name: string | null
  period_year: number | string
  period_month: number | string
  period_closed: boolean
  snapshot_revision: number | string
  revenue_clp: number | string | null
  labor_cost_clp: number | string | null
  direct_expense_clp: number | string | null
  overhead_clp: number | string | null
  total_cost_clp: number | string | null
  gross_margin_clp: number | string | null
  gross_margin_pct: number | string | null
}

type PeriodCursor = {
  year: number
  month: number
  key: string
  label: string
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const clampMonth = (value: number) => Math.min(12, Math.max(1, value))

const toPeriodKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`

const toPeriodNumber = (year: number, month: number) => year * 100 + month

const formatPeriodLabel = (year: number, month: number) => `${MONTH_LABELS[month - 1]} ${year}`

const roundCurrency = (value: number) => Math.round(value * 100) / 100

const roundPct = (value: number | null) => (value == null ? null : Math.round(value * 100) / 100)

const computePct = (numerator: number, denominator: number) => {
  if (denominator <= 0) return null

  return roundPct((numerator / denominator) * 100)
}

const buildPeriodsWindow = (year: number, month: number, months: number): PeriodCursor[] => {
  const totalMonths = Math.max(1, Math.min(months, MAX_TREND_MONTHS))
  const cursor = new Date(Date.UTC(year, month - 1, 1))

  cursor.setUTCMonth(cursor.getUTCMonth() - (totalMonths - 1))

  return Array.from({ length: totalMonths }, () => {
    const currentYear = cursor.getUTCFullYear()
    const currentMonth = cursor.getUTCMonth() + 1

    const period = {
      year: currentYear,
      month: currentMonth,
      key: toPeriodKey(currentYear, currentMonth),
      label: formatPeriodLabel(currentYear, currentMonth)
    }

    cursor.setUTCMonth(cursor.getUTCMonth() + 1)

    return period
  })
}

const listSpaceSnapshotsForWindow = async ({
  fromPeriod,
  toPeriod
}: {
  fromPeriod: number
  toPeriod: number
}) => {
  const db = await getDb()

  const result = await sql<SpaceSnapshotRow>`
    WITH ranked AS (
      SELECT
        ops.scope_id AS space_id,
        COALESCE(sp.space_name, ops.scope_name) AS space_name,
        sp.organization_id,
        org.organization_name,
        ops.period_year,
        ops.period_month,
        ops.period_closed,
        ops.snapshot_revision,
        ops.revenue_clp,
        ops.labor_cost_clp,
        ops.direct_expense_clp,
        ops.overhead_clp,
        ops.total_cost_clp,
        ops.gross_margin_clp,
        ops.gross_margin_pct,
        ROW_NUMBER() OVER (
          PARTITION BY ops.scope_id, ops.period_year, ops.period_month
          ORDER BY ops.snapshot_revision DESC, ops.materialized_at DESC NULLS LAST
        ) AS revision_rank
      FROM greenhouse_serving.operational_pl_snapshots ops
      LEFT JOIN greenhouse_core.spaces sp
        ON sp.space_id = ops.scope_id
      LEFT JOIN greenhouse_core.organizations org
        ON org.organization_id = sp.organization_id
      WHERE ops.scope_type = 'space'
        AND ((ops.period_year * 100) + ops.period_month) BETWEEN ${fromPeriod} AND ${toPeriod}
    )
    SELECT
      space_id,
      space_name,
      organization_id,
      organization_name,
      period_year,
      period_month,
      period_closed,
      snapshot_revision,
      revenue_clp,
      labor_cost_clp,
      direct_expense_clp,
      overhead_clp,
      total_cost_clp,
      gross_margin_clp,
      gross_margin_pct
    FROM ranked
    WHERE revision_rank = 1
    ORDER BY period_year DESC, period_month DESC, revenue_clp DESC, space_name ASC
  `.execute(db)

  return result.rows
}

const mapServiceSummary = (service: Awaited<ReturnType<typeof getServicesBySpace>>[number]): AgencyEconomicsServiceSummary => ({
  serviceId: service.serviceId,
  publicId: service.publicId,
  name: service.name,
  pipelineStage: service.pipelineStage,
  lineaDeServicio: service.lineaDeServicio,
  servicioEspecifico: service.servicioEspecifico,
  totalCostClp: service.totalCost,
  currency: service.currency,
  startDate: service.startDate,
  targetEndDate: service.targetEndDate
})

const sumTotals = (rows: SpaceSnapshotRow[]): AgencyEconomicsTotals => {
  const totals = rows.reduce(
    (accumulator, row) => {
      accumulator.revenueClp += Number(row.revenue_clp ?? 0)
      accumulator.laborCostClp += Number(row.labor_cost_clp ?? 0)
      accumulator.directExpenseClp += Number(row.direct_expense_clp ?? 0)
      accumulator.overheadClp += Number(row.overhead_clp ?? 0)
      accumulator.totalCostClp += Number(row.total_cost_clp ?? 0)
      accumulator.grossMarginClp += Number(row.gross_margin_clp ?? 0)

      return accumulator
    },
    {
      revenueClp: 0,
      laborCostClp: 0,
      directExpenseClp: 0,
      overheadClp: 0,
      totalCostClp: 0,
      grossMarginClp: 0
    }
  )

  return {
    revenueClp: roundCurrency(totals.revenueClp),
    laborCostClp: roundCurrency(totals.laborCostClp),
    directExpenseClp: roundCurrency(totals.directExpenseClp),
    overheadClp: roundCurrency(totals.overheadClp),
    totalCostClp: roundCurrency(totals.totalCostClp),
    grossMarginClp: roundCurrency(totals.grossMarginClp),
    grossMarginPct: computePct(totals.grossMarginClp, totals.revenueClp),
    payrollRatioPct: computePct(totals.laborCostClp, totals.revenueClp),
    spaceCount: rows.length,
    activeServiceCount: 0
  }
}

export const buildAgencyEconomicsTrend = (
  rows: SpaceSnapshotRow[],
  periods: PeriodCursor[]
): AgencyEconomicsTrendPoint[] => {
  const rowsByPeriod = new Map<string, SpaceSnapshotRow[]>()

  for (const row of rows) {
    const periodKey = toPeriodKey(Number(row.period_year), Number(row.period_month))
    const bucket = rowsByPeriod.get(periodKey) || []

    bucket.push(row)
    rowsByPeriod.set(periodKey, bucket)
  }

  return periods.map(period => {
    const periodRows = rowsByPeriod.get(period.key) || []
    const totals = sumTotals(periodRows)

    return {
      periodYear: period.year,
      periodMonth: period.month,
      label: period.label,
      revenueClp: totals.revenueClp,
      totalCostClp: totals.totalCostClp,
      grossMarginClp: totals.grossMarginClp,
      grossMarginPct: totals.grossMarginPct
    }
  })
}

const buildSpaceRows = async ({
  currentRows,
  previousRows
}: {
  currentRows: SpaceSnapshotRow[]
  previousRows: SpaceSnapshotRow[]
}): Promise<AgencyEconomicsSpaceRow[]> => {
  const previousRevenueBySpace = new Map(previousRows.map(row => [row.space_id, Number(row.revenue_clp ?? 0)]))

  const servicesEntries = await Promise.all(
    currentRows.map(async row => {
      const services = await getServicesBySpace(row.space_id).catch(() => [])

      return [row.space_id, services.map(mapServiceSummary)] as const
    })
  )

  const servicesBySpace = new Map<string, AgencyEconomicsServiceSummary[]>(servicesEntries)

  return currentRows
    .map(row => {
      const revenueClp = roundCurrency(Number(row.revenue_clp ?? 0))
      const previousRevenueClp = roundCurrency(previousRevenueBySpace.get(row.space_id) ?? 0)
      const services = servicesBySpace.get(row.space_id) || []

      const serviceTotalContractClp = roundCurrency(
        services.reduce((sum, service) => sum + (service.totalCostClp ?? 0), 0)
      )

      return {
        spaceId: row.space_id,
        spaceName: row.space_name,
        organizationId: row.organization_id,
        organizationName: row.organization_name,
        revenueClp,
        laborCostClp: roundCurrency(Number(row.labor_cost_clp ?? 0)),
        directExpenseClp: roundCurrency(Number(row.direct_expense_clp ?? 0)),
        overheadClp: roundCurrency(Number(row.overhead_clp ?? 0)),
        totalCostClp: roundCurrency(Number(row.total_cost_clp ?? 0)),
        grossMarginClp: roundCurrency(Number(row.gross_margin_clp ?? 0)),
        grossMarginPct: roundPct(row.gross_margin_pct == null ? null : Number(row.gross_margin_pct)),
        payrollRatioPct: computePct(Number(row.labor_cost_clp ?? 0), revenueClp),
        previousRevenueClp,
        revenueTrendPct: previousRevenueClp > 0
          ? roundPct(((revenueClp - previousRevenueClp) / previousRevenueClp) * 100)
          : null,
        periodClosed: row.period_closed,
        snapshotRevision: Number(row.snapshot_revision),
        serviceCount: services.length,
        serviceTotalContractClp,
        serviceEconomicsStatus: 'pending_task_146' as const,
        services
      }
    })
    .sort((left, right) => right.revenueClp - left.revenueClp || left.spaceName.localeCompare(right.spaceName))
}

const buildRanking = (rows: AgencyEconomicsSpaceRow[]): AgencyEconomicsRankingItem[] =>
  [...rows]
    .sort((left, right) => {
      const rightMargin = right.grossMarginPct ?? -Infinity
      const leftMargin = left.grossMarginPct ?? -Infinity

      return rightMargin - leftMargin || right.grossMarginClp - left.grossMarginClp || right.revenueClp - left.revenueClp
    })
    .slice(0, 5)
    .map(row => ({
      spaceId: row.spaceId,
      spaceName: row.spaceName,
      organizationName: row.organizationName,
      revenueClp: row.revenueClp,
      grossMarginClp: row.grossMarginClp,
      grossMarginPct: row.grossMarginPct
    }))

const buildPartialState = ({
  rows,
  selectedPeriod,
  periodClosed
}: {
  rows: AgencyEconomicsSpaceRow[]
  selectedPeriod: AgencyEconomicsPeriod
  periodClosed: boolean
}) => {
  const messages: string[] = []

  if (rows.length === 0) {
    messages.push(`No encontramos P&L por Space para ${selectedPeriod.label}.`)
  }

  if (!periodClosed) {
    messages.push('El período sigue abierto; los montos pueden cambiar mientras se consolida el cierre operativo.')
  }

  if (rows.some(row => row.serviceCount > 0)) {
    messages.push('El detalle económico por servicio aún no está disponible; por ahora mostramos contexto contractual y de catálogo.')
  }

  return {
    isPartial: messages.length > 0,
    messages
  }
}

export const getAgencyEconomics = async ({
  year,
  month,
  trendMonths = DEFAULT_TREND_MONTHS
}: {
  year?: number
  month?: number
  trendMonths?: number
} = {}): Promise<AgencyEconomicsResponse> => {
  const currentPeriod = getFinanceCurrentPeriod()
  const resolvedYear = Number.isInteger(year) ? Number(year) : currentPeriod.year
  const resolvedMonth = clampMonth(Number.isInteger(month) ? Number(month) : currentPeriod.month)
  const periods = buildPeriodsWindow(resolvedYear, resolvedMonth, trendMonths)

  const selectedPeriod = periods.at(-1) || {
    year: resolvedYear,
    month: resolvedMonth,
    key: toPeriodKey(resolvedYear, resolvedMonth),
    label: formatPeriodLabel(resolvedYear, resolvedMonth)
  }

  const snapshotRows = await listSpaceSnapshotsForWindow({
    fromPeriod: toPeriodNumber(periods[0].year, periods[0].month),
    toPeriod: toPeriodNumber(selectedPeriod.year, selectedPeriod.month)
  })

  const currentRows = snapshotRows.filter(
    row => Number(row.period_year) === selectedPeriod.year && Number(row.period_month) === selectedPeriod.month
  )

  const previousPeriod = periods.at(-2)

  const previousRows = previousPeriod
    ? snapshotRows.filter(
        row => Number(row.period_year) === previousPeriod.year && Number(row.period_month) === previousPeriod.month
      )
    : []

  const bySpace = await buildSpaceRows({ currentRows, previousRows })
  const totals = sumTotals(currentRows)

  totals.activeServiceCount = bySpace.reduce((sum, row) => sum + row.serviceCount, 0)

  const periodClosed = currentRows.length > 0 && currentRows.every(row => row.period_closed)
  const trends = buildAgencyEconomicsTrend(snapshotRows, periods)

  return {
    period: {
      year: selectedPeriod.year,
      month: selectedPeriod.month,
      key: selectedPeriod.key,
      label: selectedPeriod.label,
      periodClosed
    },
    totals,
    bySpace,
    trends,
    ranking: buildRanking(bySpace),
    partialState: buildPartialState({
      rows: bySpace,
      selectedPeriod: {
        year: selectedPeriod.year,
        month: selectedPeriod.month,
        key: selectedPeriod.key,
        label: selectedPeriod.label,
        periodClosed
      },
      periodClosed
    })
  }
}
