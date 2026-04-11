import { describe, expect, it } from 'vitest'

import type { HrOrgChartResponse } from '@/types/hr-core'
import { buildOrgLeadershipView } from '@/lib/reporting-hierarchy/org-chart-leadership'

const payload: HrOrgChartResponse = {
  accessMode: 'broad',
  currentMemberId: 'julio-reyes',
  focusMemberId: 'julio-reyes',
  focusNodeId: 'department:ejecutivo',
  nodes: [
    {
      nodeId: 'department:ejecutivo',
      nodeType: 'department',
      memberId: null,
      departmentId: 'ejecutivo',
      contextDepartmentId: 'ejecutivo',
      displayName: 'Ejecutivo',
      publicEmail: '',
      internalEmail: null,
      avatarUrl: null,
      roleTitle: null,
      roleCategory: 'unknown',
      departmentName: 'Ejecutivo',
      contextDepartmentName: 'Ejecutivo',
      parentDepartmentId: null,
      parentDepartmentName: null,
      headMemberId: 'julio-reyes',
      headMemberName: 'Julio Reyes',
      businessUnit: 'efeonce_digital',
      locationCountry: null,
      payRegime: null,
      supervisorMemberId: null,
      supervisorName: null,
      visualParentNodeId: null,
      visualParentLabel: null,
      placementMode: 'root',
      depth: 0,
      directReportsCount: 0,
      subtreeSize: 0,
      memberCount: 1,
      childDepartmentCount: 3,
      active: true,
      isRoot: true,
      isCurrentMember: false,
      isDirectReportToCurrentMember: false,
      hasActiveDelegation: false,
      isDepartmentHead: false
    },
    {
      nodeId: 'department:creative-team',
      nodeType: 'department',
      memberId: null,
      departmentId: 'creative-team',
      contextDepartmentId: 'creative-team',
      displayName: 'Creative Operations',
      publicEmail: '',
      internalEmail: null,
      avatarUrl: null,
      roleTitle: null,
      roleCategory: 'unknown',
      departmentName: 'Creative Operations',
      contextDepartmentName: 'Creative Operations',
      parentDepartmentId: 'ejecutivo',
      parentDepartmentName: 'Ejecutivo',
      headMemberId: 'daniela-ferreira',
      headMemberName: 'Daniela Ferreira',
      businessUnit: 'globe',
      locationCountry: null,
      payRegime: null,
      supervisorMemberId: null,
      supervisorName: null,
      visualParentNodeId: 'department:ejecutivo',
      visualParentLabel: 'Ejecutivo',
      placementMode: 'department',
      depth: 1,
      directReportsCount: 0,
      subtreeSize: 0,
      memberCount: 1,
      childDepartmentCount: 0,
      active: true,
      isRoot: false,
      isCurrentMember: false,
      isDirectReportToCurrentMember: false,
      hasActiveDelegation: false,
      isDepartmentHead: false
    }
  ],
  members: [
    {
      memberId: 'julio-reyes',
      focusNodeId: 'department:ejecutivo',
      renderedNodeId: null,
      displayName: 'Julio Reyes',
      publicEmail: 'julio.reyes@efeonce.org',
      internalEmail: 'julio.reyes@efeonce.org',
      avatarUrl: null,
      roleTitle: 'Managing Director & GTM',
      roleCategory: 'strategy',
      departmentId: 'ejecutivo',
      departmentName: 'Ejecutivo',
      contextDepartmentId: 'ejecutivo',
      contextDepartmentName: 'Ejecutivo',
      supervisorMemberId: null,
      supervisorName: null,
      locationCountry: 'CL',
      payRegime: null,
      directReportsCount: 3,
      subtreeSize: 6,
      isCurrentMember: true,
      isDirectReportToCurrentMember: false,
      hasActiveDelegation: false,
      isDepartmentHead: true,
      placementMode: 'department'
    },
    {
      memberId: 'daniela-ferreira',
      focusNodeId: 'department:creative-team',
      renderedNodeId: null,
      displayName: 'Daniela Ferreira',
      publicEmail: 'dferreira@efeoncepro.com',
      internalEmail: null,
      avatarUrl: null,
      roleTitle: 'Creative Operations Lead',
      roleCategory: 'design',
      departmentId: 'creative-team',
      departmentName: 'Creative Operations',
      contextDepartmentId: 'creative-team',
      contextDepartmentName: 'Creative Operations',
      supervisorMemberId: 'julio-reyes',
      supervisorName: 'Julio Reyes',
      locationCountry: 'ES',
      payRegime: 'international',
      directReportsCount: 3,
      subtreeSize: 3,
      isCurrentMember: false,
      isDirectReportToCurrentMember: true,
      hasActiveDelegation: true,
      isDepartmentHead: true,
      placementMode: 'department'
    },
    {
      memberId: 'andres-carlosama',
      focusNodeId: 'member:andres-carlosama',
      renderedNodeId: 'member:andres-carlosama',
      displayName: 'Andres Carlosama',
      publicEmail: 'acarlosama@efeoncepro.com',
      internalEmail: null,
      avatarUrl: null,
      roleTitle: 'Senior Visual Designer',
      roleCategory: 'design',
      departmentId: null,
      departmentName: null,
      contextDepartmentId: 'creative-team',
      contextDepartmentName: 'Creative Operations',
      supervisorMemberId: 'daniela-ferreira',
      supervisorName: 'Daniela Ferreira',
      locationCountry: 'CO',
      payRegime: 'chile',
      directReportsCount: 0,
      subtreeSize: 0,
      isCurrentMember: false,
      isDirectReportToCurrentMember: false,
      hasActiveDelegation: false,
      isDepartmentHead: false,
      placementMode: 'inferred_department'
    }
  ],
  edges: [],
  breadcrumbs: [],
  memberOptions: [],
  summary: {
    totalNodes: 3,
    departments: 2,
    members: 3,
    roots: 1,
    maxDepth: 1,
    delegatedApprovals: 1
  }
}

describe('buildOrgLeadershipView', () => {
  it('keeps leaders as nodes and uses departments as metadata', () => {
    const view = buildOrgLeadershipView({
      payload,
      focusMemberId: 'julio-reyes'
    })

    expect(view.nodes.map(node => node.memberId)).toEqual(['julio-reyes', 'daniela-ferreira'])
    expect(view.edges).toEqual([
      {
        id: 'leader:julio-reyes-leader:daniela-ferreira',
        source: 'leader:julio-reyes',
        target: 'leader:daniela-ferreira'
      }
    ])
    expect(view.nodes.find(node => node.memberId === 'daniela-ferreira')?.associatedDepartments).toEqual([
      {
        departmentId: 'creative-team',
        name: 'Creative Operations',
        businessUnit: 'globe',
        memberCount: 1,
        childDepartmentCount: 0,
        isPrimary: true
      }
    ])
  })

  it('focuses the nearest leader when the selected person is not a leader', () => {
    const view = buildOrgLeadershipView({
      payload,
      focusMemberId: 'andres-carlosama'
    })

    expect(view.focusedLeaderMemberId).toBe('daniela-ferreira')
    expect(view.focusNodeId).toBe('leader:daniela-ferreira')
  })
})
