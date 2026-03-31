import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runHrCoreQueryMock, assertHrCoreInfrastructureReadyMock } = vi.hoisted(() => {
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret'

  return {
    runHrCoreQueryMock: vi.fn(),
    assertHrCoreInfrastructureReadyMock: vi.fn(async () => undefined)
  }
})

vi.mock('@/lib/hr-core/schema', async () => {
  const actual = await vi.importActual('@/lib/hr-core/schema')

  return {
    ...actual,
    assertHrCoreInfrastructureReady: assertHrCoreInfrastructureReadyMock
  }
})

vi.mock('@/lib/hr-core/shared', async () => {
  const actual = await vi.importActual('@/lib/hr-core/shared')

  return {
    ...actual,
    getHrCoreProjectId: () => 'test-project',
    runHrCoreQuery: runHrCoreQueryMock
  }
})

vi.mock('@/lib/people/shared', () => ({
  getPeopleTableColumns: vi.fn(async () => new Set(['reports_to']))
}))

import { createDepartment, isHrLeavePostgresFallbackError, updateMemberHrProfile } from '@/lib/hr-core/service'

describe('updateMemberHrProfile', () => {
  beforeEach(() => {
    runHrCoreQueryMock.mockReset()
    assertHrCoreInfrastructureReadyMock.mockClear()
  })

  it('updates only team_members when only hireDate changes', async () => {
    runHrCoreQueryMock
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          display_name: 'Daniela Ferreira',
          email: 'dferreira@efeoncepro.com',
          identity_profile_id: null,
          reports_to: null
        }
      ])
      .mockResolvedValueOnce([])

    await updateMemberHrProfile({
      memberId: 'member-1',
      input: {
        hireDate: '2024-12-15'
      },
      actorUserId: 'user-1'
    })

    expect(runHrCoreQueryMock).toHaveBeenCalledTimes(2)
    expect(runHrCoreQueryMock.mock.calls[1]?.[0]).toContain('UPDATE `test-project.greenhouse.team_members`')
    expect(runHrCoreQueryMock.mock.calls[1]?.[0]).not.toContain('member_profiles')
    expect(runHrCoreQueryMock.mock.calls[1]?.[1]).toEqual({
      memberId: 'member-1',
      hireDate: '2024-12-15'
    })
  })
})

describe('createDepartment', () => {
  beforeEach(() => {
    runHrCoreQueryMock.mockReset()
    assertHrCoreInfrastructureReadyMock.mockClear()
  })

  it('passes explicit STRING types for nullable department fields', async () => {
    runHrCoreQueryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          department_id: 'creative-team',
          name: 'Creative Team',
          description: 'Equipo creativo',
          parent_department_id: null,
          head_member_id: 'member-1',
          head_member_name: 'Daniela Ferreira',
          business_unit: 'globe',
          active: true,
          sort_order: 1
        }
      ])

    await createDepartment({
      name: 'Creative Team',
      description: 'Equipo creativo',
      parentDepartmentId: null,
      headMemberId: 'member-1',
      businessUnit: 'globe',
      active: true,
      sortOrder: 1
    })

    expect(runHrCoreQueryMock).toHaveBeenCalledTimes(3)
    expect(runHrCoreQueryMock.mock.calls[1]?.[0]).toContain('INSERT INTO `test-project.greenhouse.departments`')
    expect(runHrCoreQueryMock.mock.calls[1]?.[1]).toEqual({
      departmentId: 'creative-team',
      name: 'Creative Team',
      description: 'Equipo creativo',
      parentDepartmentId: null,
      headMemberId: 'member-1',
      businessUnit: 'globe',
      active: true,
      sortOrder: 1
    })
    expect(runHrCoreQueryMock.mock.calls[1]?.[2]).toEqual({
      description: 'STRING',
      parentDepartmentId: 'STRING',
      headMemberId: 'STRING'
    })
  })
})

describe('isHrLeavePostgresFallbackError', () => {
  it('treats missing postgres columns as recoverable schema drift', () => {
    expect(
      isHrLeavePostgresFallbackError({
        code: '42703',
        message: 'column r.attachment_asset_id does not exist'
      })
    ).toBe(true)
  })

  it('treats missing relations as recoverable schema drift', () => {
    expect(
      isHrLeavePostgresFallbackError({
        code: '42P01',
        message: 'relation greenhouse_core.assets does not exist'
      })
    ).toBe(true)
  })
})
