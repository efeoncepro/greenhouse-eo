import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  runHrCoreQueryMock,
  assertHrCoreInfrastructureReadyMock,
  createDepartmentInPostgresMock,
  getDepartmentByIdFromPostgresMock,
  getMemberDepartmentContextFromPostgresMock,
  listDepartmentHeadOptionsFromPostgresMock,
  assertReportingLineChangeAllowedMock,
  publishOutboxEventMock,
  runGreenhousePostgresQueryMock,
  upsertReportingLineMock,
  updateMemberDepartmentContextInPostgresMock
} = vi.hoisted(() => {
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret'

  return {
    runHrCoreQueryMock: vi.fn(),
    assertHrCoreInfrastructureReadyMock: vi.fn(async () => undefined),
    createDepartmentInPostgresMock: vi.fn(),
    getDepartmentByIdFromPostgresMock: vi.fn(),
    getMemberDepartmentContextFromPostgresMock: vi.fn(),
    listDepartmentHeadOptionsFromPostgresMock: vi.fn(),
    assertReportingLineChangeAllowedMock: vi.fn(async () => undefined),
    publishOutboxEventMock: vi.fn(async (...args: unknown[]) => {
      void args

      return 'outbox-test'
    }),
    runGreenhousePostgresQueryMock: vi.fn(async (...args: unknown[]) => {
      void args

      return []
    }),
    upsertReportingLineMock: vi.fn(async () => undefined),
    updateMemberDepartmentContextInPostgresMock: vi.fn()
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

vi.mock('@/lib/postgres/client', async () => {
  const actual = await vi.importActual('@/lib/postgres/client')

  return {
    ...actual,
    runGreenhousePostgresQuery: (...args: unknown[]) => runGreenhousePostgresQueryMock(...args)
  }
})

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishOutboxEventMock(...args)
}))

vi.mock('@/lib/reporting-hierarchy/store', () => ({
  assertReportingLineChangeAllowed: assertReportingLineChangeAllowedMock,
  upsertReportingLine: upsertReportingLineMock
}))

vi.mock('@/lib/hr-core/postgres-departments-store', () => ({
  createDepartmentInPostgres: (...args: unknown[]) => createDepartmentInPostgresMock(...args),
  getDepartmentByIdFromPostgres: (...args: unknown[]) => getDepartmentByIdFromPostgresMock(...args),
  getMemberDepartmentContextFromPostgres: (...args: unknown[]) => getMemberDepartmentContextFromPostgresMock(...args),
  listDepartmentHeadOptionsFromPostgres: (...args: unknown[]) => listDepartmentHeadOptionsFromPostgresMock(...args),
  listDepartmentsFromPostgres: vi.fn(),
  updateDepartmentInPostgres: vi.fn(),
  updateMemberDepartmentContextInPostgres: (...args: unknown[]) => updateMemberDepartmentContextInPostgresMock(...args)
}))

import { createDepartment, isHrLeavePostgresFallbackError, listDepartmentHeadOptions, updateMemberHrProfile } from '@/lib/hr-core/service'

