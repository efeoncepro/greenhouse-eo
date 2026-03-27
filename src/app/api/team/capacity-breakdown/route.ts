import { NextResponse } from 'next/server'

import { requireAgencyTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { readMemberCapacityEconomicsBatch } from '@/lib/member-capacity-economics/store'
import {
  getCapacityHealth,
  type CapacityBreakdown
} from '@/lib/team-capacity/shared'
import type { TeamRoleCategory } from '@/types/team'

export const dynamic = 'force-dynamic'
const QUERY_TIMEOUT_MS = 5000

interface AssignmentRow extends Record<string, unknown> {
  assignment_id: string
  member_id: string
  display_name: string
  role_title: string | null
  role_category: TeamRoleCategory | null
  fte_allocation: string | number
  contracted_hours_month: number | null
  client_id: string | null
  client_name: string | null
  start_date: string | null
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
      a.assignment_id,
      a.member_id,
      m.display_name,
      COALESCE(a.role_title_override, m.role_title) AS role_title,
      m.role_category,
      a.client_id,
      c.client_name,
      a.fte_allocation,
      COALESCE(a.contracted_hours_month, ROUND(a.fte_allocation * 160))::int AS contracted_hours_month,
      a.start_date::text AS start_date
    FROM greenhouse_core.client_team_assignments a
    JOIN greenhouse_core.members m ON m.member_id = a.member_id
    LEFT JOIN greenhouse_core.clients c ON c.client_id = a.client_id
    WHERE a.active = TRUE
      AND m.active = TRUE
      AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
    ORDER BY m.display_name, a.client_id`

    const baseFallbackQuery = `SELECT
      a.assignment_id,
      a.member_id,
      m.display_name,
      COALESCE(a.role_title_override, m.role_title) AS role_title,
      m.role_category,
      a.client_id,
      c.client_name,
      a.fte_allocation,
      COALESCE(a.contracted_hours_month, ROUND(a.fte_allocation * 160))::int AS contracted_hours_month,
      a.start_date::text AS start_date
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
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
    const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)
    const currentYear = match ? Number(match[1]) : new Date().getFullYear()
    const currentMonth = match ? Number(match[2]) : new Date().getMonth() + 1
    const snapshots = await readMemberCapacityEconomicsBatch({
      memberIds,
      year: currentYear,
      month: currentMonth
    }).catch(() => new Map())
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
      usageKind: 'none' | 'hours' | 'percent' | string
      usagePercent: number | null
      utilizationPercent: number
      capacityHealth: string
      capacity: CapacityBreakdown
      intelligence: {
        costPerHour: number | null
        suggestedBillRate: number | null
        targetCurrency: string | null
      } | null
      assignments: Array<{
        assignmentId: string
        clientId: string | null
        clientName: string | null
        fteAllocation: number
        hoursPerMonth: number
        startDate: string | null
      }>
    }> = []

    for (const [memberId, memberRows] of rowsByMember.entries()) {
      const primaryRow = memberRows[0]
      const externalAssignments = memberRows.filter(row => !isInternalClientAssignment(row))

      if (externalAssignments.length === 0) {
        continue
      }

      const snapshot = snapshots.get(memberId)

      if (!snapshot || snapshot.usageKind === 'none') {
        continue
      }

      const utilizationPercent = snapshot.usagePercent ?? 0
      const assignedFte = snapshot.contractedFte
      const capacity: CapacityBreakdown = {
        contractedHoursMonth: snapshot.contractedHours,
        assignedHoursMonth: snapshot.assignedHours,
        usedHoursMonth: snapshot.usedHours,
        availableHoursMonth: snapshot.commercialAvailabilityHours,
        commercialAvailabilityHours: snapshot.commercialAvailabilityHours,
        operationalAvailabilityHours: snapshot.operationalAvailabilityHours,
        overcommitted: snapshot.assignedHours > snapshot.contractedHours
      }

      memberBreakdowns.push({
        memberId,
        displayName: primaryRow.display_name,
        roleTitle: primaryRow.role_title,
        fteAllocation: assignedFte,
        usageKind: snapshot.usageKind,
        usagePercent: snapshot.usagePercent,
        utilizationPercent,
        capacityHealth: getCapacityHealth(utilizationPercent || (snapshot.assignedHours >= snapshot.contractedHours ? 85 : 0)),
        capacity,
        intelligence: {
          costPerHour: snapshot.costPerHourTarget,
          suggestedBillRate: snapshot.suggestedBillRateTarget,
          targetCurrency: snapshot.targetCurrency
        },
        assignments: externalAssignments.map(row => ({
          assignmentId: row.assignment_id,
          clientId: row.client_id,
          clientName: row.client_name,
          fteAllocation: Number(row.fte_allocation) || 0,
          hoursPerMonth: Number(row.contracted_hours_month) || 0,
          startDate: row.start_date
        }))
      })
    }
    const totalContracted = memberBreakdowns.reduce((sum, m) => sum + m.capacity.contractedHoursMonth, 0)
    const totalAssigned = memberBreakdowns.reduce((sum, m) => sum + m.capacity.assignedHoursMonth, 0)
    const totalUsed = memberBreakdowns.every(m => m.capacity.usedHoursMonth !== null)
      ? memberBreakdowns.reduce((sum, m) => sum + (m.capacity.usedHoursMonth ?? 0), 0)
      : null
    const weightedUsagePercent = memberBreakdowns.length > 0
      ? Math.round(
          memberBreakdowns.reduce((sum, m) => sum + ((m.usagePercent ?? 0) * m.capacity.assignedHoursMonth), 0) /
          Math.max(1, memberBreakdowns.reduce((sum, m) => sum + m.capacity.assignedHoursMonth, 0))
        )
      : null
    const teamTotal = {
      contractedHoursMonth: totalContracted,
      assignedHoursMonth: totalAssigned,
      usedHoursMonth: totalUsed,
      availableHoursMonth: memberBreakdowns.reduce((sum, m) => sum + m.capacity.availableHoursMonth, 0),
      commercialAvailabilityHours: memberBreakdowns.reduce((sum, m) => sum + (m.capacity.commercialAvailabilityHours ?? 0), 0),
      operationalAvailabilityHours: totalUsed === null ? null : Math.max(0, totalContracted - totalUsed),
      usageKind: totalUsed !== null ? 'hours' : weightedUsagePercent !== null ? 'percent' : 'none',
      usagePercent: totalUsed === null ? weightedUsagePercent : null,
      overcommitted: memberBreakdowns.some(m => m.capacity.overcommitted)
    }
    const overcommittedCount = memberBreakdowns.filter(m => m.capacity.overcommitted).length

    return NextResponse.json(
      {
        team: teamTotal,
        members: memberBreakdowns,
        memberCount: memberBreakdowns.length,
        hasOperationalMetrics: memberBreakdowns.some(m => m.usageKind !== 'none'),
        overcommittedCount,
        overcommittedMembers: memberBreakdowns.filter(m => m.capacity.overcommitted).map(m => ({
          memberId: m.memberId,
          displayName: m.displayName,
          deficit: Math.abs(m.capacity.commercialAvailabilityHours ?? m.capacity.availableHoursMonth)
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
