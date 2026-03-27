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

// ── Types ──

interface MemberRow extends Record<string, unknown> {
  member_id: string
  display_name: string
  role_title: string | null
  role_category: TeamRoleCategory | null
}

interface AssignmentRow extends Record<string, unknown> {
  assignment_id: string
  member_id: string
  client_id: string | null
  client_name: string | null
  role_title_override: string | null
  fte_allocation: string | number
  contracted_hours_month: number | null
  start_date: string | null
}

const INTERNAL_CLIENT_IDS = new Set(['efeonce_internal', 'client_internal', 'space-efeonce'])
const INTERNAL_CLIENT_NAMES = new Set(['efeonce internal', 'efeonce'])

const isInternalAssignment = (row: AssignmentRow) => {
  const clientId = String(row.client_id || '').trim().toLowerCase()
  const clientName = String(row.client_name || '').trim().toLowerCase()

  return INTERNAL_CLIENT_IDS.has(clientId) || INTERNAL_CLIENT_NAMES.has(clientName)
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

// ── Route ──

export async function GET() {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Fetch ALL active members
    const allMembers = await withTimeout(
      runGreenhousePostgresQuery<MemberRow>(
        `SELECT member_id, display_name, role_title, role_category
         FROM greenhouse_core.members
         WHERE active = TRUE
         ORDER BY display_name`
      ),
      'team members query'
    )

    // 2. Fetch active assignments with client names
    const allAssignments = await withTimeout(
      runGreenhousePostgresQuery<AssignmentRow>(
        `SELECT
          a.assignment_id, a.member_id, a.client_id, c.client_name,
          a.role_title_override, a.fte_allocation,
          COALESCE(a.contracted_hours_month, ROUND(a.fte_allocation * 160))::int AS contracted_hours_month,
          a.start_date::text AS start_date
        FROM greenhouse_core.client_team_assignments a
        LEFT JOIN greenhouse_core.clients c ON c.client_id = a.client_id
        WHERE a.active = TRUE
          AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
        ORDER BY a.member_id, c.client_name`
      ),
      'team assignments query'
    )

    // 3. Group assignments by member
    const assignmentsByMember = new Map<string, AssignmentRow[]>()

    for (const row of allAssignments) {
      const list = assignmentsByMember.get(row.member_id) || []

      list.push(row)
      assignmentsByMember.set(row.member_id, list)
    }

    // 4. Fetch capacity snapshots for all members
    const memberIds = allMembers.map(m => m.member_id)
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
    const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)
    const currentYear = match ? Number(match[1]) : new Date().getFullYear()
    const currentMonth = match ? Number(match[2]) : new Date().getMonth() + 1

    const snapshots = await readMemberCapacityEconomicsBatch({
      memberIds,
      year: currentYear,
      month: currentMonth
    }).catch(() => new Map())

    // 5. Build breakdowns for ALL members
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

    for (const member of allMembers) {
      const memberAssignments = assignmentsByMember.get(member.member_id) || []
      const externalAssignments = memberAssignments.filter(row => !isInternalAssignment(row))
      const snapshot = snapshots.get(member.member_id)

      // Use snapshot data when available, fallback to defaults
      const contractedHours = snapshot?.contractedHours ?? 160
      const assignedHours = snapshot?.assignedHours ?? externalAssignments.reduce((sum, a) => sum + (Number(a.contracted_hours_month) || 0), 0)
      const usedHours = snapshot?.usedHours ?? null
      const commercialAvailability = contractedHours - assignedHours
      const usageKind = snapshot?.usageKind ?? 'none'
      const usagePercent = snapshot?.usagePercent ?? null
      const utilizationPercent = usagePercent ?? 0

      const roleTitle = externalAssignments[0]?.role_title_override || member.role_title

      const capacity: CapacityBreakdown = {
        contractedHoursMonth: contractedHours,
        assignedHoursMonth: assignedHours,
        usedHoursMonth: usedHours,
        availableHoursMonth: commercialAvailability,
        commercialAvailabilityHours: commercialAvailability,
        operationalAvailabilityHours: snapshot?.operationalAvailabilityHours ?? null,
        overcommitted: assignedHours > contractedHours
      }

      const capacityHealth = assignedHours === 0
        ? 'idle'
        : getCapacityHealth(utilizationPercent || (assignedHours >= contractedHours ? 85 : 0))

      memberBreakdowns.push({
        memberId: member.member_id,
        displayName: member.display_name,
        roleTitle,
        fteAllocation: snapshot?.contractedFte ?? 1,
        usageKind,
        usagePercent,
        utilizationPercent,
        capacityHealth,
        capacity,
        intelligence: snapshot ? {
          costPerHour: snapshot.costPerHourTarget,
          suggestedBillRate: snapshot.suggestedBillRateTarget,
          targetCurrency: snapshot.targetCurrency
        } : null,
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

    // 6. Aggregate team totals
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
