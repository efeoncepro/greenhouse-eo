import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockListHierarchy = vi.fn()
const mockGetPeopleList = vi.fn()
const mockResolveCurrentHrMemberId = vi.fn()

vi.mock('@/lib/reporting-hierarchy/admin', () => ({
  listHierarchy: (...args: unknown[]) => mockListHierarchy(...args)
}))

vi.mock('@/lib/people/get-people-list', () => ({
  getPeopleList: (...args: unknown[]) => mockGetPeopleList(...args)
}))

vi.mock('@/lib/hr-core/service', () => ({
  resolveCurrentHrMemberId: (...args: unknown[]) => mockResolveCurrentHrMemberId(...args)
}))

import { getHrOrgChart } from '@/lib/reporting-hierarchy/org-chart'

describe('getHrOrgChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockListHierarchy.mockResolvedValue([
      {
        reportingLineId: 'rpt-1',
        memberId: 'member-1',
        memberName: 'Ana Perez',
        memberActive: true,
        roleTitle: 'Lead',
        departmentId: 'dept-1',
        departmentName: 'Delivery',
        supervisorMemberId: null,
        supervisorName: null,
        supervisorActive: null,
        effectiveFrom: '2026-04-10T12:00:00.000Z',
        sourceSystem: 'greenhouse_manual',
        changeReason: 'initial_setup',
        changedByUserId: 'user-1',
        directReportsCount: 2,
        subtreeSize: 2,
        depth: 0,
        isRoot: true,
        delegation: null
      },
      {
        reportingLineId: 'rpt-2',
        memberId: 'member-2',
        memberName: 'Bruno Diaz',
        memberActive: true,
        roleTitle: 'Manager',
        departmentId: 'dept-1',
        departmentName: 'Delivery',
        supervisorMemberId: 'member-1',
        supervisorName: 'Ana Perez',
        supervisorActive: true,
        effectiveFrom: '2026-04-10T12:00:00.000Z',
        sourceSystem: 'greenhouse_manual',
        changeReason: 'initial_setup',
        changedByUserId: 'user-1',
        directReportsCount: 1,
        subtreeSize: 1,
        depth: 1,
        isRoot: false,
        delegation: {
          responsibilityId: 'rsp-1',
          delegateMemberId: 'member-9',
          delegateMemberName: 'Delegada',
          effectiveFrom: '2026-04-10T12:00:00.000Z',
          effectiveTo: null
        }
      },
      {
        reportingLineId: 'rpt-3',
        memberId: 'member-3',
        memberName: 'Carla Soto',
        memberActive: true,
        roleTitle: 'Analyst',
        departmentId: 'dept-1',
        departmentName: 'Delivery',
        supervisorMemberId: 'member-2',
        supervisorName: 'Bruno Diaz',
        supervisorActive: true,
        effectiveFrom: '2026-04-10T12:00:00.000Z',
        sourceSystem: 'greenhouse_manual',
        changeReason: 'initial_setup',
        changedByUserId: 'user-1',
        directReportsCount: 0,
        subtreeSize: 0,
        depth: 2,
        isRoot: false,
        delegation: null
      }
    ])

    mockGetPeopleList.mockResolvedValue({
      items: [
        {
          memberId: 'member-1',
          displayName: 'Ana Perez',
          publicEmail: 'ana@efeonce.org',
          internalEmail: 'ana@efeonce.org',
          roleTitle: 'Lead',
          roleCategory: 'operations',
          avatarUrl: null,
          locationCountry: 'CL',
          active: true,
          totalAssignments: 0,
          contractedFte: 1,
          assignedFte: 1,
          totalFte: 1,
          payRegime: 'chile'
        },
        {
          memberId: 'member-2',
          displayName: 'Bruno Diaz',
          publicEmail: 'bruno@efeonce.org',
          internalEmail: 'bruno@efeonce.org',
          roleTitle: 'Manager',
          roleCategory: 'operations',
          avatarUrl: null,
          locationCountry: 'CL',
          active: true,
          totalAssignments: 0,
          contractedFte: 1,
          assignedFte: 1,
          totalFte: 1,
          payRegime: 'chile'
        },
        {
          memberId: 'member-3',
          displayName: 'Carla Soto',
          publicEmail: 'carla@efeonce.org',
          internalEmail: 'carla@efeonce.org',
          roleTitle: 'Analyst',
          roleCategory: 'operations',
          avatarUrl: null,
          locationCountry: 'CL',
          active: true,
          totalAssignments: 0,
          contractedFte: 1,
          assignedFte: 1,
          totalFte: 1,
          payRegime: 'chile'
        }
      ]
    })

    mockResolveCurrentHrMemberId.mockResolvedValue('member-1')
  })

  it('returns the full graph for broad access and builds breadcrumbs from the focused node', async () => {
    const result = await getHrOrgChart({
      tenant: { userId: 'user-1', memberId: 'member-1' } as any,
      accessContext: {
        accessMode: 'broad',
        supervisorScope: null
      },
      focusMemberId: 'member-3'
    })

    expect(result.accessMode).toBe('broad')
    expect(result.nodes).toHaveLength(3)
    expect(result.edges).toEqual([
      { id: 'member-1-member-2', source: 'member-1', target: 'member-2' },
      { id: 'member-2-member-3', source: 'member-2', target: 'member-3' }
    ])
    expect(result.breadcrumbs.map(item => item.memberId)).toEqual(['member-1', 'member-2', 'member-3'])
    expect(result.summary.delegatedApprovals).toBe(1)
  })

  it('filters the graph for supervisor access and promotes hidden-parent nodes to roots', async () => {
    const result = await getHrOrgChart({
      tenant: { userId: 'user-1', memberId: 'member-1' } as any,
      accessContext: {
        accessMode: 'supervisor',
        supervisorScope: {
          memberId: 'member-1',
          visibleMemberIds: ['member-1', 'member-3']
        } as any
      }
    })

    expect(result.focusMemberId).toBe('member-1')
    expect(result.nodes.map(node => node.memberId)).toEqual(['member-1', 'member-3'])
    expect(result.edges).toEqual([])
    expect(result.nodes.find(node => node.memberId === 'member-3')?.isRoot).toBe(true)
  })

  it('falls back to the roster department when the hierarchy snapshot does not have it yet', async () => {
    mockListHierarchy.mockResolvedValue([
      {
        reportingLineId: 'rpt-1',
        memberId: 'member-1',
        memberName: 'Ana Perez',
        memberActive: true,
        roleTitle: 'Lead',
        departmentId: null,
        departmentName: null,
        supervisorMemberId: null,
        supervisorName: null,
        supervisorActive: null,
        effectiveFrom: '2026-04-10T12:00:00.000Z',
        sourceSystem: 'greenhouse_manual',
        changeReason: 'initial_setup',
        changedByUserId: 'user-1',
        directReportsCount: 0,
        subtreeSize: 0,
        depth: 0,
        isRoot: true,
        delegation: null
      }
    ])
    mockGetPeopleList.mockResolvedValue({
      items: [
        {
          memberId: 'member-1',
          displayName: 'Ana Perez',
          publicEmail: 'ana@efeonce.org',
          internalEmail: 'ana@efeonce.org',
          roleTitle: 'Lead',
          roleCategory: 'operations',
          departmentName: 'Delivery',
          avatarUrl: null,
          locationCountry: 'CL',
          active: true,
          totalAssignments: 0,
          contractedFte: 1,
          assignedFte: 1,
          totalFte: 1,
          payRegime: 'chile'
        }
      ]
    })

    const result = await getHrOrgChart({
      tenant: { userId: 'user-1', memberId: 'member-1' } as any,
      accessContext: {
        accessMode: 'broad',
        supervisorScope: null
      }
    })

    expect(result.nodes[0]?.departmentName).toBe('Delivery')
  })
})
