import 'server-only'

import {
  materializeCommercialCostAttributionForPeriod,
  readCommercialCostAttributionByClientForPeriod
} from '@/lib/commercial-cost-attribution/member-period-attribution'
import { getMonthDateRange } from '@/lib/finance/periods'
import { roundCurrency, toNumber, toTimestampString } from '@/lib/finance/shared'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  INTERNAL_COMMERCIAL_CLIENT_IDS,
  INTERNAL_COMMERCIAL_CLIENT_NAMES
} from '@/lib/team-capacity/internal-assignments'

import type { OperationalPlFilters, OperationalPlScopeType, OperationalPlSnapshot, PlComputationResult } from './pl-types'
import { assertValidPeriodParts, toBoolean } from './shared'

type SnapshotRow = {
  snapshot_id: string
  scope_type: OperationalPlScopeType
  scope_id: string
  scope_name: string
  period_year: number | string
  period_month: number | string
  period_closed: boolean | string
  snapshot_revision: number | string
  revenue_clp: number | string
  labor_cost_clp: number | string
  direct_expense_clp: number | string
  overhead_clp: number | string
  total_cost_clp: number | string
  gross_margin_clp: number | string
  gross_margin_pct: number | string | null
  headcount_fte: number | string | null
  revenue_per_fte_clp: number | string | null
  cost_per_fte_clp: number | string | null
  computation_reason: string | null
  materialized_at: string | Date | null
}

type RevenueRow = {
  client_id: string
  organization_id: string | null
  organization_name: string | null
  client_name: string | null
  total_revenue_clp: number | string
  partner_share_clp: number | string
}

type ExpenseRow = {
  client_id: string
  organization_id: string | null
  organization_name: string | null
  client_name: string | null
  total_direct_expense_clp: number | string
}

type ScopeBridgeRow = {
  client_id: string
  client_name: string | null
  space_id: string | null
  space_name: string | null
  organization_id: string | null
  organization_name: string | null
}

type PeriodClosureRow = {
  closure_status: string
  snapshot_revision: number | string
}

type ClientAccumulator = {
  scopeId: string
  scopeName: string
  organizationId: string | null
  organizationName: string | null
  revenueClp: number
  laborCostClp: number
  directExpenseClp: number
  overheadClp: number
  headcountFte: number
}

const toNullableNumber = (value: unknown) => {
  if (value == null) return null

  const parsed = toNumber(value)

  return Number.isFinite(parsed) ? parsed : null
}

const mapSnapshotRow = (row: SnapshotRow): OperationalPlSnapshot => ({
  snapshotId: row.snapshot_id,
  scopeType: row.scope_type,
  scopeId: row.scope_id,
  scopeName: row.scope_name,
  periodYear: toNumber(row.period_year),
  periodMonth: toNumber(row.period_month),
  periodClosed: toBoolean(row.period_closed, false),
  snapshotRevision: toNumber(row.snapshot_revision),
  currency: 'CLP',
  revenueClp: roundCurrency(toNumber(row.revenue_clp)),
  laborCostClp: roundCurrency(toNumber(row.labor_cost_clp)),
  directExpenseClp: roundCurrency(toNumber(row.direct_expense_clp)),
  overheadClp: roundCurrency(toNumber(row.overhead_clp)),
  totalCostClp: roundCurrency(toNumber(row.total_cost_clp)),
  grossMarginClp: roundCurrency(toNumber(row.gross_margin_clp)),
  grossMarginPct: toNullableNumber(row.gross_margin_pct),
  headcountFte: toNullableNumber(row.headcount_fte),
  revenuePerFteClp: toNullableNumber(row.revenue_per_fte_clp),
  costPerFteClp: toNullableNumber(row.cost_per_fte_clp),
  computationReason: row.computation_reason,
  materializedAt: toTimestampString(row.materialized_at as string | { value?: string } | null)
})

const buildSnapshotId = ({
  scopeType,
  scopeId,
  year,
  month,
  revision
}: {
  scopeType: OperationalPlScopeType
  scopeId: string
  year: number
  month: number
  revision: number
}) => `${scopeType}-${scopeId}-${year}-${String(month).padStart(2, '0')}-r${revision}`

