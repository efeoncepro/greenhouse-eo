import 'server-only'

import { getSpaceFinanceMetrics } from '@/lib/agency/agency-finance-metrics'
import { readLatestSpaceMetrics, readProjectMetrics } from '@/lib/ico-engine/read-metrics'
import { getIcoEngineProjectId, runIcoEngineQuery, toNumber as toIcoNumber, normalizeString } from '@/lib/ico-engine/shared'
import { ICO_DATASET } from '@/lib/ico-engine/schema'
import { readMemberCapacityEconomicsBatch } from '@/lib/member-capacity-economics/store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getServicesBySpace, type ServiceListItem } from '@/lib/services/service-store'
import { getSpaceHealth, type SpaceHealthZone } from '@/components/agency/space-health'

type RiskLevel = 'low' | 'medium' | 'high'
type DataStatus = 'ready' | 'partial' | 'missing'

type SpaceContextRow = Record<string, unknown> & {
  client_id: string
  client_name: string
  tenant_type: string | null
  space_id: string | null
  space_name: string | null
  organization_id: string | null
  organization_name: string | null
  organization_public_id: string | null
}

type BusinessLineRow = Record<string, unknown> & {
  module_code: string | null
}

type AssignmentRow = Record<string, unknown> & {
  assignment_id: string
  member_id: string
  display_name: string
  role_title: string | null
  role_category: string | null
  fte_allocation: string | number | null
  contracted_hours_month: string | number | null
  assignment_type: string | null
  start_date: string | null
  placement_id: string | null
  placement_status: string | null
  placement_provider_id: string | null
  placement_provider_name: string | null
}

type FinanceSnapshotRow = Record<string, unknown> & {
  scope_type: string
  scope_id: string
  scope_name: string
  period_year: string | number
  period_month: string | number
  period_closed: boolean | null
  snapshot_revision: string | number | null
  revenue_clp: string | number | null
  labor_cost_clp: string | number | null
  direct_expense_clp: string | number | null
  overhead_clp: string | number | null
  total_cost_clp: string | number | null
  gross_margin_clp: string | number | null
  gross_margin_pct: string | number | null
  headcount_fte: string | number | null
  revenue_per_fte_clp: string | number | null
  cost_per_fte_clp: string | number | null
  materialized_at: string | null
}

type IncomeRow = Record<string, unknown> & {
  income_id: string
  invoice_number: string | null
  invoice_date: string | null
  due_date: string | null
  client_name: string
  currency: string
  total_amount_clp: string | number | null
  amount_paid: string | number | null
  payment_status: string
  description: string | null
}

type ExpenseRow = Record<string, unknown> & {
  expense_id: string
  expense_type: string
  description: string
  payment_date: string | null
  due_date: string | null
  supplier_name: string | null
  payment_status: string
  total_amount_clp: string | number | null
  member_name: string | null
}

type PlacementSummaryRow = Record<string, unknown> & {
  active_count: string | number | null
  provider_count: string | number | null
  projected_revenue_clp: string | number | null
  payroll_employer_cost_clp: string | number | null
  commercial_loaded_cost_clp: string | number | null
  tooling_cost_clp: string | number | null
}

type ActivityRow = Record<string, unknown> & {
  event_id: string
  aggregate_type: string
  aggregate_id: string
  event_type: string
  payload_json: unknown
  occurred_at: string | Date
}

type TrendRow = {
  period_year: unknown
  period_month: unknown
  rpa_avg: unknown
  tasks_completed: unknown
}

type StuckAssetRow = {
  task_source_id: string
  task_name: unknown
  project_source_id: unknown
  fase_csc: unknown
  days_since_update: unknown
  severity: unknown
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toNullableNumber = (value: unknown): number | null => {
  if (value == null || value === '') return null

  const parsed = toNumber(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toDateString = (value: unknown) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string') return value.slice(0, 10)

  return null
}

const formatEventLabel = (eventType: string) =>
  eventType
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())

const summarizeActivity = (eventType: string, aggregateType: string) => {
  if (eventType.startsWith('finance.income')) return 'Movimiento de ingreso'
  if (eventType.startsWith('finance.expense')) return 'Movimiento de egreso'
  if (eventType.startsWith('staff_aug.placement')) return 'Placement actualizado'
  if (eventType.startsWith('service.')) return 'Servicio actualizado'
  if (eventType.startsWith('assignment.')) return 'Asignación de equipo actualizada'
  if (eventType.startsWith('accounting.pl_snapshot')) return 'Snapshot económico materializado'
  if (eventType.startsWith('payroll_') || eventType.startsWith('payroll.')) return 'Nómina recalculada'

  return `${formatEventLabel(eventType)} · ${aggregateType}`
}

const getCurrentPeriod = () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)
  const year = match ? Number(match[1]) : new Date().getFullYear()
  const month = match ? Number(match[2]) : new Date().getMonth() + 1

  return {
    year,
    month,
    periodId: `${year}-${String(month).padStart(2, '0')}`
  }
}

