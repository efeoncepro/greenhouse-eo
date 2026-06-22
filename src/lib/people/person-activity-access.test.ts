import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PeopleActivitySubject } from './person-activity-access'

// ── Mocks de las primitivas canónicas (un primitive, muchos consumers) ───────────────────────
const runGreenhousePostgresQuery = vi.fn()
const canAccessPeopleModule = vi.fn()
const getSupervisorScopeForTenant = vi.fn()
const getPersonAccess = vi.fn()
const assertMemberVisibleInPeopleScope = vi.fn()
const getPersonIcoProfile = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/tenant/authorization', () => ({
  canAccessPeopleModule: (...args: unknown[]) => canAccessPeopleModule(...args)
}))

vi.mock('@/lib/reporting-hierarchy/access', () => ({
  getSupervisorScopeForTenant: (...args: unknown[]) => getSupervisorScopeForTenant(...args)
}))

vi.mock('@/lib/people/permissions', () => ({
  getPersonAccess: (...args: unknown[]) => getPersonAccess(...args)
}))

vi.mock('@/lib/people/access-scope', () => ({
  assertMemberVisibleInPeopleScope: (...args: unknown[]) => assertMemberVisibleInPeopleScope(...args)
}))

vi.mock('@/lib/person-360/get-person-ico-profile', () => ({
  getPersonIcoProfile: (...args: unknown[]) => getPersonIcoProfile(...args)
}))

import {
  readMemberIcoProfileForSubject,
  resolvePeopleActivityScope
} from './person-activity-access'

const adminSubject = (overrides: Partial<PeopleActivitySubject> = {}): PeopleActivitySubject => ({
  userId: 'user-admin',
  tenantType: 'efeonce_internal',
  memberId: 'member-admin',
  roleCodes: ['efeonce_admin'],
  routeGroups: ['internal'],
  organizationId: null,
  ...overrides
})

const clientSubject = (): PeopleActivitySubject => ({
  userId: 'user-client',
  tenantType: 'client',
  memberId: null,
  roleCodes: ['client_executive'],
  routeGroups: ['client'],
  organizationId: 'org-1'
})

const supervisorSubject = (): PeopleActivitySubject => ({
  userId: 'user-sup',
  tenantType: 'efeonce_internal',
  memberId: 'member-sup',
  roleCodes: ['collaborator'],
  routeGroups: ['my'],
  organizationId: null
})

const profile = (memberId: string) => ({
  memberId,
  hasData: true,
  current: { periodYear: 2026, periodMonth: 6, otdPct: 88, rpaAvg: 72, ftrPct: 80 },
  trend: [],
  health: 'green' as const
})

beforeEach(() => {
  runGreenhousePostgresQuery.mockReset()
  canAccessPeopleModule.mockReset()
  getSupervisorScopeForTenant.mockReset()
  getPersonAccess.mockReset()
  assertMemberVisibleInPeopleScope.mockReset()
  getPersonIcoProfile.mockReset()

  // Defaults: broad admin con canViewActivity.
  canAccessPeopleModule.mockReturnValue(false)
  getPersonAccess.mockReturnValue({ canViewActivity: true })
  assertMemberVisibleInPeopleScope.mockResolvedValue(undefined)
})

describe('resolvePeopleActivityScope', () => {
  it('niega a tenants cliente (anti-oracle gate 1)', async () => {
    const scope = await resolvePeopleActivityScope(clientSubject())

    expect(scope.canViewActivity).toBe(false)
    expect(scope.accessContext).toBeNull()
    expect(canAccessPeopleModule).not.toHaveBeenCalled()
  })

  it('da acceso broad a un interno con módulo People', async () => {
    canAccessPeopleModule.mockReturnValue(true)

    const scope = await resolvePeopleActivityScope(adminSubject())

    expect(scope.canViewActivity).toBe(true)
    expect(scope.accessContext?.accessMode).toBe('broad')
    expect(getSupervisorScopeForTenant).not.toHaveBeenCalled()
  })

  it('cae a supervisor scope cuando no es broad pero tiene reportes', async () => {
    canAccessPeopleModule.mockReturnValue(false)
    getSupervisorScopeForTenant.mockResolvedValue({
      visibleMemberIds: ['member-sup', 'member-9'],
      canAccessSupervisorPeople: true
    })

    const scope = await resolvePeopleActivityScope(supervisorSubject())

    expect(scope.canViewActivity).toBe(true)
    expect(scope.accessContext?.accessMode).toBe('supervisor')
  })

  it('niega si no es broad ni supervisor', async () => {
    canAccessPeopleModule.mockReturnValue(false)
    getSupervisorScopeForTenant.mockResolvedValue({ visibleMemberIds: [], canAccessSupervisorPeople: false })

    const scope = await resolvePeopleActivityScope(supervisorSubject())

    expect(scope.canViewActivity).toBe(false)
  })

  it('niega si tiene módulo pero no la capability canViewActivity (ej. finance_admin)', async () => {
    canAccessPeopleModule.mockReturnValue(true)
    getPersonAccess.mockReturnValue({ canViewActivity: false })

    const scope = await resolvePeopleActivityScope(adminSubject({ roleCodes: ['finance_admin'] }))

    expect(scope.canViewActivity).toBe(false)
    expect(scope.accessContext).toBeNull()
  })
})

