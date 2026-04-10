import 'server-only'

import type { TenantContext } from '@/lib/tenant/get-tenant-context'
import type { HrSupervisorWorkspaceResponse, HrSupervisorWorkspaceTeamMember } from '@/types/hr-core'

import { listLeaveCalendar, listLeaveRequests, resolveCurrentHrMemberId } from '@/lib/hr-core/service'
import { getPeopleList } from '@/lib/people/get-people-list'
import { getSupervisorScopeForTenant } from '@/lib/reporting-hierarchy/access'
import { listDirectReports, listReportingSubtree } from '@/lib/reporting-hierarchy/readers'

const addDays = (date: Date, days: number) => {
  const value = new Date(date)

  value.setDate(value.getDate() + days)

  return value
}

const toDateString = (date: Date) => date.toISOString().slice(0, 10)

const buildTeamMetadata = async (scope: Awaited<ReturnType<typeof getSupervisorScopeForTenant>>) => {
  if (!scope.memberId) {
    return {
      directReportIds: new Set<string>(),
      teamMetadata: new Map<string, { supervisorMemberId: string | null; depth: number }>()
    }
  }

  const [directReports, ownSubtree, delegatedSubtrees] = await Promise.all([
    listDirectReports(scope.memberId).catch(() => []),
    listReportingSubtree(scope.memberId).catch(() => []),
    scope.delegatedSupervisorIds.length > 0
      ? Promise.all(scope.delegatedSupervisorIds.map(supervisorMemberId => listReportingSubtree(supervisorMemberId).catch(() => [])))
      : Promise.resolve([])
  ])

  const directReportIds = new Set(directReports.map(report => report.memberId))
  const teamMetadata = new Map<string, { supervisorMemberId: string | null; depth: number }>()

  for (const node of [...ownSubtree, ...delegatedSubtrees.flat()]) {
    const current = teamMetadata.get(node.memberId)

    if (!current || node.depth < current.depth) {
      teamMetadata.set(node.memberId, {
        supervisorMemberId: node.supervisorMemberId,
        depth: node.depth
      })
    }
  }

  return {
    directReportIds,
    teamMetadata
  }
}

export const getSupervisorWorkspace = async ({
  tenant,
  hasBroadAccess
}: {
  tenant: TenantContext
  hasBroadAccess: boolean
}): Promise<HrSupervisorWorkspaceResponse> => {
  const scope = await getSupervisorScopeForTenant(tenant)
  const currentMemberId = await resolveCurrentHrMemberId(tenant).catch(() => scope.memberId ?? null)
  const teamMemberIds = scope.visibleMemberIds.filter(memberId => memberId && memberId !== scope.memberId)
  const today = new Date()
  const from = toDateString(today)
  const to = toDateString(addDays(today, 30))

  const [{ directReportIds, teamMetadata }, approvalsPayload, calendar] = await Promise.all([
    buildTeamMetadata(scope),
    listLeaveRequests({
      tenant,
      year: null
    }),
    listLeaveCalendar({
      tenant,
      from,
      to
    })
  ])

  const teamPayload = teamMemberIds.length > 0
    ? await getPeopleList({
        memberIds: teamMemberIds
      })
    : { items: [] }

  const approvals = approvalsPayload.requests.filter(request => {
    if (request.status !== 'pending_supervisor' && request.status !== 'pending_hr') {
      return false
    }

    if (hasBroadAccess) {
      return true
    }

    return request.status === 'pending_supervisor'
  })

  const team: HrSupervisorWorkspaceTeamMember[] = teamPayload.items
    .map(item => {
      const metadata = teamMetadata.get(item.memberId)

      return {
        ...item,
        supervisorMemberId: metadata?.supervisorMemberId ?? null,
        depth: metadata?.depth ?? 0,
        directReport: directReportIds.has(item.memberId)
      }
    })
    .sort((left, right) => {
      if (left.directReport !== right.directReport) {
        return left.directReport ? -1 : 1
      }

      if (left.depth !== right.depth) {
        return left.depth - right.depth
      }

      if (left.active !== right.active) {
        return left.active ? -1 : 1
      }

      return left.displayName.localeCompare(right.displayName, 'es')
    })

  const upcomingAbsences = calendar.events.filter(event => event.extendedProps?.source === 'leave_request').length

  return {
    currentMemberId,
    hasBroadAccess,
    hasDirectReports: scope.hasDirectReports,
    hasDelegatedAuthority: scope.hasDelegatedAuthority,
    summary: {
      directReports: scope.directReportCount,
      totalVisibleReports: team.length,
      pendingApprovals: approvals.length,
      upcomingAbsences
    },
    team,
    approvals,
    calendar
  }
}
