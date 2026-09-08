import { describe, expect, it } from 'vitest'

import { isCurrentInternalRoleAssignment, type CurrentRoleAssignment } from './current-role-assignments'

const now = new Date('2026-09-08T18:00:00Z')

const row: CurrentRoleAssignment = {
  role_code: 'efeonce_admin', active: true, status: 'active', scope_level: null,
  client_id: null, project_id: null, campaign_id: null,
  effective_from: '2026-09-01T00:00:00Z', effective_to: null
}

describe('current internal role authority', () => {
  it('accepts the existing unscoped writer and restricts a client role to that client', () => {
    expect(isCurrentInternalRoleAssignment(row, null, now)).toBe(true)
    const scoped = { ...row, client_id: 'client-b', scope_level: 'client' }

    expect(isCurrentInternalRoleAssignment(scoped, 'client-b', now)).toBe(true)
    expect(isCurrentInternalRoleAssignment(scoped, 'client-a', now)).toBe(false)
    expect(isCurrentInternalRoleAssignment(scoped, null, now)).toBe(false)
  })
  it.each<Partial<CurrentRoleAssignment>>([
    { active: false }, { status: 'revoked' }, { effective_from: '2026-09-09T00:00:00Z' },
    { effective_to: now.toISOString() }, { effective_from: 'invalid' }, { effective_to: 'invalid' },
    { scope_level: 'unknown' }, { project_id: 'project-b' }, { campaign_id: 'campaign-b' },
    { role_code: 'unknown_admin' }
  ])('does not turn inactive, future, expired or narrow roles into global authority: %j', change => {
    expect(isCurrentInternalRoleAssignment({ ...row, ...change }, null, now)).toBe(false)
  })
})
