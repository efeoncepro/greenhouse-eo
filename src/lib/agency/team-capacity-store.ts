import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import {
  readMemberCapacityEconomicsBatch,
  type MemberCapacityEconomicsSnapshot
} from '@/lib/member-capacity-economics/store'
import { isInternalCommercialAssignment } from '@/lib/team-capacity/internal-assignments'
import {
  CAPACITY_HOURS_PER_FTE,
  getCapacityHealth,
  roundToTenths,
  type CapacityBreakdown
} from '@/lib/team-capacity/shared'
import type { AgencyCapacityOverview } from '@/lib/agency/agency-queries'
import type { AgencyTeamPayload } from '@/types/agency-team'
import type { TeamRoleCategory } from '@/types/team'

const QUERY_TIMEOUT_MS = 5000
const SANTIAGO_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' })

interface MemberRow {
  member_id: string
  display_name: string
  role_title: string | null
  role_category: TeamRoleCategory | null
  assignable: boolean
}

interface AssignmentRow {
  assignment_id: string
  member_id: string
  client_id: string | null
  client_name: string | null
  space_id: string | null
  space_name: string | null
  organization_id: string | null
  role_title_override: string | null
  fte_allocation: string | number
  contracted_hours_month: number | string | null
  start_date: string | null
  assignment_type: string | null
  placement_id: string | null
  placement_status: string | null
}

type BuildAgencyTeamCapacityInput = {
  members: MemberRow[]
  assignments: AssignmentRow[]
  snapshots: Map<string, MemberCapacityEconomicsSnapshot>
}

const isInternalAssignment = (row: AssignmentRow) =>
  isInternalCommercialAssignment({
    clientId: row.client_id,
    clientName: row.client_name
  })

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
    if (timer) {
      clearTimeout(timer)
    }
  }
}

const getCurrentPeriod = () => {
  const today = SANTIAGO_DATE_FORMATTER.format(new Date())
  const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)

  return {
    year: match ? Number(match[1]) : new Date().getFullYear(),
    month: match ? Number(match[2]) : new Date().getMonth() + 1
  }
}

export const buildAgencyTeamCapacityPayload = ({
  members,
  assignments,
  snapshots
}: BuildAgencyTeamCapacityInput): AgencyTeamPayload => {
  const assignmentsByMember = new Map<string, AssignmentRow[]>()

  for (const assignment of assignments) {
    const bucket = assignmentsByMember.get(assignment.member_id) ?? []

    bucket.push(assignment)
    assignmentsByMember.set(assignment.member_id, bucket)
  }

  const memberBreakdowns = members.map(member => {
    const memberAssignments = assignmentsByMember.get(member.member_id) ?? []
    const externalAssignments = memberAssignments.filter(assignment => !isInternalAssignment(assignment))
    const snapshot = snapshots.get(member.member_id)

    const contractedHours = snapshot?.contractedHours ?? CAPACITY_HOURS_PER_FTE

    const assignedHours = snapshot?.assignedHours
      ?? externalAssignments.reduce((sum, assignment) => sum + (Number(assignment.contracted_hours_month) || 0), 0)

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

    const allocationPercent = contractedHours > 0
      ? Math.round((assignedHours / contractedHours) * 100)
      : 0

    const capacityHealth = assignedHours === 0
      ? 'idle'
      : getCapacityHealth(utilizationPercent || allocationPercent, assignedHours > contractedHours)

    return {
      memberId: member.member_id,
      displayName: member.display_name,
      roleTitle,
      roleCategory: member.role_category,
      assignable: member.assignable !== false,
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
      assignments: externalAssignments.map(assignment => ({
        assignmentId: assignment.assignment_id,
        clientId: assignment.client_id,
        clientName: assignment.client_name,
        spaceId: assignment.space_id,
        spaceName: assignment.space_name,
        organizationId: assignment.organization_id,
        fteAllocation: Number(assignment.fte_allocation) || 0,
        hoursPerMonth: Number(assignment.contracted_hours_month) || 0,
        startDate: assignment.start_date,
        assignmentType: String(assignment.assignment_type || 'internal'),
        placementId: assignment.placement_id,
        placementStatus: assignment.placement_status
      }))
    }
  })

  const assignableMembers = memberBreakdowns.filter(member => member.assignable)
  const excludedMembers = memberBreakdowns.filter(member => !member.assignable)
  const totalContracted = assignableMembers.reduce((sum, member) => sum + member.capacity.contractedHoursMonth, 0)
  const totalAssigned = assignableMembers.reduce((sum, member) => sum + member.capacity.assignedHoursMonth, 0)

  const totalUsed = assignableMembers.every(member => member.capacity.usedHoursMonth !== null)
    ? assignableMembers.reduce((sum, member) => sum + (member.capacity.usedHoursMonth ?? 0), 0)
    : null

  const weightedUsagePercent = assignableMembers.length > 0
    ? Math.round(
        assignableMembers.reduce(
          (sum, member) => sum + ((member.usagePercent ?? 0) * member.capacity.assignedHoursMonth),
          0
        ) / Math.max(1, assignableMembers.reduce((sum, member) => sum + member.capacity.assignedHoursMonth, 0))
      )
    : null

  const overcommittedMembers = assignableMembers
    .filter(member => member.capacity.overcommitted)
    .map(member => ({
      memberId: member.memberId,
      displayName: member.displayName,
      deficit: Math.abs(member.capacity.commercialAvailabilityHours ?? member.capacity.availableHoursMonth)
    }))

  return {
    team: {
      contractedHoursMonth: totalContracted,
      assignedHoursMonth: totalAssigned,
      usedHoursMonth: totalUsed,
      availableHoursMonth: assignableMembers.reduce((sum, member) => sum + member.capacity.availableHoursMonth, 0),
      commercialAvailabilityHours: assignableMembers.reduce(
        (sum, member) => sum + (member.capacity.commercialAvailabilityHours ?? 0),
        0
      ),
      operationalAvailabilityHours: totalUsed === null ? null : Math.max(0, totalContracted - totalUsed),
      usageKind: totalUsed !== null ? 'hours' : weightedUsagePercent !== null ? 'percent' : 'none',
      usagePercent: totalUsed === null ? weightedUsagePercent : null,
      overcommitted: assignableMembers.some(member => member.capacity.overcommitted)
    },
    members: assignableMembers,
    excludedMembers,
    memberCount: assignableMembers.length,
    excludedCount: excludedMembers.length,
    hasOperationalMetrics: assignableMembers.some(member => member.usageKind !== 'none'),
    overcommittedCount: overcommittedMembers.length,
    overcommittedMembers
  }
}