const healthChip = (zone: SpaceHealthZone) => ({
  zone,
  label: zone === 'optimal' ? 'Óptimo' : zone === 'attention' ? 'Atención' : 'Crítico',
  color: (zone === 'optimal' ? 'success' : zone === 'attention' ? 'warning' : 'error') as 'success' | 'warning' | 'error'
})

const riskChip = (level: RiskLevel) => ({
  level,
  label: level === 'low' ? 'Bajo' : level === 'medium' ? 'Medio' : 'Alto',
  color: (level === 'low' ? 'success' : level === 'medium' ? 'warning' : 'error') as 'success' | 'warning' | 'error'
})

const inferRiskLevel = ({
  healthZone,
  marginPct,
  overcommittedCount,
  stuckAssets
}: {
  healthZone: SpaceHealthZone
  marginPct: number | null
  overcommittedCount: number
  stuckAssets: number
}): RiskLevel => {
  if (healthZone === 'critical' || (marginPct != null && marginPct < 15) || overcommittedCount > 0 || stuckAssets >= 5) {
    return 'high'
  }

  if (healthZone === 'attention' || (marginPct != null && marginPct < 30) || stuckAssets > 0) {
    return 'medium'
  }

  return 'low'
}

const resolveSpaceContext = async (requestedId: string) => {
  const rows = await runGreenhousePostgresQuery<SpaceContextRow>(
    `
      WITH candidate_spaces AS (
        SELECT
          c.client_id,
          c.client_name,
          c.tenant_type,
          s.space_id,
          s.space_name,
          s.organization_id,
          o.organization_name,
          o.public_id AS organization_public_id,
          CASE
            WHEN s.space_id = $1 THEN 0
            WHEN c.client_id = $1 THEN 1
            ELSE 2
          END AS match_rank
        FROM greenhouse_core.clients c
        LEFT JOIN greenhouse_core.spaces s
          ON s.client_id = c.client_id
         AND s.active = TRUE
        LEFT JOIN greenhouse_core.organizations o
          ON o.organization_id = s.organization_id
        WHERE c.client_id = $1 OR s.space_id = $1
      )
      SELECT *
      FROM candidate_spaces
      ORDER BY match_rank ASC, organization_name NULLS LAST, space_name NULLS LAST
      LIMIT 1
    `,
    [requestedId]
  )

  return rows[0] ?? null
}

const readBusinessLines = async (clientId: string) => {
  const rows = await runGreenhousePostgresQuery<BusinessLineRow>(
    `
      SELECT DISTINCT sm.module_code
      FROM greenhouse_core.client_service_modules csm
      INNER JOIN greenhouse_core.service_modules sm
        ON sm.module_id = csm.module_id
      WHERE csm.client_id = $1
        AND csm.active = TRUE
        AND sm.active = TRUE
        AND sm.module_kind = 'business_line'
      ORDER BY sm.module_code ASC
    `,
    [clientId]
  ).catch(() => [])

  return rows
    .map(row => row.module_code?.trim())
    .filter((value): value is string => Boolean(value))
}