const buildSnapshot = ({
  scopeType,
  scopeId,
  scopeName,
  year,
  month,
  periodClosed,
  snapshotRevision,
  reason,
  revenueClp,
  laborCostClp,
  directExpenseClp,
  overheadClp,
  headcountFte
}: {
  scopeType: OperationalPlScopeType
  scopeId: string
  scopeName: string
  year: number
  month: number
  periodClosed: boolean
  snapshotRevision: number
  reason: string | null
  revenueClp: number
  laborCostClp: number
  directExpenseClp: number
  overheadClp: number
  headcountFte: number
}): OperationalPlSnapshot => {
  const totalCostClp = roundCurrency(laborCostClp + directExpenseClp + overheadClp)
  const grossMarginClp = roundCurrency(revenueClp - totalCostClp)
  const roundedFte = headcountFte > 0 ? Math.round(headcountFte * 100) / 100 : null

  return {
    snapshotId: buildSnapshotId({ scopeType, scopeId, year, month, revision: snapshotRevision }),
    scopeType,
    scopeId,
    scopeName,
    periodYear: year,
    periodMonth: month,
    periodClosed,
    snapshotRevision,
    currency: 'CLP',
    revenueClp: roundCurrency(revenueClp),
    laborCostClp: roundCurrency(laborCostClp),
    directExpenseClp: roundCurrency(directExpenseClp),
    overheadClp: roundCurrency(overheadClp),
    totalCostClp,
    grossMarginClp,
    grossMarginPct: revenueClp > 0 ? roundCurrency((grossMarginClp / revenueClp) * 100) : null,
    headcountFte: roundedFte,
    revenuePerFteClp: roundedFte && roundedFte > 0 ? roundCurrency(revenueClp / roundedFte) : null,
    costPerFteClp: roundedFte && roundedFte > 0 ? roundCurrency(totalCostClp / roundedFte) : null,
    computationReason: reason,
    materializedAt: null
  }
}

const aggregateSnapshots = ({
  scopeType,
  year,
  month,
  periodClosed,
  snapshotRevision,
  reason,
  baseSnapshots,
  keyFor
}: {
  scopeType: Exclude<OperationalPlScopeType, 'client'>
  year: number
  month: number
  periodClosed: boolean
  snapshotRevision: number
  reason: string | null
  baseSnapshots: OperationalPlSnapshot[]
  keyFor: (snapshot: OperationalPlSnapshot) => { scopeId: string; scopeName: string } | null
}) => {
  const aggregateMap = new Map<string, ClientAccumulator>()

  for (const snapshot of baseSnapshots) {
    const key = keyFor(snapshot)

    if (!key) continue

    const existing = aggregateMap.get(key.scopeId) || {
      scopeId: key.scopeId,
      scopeName: key.scopeName,
      organizationId: null,
      organizationName: null,
      revenueClp: 0,
      laborCostClp: 0,
      directExpenseClp: 0,
      overheadClp: 0,
      headcountFte: 0
    }

    existing.revenueClp += snapshot.revenueClp
    existing.laborCostClp += snapshot.laborCostClp
    existing.directExpenseClp += snapshot.directExpenseClp
    existing.overheadClp += snapshot.overheadClp
    existing.headcountFte += snapshot.headcountFte ?? 0
    aggregateMap.set(key.scopeId, existing)
  }

  return Array.from(aggregateMap.values())
    .map(item =>
      buildSnapshot({
        scopeType,
        scopeId: item.scopeId,
        scopeName: item.scopeName,
        year,
        month,
        periodClosed,
        snapshotRevision,
        reason,
        revenueClp: item.revenueClp,
        laborCostClp: item.laborCostClp,
        directExpenseClp: item.directExpenseClp,
        overheadClp: item.overheadClp,
        headcountFte: item.headcountFte
      })
    )
    .sort((left, right) => right.revenueClp - left.revenueClp || left.scopeName.localeCompare(right.scopeName))
}

const getPeriodClosureMetadata = async (year: number, month: number) => {
  const rows = await runGreenhousePostgresQuery<PeriodClosureRow>(
    `
      SELECT closure_status, snapshot_revision
      FROM greenhouse_serving.period_closure_status
      WHERE period_year = $1 AND period_month = $2
      LIMIT 1
    `,
    [year, month]
  ).catch(() => [])

  const row = rows[0]

  return {
    periodClosed: row?.closure_status === 'closed',
    snapshotRevision: Math.max(1, toNumber(row?.snapshot_revision ?? 1))
  }
}

