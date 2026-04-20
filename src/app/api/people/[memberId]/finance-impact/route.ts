import { NextResponse } from 'next/server'

import { roundCurrency, toNumber } from '@/lib/finance/shared'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getPreferredMemberActualCostBasis } from '@/lib/commercial-cost-basis/people-role-cost-basis'
import { assertMemberVisibleInPeopleScope, assertPeopleCapability, getPersonAccessForTenant } from '@/lib/people/access-scope'
import { resolvePeopleOrganizationScope } from '@/lib/people/organization-scope'
import { toPeopleErrorResponse } from '@/lib/people/shared'
import { requirePeopleTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface PeriodClosureRow extends Record<string, unknown> {
  closure_status: string | null
  period_closed: boolean | null
}

interface AssignmentRevenueRow extends Record<string, unknown> {
  client_id: string
  client_name: string | null
  fte_weight: string | number
  revenue_clp: string | number
}

/**
 * GET /api/people/[memberId]/finance-impact
 *
 * Returns the financial impact of a team member:
 * - Monthly commercial cost basis
 * - Revenue attributed via FTE-weighted client assignments
 * - Cost/revenue ratio
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { tenant, accessContext, errorResponse } = await requirePeopleTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await params
    const organizationId = resolvePeopleOrganizationScope(request, tenant)
    const access = getPersonAccessForTenant(tenant, accessContext)

    assertPeopleCapability({ allowed: access.canViewFinance })
    await assertMemberVisibleInPeopleScope({
      memberId,
      organizationId,
      accessContext
    })

    let costData: {
      baseSalaryClp: number | null
      totalBonusClp: number | null
      totalAllowanceClp: number | null
      loadedCostTarget: number
      laborCostTarget: number
      directOverheadClp: number
      sharedOverheadClp: number
      totalFte: number
      contractedHours: number
      commercialAvailabilityHours: number
      costPerHourTarget: number | null
      sourceKind: string
      sourceRef: string | null
      snapshotDate: string
      confidenceScore: number
      confidenceLabel: string
      snapshotStatus: string
      currency: string
      roleCode: string | null
      roleLabel: string | null
      employmentTypeCode: string | null
      periodYear: number
      periodMonth: number
      closureStatus: string | null
      periodClosed: boolean
    } | null = null

    try {
      const actualCost = await getPreferredMemberActualCostBasis(memberId)

      if (actualCost) {
        const periodClosureRows = await runGreenhousePostgresQuery<PeriodClosureRow>(
          `SELECT
             closure_status,
             COALESCE(closure_status = 'closed', FALSE) AS period_closed
           FROM greenhouse_serving.period_closure_status
           WHERE period_year = $1
             AND period_month = $2
           LIMIT 1`,
          [actualCost.periodYear, actualCost.periodMonth]
        )

        const closure = periodClosureRows[0]

        costData = {
          baseSalaryClp: null,
          totalBonusClp: null,
          totalAllowanceClp: null,
          loadedCostTarget: roundCurrency(toNumber(actualCost.loadedCostAmount)),
          laborCostTarget: roundCurrency(toNumber(actualCost.totalLaborCostAmount)),
          directOverheadClp: roundCurrency(toNumber(actualCost.directOverheadAmount)),
          sharedOverheadClp: roundCurrency(toNumber(actualCost.sharedOverheadAmount)),
          totalFte: toNumber(actualCost.contractedFte),
          contractedHours: roundCurrency(toNumber(actualCost.contractedHours)),
          commercialAvailabilityHours: roundCurrency(toNumber(actualCost.commercialAvailabilityHours)),
          costPerHourTarget:
            actualCost.costPerHourAmount != null ? roundCurrency(toNumber(actualCost.costPerHourAmount)) : null,
          sourceKind: actualCost.sourceKind,
          sourceRef: actualCost.sourceRef,
          snapshotDate: actualCost.snapshotDate,
          confidenceScore: actualCost.confidenceScore,
          confidenceLabel: actualCost.confidenceLabel,
          snapshotStatus: actualCost.snapshotStatus,
          currency: actualCost.currency,
          roleCode: actualCost.roleCode,
          roleLabel: actualCost.roleLabel,
          employmentTypeCode: actualCost.employmentTypeCode,
          periodYear: actualCost.periodYear,
          periodMonth: actualCost.periodMonth,
          closureStatus: closure?.closure_status ? String(closure.closure_status) : null,
          periodClosed: closure?.period_closed === true
        }
      }
    } catch {
      // Cost basis may not exist yet for this member.
    }

    let assignmentRevenue: Array<{
      clientId: string
      clientName: string | null
      fteWeight: number
      revenueClp: number
    }> = []

    try {
      const now = new Date()
      const year = costData?.periodYear ?? now.getFullYear()
      const month = costData?.periodMonth ?? (now.getMonth() + 1)

      const rows = await runGreenhousePostgresQuery<AssignmentRevenueRow>(
        `WITH latest_client_snapshots AS (
           SELECT
             ops.scope_id AS client_id,
             ops.revenue_clp,
             ROW_NUMBER() OVER (
               PARTITION BY ops.scope_id, ops.period_year, ops.period_month
               ORDER BY ops.snapshot_revision DESC, ops.materialized_at DESC NULLS LAST
             ) AS revision_rank
           FROM greenhouse_serving.operational_pl_snapshots ops
           WHERE ops.scope_type = 'client'
             AND ops.period_year = $2
             AND ops.period_month = $3
         )
         SELECT
           a.client_id,
           c.client_name,
           a.fte_allocation AS fte_weight,
           COALESCE(s.revenue_clp, 0) * COALESCE(a.fte_allocation, 0) AS revenue_clp
         FROM greenhouse_core.client_team_assignments a
         ${organizationId
           ? `JOIN greenhouse_core.spaces sp
               ON sp.client_id = a.client_id
              AND sp.active = TRUE
              AND sp.organization_id = $4`
           : ''}
         LEFT JOIN greenhouse_core.clients c ON c.client_id = a.client_id
         LEFT JOIN latest_client_snapshots s
           ON s.client_id = a.client_id
          AND s.revision_rank = 1
         WHERE a.member_id = $1
           AND a.active = TRUE
         ORDER BY revenue_clp DESC`,
        organizationId ? [memberId, year, month, organizationId] : [memberId, year, month]
      )

      assignmentRevenue = rows.map(row => ({
        clientId: String(row.client_id),
        clientName: row.client_name ? String(row.client_name) : null,
        fteWeight: toNumber(row.fte_weight),
        revenueClp: roundCurrency(toNumber(row.revenue_clp))
      }))
    } catch {
      // Assignments or P&L snapshots may not be available.
    }

    const totalRevenueAttributed = roundCurrency(assignmentRevenue.reduce((sum, item) => sum + item.revenueClp, 0))
    const totalCost = costData?.loadedCostTarget ?? 0

    const costRevenueRatio = totalRevenueAttributed > 0
      ? Math.round((totalCost / totalRevenueAttributed) * 1000) / 10
      : null

    return NextResponse.json({
      memberId,
      cost: costData,
      assignments: {
        count: assignmentRevenue.length,
        items: assignmentRevenue,
        totalRevenueAttributed
      },
      costRevenueRatio,
      costRevenueStatus: costRevenueRatio === null
        ? 'no_data'
        : costRevenueRatio <= 40 ? 'optimal'
          : costRevenueRatio <= 70 ? 'attention'
            : 'critical'
    })
  } catch (error) {
    return toPeopleErrorResponse(error, 'Unable to load person finance impact.')
  }
}
