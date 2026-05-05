import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import { isKnownShortcutKey, SHORTCUT_CATALOG } from './catalog'
import {
  resolveAvailableShortcuts,
  resolveRecommendedShortcuts,
  validateShortcutAccess
} from './resolver'

const baseSubject = (overrides: Partial<TenantEntitlementSubject> = {}): TenantEntitlementSubject => ({
  userId: 'user-test',
  tenantType: 'efeonce_internal',
  roleCodes: [],
  primaryRoleCode: ROLE_CODES.COLLABORATOR,
  routeGroups: [],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  portalHomePath: '/home',
  ...overrides
})

describe('shortcuts resolver', () => {
  it('admin sees the full catalog audience-ordered', () => {
    const subject = baseSubject({
      roleCodes: [ROLE_CODES.EFEONCE_ADMIN],
      primaryRoleCode: ROLE_CODES.EFEONCE_ADMIN,
      routeGroups: ['internal', 'admin', 'finance', 'hr', 'people', 'agency', 'my']
    })

    const available = resolveAvailableShortcuts(subject)
    const recommended = resolveRecommendedShortcuts(subject, 4)

    expect(available.length).toBeGreaterThanOrEqual(7)
    expect(recommended).toHaveLength(4)
    expect(recommended[0]?.key).toBe('admin-center')
  })

  it('client tenant only sees client-portal', () => {
    const subject = baseSubject({
      tenantType: 'client',
      roleCodes: [ROLE_CODES.CLIENT_EXECUTIVE],
      primaryRoleCode: ROLE_CODES.CLIENT_EXECUTIVE,
      routeGroups: ['client']
    })

    const available = resolveAvailableShortcuts(subject)
    const recommended = resolveRecommendedShortcuts(subject)

    expect(available.map(shortcut => shortcut.key)).toEqual(['client-portal'])
    expect(recommended.map(shortcut => shortcut.key)).toEqual(['client-portal'])
  })

  it('finance audience surfaces finance shortcuts first', () => {
    const subject = baseSubject({
      roleCodes: [ROLE_CODES.FINANCE_ADMIN],
      primaryRoleCode: ROLE_CODES.FINANCE_ADMIN,
      routeGroups: ['finance']
    })

    const recommended = resolveRecommendedShortcuts(subject, 4)

    expect(recommended[0]?.module).toBe('finance')
    expect(recommended[0]?.key).toBe('finance')
    expect(recommended.map(shortcut => shortcut.module)).toContain('finance')
  })

  it('hr audience favors hr shortcuts', () => {
    const subject = baseSubject({
      roleCodes: [ROLE_CODES.HR_PAYROLL],
      primaryRoleCode: ROLE_CODES.HR_PAYROLL,
      routeGroups: ['hr']
    })

    const recommended = resolveRecommendedShortcuts(subject, 4)

    expect(recommended[0]?.key).toBe('hr')
    expect(recommended.some(shortcut => shortcut.key === 'hr-leave')).toBe(true)
  })

  it('collaborator without route_group sees only home-level shortcuts', () => {
    const subject = baseSubject({
      tenantType: 'efeonce_internal',
      roleCodes: [ROLE_CODES.COLLABORATOR],
      primaryRoleCode: ROLE_CODES.COLLABORATOR,
      routeGroups: ['my']
    })

    const recommended = resolveRecommendedShortcuts(subject, 4)
    const available = resolveAvailableShortcuts(subject)

    expect(recommended.length).toBeGreaterThanOrEqual(1)
    expect(recommended[0]?.key).toBe('my-workspace')
    // Collaborator without finance/hr/agency route_groups must NOT see those.
    expect(available.find(shortcut => shortcut.module === 'finance')).toBeUndefined()
    expect(available.find(shortcut => shortcut.module === 'agency')).toBeUndefined()
  })

  it('respects view-code gate when declared on a shortcut', () => {
    const subject = baseSubject({
      roleCodes: [ROLE_CODES.COLLABORATOR],
      primaryRoleCode: ROLE_CODES.COLLABORATOR,
      routeGroups: ['my'],
      authorizedViews: ['equipo.personas']
    })

    // people module visibility comes from the authorized view (no people
    // route_group). Without the view, people shortcut would not surface.
    const subjectWithoutView = baseSubject({
      roleCodes: [ROLE_CODES.COLLABORATOR],
      primaryRoleCode: ROLE_CODES.COLLABORATOR,
      routeGroups: ['my']
    })

    const withView = resolveAvailableShortcuts(subject)
    const withoutView = resolveAvailableShortcuts(subjectWithoutView)

    expect(withView.find(shortcut => shortcut.key === 'people')).toBeDefined()
    expect(withoutView.find(shortcut => shortcut.key === 'people')).toBeUndefined()
  })

  it('validateShortcutAccess returns true for accessible keys and false otherwise', () => {
    const subject = baseSubject({
      roleCodes: [ROLE_CODES.FINANCE_ADMIN],
      primaryRoleCode: ROLE_CODES.FINANCE_ADMIN,
      routeGroups: ['finance']
    })

    expect(validateShortcutAccess(subject, 'finance')).toBe(true)
    expect(validateShortcutAccess(subject, 'finance-bank')).toBe(true)
    expect(validateShortcutAccess(subject, 'admin-center')).toBe(false)
    expect(validateShortcutAccess(subject, 'unknown-shortcut-key')).toBe(false)
  })

  it('every catalog entry is a known key', () => {
    for (const shortcut of SHORTCUT_CATALOG) {
      expect(isKnownShortcutKey(shortcut.key)).toBe(true)
    }

    expect(isKnownShortcutKey('not-in-catalog')).toBe(false)
  })

  it('respects the audience top-N limit', () => {
    const subject = baseSubject({
      roleCodes: [ROLE_CODES.EFEONCE_ADMIN],
      primaryRoleCode: ROLE_CODES.EFEONCE_ADMIN,
      routeGroups: ['internal', 'admin', 'finance', 'hr', 'people', 'agency', 'my']
    })

    expect(resolveRecommendedShortcuts(subject, 1)).toHaveLength(1)
    expect(resolveRecommendedShortcuts(subject, 6)).toHaveLength(6)
    // limit <= 0 falls back to default (4) — never throws.
    expect(resolveRecommendedShortcuts(subject, 0)).toHaveLength(4)
  })
})
