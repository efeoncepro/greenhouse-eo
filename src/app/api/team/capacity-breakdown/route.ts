import { NextResponse } from 'next/server'

import { requireAgencyTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  computeCapacityBreakdown,
  aggregateCapacityBreakdown,
  getExpectedMonthlyThroughput,
  getUtilizationPercent,
  getCapacityHealth,
  type CapacityBreakdown
} from '@/lib/team-capacity/shared'
import type { TeamRoleCategory } from '@/types/team'

export const dynamic = 'force-dynamic'

interface AssignmentRow extends Record<string, unknown> {
  member_id: string
  display_name: string
  role_title: string | null
  fte_allocation: string | number
  contracted_hours_month: number | null
  active_assets: string | number
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }

  return 0
}

const inferRoleCategory = (roleTitle: string | null): TeamRoleCategory => {
  if (!roleTitle) return 'unknown'

  const lower = roleTitle.toLowerCase()

  if (lower.includes('account') || lower.includes('ejecutiv')) return 'account'
  if (lower.includes('operation') || lower.includes('project') || lower.includes('tráfico')) return 'operations'
  if (lower.includes('strate') || lower.includes('plan')) return 'strategy'
  if (lower.includes('diseñ') || lower.includes('design') || lower.includes('art')) return 'design'
  if (lower.includes('develop') || lower.includes('dev') || lower.includes('front') || lower.includes('back')) return 'development'
  if (lower.includes('media') || lower.includes('pauta') || lower.includes('social')) return 'media'

  return 'unknown'
}

const getCommitmentHealth = ({
  assignedHoursMonth,
  contractedHoursMonth
}: {
  assignedHoursMonth: number
  contractedHoursMonth: number
}) => {
  if (contractedHoursMonth <= 0) {
    return 'idle'
  }

  if (assignedHoursMonth > contractedHoursMonth) {
    return 'overloaded'
  }

  const commitmentPercent = Math.round((assignedHoursMonth / contractedHoursMonth) * 100)

  if (commitmentPercent >= 85) {
    return 'high'
  }

  if (commitmentPercent >= 35) {
    return 'balanced'
  }

  return 'idle'
}

export async function GET() {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if person_operational_metrics exists for LEFT JOIN
    const pomExists = await runGreenhousePostgresQuery<Record<string, unknown> & { exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'greenhouse_serving' AND table_name = 'person_operational_metrics'
      ) AS exists`
    ).then(r => r[0]?.exists === true).catch(() => false)

    // Get assignments with contracted hours from Postgres
    const query = pomExists
      ? `SELECT
          a.member_id, m.display_name,
          COALESCE(MAX(a.role_title_override), m.role_title) AS role_title,
          SUM(a.fte_allocation) AS fte_allocation,
          SUM(COALESCE(a.contracted_hours_month, ROUND(a.fte_allocation * 160)))::int AS contracted_hours_month,
          COALESCE(pom.tasks_active, 0) AS active_assets
        FROM greenhouse_core.client_team_assignments a
        JOIN greenhouse_core.members m ON m.member_id = a.member_id
        LEFT JOIN greenhouse_serving.person_operational_metrics pom
          ON pom.member_id = a.member_id
          AND pom.period_year = EXTRACT(YEAR FROM CURRENT_DATE)
          AND pom.period_month = EXTRACT(MONTH FROM CURRENT_DATE)
        WHERE a.active = TRUE
        GROUP BY a.member_id, m.display_name, m.role_title, pom.tasks_active
        ORDER BY m.display_name`
      : `SELECT
          a.member_id, m.display_name,
          COALESCE(MAX(a.role_title_override), m.role_title) AS role_title,
          SUM(a.fte_allocation) AS fte_allocation,
          SUM(COALESCE(a.contracted_hours_month, ROUND(a.fte_allocation * 160)))::int AS contracted_hours_month,
          0 AS active_assets
        FROM greenhouse_core.client_team_assignments a
        JOIN greenhouse_core.members m ON m.member_id = a.member_id
        WHERE a.active = TRUE
        GROUP BY a.member_id, m.display_name, m.role_title
        ORDER BY m.display_name`

    const rows = await runGreenhousePostgresQuery<AssignmentRow>(query)

    const memberBreakdowns: Array<{
      memberId: string
      displayName: string
      roleTitle: string | null
      fteAllocation: number
      utilizationPercent: number
      capacityHealth: string
      capacity: CapacityBreakdown
    }> = []

    for (const row of rows) {
      const fteAllocation = toNum(row.fte_allocation)
      const roleCategory = inferRoleCategory(row.role_title)
      const activeAssets = toNum(row.active_assets)
      const expectedThroughput = getExpectedMonthlyThroughput({ roleCategory, fteAllocation })
      const utilizationPercent = getUtilizationPercent({ activeAssets, expectedMonthlyThroughput: expectedThroughput })

      const capacity = computeCapacityBreakdown({
        fteAllocation,
        contractedHoursMonth: row.contracted_hours_month,
        utilizationPercent,
        hasUsageData: pomExists
      })

      memberBreakdowns.push({
        memberId: row.member_id,
        displayName: row.display_name,
        roleTitle: row.role_title,
        fteAllocation,
        utilizationPercent,
        capacityHealth: pomExists
          ? getCapacityHealth(utilizationPercent)
          : getCommitmentHealth({
              assignedHoursMonth: capacity.assignedHoursMonth,
              contractedHoursMonth: capacity.contractedHoursMonth
            }),
        capacity
      })
    }

    const teamTotal = aggregateCapacityBreakdown(memberBreakdowns.map(m => m.capacity))
    const overcommittedCount = memberBreakdowns.filter(m => m.capacity.overcommitted).length

    return NextResponse.json({
      team: teamTotal,
      members: memberBreakdowns,
      memberCount: memberBreakdowns.length,
      hasOperationalMetrics: pomExists,
      overcommittedCount,
      overcommittedMembers: memberBreakdowns.filter(m => m.capacity.overcommitted).map(m => ({
        memberId: m.memberId,
        displayName: m.displayName,
        deficit: Math.abs(m.capacity.availableHoursMonth)
      }))
    })
  } catch (error) {
    console.error('GET /api/team/capacity-breakdown failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