export const computeOperationalPl = async (
  year: number,
  month: number,
  reason: string | null = null
): Promise<PlComputationResult> => {
  assertValidPeriodParts(year, month)

  const { periodStart, periodEnd } = getMonthDateRange(year, month)

  const [{ periodClosed, snapshotRevision }, revenueRows, directExpenseRows, allocationRows, scopeBridgeRows, commercialCostRows] =
    await Promise.all([
      getPeriodClosureMetadata(year, month),
      runGreenhousePostgresQuery<RevenueRow>(
        `
          WITH client_bridge AS (
            SELECT DISTINCT ON (s.client_id)
              s.client_id,
              s.organization_id
            FROM greenhouse_core.spaces s
            WHERE s.client_id IS NOT NULL
              AND s.organization_id IS NOT NULL
              AND s.active = TRUE
            ORDER BY s.client_id, s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST, s.space_id ASC
          )
          SELECT
            COALESCE(i.client_id, cp.client_id, i.organization_id, cp.organization_id) AS client_id,
            COALESCE(i.organization_id, cp.organization_id, cb.organization_id) AS organization_id,
            MAX(COALESCE(o.organization_name, o.legal_name, cp.legal_name)) AS organization_name,
            MAX(
              COALESCE(
                NULLIF(TRIM(i.client_name), ''),
                NULLIF(TRIM(c.client_name), ''),
                NULLIF(TRIM(cp.legal_name), ''),
                NULLIF(TRIM(o.organization_name), ''),
                COALESCE(i.client_id, cp.client_id, i.organization_id, cp.organization_id)
              )
            ) AS client_name,
            COALESCE(SUM(i.total_amount_clp), 0) AS total_revenue_clp,
            COALESCE(SUM(COALESCE(i.partner_share_amount, 0) * COALESCE(i.exchange_rate_to_clp, 1)), 0) AS partner_share_clp
          FROM greenhouse_finance.income i
          LEFT JOIN greenhouse_finance.client_profiles cp
            ON cp.client_profile_id = i.client_profile_id
          LEFT JOIN client_bridge cb
            ON cb.client_id = COALESCE(i.client_id, cp.client_id)
          LEFT JOIN greenhouse_core.clients c
            ON c.client_id = COALESCE(i.client_id, cp.client_id)
          LEFT JOIN greenhouse_core.organizations o
            ON o.organization_id = COALESCE(i.organization_id, cp.organization_id, cb.organization_id)
          WHERE i.invoice_date >= $1::date
            AND i.invoice_date <= $2::date
            AND COALESCE(i.client_id, cp.client_id, i.organization_id, cp.organization_id) IS NOT NULL
            AND COALESCE(NULLIF(LOWER(TRIM(COALESCE(i.client_id, cp.client_id, i.organization_id, cp.organization_id))), ''), '__missing__') <> ALL($3::text[])
            AND COALESCE(
              NULLIF(LOWER(TRIM(COALESCE(i.client_name, c.client_name, cp.legal_name, o.organization_name))), ''),
              '__missing__'
            ) <> ALL($4::text[])
          GROUP BY
            COALESCE(i.client_id, cp.client_id, i.organization_id, cp.organization_id),
            COALESCE(i.organization_id, cp.organization_id, cb.organization_id)
        `,
        [periodStart, periodEnd, INTERNAL_COMMERCIAL_CLIENT_IDS, INTERNAL_COMMERCIAL_CLIENT_NAMES]
      ),
      runGreenhousePostgresQuery<ExpenseRow>(
        `
          WITH client_bridge AS (
            SELECT DISTINCT ON (s.client_id)
              s.client_id,
              s.organization_id
            FROM greenhouse_core.spaces s
            WHERE s.client_id IS NOT NULL
              AND s.organization_id IS NOT NULL
              AND s.active = TRUE
            ORDER BY s.client_id, s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST, s.space_id ASC
          )
          SELECT
            e.allocated_client_id AS client_id,
            COALESCE(es.organization_id, cb.organization_id) AS organization_id,
            MAX(o.organization_name) AS organization_name,
            MAX(c.client_name) AS client_name,
            COALESCE(SUM(e.total_amount_clp), 0) AS total_direct_expense_clp
          FROM greenhouse_finance.expenses e
          LEFT JOIN greenhouse_core.clients c ON c.client_id = e.allocated_client_id
          LEFT JOIN greenhouse_core.spaces es ON es.space_id = e.space_id
          LEFT JOIN client_bridge cb ON cb.client_id = e.allocated_client_id
          LEFT JOIN greenhouse_core.organizations o
            ON o.organization_id = COALESCE(es.organization_id, cb.organization_id)
          WHERE e.allocated_client_id IS NOT NULL
            AND e.payroll_entry_id IS NULL
            AND COALESCE(e.document_date, e.payment_date) >= $1::date
            AND COALESCE(e.document_date, e.payment_date) <= $2::date
            AND COALESCE(NULLIF(LOWER(TRIM(e.allocated_client_id)), ''), '__missing__') <> ALL($3::text[])
            AND COALESCE(NULLIF(LOWER(TRIM(c.client_name)), ''), '__missing__') <> ALL($4::text[])
          GROUP BY e.allocated_client_id, COALESCE(es.organization_id, cb.organization_id)
        `,
        [periodStart, periodEnd, INTERNAL_COMMERCIAL_CLIENT_IDS, INTERNAL_COMMERCIAL_CLIENT_NAMES]
      ),
      runGreenhousePostgresQuery<ExpenseRow>(
        `
          SELECT
            ca.client_id,
            ca.organization_id,
            MAX(o.organization_name) AS organization_name,
            MAX(ca.client_name) AS client_name,
            COALESCE(SUM(ca.allocated_amount_clp), 0) AS total_direct_expense_clp
          FROM greenhouse_finance.cost_allocations ca
          INNER JOIN greenhouse_finance.expenses e ON e.expense_id = ca.expense_id
          LEFT JOIN greenhouse_core.organizations o ON o.organization_id = ca.organization_id
          WHERE ca.period_year = $1
            AND ca.period_month = $2
            AND e.payroll_entry_id IS NULL
            AND COALESCE(NULLIF(LOWER(TRIM(ca.client_id)), ''), '__missing__') <> ALL($3::text[])
            AND COALESCE(NULLIF(LOWER(TRIM(ca.client_name)), ''), '__missing__') <> ALL($4::text[])
          GROUP BY ca.client_id, ca.organization_id
        `,
        [year, month, INTERNAL_COMMERCIAL_CLIENT_IDS, INTERNAL_COMMERCIAL_CLIENT_NAMES]
      ),
      runGreenhousePostgresQuery<ScopeBridgeRow>(
        `
          SELECT DISTINCT ON (s.client_id)
            s.client_id,
            c.client_name,
            s.space_id,
            s.space_name,
            s.organization_id,
            o.organization_name
          FROM greenhouse_core.spaces s
          LEFT JOIN greenhouse_core.clients c ON c.client_id = s.client_id
          LEFT JOIN greenhouse_core.organizations o ON o.organization_id = s.organization_id
          WHERE s.active = TRUE
            AND s.client_id IS NOT NULL
          ORDER BY s.client_id, s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST, s.space_id ASC
        `
      ).catch(() => []),
      readCommercialCostAttributionByClientForPeriod(year, month).catch(() => [])
    ])

  const scopeBridgeByClient = new Map<string, ScopeBridgeRow>(scopeBridgeRows.map(row => [row.client_id, row]))
  const clientMap = new Map<string, ClientAccumulator>()

  const ensureClient = (
    clientId: string,
    clientName: string | null,
    organizationId: string | null = null,
    organizationName: string | null = null
  ) => {
    const bridge = scopeBridgeByClient.get(clientId)

    const normalizedName =
      clientName?.trim() ||
      bridge?.client_name?.trim() ||
      clientId

    const existing = clientMap.get(clientId) || {
      scopeId: clientId,
      scopeName: normalizedName,
      organizationId: organizationId || bridge?.organization_id || null,
      organizationName: organizationName?.trim() || bridge?.organization_name?.trim() || null,
      revenueClp: 0,
      laborCostClp: 0,
      directExpenseClp: 0,
      overheadClp: 0,
      headcountFte: 0
    }

    existing.organizationId = existing.organizationId || organizationId || bridge?.organization_id || null
    existing.organizationName = existing.organizationName || organizationName?.trim() || bridge?.organization_name?.trim() || null
    clientMap.set(clientId, existing)

    return existing
  }

  for (const row of revenueRows) {
    const client = ensureClient(row.client_id, row.client_name, row.organization_id, row.organization_name)
    const totalRevenueClp = toNumber(row.total_revenue_clp)
    const partnerShareClp = toNumber(row.partner_share_clp)

    client.revenueClp += roundCurrency(totalRevenueClp - partnerShareClp)
  }

  for (const row of directExpenseRows) {
    const client = ensureClient(row.client_id, row.client_name, row.organization_id, row.organization_name)

    client.directExpenseClp += toNumber(row.total_direct_expense_clp)
  }

  for (const row of allocationRows) {
    const client = ensureClient(row.client_id, row.client_name, row.organization_id, row.organization_name)

    client.directExpenseClp += toNumber(row.total_direct_expense_clp)
  }

  for (const row of commercialCostRows) {
    const client = ensureClient(row.clientId, row.clientName, row.organizationId, null)

    client.laborCostClp += row.laborCostClp
    client.overheadClp += row.overheadCostClp
    client.headcountFte += row.headcountFte
  }

  const clientSnapshots = Array.from(clientMap.values())
    .map(item =>
      buildSnapshot({
        scopeType: 'client',
        scopeId: item.scopeId,
        scopeName: item.scopeName,
        year,
        month,
        periodClosed,
        snapshotRevision,
        reason,
        revenueClp: item.revenueClp,
        laborCostClp: item.laborCostClp,
        directExpenseClp: item.directExpenseClp,
        overheadClp: item.overheadClp,
        headcountFte: item.headcountFte
      })
    )
    .sort((left, right) => right.revenueClp - left.revenueClp || left.scopeName.localeCompare(right.scopeName))

  const spaceSnapshots = aggregateSnapshots({
    scopeType: 'space',
    year,
    month,
    periodClosed,
    snapshotRevision,
    reason,
    baseSnapshots: clientSnapshots,
    keyFor: snapshot => {
      const bridge = scopeBridgeByClient.get(snapshot.scopeId)

      return bridge?.space_id
        ? { scopeId: bridge.space_id, scopeName: bridge.space_name?.trim() || bridge.space_id }
        : null
    }
  })

  const organizationSnapshots = aggregateSnapshots({
    scopeType: 'organization',
    year,
    month,
    periodClosed,
    snapshotRevision,
    reason,
    baseSnapshots: clientSnapshots,
    keyFor: snapshot => {
      const bridge = scopeBridgeByClient.get(snapshot.scopeId)
      const fallback = clientMap.get(snapshot.scopeId)

      return bridge?.organization_id || fallback?.organizationId
        ? {
            scopeId: bridge?.organization_id || fallback?.organizationId || snapshot.scopeId,
            scopeName:
              bridge?.organization_name?.trim() ||
              fallback?.organizationName?.trim() ||
              bridge?.organization_id ||
              fallback?.organizationId ||
              snapshot.scopeId
          }
        : null
    }
  })

  return {
    snapshots: [...clientSnapshots, ...spaceSnapshots, ...organizationSnapshots],
    periodClosed,
    snapshotRevision
  }
}

