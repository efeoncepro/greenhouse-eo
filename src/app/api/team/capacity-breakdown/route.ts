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
  role_category: TeamRoleCategory | null
  fte_allocation: string | number
  contracted_hours_month: number | null
  client_id: string | null
  client_name: string | null
}

interface LatestMetricsRow extends Record<string, unknown> {
  member_id: string
  period_year: string | number
  period_month: string | number
  active_tasks: string | number | null
  completed_tasks: string | number | null
  throughput_count: string | number | null
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

  return (
    clientId === 'efeonce_internal' ||
    clientId === 'client_internal' ||
    clientId === 'space-efeonce' ||
    clientName === 'efeonce internal' ||
    clientName === 'efeonce'
  )
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
    const query = `SELECT
      a.member_id,
      m.display_name,
      COALESCE(a.role_title_override, m.role_title) AS role_title,
      m.role_category,
      a.client_id,
      c.client_name,
      a.fte_allocation,
      COALESCE(a.contracted_hours_month, ROUND(a.fte_allocation * 160))::int AS contracted_hours_month
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
      m.role_category,
      a.client_id,
      c.client_name,
      a.fte_allocation,
      COALESCE(a.contracted_hours_month, ROUND(a.fte_allocation * 160))::int AS contracted_hours_month
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

    const memberIds = Array.from(new Set(rows.map(row => row.member_id)))
    const latestMetricsRows = memberIds.length > 0
      ? await withTimeout(
          runGreenhousePostgresQuery<LatestMetricsRow>(
            `WITH ranked AS (
              SELECT
                member_id,
                period_year,
                period_month,
                active_tasks,
                completed_tasks,
                throughput_count,
                ROW_NUMBER() OVER (PARTITION BY member_id ORDER BY period_year DESC, period_month DESC) AS rn
              FROM greenhouse_serving.ico_member_metrics
              WHERE member_id = ANY($1::text[])
            )
            SELECT member_id, period_year, period_month, active_tasks, completed_tasks, throughput_count
            FROM ranked
            WHERE rn = 1`,
            [memberIds]
          ),
          'team capacity metrics query'
        ).catch(() => [] as LatestMetricsRow[])
      : []
    const latestMetricsByMember = new Map(latestMetricsRows.map(row => [row.member_id, row]))
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
      const externalAssignments = memberRows.filter(row => !isInternalClientAssignment(row))

      if (externalAssignments.length === 0) {
        continue
      }

      const latestMetrics = latestMetricsByMember.get(memberId)

      if (!latestMetrics) {
        continue
      }

      const totalActiveFte = memberRows.reduce((sum, row) => sum + toNum(row.fte_allocation), 0)
      const clientFacingFte = externalAssignments.reduce((sum, row) => sum + toNum(row.fte_allocation), 0)
      const contractedFte = clampFte(totalActiveFte)
      const assignedFte = Math.min(clientFacingFte, contractedFte)
      const contractedHoursMonth = Math.round(contractedFte * 160)
      const roleCategory = primaryRow.role_category || inferRoleCategory(primaryRow.role_title)
      const activityCount = Math.max(
        toNum(latestMetrics.throughput_count),
        toNum(latestMetrics.completed_tasks),
        toNum(latestMetrics.active_tasks)
      )
      const expectedThroughput = getExpectedMonthlyThroughput({ roleCategory, fteAllocation: assignedFte })
      const utilizationPercent = getUtilizationPercent({ activeAssets: activityCount, expectedMonthlyThroughput: expectedThroughput })

      const capacity = computeCapacityBreakdown({
        fteAllocation: assignedFte,
        contractedHoursMonth,
        utilizationPercent,
        hasUsageData: true
      })

      memberBreakdowns.push({
        memberId,
        displayName: primaryRow.display_name,
        roleTitle: primaryRow.role_title,
        fteAllocation: assignedFte,
        utilizationPercent,
        capacityHealth: getCapacityHealth(utilizationPercent),
        capacity
      })
    }

    // Enrich with person_operational_360 intelligence (quality, dedication, cost)
    const enrichedMemberIds = memberBreakdowns.map(m => m.memberId)

    interface IntelligenceRow extends Record<string, unknown> {
      member_id: string
      quality_index: string | number | null
      dedication_index: string | number | null
      cost_per_asset: string | number | null
      cost_per_hour: string | number | null
      rpa_avg: string | number | null
      otd_pct: string | number | null
      ftr_pct: string | number | null
    }

    const intelligenceRows = enrichedMemberIds.length > 0
      ? await withTimeout(
          runGreenhousePostgresQuery<IntelligenceRow>(
            `SELECT member_id, quality_index, dedication_index, cost_per_asset, cost_per_hour,
                    rpa_avg, otd_pct, ftr_pct
             FROM greenhouse_serving.person_operational_360
             WHERE member_id = ANY($1::text[])
               AND period_year = EXTRACT(YEAR FROM CURRENT_DATE)
               AND period_month = EXTRACT(MONTH FROM CURRENT_DATE)`,
            [enrichedMemberIds]
          ),
          'person intelligence query'
        ).catch(() => [] as IntelligenceRow[])
      : []

    const intelligenceByMember = new Map(intelligenceRows.map(r => [r.member_id, r]))

    const enrichedMembers = memberBreakdowns.map(m => {
      const intel = intelligenceByMember.get(m.memberId)

      return {
        ...m,
        intelligence: intel ? {
          qualityIndex: toNum(intel.quality_index) || null,
          dedicationIndex: toNum(intel.dedication_index) || null,
          costPerAsset: toNum(intel.cost_per_asset) || null,
          costPerHour: toNum(intel.cost_per_hour) || null,
          rpaAvg: toNum(intel.rpa_avg) || null,
          otdPct: toNum(intel.otd_pct) || null,
          ftrPct: toNum(intel.ftr_pct) || null
        } : null
      }
    })

    const teamTotal = aggregateCapacityBreakdown(memberBreakdowns.map(m => m.capacity))
    const overcommittedCount = memberBreakdowns.filter(m => m.capacity.overcommitted).length

    return NextResponse.json(
      {
        team: teamTotal,
        members: enrichedMembers,
        memberCount: enrichedMembers.length,
        hasOperationalMetrics: enrichedMembers.length > 0,
        overcommittedCount,
        overcommittedMembers: enrichedMembers.filter(m => m.capacity.overcommitted).map(m => ({
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
