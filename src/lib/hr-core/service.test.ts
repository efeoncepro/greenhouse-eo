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

import { updateMemberHrProfile } from '@/lib/hr-core/service'

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