describe('updateMemberHrProfile', () => {
  beforeEach(() => {
    runHrCoreQueryMock.mockReset()
    assertHrCoreInfrastructureReadyMock.mockClear()
    getDepartmentByIdFromPostgresMock.mockReset()
    getMemberDepartmentContextFromPostgresMock.mockReset()
    assertReportingLineChangeAllowedMock.mockClear()
    publishOutboxEventMock.mockClear()
    runGreenhousePostgresQueryMock.mockClear()
    upsertReportingLineMock.mockClear()
    updateMemberDepartmentContextInPostgresMock.mockReset()
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
    expect(upsertReportingLineMock).not.toHaveBeenCalled()
  })

  it('updates department assignment in Postgres without touching BigQuery team_members.department_id', async () => {
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

    getMemberDepartmentContextFromPostgresMock.mockResolvedValue({
      departmentId: null,
      departmentName: null
    })
    getDepartmentByIdFromPostgresMock.mockResolvedValue({
      departmentId: 'creative-team',
      name: 'Creative Team',
      description: null,
      parentDepartmentId: null,
      headMemberId: null,
      headMemberName: null,
      businessUnit: 'globe',
      active: true,
      sortOrder: 1
    })

    await updateMemberHrProfile({
      memberId: 'member-1',
      input: {
        departmentId: 'creative-team'
      },
      actorUserId: 'user-1'
    })

    expect(runHrCoreQueryMock).toHaveBeenCalledTimes(1)
    expect(updateMemberDepartmentContextInPostgresMock).toHaveBeenCalledWith({
      memberId: 'member-1',
      departmentId: 'creative-team'
    })
    expect(upsertReportingLineMock).not.toHaveBeenCalled()
  })

  it('routes reportsTo changes through the reporting hierarchy store', async () => {
    runHrCoreQueryMock
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          display_name: 'Daniela Ferreira',
          email: 'dferreira@efeoncepro.com',
          identity_profile_id: null,
          reports_to: 'member-2'
        }
      ])
      .mockResolvedValueOnce([])

    await updateMemberHrProfile({
      memberId: 'member-1',
      input: {
        reportsTo: 'member-3'
      },
      actorUserId: 'user-1'
    })

    expect(assertReportingLineChangeAllowedMock).toHaveBeenCalledWith({
      memberId: 'member-1',
      supervisorMemberId: 'member-3'
    })
    expect(upsertReportingLineMock).toHaveBeenCalledWith({
      memberId: 'member-1',
      supervisorMemberId: 'member-3',
      actorUserId: 'user-1',
      reason: 'hr_core_profile_update',
      sourceSystem: 'hr_core_profile_update',
      sourceMetadata: {
        actor: 'updateMemberHrProfile'
      }
    })
    expect(runGreenhousePostgresQueryMock).not.toHaveBeenCalledWith(
      expect.stringContaining('reports_to_member_id'),
      expect.anything()
    )
  })
})

describe('createDepartment', () => {
  beforeEach(() => {
    createDepartmentInPostgresMock.mockReset()
  })

  it('delegates department creation to the Postgres store', async () => {
    createDepartmentInPostgresMock.mockResolvedValue({
      departmentId: 'creative-team',
      name: 'Creative Team',
      description: 'Equipo creativo',
      parentDepartmentId: null,
      headMemberId: 'member-1',
      headMemberName: 'Daniela Ferreira',
      businessUnit: 'globe',
      active: true,
      sortOrder: 1
    })

    const created = await createDepartment({
      name: 'Creative Team',
      description: 'Equipo creativo',
      parentDepartmentId: null,
      headMemberId: 'member-1',
      businessUnit: 'globe',
      active: true,
      sortOrder: 1
    })

    expect(created.departmentId).toBe('creative-team')
    expect(createDepartmentInPostgresMock).toHaveBeenCalledWith({
      name: 'Creative Team',
      description: 'Equipo creativo',
      parentDepartmentId: null,
      headMemberId: 'member-1',
      businessUnit: 'globe',
      active: true,
      sortOrder: 1
    })
  })
})

describe('listDepartmentHeadOptions', () => {
  beforeEach(() => {
    listDepartmentHeadOptionsFromPostgresMock.mockReset()
  })

  it('delegates department head options to the Postgres store', async () => {
    listDepartmentHeadOptionsFromPostgresMock.mockResolvedValue([
      {
        memberId: 'member-1',
        displayName: 'Daniela Ferreira',
        roleTitle: 'Creative Lead'
      }
    ])

    const members = await listDepartmentHeadOptions()

    expect(members).toEqual([
      {
        memberId: 'member-1',
        displayName: 'Daniela Ferreira',
        roleTitle: 'Creative Lead'
      }
    ])
    expect(listDepartmentHeadOptionsFromPostgresMock).toHaveBeenCalledTimes(1)
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