export const upsertOperationalPlSnapshots = async (snapshots: OperationalPlSnapshot[]) => {
  for (const snapshot of snapshots) {
    const rows = await runGreenhousePostgresQuery<SnapshotRow>(
      `
        INSERT INTO greenhouse_serving.operational_pl_snapshots (
          snapshot_id,
          scope_type,
          scope_id,
          scope_name,
          period_year,
          period_month,
          period_closed,
          snapshot_revision,
          currency,
          revenue_clp,
          labor_cost_clp,
          direct_expense_clp,
          overhead_clp,
          total_cost_clp,
          gross_margin_clp,
          gross_margin_pct,
          headcount_fte,
          revenue_per_fte_clp,
          cost_per_fte_clp,
          computation_reason,
          materialized_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 'CLP',
          $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP
        )
        ON CONFLICT (scope_type, scope_id, period_year, period_month, snapshot_revision)
        DO UPDATE SET
          snapshot_id = EXCLUDED.snapshot_id,
          scope_name = EXCLUDED.scope_name,
          period_closed = EXCLUDED.period_closed,
          revenue_clp = EXCLUDED.revenue_clp,
          labor_cost_clp = EXCLUDED.labor_cost_clp,
          direct_expense_clp = EXCLUDED.direct_expense_clp,
          overhead_clp = EXCLUDED.overhead_clp,
          total_cost_clp = EXCLUDED.total_cost_clp,
          gross_margin_clp = EXCLUDED.gross_margin_clp,
          gross_margin_pct = EXCLUDED.gross_margin_pct,
          headcount_fte = EXCLUDED.headcount_fte,
          revenue_per_fte_clp = EXCLUDED.revenue_per_fte_clp,
          cost_per_fte_clp = EXCLUDED.cost_per_fte_clp,
          computation_reason = EXCLUDED.computation_reason,
          materialized_at = CURRENT_TIMESTAMP
        RETURNING *
      `,
      [
        snapshot.snapshotId,
        snapshot.scopeType,
        snapshot.scopeId,
        snapshot.scopeName,
        snapshot.periodYear,
        snapshot.periodMonth,
        snapshot.periodClosed,
        snapshot.snapshotRevision,
        snapshot.revenueClp,
        snapshot.laborCostClp,
        snapshot.directExpenseClp,
        snapshot.overheadClp,
        snapshot.totalCostClp,
        snapshot.grossMarginClp,
        snapshot.grossMarginPct,
        snapshot.headcountFte,
        snapshot.revenuePerFteClp,
        snapshot.costPerFteClp,
        snapshot.computationReason
      ]
    )

    snapshot.materializedAt = mapSnapshotRow(rows[0]).materializedAt
  }

  return snapshots
}

