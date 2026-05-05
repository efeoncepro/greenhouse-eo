import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  query: vi.fn()
}))

import { query } from '@/lib/db'

import { resolveRoleTitle } from './resolver'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>

describe('TASK-785 resolveRoleTitle — internal_profile', () => {
  beforeEach(() => mockedQuery.mockReset())

  it('prefers members.role_title when set with hr_manual source', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        member_id: 'm-1',
        role_title: 'Senior Designer',
        role_title_source: 'hr_manual',
        identity_job_title: 'Designer'
      }
    ])

    const r = await resolveRoleTitle({ memberId: 'm-1', context: 'internal_profile' })

    expect(r.value).toBe('Senior Designer')
    expect(r.source).toBe('hr_manual')
    expect(r.hasDriftWithEntra).toBe(true) // members != entra + source=hr_manual
  })

  it('falls back to identity_profiles.job_title when member.role_title null', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        member_id: 'm-2',
        role_title: null,
        role_title_source: 'unset',
        identity_job_title: 'Manager'
      }
    ])

    const r = await resolveRoleTitle({ memberId: 'm-2', context: 'internal_profile' })

    expect(r.value).toBe('Manager')
    expect(r.source).toBe('entra')
    expect(r.hasDriftWithEntra).toBe(false)
  })

  it('returns null when both sources are null', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        member_id: 'm-3',
        role_title: null,
        role_title_source: 'unset',
        identity_job_title: null
      }
    ])

    const r = await resolveRoleTitle({ memberId: 'm-3', context: 'internal_profile' })

    expect(r.value).toBeNull()
    expect(r.source).toBe('unset')
  })

  it('does NOT report drift when source is entra (not hr_manual)', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        member_id: 'm-4',
        role_title: 'Designer',
        role_title_source: 'entra',
        identity_job_title: 'Designer'
      }
    ])

    const r = await resolveRoleTitle({ memberId: 'm-4', context: 'internal_profile' })

    expect(r.hasDriftWithEntra).toBe(false)
  })

  it('returns unset when member not found', async () => {
    mockedQuery.mockResolvedValueOnce([])

    const r = await resolveRoleTitle({ memberId: 'missing', context: 'internal_profile' })

    expect(r.value).toBeNull()
    expect(r.source).toBe('unset')
  })
})

describe('TASK-785 resolveRoleTitle — client_assignment', () => {
  beforeEach(() => mockedQuery.mockReset())

  it('returns assignment override when set', async () => {
    mockedQuery
      .mockResolvedValueOnce([
        {
          member_id: 'm-5',
          role_title: 'Designer',
          role_title_source: 'hr_manual',
          identity_job_title: 'Designer'
        }
      ])
      .mockResolvedValueOnce([{ role_title_override: 'Brand Designer' }])

    const r = await resolveRoleTitle({
      memberId: 'm-5',
      context: 'client_assignment',
      assignmentId: 'a-1'
    })

    expect(r.value).toBe('Brand Designer')
    expect(r.assignmentOverride).toBe('Brand Designer')
    expect(r.sourceLabel).toContain('asignacion')
  })

  it('falls back to base role title when no override', async () => {
    mockedQuery
      .mockResolvedValueOnce([
        {
          member_id: 'm-6',
          role_title: 'Designer',
          role_title_source: 'hr_manual',
          identity_job_title: 'Designer'
        }
      ])
      .mockResolvedValueOnce([{ role_title_override: null }])
      .mockResolvedValueOnce([
        {
          member_id: 'm-6',
          role_title: 'Designer',
          role_title_source: 'hr_manual',
          identity_job_title: 'Designer'
        }
      ])

    const r = await resolveRoleTitle({
      memberId: 'm-6',
      context: 'client_assignment',
      assignmentId: 'a-2'
    })

    expect(r.value).toBe('Designer')
    expect(r.assignmentOverride).toBeNull()
  })
})

describe('TASK-785 resolveRoleTitle — identity_admin', () => {
  beforeEach(() => mockedQuery.mockReset())

  it('returns identity_profiles.job_title (Entra) regardless of HR override', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        member_id: 'm-7',
        role_title: 'HR-overriden Title',
        role_title_source: 'hr_manual',
        identity_job_title: 'Original Entra Title'
      }
    ])

    const r = await resolveRoleTitle({ memberId: 'm-7', context: 'identity_admin' })

    expect(r.value).toBe('Original Entra Title')
    expect(r.source).toBe('entra')
    expect(r.hasDriftWithEntra).toBe(true) // for awareness
  })
})