const readLatestFinanceSnapshot = async ({
  clientId,
  spaceId
}: {
  clientId: string
  spaceId: string | null
}) => {
  const rows = await runGreenhousePostgresQuery<FinanceSnapshotRow>(
    `
      WITH ranked AS (
        SELECT
          ops.*,
          ROW_NUMBER() OVER (
            PARTITION BY ops.scope_type, ops.scope_id, ops.period_year, ops.period_month
            ORDER BY ops.snapshot_revision DESC, ops.materialized_at DESC NULLS LAST
          ) AS revision_rank
        FROM greenhouse_serving.operational_pl_snapshots ops
        WHERE (ops.scope_type = 'client' AND ops.scope_id = $1)
           OR ($2::text IS NOT NULL AND ops.scope_type = 'space' AND ops.scope_id = $2)
      )
      SELECT
        scope_type, scope_id, scope_name,
        period_year, period_month, period_closed, snapshot_revision,
        revenue_clp, labor_cost_clp, direct_expense_clp, overhead_clp,
        total_cost_clp, gross_margin_clp, gross_margin_pct,
        headcount_fte, revenue_per_fte_clp, cost_per_fte_clp,
        materialized_at::text
      FROM ranked
      WHERE revision_rank = 1
      ORDER BY
        CASE WHEN scope_type = 'space' THEN 0 ELSE 1 END,
        period_year DESC,
        period_month DESC
      LIMIT 1
    `,
    [clientId, spaceId]
  ).catch(() => [])

  return rows[0] ?? null
}

const readRecentIncome = async (clientId: string) =>
  runGreenhousePostgresQuery<IncomeRow>(
    `
      SELECT income_id, invoice_number, invoice_date::text, due_date::text,
             client_name, currency, total_amount_clp, amount_paid, payment_status, description
      FROM greenhouse_finance.income
      WHERE client_id = $1
      ORDER BY invoice_date DESC NULLS LAST, created_at DESC
      LIMIT 5
    `,
    [clientId]
  ).catch(() => [])

const readRecentExpenses = async (clientId: string) =>
  runGreenhousePostgresQuery<ExpenseRow>(
    `
      SELECT expense_id, expense_type, description,
             payment_date::text, due_date::text, supplier_name, payment_status, total_amount_clp, member_name
      FROM greenhouse_finance.expenses
      WHERE client_id = $1
      ORDER BY COALESCE(payment_date, due_date, document_date) DESC NULLS LAST, created_at DESC
      LIMIT 5
    `,
    [clientId]
  ).catch(() => [])

