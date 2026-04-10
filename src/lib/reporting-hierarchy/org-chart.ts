import 'server-only'

import type {
  HrDepartment,
  HrHierarchyRecord,
  HrOrgChartBreadcrumb,
  HrOrgChartEdge,
  HrOrgChartMemberOption,
  HrOrgChartNode,
  HrOrgChartResponse
} from '@/types/hr-core'

import type { DerivedTenantAccessContext } from '@/lib/tenant/authorization'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import { query } from '@/lib/db'
import { listDepartmentsFromPostgres } from '@/lib/hr-core/postgres-departments-store'
import { HrCoreValidationError, normalizeNullableString } from '@/lib/hr-core/shared'
import { resolveCurrentHrMemberId } from '@/lib/hr-core/service'
import { getPeopleList } from '@/lib/people/get-people-list'
import { listHierarchy } from '@/lib/reporting-hierarchy/admin'

type OrgChartMemberDepartmentRow = {
  member_id: string
  department_id: string | null
}

type OrgChartMemberDraft = {
  nodeId: string
  nodeType: 'member'
  memberId: string
  departmentId: string | null
  contextDepartmentId: string | null
  displayName: string
  publicEmail: string
  internalEmail: string | null
  avatarUrl: string | null
  roleTitle: string | null
  roleCategory: string
  departmentName: string | null
  contextDepartmentName: string | null
  parentDepartmentId: string | null
  parentDepartmentName: string | null
  headMemberId: string | null
  headMemberName: string | null
  businessUnit: string | null
  locationCountry: string | null
  payRegime: 'chile' | 'international' | null
  supervisorMemberId: string | null
  supervisorName: string | null
  visualParentNodeId: string | null
  visualParentLabel: string | null
  placementMode: 'department' | 'supervisor' | 'root'
  directReportsCount: number
  subtreeSize: number
  memberCount: number
  childDepartmentCount: number
  active: boolean
  isCurrentMember: boolean
  isDirectReportToCurrentMember: boolean
  hasActiveDelegation: boolean
  isDepartmentHead: boolean
}

const DEPARTMENT_NODE_PREFIX = 'department:'
const MEMBER_NODE_PREFIX = 'member:'

const resolveVisibleMemberIds = (accessContext: DerivedTenantAccessContext) =>
  accessContext.accessMode === 'supervisor'
    ? new Set(accessContext.supervisorScope?.visibleMemberIds ?? [])
    : null

const buildDepartmentNodeId = (departmentId: string) => `${DEPARTMENT_NODE_PREFIX}${departmentId}`

const buildMemberNodeId = (memberId: string) => `${MEMBER_NODE_PREFIX}${memberId}`

const listMemberDepartmentRows = async (memberIds?: string[]) => {
  const filters = ['m.active = TRUE']
  const values: unknown[] = []

  if (memberIds && memberIds.length > 0) {
    values.push(memberIds)
    filters.push(`m.member_id = ANY($${values.length}::text[])`)
  }

  return query<OrgChartMemberDepartmentRow>(
    `
      SELECT
        m.member_id,
        m.department_id
      FROM greenhouse_core.members AS m
      WHERE ${filters.join(' AND ')}
      ORDER BY m.member_id ASC
    `,
    values
  )
}

const resolveRequestedFocus = ({
  requestedFocusMemberId,
  currentMemberId,
  accessContext,
  memberOptions
}: {
  requestedFocusMemberId: string | null
  currentMemberId: string | null
  accessContext: DerivedTenantAccessContext
  memberOptions: HrOrgChartMemberOption[]
}) => {
  const visibleIds = new Set(memberOptions.map(option => option.memberId))

  if (requestedFocusMemberId) {
    if (!visibleIds.has(requestedFocusMemberId)) {
      throw new HrCoreValidationError('Member not found.', 404)
    }

    return requestedFocusMemberId
  }

  const supervisorMemberId =
    accessContext.accessMode === 'supervisor'
      ? accessContext.supervisorScope?.memberId ?? null
      : null

  if (supervisorMemberId && visibleIds.has(supervisorMemberId)) {
    return supervisorMemberId
  }

  if (currentMemberId && visibleIds.has(currentMemberId)) {
    return currentMemberId
  }

  return memberOptions[0]?.memberId ?? null
}

