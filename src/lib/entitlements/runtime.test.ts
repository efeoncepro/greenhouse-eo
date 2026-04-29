import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'
import { can, canSeeModule, getTenantEntitlements } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

const buildSubject = (overrides: Partial<TenantEntitlementSubject> = {}): TenantEntitlementSubject => ({
  userId: 'user-1',
  tenantType: 'efeonce_internal',
  roleCodes: [ROLE_CODES.COLLABORATOR],
  primaryRoleCode: ROLE_CODES.COLLABORATOR,
  routeGroups: ['my'],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  portalHomePath: '/home',
  ...overrides
})

describe('getTenantEntitlements', () => {
  it('grants broad workspace access to superadmins', () => {
    const entitlements = getTenantEntitlements(buildSubject({
      roleCodes: [ROLE_CODES.EFEONCE_ADMIN, ROLE_CODES.COLLABORATOR],
      primaryRoleCode: ROLE_CODES.EFEONCE_ADMIN,
      routeGroups: ['internal', 'admin', 'client', 'finance', 'hr', 'people', 'my', 'ai_tooling']
    }))

    expect(entitlements.audienceKey).toBe('admin')
    expect(entitlements.startupPolicyKey).toBe('internal_default')
    expect(can(entitlements, 'admin.workspace', 'manage', 'all')).toBe(true)
    expect(can(entitlements, 'agency.workspace', 'launch', 'tenant')).toBe(true)
    expect(can(entitlements, 'finance.status', 'read', 'tenant')).toBe(true)
    expect(canSeeModule(entitlements, 'people')).toBe(true)
    expect(canSeeModule(entitlements, 'client_portal')).toBe(true)
    expect(canSeeModule(entitlements, 'ai_tooling')).toBe(true)
  })

  it('bridges authorized views into people and hr entitlements without finance access', () => {
    const entitlements = getTenantEntitlements(buildSubject({
      roleCodes: [ROLE_CODES.HR_MANAGER],
      primaryRoleCode: ROLE_CODES.HR_MANAGER,
      routeGroups: ['hr'],
      authorizedViews: ['equipo.personas', 'equipo.organigrama']
    }))

    expect(entitlements.audienceKey).toBe('hr')
    expect(entitlements.startupPolicyKey).toBe('hr_workspace')
    expect(can(entitlements, 'hr.workspace', 'launch', 'tenant')).toBe(true)
    expect(can(entitlements, 'hr.org_chart', 'read', 'tenant')).toBe(true)
    expect(can(entitlements, 'hr.leave_balance', 'read', 'tenant')).toBe(true)
    expect(can(entitlements, 'hr.leave_backfill', 'create', 'tenant')).toBe(true)
    expect(can(entitlements, 'hr.leave_adjustment', 'update', 'tenant')).toBe(true)
    expect(can(entitlements, 'people.directory', 'read', 'tenant')).toBe(true)
    expect(can(entitlements, 'finance.status', 'read', 'tenant')).toBe(false)
  })

  it('keeps finance users in the finance audience and grants finance status', () => {
    const entitlements = getTenantEntitlements(buildSubject({
      roleCodes: [ROLE_CODES.FINANCE_ANALYST],
      primaryRoleCode: ROLE_CODES.FINANCE_ANALYST,
      routeGroups: ['finance']
    }))

    expect(entitlements.audienceKey).toBe('finance')
    expect(entitlements.startupPolicyKey).toBe('finance_workspace')
    expect(can(entitlements, 'finance.workspace', 'launch', 'tenant')).toBe(true)
    expect(can(entitlements, 'finance.status', 'read', 'tenant')).toBe(true)
    expect(can(entitlements, 'finance.payment_instruments.read', 'read', 'tenant')).toBe(true)
    expect(can(entitlements, 'finance.payment_instruments.update', 'update', 'tenant')).toBe(false)
    expect(canSeeModule(entitlements, 'finance')).toBe(true)
  })

  it('grants payment instrument admin capabilities only to finance admins and superadmins', () => {
    const financeAdminEntitlements = getTenantEntitlements(buildSubject({
      roleCodes: [ROLE_CODES.FINANCE_ADMIN],
      primaryRoleCode: ROLE_CODES.FINANCE_ADMIN,
      routeGroups: ['finance']
    }))

    const superadminEntitlements = getTenantEntitlements(buildSubject({
      roleCodes: [ROLE_CODES.EFEONCE_ADMIN],
      primaryRoleCode: ROLE_CODES.EFEONCE_ADMIN,
      routeGroups: ['admin', 'finance']
    }))

    expect(can(financeAdminEntitlements, 'finance.payment_instruments.update', 'update', 'tenant')).toBe(true)
    expect(can(financeAdminEntitlements, 'finance.payment_instruments.manage_defaults', 'manage', 'tenant')).toBe(true)
    expect(can(financeAdminEntitlements, 'finance.payment_instruments.reveal_sensitive', 'read', 'tenant')).toBe(false)
    expect(can(superadminEntitlements, 'finance.payment_instruments.reveal_sensitive', 'read', 'tenant')).toBe(true)
  })

  it('keeps pure collaborators in my workspace', () => {
    const entitlements = getTenantEntitlements(buildSubject())

    expect(entitlements.audienceKey).toBe('collaborator')
    expect(entitlements.startupPolicyKey).toBe('my_workspace')
    expect(can(entitlements, 'my_workspace.workspace', 'launch', 'own')).toBe(true)
    expect(canSeeModule(entitlements, 'my_workspace')).toBe(true)
    expect(canSeeModule(entitlements, 'agency')).toBe(false)
  })

  it('maps client tenants to the client portal workspace', () => {
    const entitlements = getTenantEntitlements(buildSubject({
      tenantType: 'client',
      roleCodes: [ROLE_CODES.CLIENT_EXECUTIVE],
      primaryRoleCode: ROLE_CODES.CLIENT_EXECUTIVE,
      routeGroups: ['client']
    }))

    expect(entitlements.audienceKey).toBe('client')
    expect(entitlements.startupPolicyKey).toBe('client_default')
    expect(can(entitlements, 'client_portal.workspace', 'launch', 'space')).toBe(true)
    expect(canSeeModule(entitlements, 'client_portal')).toBe(true)
  })

  it('fails closed instead of throwing when a legacy caller omits optional access arrays', () => {
    const subject = {
      userId: 'legacy-user',
      tenantType: 'efeonce_internal',
      primaryRoleCode: ROLE_CODES.COLLABORATOR
    } as TenantEntitlementSubject

    expect(can(subject, 'finance.reconciliation.declare_snapshot', 'create', 'space')).toBe(false)
    expect(can(subject, 'home.view', 'read', 'own')).toBe(true)
  })
})