describe('readMemberIcoProfileForSubject', () => {
  it('forbidden cuando el subject no puede ver actividad', async () => {
    const result = await readMemberIcoProfileForSubject(clientSubject(), 'Daniela')

    expect(result.status).toBe('forbidden')
    expect(getPersonIcoProfile).not.toHaveBeenCalled()
  })

  it('found + profile para broad admin que nombra a una persona visible', async () => {
    canAccessPeopleModule.mockReturnValue(true)
    runGreenhousePostgresQuery.mockResolvedValue([{ member_id: 'member-9', display_name: 'Daniela Ferreira' }])
    getPersonIcoProfile.mockResolvedValue(profile('member-9'))

    const result = await readMemberIcoProfileForSubject(adminSubject(), 'Daniela')

    expect(result.status).toBe('ok')

    if (result.status === 'ok') {
      expect(result.memberId).toBe('member-9')
      expect(result.displayName).toBe('Daniela Ferreira')
      expect(result.profile.current?.otdPct).toBe(88)
    }

    expect(getPersonIcoProfile).toHaveBeenCalledWith('member-9', 6, { organizationId: null })
  })

  it('not_found uniforme cuando no hay match (anti-oracle)', async () => {
    canAccessPeopleModule.mockReturnValue(true)
    runGreenhousePostgresQuery.mockResolvedValue([])

    const result = await readMemberIcoProfileForSubject(adminSubject(), 'Nadie')

    expect(result.status).toBe('not_found')
    expect(getPersonIcoProfile).not.toHaveBeenCalled()
  })

  it('ambiguous cuando hay varias coincidencias parciales sin exacta', async () => {
    canAccessPeopleModule.mockReturnValue(true)
    runGreenhousePostgresQuery.mockResolvedValue([
      { member_id: 'm-1', display_name: 'Daniela Ferreira' },
      { member_id: 'm-2', display_name: 'Daniela Soto' }
    ])

    const result = await readMemberIcoProfileForSubject(adminSubject(), 'Daniela')

    expect(result.status).toBe('ambiguous')

    if (result.status === 'ambiguous') {
      expect(result.candidates).toHaveLength(2)
    }

    expect(getPersonIcoProfile).not.toHaveBeenCalled()
  })

  it('match exacto de nombre gana sobre parciales (no es ambiguo)', async () => {
    canAccessPeopleModule.mockReturnValue(true)
    runGreenhousePostgresQuery.mockResolvedValue([
      { member_id: 'm-1', display_name: 'Daniela' },
      { member_id: 'm-2', display_name: 'Daniela Ferreira' }
    ])
    getPersonIcoProfile.mockResolvedValue(profile('m-1'))

    const result = await readMemberIcoProfileForSubject(adminSubject(), 'Daniela')

    expect(result.status).toBe('ok')
    if (result.status === 'ok') expect(result.memberId).toBe('m-1')
  })

  it('not_found si el gate de visibilidad final rechaza (defensa en profundidad)', async () => {
    canAccessPeopleModule.mockReturnValue(true)
    runGreenhousePostgresQuery.mockResolvedValue([{ member_id: 'member-9', display_name: 'Daniela Ferreira' }])
    assertMemberVisibleInPeopleScope.mockRejectedValue(new Error('Person not found.'))

    const result = await readMemberIcoProfileForSubject(adminSubject(), 'Daniela')

    expect(result.status).toBe('not_found')
    expect(getPersonIcoProfile).not.toHaveBeenCalled()
  })

  it('acota el lookup a visibleMemberIds en modo supervisor', async () => {
    canAccessPeopleModule.mockReturnValue(false)
    getSupervisorScopeForTenant.mockResolvedValue({
      visibleMemberIds: ['member-sup', 'member-9'],
      canAccessSupervisorPeople: true
    })
    runGreenhousePostgresQuery.mockResolvedValue([{ member_id: 'member-9', display_name: 'Daniela Ferreira' }])
    getPersonIcoProfile.mockResolvedValue(profile('member-9'))

    await readMemberIcoProfileForSubject(supervisorSubject(), 'Daniela')

    // La query recibió el array de scope como segundo binding.
    const call = runGreenhousePostgresQuery.mock.calls[0]

    expect(call?.[1]).toContainEqual(['member-sup', 'member-9'])
  })
})
