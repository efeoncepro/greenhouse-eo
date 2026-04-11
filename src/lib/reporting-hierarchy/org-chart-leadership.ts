import type { HrOrgChartMemberContext, HrOrgChartNode, HrOrgChartResponse } from '@/types/hr-core'

export type HrOrgLeadershipDepartment = {
  departmentId: string
  name: string
  businessUnit: string | null
  memberCount: number
  childDepartmentCount: number
  isPrimary: boolean
}

export type HrOrgLeadershipNode = {
  nodeId: string
  memberId: string
  displayName: string
  avatarUrl: string | null
  roleTitle: string | null
  roleCategory: string
  supervisorMemberId: string | null
  supervisorName: string | null
  departmentName: string | null
  contextDepartmentName: string | null
  locationCountry: string | null
  payRegime: 'chile' | 'international' | null
  directReportsCount: number
  subtreeSize: number
  hasActiveDelegation: boolean
  isCurrentMember: boolean
  isDepartmentHead: boolean
  associatedDepartments: HrOrgLeadershipDepartment[]
  depth: number
  isRoot: boolean
}

export type HrOrgLeadershipEdge = {
  id: string
  source: string
  target: string
}

export type HrOrgLeadershipView = {
  nodes: HrOrgLeadershipNode[]
  edges: HrOrgLeadershipEdge[]
  focusNodeId: string | null
  focusedLeaderMemberId: string | null
}

const buildLeaderNodeId = (memberId: string) => `leader:${memberId}`

const isLeader = (member: HrOrgChartMemberContext) =>
  member.directReportsCount > 0 || member.isDepartmentHead || member.isCurrentMember

const resolveDepartmentPriority = ({
  department,
  member
}: {
  department: HrOrgChartNode
  member: HrOrgChartMemberContext
}) => {
  if (department.departmentId && department.departmentId === member.departmentId) {
    return 0
  }

  if (department.departmentId && department.departmentId === member.contextDepartmentId) {
    return 1
  }

  return 2
}

const resolveFocusedLeaderMemberId = ({
  members,
  leaderIds,
  focusMemberId,
  departments
}: {
  members: HrOrgChartMemberContext[]
  leaderIds: Set<string>
  focusMemberId: string | null
  departments: HrOrgChartNode[]
}) => {
  if (!focusMemberId) {
    return null
  }

  if (leaderIds.has(focusMemberId)) {
    return focusMemberId
  }

  const focusedMember = members.find(member => member.memberId === focusMemberId) ?? null

  if (!focusedMember) {
    return null
  }

  if (focusedMember.supervisorMemberId && leaderIds.has(focusedMember.supervisorMemberId)) {
    return focusedMember.supervisorMemberId
  }

  const structuralDepartmentId = focusedMember.contextDepartmentId ?? focusedMember.departmentId

  const structuralLeaderId =
    departments.find(department => department.departmentId === structuralDepartmentId)?.headMemberId ?? null

  if (structuralLeaderId && leaderIds.has(structuralLeaderId)) {
    return structuralLeaderId
  }

  return null
}

export const buildOrgLeadershipView = ({
  payload,
  focusMemberId
}: {
  payload: HrOrgChartResponse
  focusMemberId: string | null
}): HrOrgLeadershipView => {
  const departments = payload.nodes.filter(node => node.nodeType === 'department')
  const leaders = payload.members.filter(isLeader)
  const leaderIds = new Set(leaders.map(member => member.memberId))

  const nodes = leaders
    .map<HrOrgLeadershipNode>(member => {
      const associatedDepartments = departments
        .filter(department => department.headMemberId === member.memberId)
        .sort((left, right) => {
          const priorityDelta =
            resolveDepartmentPriority({ department: left, member }) -
            resolveDepartmentPriority({ department: right, member })

          if (priorityDelta !== 0) {
            return priorityDelta
          }

          return left.displayName.localeCompare(right.displayName, 'es')
        })
        .map((department, index) => ({
          departmentId: department.departmentId as string,
          name: department.displayName,
          businessUnit: department.businessUnit,
          memberCount: department.memberCount,
          childDepartmentCount: department.childDepartmentCount,
          isPrimary: index === 0
        }))

      return {
        nodeId: buildLeaderNodeId(member.memberId),
        memberId: member.memberId,
        displayName: member.displayName,
        avatarUrl: member.avatarUrl,
        roleTitle: member.roleTitle,
        roleCategory: member.roleCategory,
        supervisorMemberId: member.supervisorMemberId,
        supervisorName: member.supervisorName,
        departmentName: member.departmentName,
        contextDepartmentName: member.contextDepartmentName,
        locationCountry: member.locationCountry,
        payRegime: member.payRegime,
        directReportsCount: member.directReportsCount,
        subtreeSize: member.subtreeSize,
        hasActiveDelegation: member.hasActiveDelegation,
        isCurrentMember: member.isCurrentMember,
        isDepartmentHead: member.isDepartmentHead,
        associatedDepartments,
        depth: 0,
        isRoot: false
      }
    })
    .sort((left, right) => {
      if (left.isCurrentMember !== right.isCurrentMember) {
        return left.isCurrentMember ? -1 : 1
      }

      if (left.depth !== right.depth) {
        return left.depth - right.depth
      }

      return left.displayName.localeCompare(right.displayName, 'es')
    })

  const nodeMap = new Map(nodes.map(node => [node.memberId, node]))

  const edges = nodes
    .filter(node => node.supervisorMemberId && nodeMap.has(node.supervisorMemberId))
    .map<HrOrgLeadershipEdge>(node => ({
      id: `${buildLeaderNodeId(node.supervisorMemberId as string)}-${node.nodeId}`,
      source: buildLeaderNodeId(node.supervisorMemberId as string),
      target: node.nodeId
    }))

  const parentByNodeId = new Map(edges.map(edge => [edge.target, edge.source]))
  const depthByNodeId = new Map<string, number>()

  const resolveDepth = (nodeId: string, path = new Set<string>()): number => {
    if (depthByNodeId.has(nodeId)) {
      return depthByNodeId.get(nodeId) as number
    }

    if (path.has(nodeId)) {
      return 0
    }

    path.add(nodeId)

    const parentNodeId = parentByNodeId.get(nodeId) ?? null
    const depth = parentNodeId ? resolveDepth(parentNodeId, path) + 1 : 0

    depthByNodeId.set(nodeId, depth)

    return depth
  }

  for (const node of nodes) {
    const depth = resolveDepth(node.nodeId)

    node.depth = depth
    node.isRoot = depth === 0
  }

  const focusedLeaderMemberId =
    resolveFocusedLeaderMemberId({
      members: payload.members,
      leaderIds,
      focusMemberId,
      departments
    }) ??
    (payload.currentMemberId && leaderIds.has(payload.currentMemberId) ? payload.currentMemberId : null) ??
    nodes[0]?.memberId ??
    null

  return {
    nodes,
    edges,
    focusNodeId: focusedLeaderMemberId ? buildLeaderNodeId(focusedLeaderMemberId) : null,
    focusedLeaderMemberId
  }
}