const buildBreadcrumbs = ({
  focusMemberId,
  nodesById,
  parentNodeIdByNodeId
}: {
  focusMemberId: string | null
  nodesById: Map<string, HrOrgChartNode>
  parentNodeIdByNodeId: Map<string, string | null>
}): HrOrgChartBreadcrumb[] => {
  if (!focusMemberId) {
    return []
  }

  const memberNode = nodesById.get(buildMemberNodeId(focusMemberId))

  if (!memberNode) {
    return []
  }

  const breadcrumbs: HrOrgChartBreadcrumb[] = []
  const visitedNodeIds = new Set<string>()
  let cursorNodeId: string | null = memberNode.nodeId

  while (cursorNodeId) {
    if (visitedNodeIds.has(cursorNodeId)) {
      break
    }

    visitedNodeIds.add(cursorNodeId)
    const node = nodesById.get(cursorNodeId)

    if (!node) {
      break
    }

    breadcrumbs.push({
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      memberId: node.memberId,
      departmentId: node.departmentId,
      label: node.displayName
    })

    cursorNodeId = parentNodeIdByNodeId.get(cursorNodeId) ?? null
  }

  breadcrumbs.reverse()

  return breadcrumbs
}

const addDepartmentAncestors = ({
  departmentId,
  departmentsById,
  accumulator
}: {
  departmentId: string | null
  departmentsById: Map<string, HrDepartment>
  accumulator: Set<string>
}) => {
  const visited = new Set<string>()
  let cursorDepartmentId = departmentId

  while (cursorDepartmentId) {
    if (visited.has(cursorDepartmentId)) {
      break
    }

    visited.add(cursorDepartmentId)
    accumulator.add(cursorDepartmentId)

    cursorDepartmentId = departmentsById.get(cursorDepartmentId)?.parentDepartmentId ?? null
  }
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
  const visibleMemberIds = resolveVisibleMemberIds(accessContext)

  const [departments, hierarchy, currentMemberId] = await Promise.all([
    listDepartmentsFromPostgres({ activeOnly: true }),
    listHierarchy({ includeInactive: false }),
    resolveCurrentHrMemberId(tenant).catch(() => tenant.memberId ?? null)
  ])

  const departmentsById = new Map(departments.map(department => [department.departmentId, department]))
  const headDepartmentByMemberId = new Map<string, HrDepartment>()

  for (const department of departments) {
    if (department.headMemberId) {
      headDepartmentByMemberId.set(department.headMemberId, department)
    }
  }

  const peoplePayload = await getPeopleList({
    memberIds: visibleMemberIds ? [...visibleMemberIds] : undefined
  })

  const peopleItems = peoplePayload.items.filter(item => item.active)
  const peopleIds = peopleItems.map(item => item.memberId)
  const memberDepartmentRows = await listMemberDepartmentRows(peopleIds)

  const hierarchyByMemberId = new Map(
    hierarchy
      .filter(item => !visibleMemberIds || visibleMemberIds.has(item.memberId))
      .map(item => [item.memberId, item])
  )

  const memberDepartmentById = new Map(
    memberDepartmentRows.map(row => [row.member_id, normalizeNullableString(row.department_id)])
  )

  const basicMemberOptions: HrOrgChartMemberOption[] = peopleItems.map(item => ({
    memberId: item.memberId,
    displayName: item.displayName,
    roleTitle: item.roleTitle ?? null,
    departmentName: item.departmentName ?? null,
    avatarUrl: item.avatarUrl ?? null,
    isCurrentMember: currentMemberId != null && item.memberId === currentMemberId
  }))

  const resolvedFocusMemberId = resolveRequestedFocus({
    requestedFocusMemberId: focusMemberId ?? null,
    currentMemberId,
    accessContext,
    memberOptions: basicMemberOptions
  })

  const effectiveDepartmentIdByMemberId = new Map<string, string | null>()

  const resolveContextDepartmentId = (memberId: string, visited = new Set<string>()): string | null => {
    if (visited.has(memberId)) {
      return null
    }

    visited.add(memberId)

    const effectiveDepartmentId = effectiveDepartmentIdByMemberId.get(memberId)

    if (effectiveDepartmentId) {
      return effectiveDepartmentId
    }

    const supervisorMemberId = hierarchyByMemberId.get(memberId)?.supervisorMemberId ?? null

    if (!supervisorMemberId) {
      return null
    }

    return resolveContextDepartmentId(supervisorMemberId, visited)
  }

  for (const person of peopleItems) {
    const assignedDepartmentId = memberDepartmentById.get(person.memberId) ?? null
    const headDepartmentId = headDepartmentByMemberId.get(person.memberId)?.departmentId ?? null

    effectiveDepartmentIdByMemberId.set(person.memberId, assignedDepartmentId ?? headDepartmentId ?? null)
  }

  const relevantDepartmentIds = new Set<string>()

  if (visibleMemberIds) {
    for (const person of peopleItems) {
      addDepartmentAncestors({
        departmentId: resolveContextDepartmentId(person.memberId),
        departmentsById,
        accumulator: relevantDepartmentIds
      })
    }
  } else {
    for (const department of departments) {
      relevantDepartmentIds.add(department.departmentId)
    }
  }

  const relevantDepartments = departments.filter(department => relevantDepartmentIds.has(department.departmentId))
  const departmentChildrenMap = new Map<string | null, HrDepartment[]>()
  const memberCountByDepartmentId = new Map<string, number>()

  for (const department of relevantDepartments) {
    const parentKey = relevantDepartmentIds.has(department.parentDepartmentId ?? '')
      ? department.parentDepartmentId
      : null

    const siblings = departmentChildrenMap.get(parentKey) ?? []

    siblings.push(department)
    departmentChildrenMap.set(parentKey, siblings)
  }

  for (const person of peopleItems) {
    const departmentId = effectiveDepartmentIdByMemberId.get(person.memberId) ?? null

    if (!departmentId || !relevantDepartmentIds.has(departmentId)) {
      continue
    }

    memberCountByDepartmentId.set(departmentId, (memberCountByDepartmentId.get(departmentId) ?? 0) + 1)
  }

  const departmentNodes: HrOrgChartNode[] = relevantDepartments.map(department => {
    const parentDepartment = department.parentDepartmentId
      ? departmentsById.get(department.parentDepartmentId)
      : null

    const depth = (() => {
      let currentDepth = 0
      let cursorDepartmentId = department.parentDepartmentId
      const visited = new Set<string>()

      while (cursorDepartmentId && relevantDepartmentIds.has(cursorDepartmentId) && !visited.has(cursorDepartmentId)) {
        visited.add(cursorDepartmentId)
        currentDepth += 1
        cursorDepartmentId = departmentsById.get(cursorDepartmentId)?.parentDepartmentId ?? null
      }

      return currentDepth
    })()

    return {
      nodeId: buildDepartmentNodeId(department.departmentId),
      nodeType: 'department',
      memberId: null,
      departmentId: department.departmentId,
      contextDepartmentId: department.departmentId,
      displayName: department.name,
      publicEmail: '',
      internalEmail: null,
      avatarUrl: null,
      roleTitle: department.description,
      roleCategory: 'unknown',
      departmentName: department.name,
      contextDepartmentName: department.name,
      parentDepartmentId: relevantDepartmentIds.has(department.parentDepartmentId ?? '')
        ? department.parentDepartmentId
        : null,
      parentDepartmentName: parentDepartment?.name ?? null,
      headMemberId: department.headMemberId,
      headMemberName: department.headMemberName,
      businessUnit: department.businessUnit,
      locationCountry: null,
      payRegime: null,
      supervisorMemberId: null,
      supervisorName: null,
      visualParentNodeId: relevantDepartmentIds.has(department.parentDepartmentId ?? '')
        ? buildDepartmentNodeId(department.parentDepartmentId as string)
        : null,
      visualParentLabel: parentDepartment?.name ?? null,
      placementMode: department.parentDepartmentId && relevantDepartmentIds.has(department.parentDepartmentId) ? 'department' : 'root',
      depth,
      directReportsCount: 0,
      subtreeSize: 0,
      memberCount: memberCountByDepartmentId.get(department.departmentId) ?? 0,
      childDepartmentCount: departmentChildrenMap.get(department.departmentId)?.length ?? 0,
      active: department.active,
      isRoot: !department.parentDepartmentId || !relevantDepartmentIds.has(department.parentDepartmentId),
      isCurrentMember: false,
      isDirectReportToCurrentMember: false,
      hasActiveDelegation: false,
      isDepartmentHead: false
    }
  })

  const memberDrafts: OrgChartMemberDraft[] = peopleItems.map(person => {
    const hierarchyNode = hierarchyByMemberId.get(person.memberId) as HrHierarchyRecord | undefined
    const departmentId = effectiveDepartmentIdByMemberId.get(person.memberId) ?? null
    const contextDepartmentId = resolveContextDepartmentId(person.memberId)
    const department = departmentId ? departmentsById.get(departmentId) ?? null : null
    const contextDepartment = contextDepartmentId ? departmentsById.get(contextDepartmentId) ?? null : null
    const isCurrentMember = currentMemberId != null && person.memberId === currentMemberId

    const visibleSupervisorMemberId =
      hierarchyNode?.supervisorMemberId && hierarchyByMemberId.has(hierarchyNode.supervisorMemberId)
        ? hierarchyNode.supervisorMemberId
        : null

    const visualParentNodeId =
      departmentId && relevantDepartmentIds.has(departmentId)
        ? buildDepartmentNodeId(departmentId)
        : visibleSupervisorMemberId
          ? buildMemberNodeId(visibleSupervisorMemberId)
          : contextDepartmentId && relevantDepartmentIds.has(contextDepartmentId)
            ? buildDepartmentNodeId(contextDepartmentId)
            : null

    const placementMode: 'department' | 'supervisor' | 'root' =
      departmentId && relevantDepartmentIds.has(departmentId)
        ? 'department'
        : visibleSupervisorMemberId
          ? 'supervisor'
          : contextDepartmentId && relevantDepartmentIds.has(contextDepartmentId)
            ? 'department'
            : 'root'

    const visualParentLabel =
      visibleSupervisorMemberId
        ? hierarchyByMemberId.get(visibleSupervisorMemberId)?.memberName ?? null
        : contextDepartment?.name ?? null

    return {
      nodeId: buildMemberNodeId(person.memberId),
      nodeType: 'member',
      memberId: person.memberId,
      departmentId,
      contextDepartmentId,
      displayName: person.displayName,
      publicEmail: person.publicEmail,
      internalEmail: person.internalEmail,
      avatarUrl: person.avatarUrl ?? null,
      roleTitle: person.roleTitle ?? null,
      roleCategory: person.roleCategory,
      departmentName: department?.name ?? null,
      contextDepartmentName: contextDepartment?.name ?? person.departmentName ?? null,
      parentDepartmentId: contextDepartment?.parentDepartmentId ?? null,
      parentDepartmentName: contextDepartment?.parentDepartmentId
        ? departmentsById.get(contextDepartment.parentDepartmentId)?.name ?? null
        : null,
      headMemberId: contextDepartment?.headMemberId ?? null,
      headMemberName: contextDepartment?.headMemberName ?? null,
      businessUnit: contextDepartment?.businessUnit ?? null,
      locationCountry: person.locationCountry,
      payRegime: person.payRegime,
      supervisorMemberId: hierarchyNode?.supervisorMemberId ?? null,
      supervisorName: hierarchyNode?.supervisorName ?? null,
      visualParentNodeId,
      visualParentLabel,
      placementMode,
      directReportsCount: hierarchyNode?.directReportsCount ?? 0,
      subtreeSize: hierarchyNode?.subtreeSize ?? 0,
      memberCount: 0,
      childDepartmentCount: 0,
      active: person.active,
      isCurrentMember,
      isDirectReportToCurrentMember: Boolean(currentMemberId && hierarchyNode?.supervisorMemberId === currentMemberId),
      hasActiveDelegation: Boolean(hierarchyNode?.delegation),
      isDepartmentHead: Boolean(contextDepartment?.headMemberId && contextDepartment.headMemberId === person.memberId)
    }
  })

  const parentNodeIdByNodeId = new Map<string, string | null>()

  for (const departmentNode of departmentNodes) {
    parentNodeIdByNodeId.set(departmentNode.nodeId, departmentNode.visualParentNodeId)
  }

  for (const memberDraft of memberDrafts) {
    parentNodeIdByNodeId.set(memberDraft.nodeId, memberDraft.visualParentNodeId)
  }

  const depthByNodeId = new Map<string, number>()

  const resolveDepth = (nodeId: string, path = new Set<string>()): number => {
    if (depthByNodeId.has(nodeId)) {
      return depthByNodeId.get(nodeId) as number
    }

    if (path.has(nodeId)) {
      return 0
    }

    path.add(nodeId)

    const parentNodeId = parentNodeIdByNodeId.get(nodeId) ?? null
    const depth = parentNodeId ? resolveDepth(parentNodeId, path) + 1 : 0

    depthByNodeId.set(nodeId, depth)

    return depth
  }

  const memberNodes: HrOrgChartNode[] = memberDrafts.map(memberDraft => ({
    ...memberDraft,
    depth: resolveDepth(memberDraft.nodeId),
    isRoot: !memberDraft.visualParentNodeId
  }))

  const memberOptions: HrOrgChartMemberOption[] = peopleItems.map(item => {
    const contextDepartmentId = resolveContextDepartmentId(item.memberId)
    const contextDepartmentName = contextDepartmentId ? departmentsById.get(contextDepartmentId)?.name ?? null : null

    return {
      memberId: item.memberId,
      displayName: item.displayName,
      roleTitle: item.roleTitle ?? null,
      departmentName: contextDepartmentName ?? item.departmentName ?? null,
      avatarUrl: item.avatarUrl ?? null,
      isCurrentMember: currentMemberId != null && item.memberId === currentMemberId
    }
  })

  const nodes = [...departmentNodes, ...memberNodes]

  const nodesById = new Map(nodes.map(node => [node.nodeId, node]))

  const edges: HrOrgChartEdge[] = [
    ...departmentNodes
      .filter(node => node.visualParentNodeId)
      .map(node => ({
        id: `${node.visualParentNodeId as string}-${node.nodeId}`,
        source: node.visualParentNodeId as string,
        target: node.nodeId
      })),
    ...memberNodes
      .filter(node => node.visualParentNodeId)
      .map(node => ({
        id: `${node.visualParentNodeId as string}-${node.nodeId}`,
        source: node.visualParentNodeId as string,
        target: node.nodeId
      }))
  ]

  return {
    accessMode: accessContext.accessMode,
    currentMemberId,
    focusMemberId: resolvedFocusMemberId,
    nodes,
    edges,
    breadcrumbs: buildBreadcrumbs({
      focusMemberId: resolvedFocusMemberId,
      nodesById,
      parentNodeIdByNodeId
    }),
    memberOptions,
    summary: {
      totalNodes: nodes.length,
      departments: departmentNodes.length,
      members: memberNodes.length,
      roots: nodes.filter(node => node.isRoot).length,
      maxDepth: nodes.reduce((maxDepth, node) => Math.max(maxDepth, node.depth), 0),
      delegatedApprovals: memberNodes.filter(node => node.hasActiveDelegation).length
    }
  }
}
