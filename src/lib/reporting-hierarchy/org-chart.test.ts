import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockListHierarchy = vi.fn()
const mockListDepartmentsFromPostgres = vi.fn()
const mockGetPeopleList = vi.fn()
const mockResolveCurrentHrMemberId = vi.fn()
const mockQuery = vi.fn()

vi.mock('@/lib/reporting-hierarchy/admin', () => ({
  listHierarchy: (...args: unknown[]) => mockListHierarchy(...args)
}))

vi.mock('@/lib/hr-core/postgres-departments-store', () => ({
  listDepartmentsFromPostgres: (...args: unknown[]) => mockListDepartmentsFromPostgres(...args)
}))

vi.mock('@/lib/people/get-people-list', () => ({
  getPeopleList: (...args: unknown[]) => mockGetPeopleList(...args)
}))

vi.mock('@/lib/hr-core/service', () => ({
  resolveCurrentHrMemberId: (...args: unknown[]) => mockResolveCurrentHrMemberId(...args)
}))

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

import { getHrOrgChart } from '@/lib/reporting-hierarchy/org-chart'

describe('getHrOrgChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockListDepartmentsFromPostgres.mockResolvedValue([
      {
        departmentId: 'ejecutivo',
        name: 'Ejecutivo',
        description: 'Dirección',
        parentDepartmentId: null,
        headMemberId: 'julio-reyes',
        headMemberName: 'Julio Reyes',
        businessUnit: 'globe',
        active: true,
        sortOrder: 1
      },
      {
        departmentId: 'creative-team',
        name: 'Creative Team',
        description: 'Creative Operations',
        parentDepartmentId: 'ejecutivo',
        headMemberId: 'daniela-ferreira',
        headMemberName: 'Daniela Ferreira',
        businessUnit: 'globe',
        active: true,
        sortOrder: 2
      }
    ])

    mockListHierarchy.mockResolvedValue([
      {
        reportingLineId: 'rpt-1',
        memberId: 'julio-reyes',
        memberName: 'Julio Reyes',
        memberActive: true,
        roleTitle: 'CEO',
        departmentId: 'ejecutivo',
        departmentName: 'Ejecutivo',
        supervisorMemberId: null,
        supervisorName: null,
        supervisorActive: null,
        effectiveFrom: '2026-04-10T12:00:00.000Z',
        sourceSystem: 'greenhouse_manual',
        changeReason: 'initial_setup',
        changedByUserId: 'user-1',
        directReportsCount: 1,
        subtreeSize: 1,
        depth: 0,
        isRoot: true,
        delegation: null
      },
      {
        reportingLineId: 'rpt-2',
        memberId: 'daniela-ferreira',
        memberName: 'Daniela Ferreira',
        memberActive: true,
        roleTitle: 'Creative Operations Lead',
        departmentId: null,
        departmentName: null,
        supervisorMemberId: 'julio-reyes',
        supervisorName: 'Julio Reyes',
        supervisorActive: true,
        effectiveFrom: '2026-04-10T12:00:00.000Z',
        sourceSystem: 'greenhouse_manual',
        changeReason: 'team_update',
        changedByUserId: 'user-1',
        directReportsCount: 0,
        subtreeSize: 0,
        depth: 1,
        isRoot: false,
        delegation: {
          responsibilityId: 'resp-1',
          delegateMemberId: 'member-9',
          delegateMemberName: 'Valentina Hoyos',
          effectiveFrom: '2026-04-10T12:00:00.000Z',
          effectiveTo: null
        }
      }
    ])

    const rosterItems = [
      {
        memberId: 'julio-reyes',
        displayName: 'Julio Reyes',
        publicEmail: 'julio@efeonce.org',
        internalEmail: 'julio@efeonce.org',
        roleTitle: 'CEO',
        roleCategory: 'strategy',
        departmentName: 'Ejecutivo',
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
        memberId: 'daniela-ferreira',
        displayName: 'Daniela Ferreira',
        publicEmail: 'daniela@efeonce.org',
        internalEmail: 'daniela@efeonce.org',
        roleTitle: 'Creative Operations Lead',
        roleCategory: 'operations',
        departmentName: null,
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

    mockGetPeopleList.mockImplementation(async (input?: { memberIds?: string[] }) => ({
      items: input?.memberIds?.length
        ? rosterItems.filter(item => input.memberIds?.includes(item.memberId))
        : rosterItems
    }))

    mockQuery.mockResolvedValue([
      {
        member_id: 'julio-reyes',
        department_id: 'ejecutivo'
      },
      {
        member_id: 'daniela-ferreira',
        department_id: null
      }
    ])

    mockResolveCurrentHrMemberId.mockResolvedValue('julio-reyes')
  })

  it('builds a structural graph with department and member nodes', async () => {
    const result = await getHrOrgChart({
      tenant: { userId: 'user-1', memberId: 'julio-reyes' } as any,
      accessContext: {
        accessMode: 'broad',
        supervisorScope: null
      },
      focusMemberId: 'daniela-ferreira'
    })

    expect(result.summary.departments).toBe(2)
    expect(result.summary.members).toBe(2)
    expect(result.nodes.some(node => node.nodeType === 'department' && node.departmentId === 'creative-team')).toBe(true)
    expect(result.nodes.some(node => node.nodeType === 'member' && node.memberId === 'daniela-ferreira')).toBe(true)
    expect(result.edges).toEqual(
      expect.arrayContaining([
        {
          id: 'department:ejecutivo-department:creative-team',
          source: 'department:ejecutivo',
          target: 'department:creative-team'
        },
        {
          id: 'department:creative-team-member:daniela-ferreira',
          source: 'department:creative-team',
          target: 'member:daniela-ferreira'
        }
      ])
    )
    expect(result.breadcrumbs.map(item => item.label)).toEqual(['Ejecutivo', 'Creative Team', 'Daniela Ferreira'])
  })

  it('falls back to the headed department when the member assignment is still null', async () => {
    const result = await getHrOrgChart({
      tenant: { userId: 'user-1', memberId: 'julio-reyes' } as any,
      accessContext: {
        accessMode: 'broad',
        supervisorScope: null
      }
    })

    const danielaNode = result.nodes.find(node => node.nodeType === 'member' && node.memberId === 'daniela-ferreira')

    expect(danielaNode?.departmentId).toBe('creative-team')
    expect(danielaNode?.departmentName).toBe('Creative Team')
    expect(danielaNode?.isDepartmentHead).toBe(true)
  })

  it('keeps only visible member branches and their ancestor departments for supervisor scope', async () => {
    mockGetPeopleList.mockResolvedValue({
      items: [
        {
          memberId: 'daniela-ferreira',
          displayName: 'Daniela Ferreira',
          publicEmail: 'daniela@efeonce.org',
          internalEmail: 'daniela@efeonce.org',
          roleTitle: 'Creative Lead',
          roleCategory: 'design',
          departmentName: null,
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
    mockQuery.mockResolvedValue([{ member_id: 'daniela-ferreira', department_id: null }])

    const result = await getHrOrgChart({
      tenant: { userId: 'user-1', memberId: 'julio-reyes' } as any,
      accessContext: {
        accessMode: 'supervisor',
        supervisorScope: {
          memberId: 'daniela-ferreira',
          visibleMemberIds: ['daniela-ferreira']
        } as any
      }
    })

    expect(result.memberOptions.map(option => option.memberId)).toEqual(['daniela-ferreira'])
    expect(result.nodes.filter(node => node.nodeType === 'member').map(node => node.memberId)).toEqual(['daniela-ferreira'])
    expect(result.nodes.filter(node => node.nodeType === 'department').map(node => node.departmentId)).toEqual(
      expect.arrayContaining(['creative-team', 'ejecutivo'])
    )
  })
})
