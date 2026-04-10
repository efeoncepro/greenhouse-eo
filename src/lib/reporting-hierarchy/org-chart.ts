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

const buildDepartmentBreadcrumbs = ({
  focusMemberId,
  memberNodesById,
  departmentsById
}: {
  focusMemberId: string | null
  memberNodesById: Map<string, HrOrgChartNode>
  departmentsById: Map<string, HrDepartment>
}): HrOrgChartBreadcrumb[] => {
  if (!focusMemberId) {
    return []
  }

  const memberNode = memberNodesById.get(focusMemberId)

  if (!memberNode) {
    return []
  }

  const breadcrumbs: HrOrgChartBreadcrumb[] = []
  const visitedDepartments = new Set<string>()
  let cursorDepartmentId = memberNode.departmentId

  while (cursorDepartmentId) {
    if (visitedDepartments.has(cursorDepartmentId)) {
      break
    }

    visitedDepartments.add(cursorDepartmentId)

    const department = departmentsById.get(cursorDepartmentId)

    if (!department) {
      break
    }

    breadcrumbs.push({
      nodeId: buildDepartmentNodeId(department.departmentId),
      nodeType: 'department',
      memberId: null,
      departmentId: department.departmentId,
      label: department.name
    })

    cursorDepartmentId = department.parentDepartmentId
  }

  breadcrumbs.reverse()

  breadcrumbs.push({
    nodeId: memberNode.nodeId,
    nodeType: 'member',
    memberId: memberNode.memberId,
    departmentId: memberNode.departmentId,
    label: memberNode.displayName
  })

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

  const memberOptions: HrOrgChartMemberOption[] = peopleItems.map(item => ({
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
    memberOptions
  })

  const effectiveDepartmentIdByMemberId = new Map<string, string | null>()

  for (const person of peopleItems) {
    const assignedDepartmentId = memberDepartmentById.get(person.memberId) ?? null
    const headDepartmentId = headDepartmentByMemberId.get(person.memberId)?.departmentId ?? null

    effectiveDepartmentIdByMemberId.set(person.memberId, assignedDepartmentId ?? headDepartmentId ?? null)
  }

  const relevantDepartmentIds = new Set<string>()

  if (visibleMemberIds) {
    for (const person of peopleItems) {
      addDepartmentAncestors({
        departmentId: effectiveDepartmentIdByMemberId.get(person.memberId) ?? null,
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
      displayName: department.name,
      publicEmail: '',
      internalEmail: null,
      avatarUrl: null,
      roleTitle: department.description,
      roleCategory: 'unknown',
      departmentName: department.name,
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
      depth,
      directReportsCount: 0,
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

  const memberNodes: HrOrgChartNode[] = peopleItems.map(person => {
    const hierarchyNode = hierarchyByMemberId.get(person.memberId) as HrHierarchyRecord | undefined
    const departmentId = effectiveDepartmentIdByMemberId.get(person.memberId) ?? null
    const department = departmentId ? departmentsById.get(departmentId) ?? null : null
    const isCurrentMember = currentMemberId != null && person.memberId === currentMemberId

    return {
      nodeId: buildMemberNodeId(person.memberId),
      nodeType: 'member',
      memberId: person.memberId,
      departmentId,
      displayName: person.displayName,
      publicEmail: person.publicEmail,
      internalEmail: person.internalEmail,
      avatarUrl: person.avatarUrl ?? null,
      roleTitle: person.roleTitle ?? null,
      roleCategory: person.roleCategory,
      departmentName: department?.name ?? person.departmentName ?? null,
      parentDepartmentId: department?.parentDepartmentId ?? null,
      parentDepartmentName: department?.parentDepartmentId
        ? departmentsById.get(department.parentDepartmentId)?.name ?? null
        : null,
      headMemberId: department?.headMemberId ?? null,
      headMemberName: department?.headMemberName ?? null,
      businessUnit: department?.businessUnit ?? null,
      locationCountry: person.locationCountry,
      payRegime: person.payRegime,
      supervisorMemberId: hierarchyNode?.supervisorMemberId ?? null,
      supervisorName: hierarchyNode?.supervisorName ?? null,
      depth: department ? (departmentNodes.find(node => node.departmentId === department.departmentId)?.depth ?? 0) + 1 : 0,
      directReportsCount: hierarchyNode?.directReportsCount ?? 0,
      memberCount: 0,
      childDepartmentCount: 0,
      active: person.active,
      isRoot: !departmentId || !relevantDepartmentIds.has(departmentId),
      isCurrentMember,
      isDirectReportToCurrentMember: Boolean(currentMemberId && hierarchyNode?.supervisorMemberId === currentMemberId),
      hasActiveDelegation: Boolean(hierarchyNode?.delegation),
      isDepartmentHead: Boolean(department?.headMemberId && department.headMemberId === person.memberId)
    }
  })

  const memberNodesById = new Map(
    memberNodes
      .filter(node => node.memberId)
      .map(node => [node.memberId as string, node])
  )

  const edges: HrOrgChartEdge[] = [
    ...departmentNodes
      .filter(node => node.parentDepartmentId)
      .map(node => ({
        id: `${buildDepartmentNodeId(node.parentDepartmentId as string)}-${node.nodeId}`,
        source: buildDepartmentNodeId(node.parentDepartmentId as string),
        target: node.nodeId
      })),
    ...memberNodes
      .filter(node => node.departmentId && relevantDepartmentIds.has(node.departmentId))
      .map(node => ({
        id: `${buildDepartmentNodeId(node.departmentId as string)}-${node.nodeId}`,
        source: buildDepartmentNodeId(node.departmentId as string),
        target: node.nodeId
      }))
  ]

  const nodes = [...departmentNodes, ...memberNodes]

  return {
    accessMode: accessContext.accessMode,
    currentMemberId,
    focusMemberId: resolvedFocusMemberId,
    nodes,
    edges,
    breadcrumbs: buildDepartmentBreadcrumbs({
      focusMemberId: resolvedFocusMemberId,
      memberNodesById,
      departmentsById
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