const readFinanceExposure = async (clientId: string) => {
  const [row] = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN payment_status IN ('pending', 'partial', 'overdue') THEN total_amount_clp ELSE 0 END), 0) AS receivables_clp,
        COALESCE((SELECT SUM(total_amount_clp)
          FROM greenhouse_finance.expenses e
          WHERE e.client_id = $1
            AND e.payment_status IN ('pending', 'partial', 'overdue')
        ), 0) AS payables_clp
      FROM greenhouse_finance.income
      WHERE client_id = $1
    `,
    [clientId]
  ).catch(() => [])

  return {
    receivablesClp: toNumber(row?.receivables_clp),
    payablesClp: toNumber(row?.payables_clp)
  }
}

const readTeamAssignments = async (clientId: string) =>
  runGreenhousePostgresQuery<AssignmentRow>(
    `
      SELECT
        a.assignment_id,
        a.member_id,
        m.display_name,
        COALESCE(a.role_title_override, m.role_title) AS role_title,
        m.role_category,
        a.fte_allocation,
        COALESCE(a.contracted_hours_month, ROUND(a.fte_allocation * 160)) AS contracted_hours_month,
        a.assignment_type,
        a.start_date::text,
        placement.placement_id,
        placement.status AS placement_status,
        placement.provider_id AS placement_provider_id,
        provider.provider_name AS placement_provider_name
      FROM greenhouse_core.client_team_assignments a
      INNER JOIN greenhouse_core.members m
        ON m.member_id = a.member_id
      LEFT JOIN greenhouse_delivery.staff_aug_placements placement
        ON placement.assignment_id = a.assignment_id
      LEFT JOIN greenhouse_core.providers provider
        ON provider.provider_id = placement.provider_id
      WHERE a.client_id = $1
        AND a.active = TRUE
        AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
      ORDER BY m.display_name ASC
    `,
    [clientId]
  ).catch(() => [])

const readPlacementExposure = async (clientId: string) => {
  const [row] = await runGreenhousePostgresQuery<PlacementSummaryRow>(
    `
      SELECT
        COUNT(*) FILTER (WHERE p.status IN ('active', 'renewal_pending', 'renewed')) AS active_count,
        COUNT(DISTINCT p.provider_id) FILTER (WHERE p.provider_id IS NOT NULL) AS provider_count,
        COALESCE(SUM(snapshot.projected_revenue_clp), 0) AS projected_revenue_clp,
        COALESCE(SUM(snapshot.payroll_employer_cost_clp), 0) AS payroll_employer_cost_clp,
        COALESCE(SUM(snapshot.commercial_loaded_cost_clp), 0) AS commercial_loaded_cost_clp,
        COALESCE(SUM(snapshot.tooling_cost_clp), 0) AS tooling_cost_clp
      FROM greenhouse_delivery.staff_aug_placements p
      LEFT JOIN greenhouse_serving.staff_aug_placement_snapshots snapshot
        ON snapshot.snapshot_id = p.latest_snapshot_id
      WHERE p.client_id = $1
    `,
    [clientId]
  ).catch(() => [])

  return {
    activeCount: toNumber(row?.active_count),
    providerCount: toNumber(row?.provider_count),
    projectedRevenueClp: toNumber(row?.projected_revenue_clp),
    payrollEmployerCostClp: toNumber(row?.payroll_employer_cost_clp),
    commercialLoadedCostClp: toNumber(row?.commercial_loaded_cost_clp),
    toolingCostClp: toNumber(row?.tooling_cost_clp)
  }
}

const readRecentActivity = async ({
  clientId,
  spaceId,
  organizationId
}: {
  clientId: string
  spaceId: string | null
  organizationId: string | null
}) => {
  const rows = await runGreenhousePostgresQuery<ActivityRow>(
    `
      SELECT event_id, aggregate_type, aggregate_id, event_type, payload_json, occurred_at
      FROM greenhouse_sync.outbox_events
      WHERE aggregate_id = $1
         OR ($2::text IS NOT NULL AND aggregate_id = $2)
         OR ($3::text IS NOT NULL AND aggregate_id = $3)
         OR payload_json ->> 'clientId' = $1
         OR payload_json ->> 'client_id' = $1
         OR ($2::text IS NOT NULL AND (
              payload_json ->> 'spaceId' = $2
           OR payload_json ->> 'space_id' = $2
         ))
         OR ($3::text IS NOT NULL AND (
              payload_json ->> 'organizationId' = $3
           OR payload_json ->> 'organization_id' = $3
         ))
      ORDER BY occurred_at DESC
      LIMIT 10
    `,
    [clientId, spaceId, organizationId]
  ).catch(() => [])

  return rows.map(row => ({
    eventId: row.event_id,
    eventType: row.event_type,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    occurredAt: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : String(row.occurred_at),
    title: formatEventLabel(row.event_type),
    description: summarizeActivity(row.event_type, row.aggregate_type)
  }))
}

const readDeliveryExtras = async (spaceId: string) => {
  const projectId = getIcoEngineProjectId()

  const [trendRows, stuckRows] = await Promise.all([
    runIcoEngineQuery<TrendRow>(
      `
        SELECT period_year, period_month, rpa_avg, tasks_completed
        FROM \`${projectId}.${ICO_DATASET}.rpa_trend\`
        WHERE space_id = @spaceId
        ORDER BY period_year DESC, period_month DESC
        LIMIT 6
      `,
      { spaceId }
    ).catch(() => []),
    runIcoEngineQuery<StuckAssetRow>(
      `
        SELECT task_source_id, task_name, project_source_id, fase_csc, days_since_update, severity
        FROM \`${projectId}.${ICO_DATASET}.stuck_assets_detail\`
        WHERE space_id = @spaceId
        ORDER BY
          CASE WHEN severity = 'danger' THEN 0 ELSE 1 END,
          days_since_update DESC
        LIMIT 5
      `,
      { spaceId }
    ).catch(() => [])
  ])

  return {
    trend: trendRows
      .map(row => ({
        periodId: `${toIcoNumber(row.period_year)}-${String(toIcoNumber(row.period_month)).padStart(2, '0')}`,
        rpaAvg: row.rpa_avg == null ? null : toIcoNumber(row.rpa_avg),
        tasksCompleted: toIcoNumber(row.tasks_completed)
      }))
      .reverse(),
    stuckAssets: stuckRows.map(row => ({
      taskSourceId: normalizeString(row.task_source_id),
      taskName: row.task_name ? String(row.task_name).trim() : 'Activo sin nombre',
      projectSourceId: row.project_source_id ? String(row.project_source_id).trim() : null,
      faseCsc: row.fase_csc ? String(row.fase_csc).trim() : null,
      daysSinceUpdate: toIcoNumber(row.days_since_update),
      severity: row.severity ? String(row.severity).trim() : 'warning'
    }))
  }
}