const purgeOperationalPlRevision = async ({
  year,
  month,
  snapshotRevision
}: {
  year: number
  month: number
  snapshotRevision: number
}) => {
  await runGreenhousePostgresQuery(
    `
      DELETE FROM greenhouse_serving.operational_pl_snapshots
      WHERE period_year = $1
        AND period_month = $2
        AND snapshot_revision = $3
    `,
    [year, month, snapshotRevision]
  )
}

export const materializeOperationalPl = async (
  year: number,
  month: number,
  reason: string | null = null
) => {
  await materializeCommercialCostAttributionForPeriod(year, month, reason).catch(() => [])

  const result = await computeOperationalPl(year, month, reason)

  await purgeOperationalPlRevision({
    year,
    month,
    snapshotRevision: result.snapshotRevision
  })
  await upsertOperationalPlSnapshots(result.snapshots)

  return result
}

export const listOperationalPlSnapshots = async ({
  year,
  month,
  scopeType,
  scopeId,
  periodClosed,
  limit = 200
}: OperationalPlFilters) => {
  const clauses: string[] = []
  const values: unknown[] = []

  if (typeof year === 'number') {
    values.push(year)
    clauses.push(`period_year = $${values.length}`)
  }

  if (typeof month === 'number') {
    values.push(month)
    clauses.push(`period_month = $${values.length}`)
  }

  if (scopeType) {
    values.push(scopeType)
    clauses.push(`scope_type = $${values.length}`)
  }

  if (scopeId) {
    values.push(scopeId)
    clauses.push(`scope_id = $${values.length}`)
  }

  if (typeof periodClosed === 'boolean') {
    values.push(periodClosed)
    clauses.push(`period_closed = $${values.length}`)
  }

  values.push(Math.max(1, Math.min(limit, 500)))

  const rows = await runGreenhousePostgresQuery<SnapshotRow>(
    `
      SELECT
        snapshot_id,
        scope_type,
        scope_id,
        scope_name,
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
        gross_margin_pct,
        headcount_fte,
        revenue_per_fte_clp,
        cost_per_fte_clp,
        computation_reason,
        materialized_at
      FROM greenhouse_serving.operational_pl_snapshots
      ${clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''}
      ORDER BY period_year DESC, period_month DESC, revenue_clp DESC, scope_name ASC
      LIMIT $${values.length}
    `,
    values
  )

  return rows.map(mapSnapshotRow)
}

export const getOperationalPlTrend = async ({
  scopeType,
  scopeId,
  months = 6
}: {
  scopeType: OperationalPlScopeType
  scopeId: string
  months?: number
}) => {
  const snapshots = await listOperationalPlSnapshots({
    scopeType,
    scopeId,
    limit: Math.max(1, Math.min(months, 24))
  })

  const avgMarginPct = snapshots.length > 0
    ? roundCurrency(
        snapshots.reduce((sum, snapshot) => sum + (snapshot.grossMarginPct ?? 0), 0) / snapshots.length
      )
    : null

  return {
    snapshots,
    trend: {
      periods: snapshots.map(snapshot => `${snapshot.periodYear}-${String(snapshot.periodMonth).padStart(2, '0')}`),
      avgMarginPct
    }
  }
}
