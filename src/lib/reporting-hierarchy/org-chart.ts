import 'server-only'

import type { HrOrgChartBreadcrumb, HrOrgChartNode, HrOrgChartResponse } from '@/types/hr-core'

import type { DerivedTenantAccessContext } from '@/lib/tenant/authorization'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import { HrCoreValidationError } from '@/lib/hr-core/shared'
import { resolveCurrentHrMemberId } from '@/lib/hr-core/service'
import { getPeopleList } from '@/lib/people/get-people-list'
import { listHierarchy } from '@/lib/reporting-hierarchy/admin'

const resolveVisibleMemberIds = (accessContext: DerivedTenantAccessContext) =>
  accessContext.accessMode === 'supervisor'
    ? new Set(accessContext.supervisorScope?.visibleMemberIds ?? [])
    : null

const resolveRequestedFocus = ({
  requestedFocusMemberId,
  currentMemberId,
  accessContext,
  nodes
}: {
  requestedFocusMemberId: string | null
  currentMemberId: string | null
  accessContext: DerivedTenantAccessContext
  nodes: HrOrgChartNode[]
}) => {
  const visibleIds = new Set(nodes.map(node => node.memberId))

  if (requestedFocusMemberId) {
    if (!visibleIds.has(requestedFocusMemberId)) {
      throw new HrCoreValidationError('Member not found.', 404)
    }

    return requestedFocusMemberId
  }

  const supervisorMemberId = accessContext.accessMode === 'supervisor'
    ? accessContext.supervisorScope?.memberId ?? null
    : null

  if (supervisorMemberId && visibleIds.has(supervisorMemberId)) {
    return supervisorMemberId
  }

  if (currentMemberId && visibleIds.has(currentMemberId)) {
    return currentMemberId
  }

  return nodes.find(node => node.isRoot)?.memberId ?? nodes[0]?.memberId ?? null
}

const buildBreadcrumbs = ({
  focusMemberId,
  nodes
}: {
  focusMemberId: string | null
  nodes: HrOrgChartNode[]
}): HrOrgChartBreadcrumb[] => {
  if (!focusMemberId) {
    return []
  }

  const byId = new Map(nodes.map(node => [node.memberId, node]))
  const breadcrumbs: HrOrgChartBreadcrumb[] = []
  const visited = new Set<string>()
  let cursorId: string | null = focusMemberId

  while (cursorId) {
    if (visited.has(cursorId)) {
      break
    }

    visited.add(cursorId)

    const node = byId.get(cursorId)

    if (!node) {
      break
    }

    breadcrumbs.push({
      memberId: node.memberId,
      displayName: node.displayName
    })

    cursorId = node.supervisorMemberId && byId.has(node.supervisorMemberId)
      ? node.supervisorMemberId
      : null
  }

  return breadcrumbs.reverse()
}

export const getHrOrgChart = async ({
  tenant,
  accessContext,
  focusMemberId
}: {
  tenant: TenantContext
  accessContext: DerivedTenantAccessContext
  focusMemberId?: string | null
}): Promise<HrOrgChartResponse> => {
  const hierarchy = await listHierarchy({
    includeInactive: false
  })

  const visibleMemberIds = resolveVisibleMemberIds(accessContext)

  const filteredHierarchy = visibleMemberIds
    ? hierarchy.filter(item => visibleMemberIds.has(item.memberId))
    : hierarchy

  const currentMemberId = await resolveCurrentHrMemberId(tenant).catch(() => tenant.memberId ?? null)

  const peoplePayload = filteredHierarchy.length > 0
    ? await getPeopleList({
        memberIds: filteredHierarchy.map(item => item.memberId)
      })
    : { items: [] }

  const peopleById = new Map(peoplePayload.items.map(item => [item.memberId, item]))

  const nodes: HrOrgChartNode[] = filteredHierarchy.map(item => {
    const roster = peopleById.get(item.memberId)
    const isCurrentMember = currentMemberId != null && item.memberId === currentMemberId

    return {
      memberId: item.memberId,
      displayName: item.memberName,
      publicEmail: roster?.publicEmail ?? '',
      internalEmail: roster?.internalEmail ?? null,
      avatarUrl: roster?.avatarUrl ?? null,
      roleTitle: item.roleTitle,
      roleCategory: roster?.roleCategory ?? 'unknown',
      departmentName: item.departmentName,
      locationCountry: roster?.locationCountry ?? null,
      payRegime: roster?.payRegime ?? null,
      supervisorMemberId: item.supervisorMemberId,
      supervisorName: item.supervisorName,
      depth: item.depth,
      directReportsCount: item.directReportsCount,
      subtreeSize: item.subtreeSize,
      active: item.memberActive,
      isRoot: !item.supervisorMemberId || (visibleMemberIds != null && !visibleMemberIds.has(item.supervisorMemberId)),
      isCurrentMember,
      isDirectReportToCurrentMember: Boolean(currentMemberId && item.supervisorMemberId === currentMemberId),
      hasActiveDelegation: Boolean(item.delegation)
    }
  })

  const nodeIds = new Set(nodes.map(node => node.memberId))

  const edges = nodes
    .filter(node => node.supervisorMemberId && nodeIds.has(node.supervisorMemberId))
    .map(node => ({
      id: `${node.supervisorMemberId}-${node.memberId}`,
      source: node.supervisorMemberId as string,
      target: node.memberId
    }))

  const resolvedFocusMemberId = resolveRequestedFocus({
    requestedFocusMemberId: focusMemberId ?? null,
    currentMemberId,
    accessContext,
    nodes
  })

  return {
    accessMode: accessContext.accessMode,
    currentMemberId,
    focusMemberId: resolvedFocusMemberId,
    nodes,
    edges,
    breadcrumbs: buildBreadcrumbs({
      focusMemberId: resolvedFocusMemberId,
      nodes
    }),
    summary: {
      totalNodes: nodes.length,
      roots: nodes.filter(node => node.isRoot).length,
      maxDepth: nodes.reduce((maxDepth, node) => Math.max(maxDepth, node.depth), 0),
      delegatedApprovals: nodes.filter(node => node.hasActiveDelegation).length
    }
  }
}
