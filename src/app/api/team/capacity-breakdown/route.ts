import { NextResponse } from 'next/server'

import { requireAgencyTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  computeCapacityBreakdown,
  aggregateCapacityBreakdown,
  clampFte,
  getExpectedMonthlyThroughput,
  getUtilizationPercent,
  getCapacityHealth,
  type CapacityBreakdown
} from '@/lib/team-capacity/shared'
import type { TeamRoleCategory } from '@/types/team'

export const dynamic = 'force-dynamic'
const QUERY_TIMEOUT_MS = 5000

interface AssignmentRow extends Record<string, unknown> {
  member_id: string
  display_name: string
  role_title: string | null
  fte_allocation: string | number
  contracted_hours_month: number | null
  client_id: string | null
  client_name: string | null
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

const isInternalClientAssignment = (row: AssignmentRow) => {
  const clientId = String(row.client_id || '').trim().toLowerCase()
  const clientName = String(row.client_name || '').trim().toLowerCase()

  return clientId === 'efeonce_internal' || clientId === 'client_internal' || clientName === 'efeonce internal'
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

const withTimeout = async <T>(promise: Promise<T>, label: string, timeoutMs = QUERY_TIMEOUT_MS): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
      })
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function GET() {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if person_operational_metrics exists for LEFT JOIN
    const pomExists = await withTimeout(
      runGreenhousePostgresQuery<Record<string, unknown> & { exists: boolean }>(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'greenhouse_serving' AND table_name = 'person_operational_metrics'
        ) AS exists`
      ),
      'team capacity serving probe'
    ).then(r => r[0]?.exists === true).catch(() => false)

    // Get assignments with contracted hours from Postgres
    const query = pomExists
      ? `SELECT
          a.member_id,
          m.display_name,
          COALESCE(a.role_title_override, m.role_title) AS role_title,
          a.client_id,
          c.client_name,
          a.fte_allocation,
          COALESCE(a.contracted_hours_month, ROUND(a.fte_allocation * 160))::int AS contracted_hours_month,
          COALESCE(pom.tasks_active, 0) AS active_assets
        FROM greenhouse_core.client_team_assignments a
        JOIN greenhouse_core.members m ON m.member_id = a.member_id
        LEFT JOIN greenhouse_core.clients c ON c.client_id = a.client_id
        LEFT JOIN greenhouse_serving.person_operational_metrics pom
          ON pom.member_id = a.member_id
          AND pom.period_year = EXTRACT(YEAR FROM CURRENT_DATE)
          AND pom.period_month = EXTRACT(MONTH FROM CURRENT_DATE)
        WHERE a.active = TRUE
          AND m.active = TRUE
          AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
        ORDER BY m.display_name, a.client_id`
      : `SELECT
          a.member_id,
          m.display_name,
          COALESCE(a.role_title_override, m.role_title) AS role_title,
          a.client_id,
          c.client_name,
          a.fte_allocation,
          COALESCE(a.contracted_hours_month, ROUND(a.fte_allocation * 160))::int AS contracted_hours_month,
          0 AS active_assets
        FROM greenhouse_core.client_team_assignments a
        JOIN greenhouse_core.members m ON m.member_id = a.member_id
        LEFT JOIN greenhouse_core.clients c ON c.client_id = a.client_id
        WHERE a.active = TRUE
          AND m.active = TRUE
          AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
        ORDER BY m.display_name, a.client_id`

    const baseFallbackQuery = `SELECT
      a.member_id,
      m.display_name,
      COALESCE(a.role_title_override, m.role_title) AS role_title,
      a.client_id,
      c.client_name,
      a.fte_allocation,
      COALESCE(a.contracted_hours_month, ROUND(a.fte_allocation * 160))::int AS contracted_hours_month,
      0 AS active_assets
    FROM greenhouse_core.client_team_assignments a
    JOIN greenhouse_core.members m ON m.member_id = a.member_id
    LEFT JOIN greenhouse_core.clients c ON c.client_id = a.client_id
    WHERE a.active = TRUE
      AND m.active = TRUE
      AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
    ORDER BY m.display_name, a.client_id`

    const rows = await withTimeout(runGreenhousePostgresQuery<AssignmentRow>(query), 'team capacity query')
      .catch(async error => {
        console.warn('[team-capacity] primary query degraded to fallback:', error instanceof Error ? error.message : error)
        return withTimeout(runGreenhousePostgresQuery<AssignmentRow>(baseFallbackQuery), 'team capacity fallback query')
      })
    const rowsByMember = new Map<string, AssignmentRow[]>()

    for (const row of rows) {
      const memberRows = rowsByMember.get(row.member_id) || []
      memberRows.push(row)
      rowsByMember.set(row.member_id, memberRows)
    }

    const memberBreakdowns: Array<{
      memberId: string
      displayName: string
      roleTitle: string | null
      fteAllocation: number
      utilizationPercent: number
      capacityHealth: string
      capacity: CapacityBreakdown
    }> = []

    for (const [memberId, memberRows] of rowsByMember.entries()) {
      const primaryRow = memberRows[0]
      const totalActiveFte = memberRows.reduce((sum, row) => sum + toNum(row.fte_allocation), 0)
      const clientFacingFte = memberRows.reduce((sum, row) => sum + (isInternalClientAssignment(row) ? 0 : toNum(row.fte_allocation)), 0)
      const contractedFte = clampFte(totalActiveFte)
      const assignedFte = Math.min(clientFacingFte, contractedFte)
      const contractedHoursMonth = Math.round(contractedFte * 160)
      const roleCategory = inferRoleCategory(primaryRow.role_title)
      const activeAssets = toNum(primaryRow.active_assets)
      const expectedThroughput = getExpectedMonthlyThroughput({ roleCategory, fteAllocation: assignedFte })
      const utilizationPercent = getUtilizationPercent({ activeAssets, expectedMonthlyThroughput: expectedThroughput })

      const capacity = computeCapacityBreakdown({
        fteAllocation: assignedFte,
        contractedHoursMonth,
        utilizationPercent,
        hasUsageData: pomExists
      })

      memberBreakdowns.push({
        memberId,
        displayName: primaryRow.display_name,
        roleTitle: primaryRow.role_title,
        fteAllocation: assignedFte,
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

    return NextResponse.json(
      {
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
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache'
        }
      }
    )
  } catch (error) {
    console.error('GET /api/team/capacity-breakdown failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