export type Space360Detail = {
  requestedId: string
  clientId: string
  clientName: string
  tenantType: string | null
  isInternal: boolean
  businessLines: string[]
  spaceId: string | null
  spaceName: string | null
  organizationId: string | null
  organizationName: string | null
  organizationPublicId: string | null
  resolutionStatus: 'client_only' | 'client_and_space'
  dataStatus: DataStatus
  kpis: {
    revenueClp: number
    totalCostClp: number
    marginPct: number | null
    rpaAvg: number | null
    otdPct: number | null
    projectCount: number
    assignedMembers: number
    allocatedFte: number
    activeServices: number
    activePlacements: number
  }
  badges: {
    health: ReturnType<typeof healthChip>
    risk: ReturnType<typeof riskChip>
  }
  overview: {
    dimensions: Array<{
      key: string
      label: string
      status: SpaceHealthZone | 'missing'
      summary: string
      detail: string
    }>
    alerts: string[]
    provenance: string[]
    recentActivity: Awaited<ReturnType<typeof readRecentActivity>>
  }
  team: {
    summary: {
      assignedMembers: number
      allocatedFte: number
      avgUsagePct: number | null
      totalLoadedCostClp: number
      activePlacements: number
      providerCount: number
      overcommittedCount: number
    }
    members: Array<{
      assignmentId: string
      memberId: string
      displayName: string
      roleTitle: string | null
      roleCategory: string | null
      fteAllocation: number
      contractedHoursMonth: number
      usagePercent: number | null
      capacityHealth: 'optimal' | 'attention' | 'critical'
      loadedCostTarget: number | null
      costPerHourTarget: number | null
      targetCurrency: string | null
      assignmentType: string | null
      startDate: string | null
      placementId: string | null
      placementStatus: string | null
      placementProviderId: string | null
      placementProviderName: string | null
    }>
  }
  services: {
    items: Array<ServiceListItem>
    totalCostClp: number
    stageMix: Record<string, number>
  }
  delivery: {
    snapshot: Awaited<ReturnType<typeof readLatestSpaceMetrics>>
    trends: Array<{ periodId: string; rpaAvg: number | null; tasksCompleted: number }>
    projectMetrics: Awaited<ReturnType<typeof readProjectMetrics>>
    stuckAssets: Array<{
      taskSourceId: string
      taskName: string
      projectSourceId: string | null
      faseCsc: string | null
      daysSinceUpdate: number
      severity: string
    }>
  }
  finance: {
    snapshot: {
      scopeType: string
      scopeId: string
      periodYear: number
      periodMonth: number
      periodClosed: boolean
      snapshotRevision: number | null
      revenueClp: number
      laborCostClp: number
      directExpenseClp: number
      overheadClp: number
      totalCostClp: number
      grossMarginClp: number
      grossMarginPct: number | null
      headcountFte: number | null
      materializedAt: string | null
    } | null
    receivablesClp: number
    payablesClp: number
    payrollExposureClp: number
    toolingExposureClp: number
    recentIncome: Array<{
      incomeId: string
      invoiceNumber: string | null
      invoiceDate: string | null
      dueDate: string | null
      totalAmountClp: number
      amountPaid: number
      paymentStatus: string
      description: string | null
    }>
    recentExpenses: Array<{
      expenseId: string
      expenseType: string
      description: string
      paymentDate: string | null
      dueDate: string | null
      supplierName: string | null
      paymentStatus: string
      totalAmountClp: number
      memberName: string | null
    }>
  }
}

