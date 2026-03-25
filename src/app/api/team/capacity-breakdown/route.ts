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
  assignment_id: string
  member_id: string
  client_id: string
  display_name: string
  role_title: string | null
  fte_allocation: string | number
  contracted_hours_month: number | null
  active_assets: string | number
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : 0 }

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

export async function GET() {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get assignments with contracted hours from Postgres
    const rows = await runGreenhousePostgresQuery<AssignmentRow>(
      `SELECT
        a.assignment_id,
        a.member_id,
        a.client_id,
        m.display_name,
        COALESCE(a.role_title_override, m.role_title) AS role_title,
        a.fte_allocation,
        a.contracted_hours_month,
        COALESCE(pom.tasks_active, 0) AS active_assets
      FROM greenhouse_core.client_team_assignments a
      JOIN greenhouse_core.members m ON m.member_id = a.member_id
      LEFT JOIN greenhouse_serving.person_operational_metrics pom
        ON pom.member_id = a.member_id
        AND pom.period_year = EXTRACT(YEAR FROM CURRENT_DATE)
        AND pom.period_month = EXTRACT(MONTH FROM CURRENT_DATE)
      WHERE a.active = TRUE
      ORDER BY m.display_name`
    )

    const memberBreakdowns: Array<{
      memberId: string
      displayName: string
      roleTitle: string | null
      clientId: string
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
        utilizationPercent
      })

      memberBreakdowns.push({
        memberId: row.member_id,
        displayName: row.display_name,
        roleTitle: row.role_title,
        clientId: row.client_id,
        fteAllocation,
        utilizationPercent,
        capacityHealth: getCapacityHealth(utilizationPercent),
        capacity
      })
    }

    const teamTotal = aggregateCapacityBreakdown(memberBreakdowns.map(m => m.capacity))
    const overcommittedCount = memberBreakdowns.filter(m => m.capacity.overcommitted).length

    return NextResponse.json({
      team: teamTotal,
      members: memberBreakdowns,
      memberCount: memberBreakdowns.length,
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