export const toAgencyCapacityOverview = (payload: AgencyTeamPayload): AgencyCapacityOverview => {
  const members = payload.members.map(member => {
    const allocationByClient = new Map<string, { clientId: string; clientName: string; fte: number }>()

    for (const assignment of member.assignments) {
      const key = `${assignment.clientId ?? 'unknown'}::${assignment.clientName ?? 'Sin cliente'}`
      const current = allocationByClient.get(key)

      if (current) {
        current.fte += assignment.fteAllocation
      } else {
        allocationByClient.set(key, {
          clientId: assignment.clientId ?? 'unknown',
          clientName: assignment.clientName ?? 'Sin cliente',
          fte: assignment.fteAllocation
        })
      }
    }

    return {
      memberId: member.memberId,
      displayName: member.displayName,
      avatarUrl: null,
      roleTitle: member.roleTitle ?? 'Sin rol definido',
      roleCategory: member.roleCategory ?? 'unknown',
      fteAllocation: roundToTenths(member.fteAllocation),
      spaceAllocations: Array.from(allocationByClient.values()).map(allocation => ({
        ...allocation,
        fte: roundToTenths(allocation.fte)
      }))
    }
  })

  const totalFte = roundToTenths(payload.team.contractedHoursMonth / CAPACITY_HOURS_PER_FTE)
  const allocatedFte = roundToTenths(payload.team.assignedHoursMonth / CAPACITY_HOURS_PER_FTE)

  const utilizationPct = payload.team.contractedHoursMonth > 0
    ? Math.round((payload.team.assignedHoursMonth / payload.team.contractedHoursMonth) * 100)
    : 0

  return {
    totalFte,
    allocatedFte,
    utilizationPct,
    monthlyHours: payload.team.contractedHoursMonth,
    members
  }
}

export const getAgencyTeamCapacity = async (): Promise<AgencyTeamPayload> => {
  const db = await getDb()

  const [membersResult, assignmentsResult] = await Promise.all([
    withTimeout(
      sql<MemberRow>`
        SELECT
          member_id,
          display_name,
          role_title,
          role_category,
          COALESCE(assignable, TRUE) AS assignable
        FROM greenhouse_core.members
        WHERE active = TRUE
        ORDER BY display_name
      `.execute(db),
      'team members query'
    ),
    withTimeout(
      sql<AssignmentRow>`
        SELECT
          assignment.assignment_id,
          assignment.member_id,
          assignment.client_id,
          client.client_name,
          space_ref.space_id,
          space_ref.space_name,
          space_ref.organization_id,
          assignment.role_title_override,
          assignment.fte_allocation,
          COALESCE(assignment.contracted_hours_month, ROUND(assignment.fte_allocation * ${CAPACITY_HOURS_PER_FTE}))::int AS contracted_hours_month,
          assignment.start_date::text AS start_date,
          assignment.assignment_type,
          placement.placement_id,
          placement.status AS placement_status
        FROM greenhouse_core.client_team_assignments AS assignment
        LEFT JOIN greenhouse_core.clients AS client
          ON client.client_id = assignment.client_id
        LEFT JOIN LATERAL (
          SELECT
            space_id,
            space_name,
            organization_id
          FROM greenhouse_core.spaces
          WHERE client_id = assignment.client_id
            AND COALESCE(active, TRUE) = TRUE
          ORDER BY
            CASE WHEN status = 'active' THEN 0 ELSE 1 END,
            created_at DESC,
            space_name ASC
          LIMIT 1
        ) AS space_ref ON TRUE
        LEFT JOIN greenhouse_delivery.staff_aug_placements AS placement
          ON placement.assignment_id = assignment.assignment_id
        WHERE assignment.active = TRUE
          AND (assignment.end_date IS NULL OR assignment.end_date >= CURRENT_DATE)
        ORDER BY assignment.member_id, client.client_name
      `.execute(db),
      'team assignments query'
    )
  ])

  const memberIds = membersResult.rows.map(member => member.member_id)
  const period = getCurrentPeriod()

  const snapshots = memberIds.length > 0
    ? await readMemberCapacityEconomicsBatch({
        memberIds,
        year: period.year,
        month: period.month
      }).catch(() => new Map<string, MemberCapacityEconomicsSnapshot>())
    : new Map<string, MemberCapacityEconomicsSnapshot>()

  return buildAgencyTeamCapacityPayload({
    members: membersResult.rows,
    assignments: assignmentsResult.rows,
    snapshots
  })
}