export const getAgencySpace360 = async (requestedId: string): Promise<Space360Detail | null> => {
  const context = await resolveSpaceContext(requestedId)

  if (!context) {
    return null
  }

  const businessLines = await readBusinessLines(context.client_id).catch(() => [])

  const [
    financeSnapshot,
    financeMetrics,
    financeExposure,
    recentIncome,
    recentExpenses,
    assignments,
    placementExposure,
    services,
    recentActivity
  ] = await Promise.all([
    readLatestFinanceSnapshot({ clientId: context.client_id, spaceId: context.space_id }),
    getSpaceFinanceMetrics().then(items => items.find(item => item.clientId === context.client_id) ?? null).catch(() => null),
    readFinanceExposure(context.client_id),
    readRecentIncome(context.client_id),
    readRecentExpenses(context.client_id),
    readTeamAssignments(context.client_id),
    readPlacementExposure(context.client_id),
    context.space_id ? getServicesBySpace(context.space_id).catch(() => []) : Promise.resolve([]),
    readRecentActivity({
      clientId: context.client_id,
      spaceId: context.space_id,
      organizationId: context.organization_id
    })
  ])

  const currentPeriod = getCurrentPeriod()

  const memberSnapshots = assignments.length > 0
    ? await readMemberCapacityEconomicsBatch({
        memberIds: assignments.map(assignment => assignment.member_id),
        year: currentPeriod.year,
        month: currentPeriod.month
      }).catch(() => new Map())
    : new Map()

  const teamMembers = assignments.map(assignment => {
    const snapshot = memberSnapshots.get(assignment.member_id)
    const fteAllocation = Number(toNumber(assignment.fte_allocation).toFixed(2))
    const contractedHoursMonth = Math.max(0, toNumber(assignment.contracted_hours_month) || Math.round(fteAllocation * 160))
    const usagePercent = snapshot?.usagePercent ?? null

    const capacityHealth: 'optimal' | 'attention' | 'critical' =
      usagePercent == null
        ? 'attention'
        : usagePercent >= 100
          ? 'critical'
          : usagePercent >= 85
            ? 'attention'
            : 'optimal'

    return {
      assignmentId: assignment.assignment_id,
      memberId: assignment.member_id,
      displayName: assignment.display_name,
      roleTitle: assignment.role_title,
      roleCategory: assignment.role_category,
      fteAllocation,
      contractedHoursMonth,
      usagePercent,
      capacityHealth,
      loadedCostTarget: snapshot?.loadedCostTarget ?? null,
      costPerHourTarget: snapshot?.costPerHourTarget ?? null,
      targetCurrency: snapshot?.targetCurrency ?? null,
      assignmentType: assignment.assignment_type,
      startDate: assignment.start_date,
      placementId: assignment.placement_id,
      placementStatus: assignment.placement_status,
      placementProviderId: assignment.placement_provider_id,
      placementProviderName: assignment.placement_provider_name
    }
  })

  const totalLoadedCostClp = teamMembers.reduce((sum, member) => sum + (member.loadedCostTarget ?? 0), 0)
  const allocatedFte = teamMembers.reduce((sum, member) => sum + member.fteAllocation, 0)

  const avgUsagePct = teamMembers.filter(member => member.usagePercent != null).length > 0
    ? Math.round(
        teamMembers.reduce((sum, member) => sum + (member.usagePercent ?? 0), 0) /
        teamMembers.filter(member => member.usagePercent != null).length
      )
    : null

  const overcommittedCount = teamMembers.filter(member => (member.usagePercent ?? 0) > 100).length

  const deliverySnapshot = context.space_id ? await readLatestSpaceMetrics(context.space_id).catch(() => null) : null
  const deliveryExtras = context.space_id ? await readDeliveryExtras(context.space_id).catch(() => ({ trend: [], stuckAssets: [] })) : { trend: [], stuckAssets: [] }

  const deliveryProjectMetrics = context.space_id && deliverySnapshot
    ? await readProjectMetrics(context.space_id, deliverySnapshot.periodYear, deliverySnapshot.periodMonth).catch(() => [])
    : []

  const effectiveRevenueClp = financeSnapshot ? toNumber(financeSnapshot.revenue_clp) : financeMetrics?.revenueCurrentMonth ?? 0
  const effectiveCostClp = financeSnapshot ? toNumber(financeSnapshot.total_cost_clp) : financeMetrics?.expensesCurrentMonth ?? 0
  const effectiveMarginPct = financeSnapshot ? toNullableNumber(financeSnapshot.gross_margin_pct) : financeMetrics?.marginPct ?? null
  const effectiveRpa = deliverySnapshot?.metrics.find(metric => metric.metricId === 'rpa')?.value ?? null
  const effectiveOtd = deliverySnapshot?.metrics.find(metric => metric.metricId === 'otd_pct')?.value ?? null

  const healthZone = getSpaceHealth({
    clientId: context.client_id,
    clientName: context.client_name,
    businessLines,
    rpaAvg: effectiveRpa,
    otdPct: effectiveOtd,
    assetsActivos: deliverySnapshot?.context.activeTasks ?? deliveryExtras.stuckAssets.length,
    feedbackPendiente: 0,
    projectCount: deliveryProjectMetrics.length,
    notionProjectCount: deliveryProjectMetrics.length,
    scopedProjectCount: deliveryProjectMetrics.length,
    assignedMembers: teamMembers.length,
    allocatedFte,
    totalUsers: 0,
    activeUsers: 0,
    isInternal: context.client_name.toLowerCase().includes('efeonce')
  })

  const riskLevel = inferRiskLevel({
    healthZone,
    marginPct: effectiveMarginPct,
    overcommittedCount,
    stuckAssets: deliveryExtras.stuckAssets.length
  })

  const servicesStageMix = services.reduce<Record<string, number>>((acc, service) => {
    acc[service.pipelineStage] = (acc[service.pipelineStage] || 0) + 1

    return acc
  }, {})

  const provenance: string[] = []

  if (context.space_id) {
    provenance.push(`Space canónico resuelto: ${context.space_name || context.space_id}`)
  } else {
    provenance.push('Sin vínculo canónico a greenhouse_core.spaces; la vista opera sobre clientId')
  }

  provenance.push(financeSnapshot ? `Finance snapshot ${financeSnapshot.scope_type} ${financeSnapshot.period_year}-${String(financeSnapshot.period_month).padStart(2, '0')}` : 'Sin snapshot financiero; usando métricas resumidas disponibles')
  provenance.push(deliverySnapshot ? `ICO ${deliverySnapshot.source} ${deliverySnapshot.periodYear}-${String(deliverySnapshot.periodMonth).padStart(2, '0')}` : 'Sin snapshot ICO materializado')

  const alerts: string[] = []

  if (!context.space_id) alerts.push('Falta el vínculo canónico a Space; algunos drilldowns quedan en modo client-first.')
  if (!deliverySnapshot) alerts.push('El tab de delivery quedó parcial porque no existe snapshot ICO reciente para este Space.')
  if (!financeSnapshot) alerts.push('La lectura financiera usa el summary Agency vigente y no un snapshot P&L detallado por Space.')
  if (overcommittedCount > 0) alerts.push(`${overcommittedCount} integrante(s) superan 100% de uso operativo.`)
  if (deliveryExtras.stuckAssets.length > 0) alerts.push(`${deliveryExtras.stuckAssets.length} activo(s) aparecen atascados en el pipeline.`)

  return {
    requestedId,
    clientId: context.client_id,
    clientName: context.client_name,
    tenantType: context.tenant_type,
    isInternal: context.client_name.toLowerCase().includes('efeonce'),
    businessLines,
    spaceId: context.space_id,
    spaceName: context.space_name,
    organizationId: context.organization_id,
    organizationName: context.organization_name,
    organizationPublicId: context.organization_public_id,
    resolutionStatus: context.space_id ? 'client_and_space' : 'client_only',
    dataStatus: alerts.length > 0 ? 'partial' : 'ready',
    kpis: {
      revenueClp: effectiveRevenueClp,
      totalCostClp: effectiveCostClp,
      marginPct: effectiveMarginPct,
      rpaAvg: effectiveRpa,
      otdPct: effectiveOtd,
      projectCount: deliveryProjectMetrics.length,
      assignedMembers: teamMembers.length,
      allocatedFte: Number(allocatedFte.toFixed(1)),
      activeServices: services.length,
      activePlacements: placementExposure.activeCount
    },
    badges: {
      health: healthChip(healthZone),
      risk: riskChip(riskLevel)
    },
    overview: {
      dimensions: [
        {
          key: 'delivery',
          label: 'Delivery',
          status: deliverySnapshot ? healthZone : 'missing',
          summary: effectiveRpa != null || effectiveOtd != null ? `RpA ${effectiveRpa?.toFixed(1) ?? '—'} · OTD ${effectiveOtd != null ? `${Math.round(effectiveOtd)}%` : '—'}` : 'Sin snapshot delivery',
          detail: deliveryExtras.stuckAssets.length > 0 ? `${deliveryExtras.stuckAssets.length} activos atascados` : 'Sin alertas de stuck assets'
        },
        {
          key: 'finance',
          label: 'Finanzas',
          status: effectiveMarginPct == null ? 'missing' : effectiveMarginPct < 15 ? 'critical' : effectiveMarginPct < 30 ? 'attention' : 'optimal',
          summary: `Margen ${effectiveMarginPct != null ? `${Math.round(effectiveMarginPct)}%` : '—'}`,
          detail: `CxC ${financeExposure.receivablesClp.toLocaleString('es-CL')} · CxP ${financeExposure.payablesClp.toLocaleString('es-CL')}`
        },
        {
          key: 'capacity',
          label: 'Capacidad',
          status: overcommittedCount > 0 ? 'critical' : avgUsagePct != null && avgUsagePct >= 85 ? 'attention' : 'optimal',
          summary: `${teamMembers.length} personas · ${Number(allocatedFte.toFixed(1))} FTE`,
          detail: avgUsagePct != null ? `Uso operativo promedio ${avgUsagePct}%` : 'Sin uso operativo materializado'
        },
        {
          key: 'engagement',
          label: 'Cobertura comercial',
          status: services.length === 0 && placementExposure.activeCount === 0 ? 'attention' : 'optimal',
          summary: `${services.length} servicio(s) · ${placementExposure.activeCount} placement(s)`,
          detail: placementExposure.providerCount > 0 ? `${placementExposure.providerCount} provider(s) expuesto(s)` : 'Sin provider externo vinculado'
        }
      ],
      alerts,
      provenance,
      recentActivity
    },
    team: {
      summary: {
        assignedMembers: teamMembers.length,
        allocatedFte: Number(allocatedFte.toFixed(1)),
        avgUsagePct,
        totalLoadedCostClp: Math.round(totalLoadedCostClp),
        activePlacements: placementExposure.activeCount,
        providerCount: placementExposure.providerCount,
        overcommittedCount
      },
      members: teamMembers
    },
    services: {
      items: services,
      totalCostClp: Math.round(services.reduce((sum, service) => sum + (service.totalCost ?? 0), 0)),
      stageMix: servicesStageMix
    },
    delivery: {
      snapshot: deliverySnapshot,
      trends: deliveryExtras.trend,
      projectMetrics: deliveryProjectMetrics,
      stuckAssets: deliveryExtras.stuckAssets
    },
    finance: {
      snapshot: financeSnapshot ? {
        scopeType: financeSnapshot.scope_type,
        scopeId: financeSnapshot.scope_id,
        periodYear: toNumber(financeSnapshot.period_year),
        periodMonth: toNumber(financeSnapshot.period_month),
        periodClosed: Boolean(financeSnapshot.period_closed),
        snapshotRevision: toNullableNumber(financeSnapshot.snapshot_revision),
        revenueClp: toNumber(financeSnapshot.revenue_clp),
        laborCostClp: toNumber(financeSnapshot.labor_cost_clp),
        directExpenseClp: toNumber(financeSnapshot.direct_expense_clp),
        overheadClp: toNumber(financeSnapshot.overhead_clp),
        totalCostClp: toNumber(financeSnapshot.total_cost_clp),
        grossMarginClp: toNumber(financeSnapshot.gross_margin_clp),
        grossMarginPct: toNullableNumber(financeSnapshot.gross_margin_pct),
        headcountFte: toNullableNumber(financeSnapshot.headcount_fte),
        materializedAt: financeSnapshot.materialized_at
      } : null,
      receivablesClp: financeExposure.receivablesClp,
      payablesClp: financeExposure.payablesClp,
      payrollExposureClp: Math.round(totalLoadedCostClp || placementExposure.payrollEmployerCostClp),
      toolingExposureClp: placementExposure.toolingCostClp,
      recentIncome: recentIncome.map(row => ({
        incomeId: row.income_id,
        invoiceNumber: row.invoice_number,
        invoiceDate: toDateString(row.invoice_date),
        dueDate: toDateString(row.due_date),
        totalAmountClp: toNumber(row.total_amount_clp),
        amountPaid: toNumber(row.amount_paid),
        paymentStatus: row.payment_status,
        description: row.description
      })),
      recentExpenses: recentExpenses.map(row => ({
        expenseId: row.expense_id,
        expenseType: row.expense_type,
        description: row.description,
        paymentDate: toDateString(row.payment_date),
        dueDate: toDateString(row.due_date),
        supplierName: row.supplier_name,
        paymentStatus: row.payment_status,
        totalAmountClp: toNumber(row.total_amount_clp),
        memberName: row.member_name
      }))
    }
  }
}
