import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import { canAccessHiringCandidateDocument } from './access'

const subject = (overrides: Partial<TenantEntitlementSubject>): TenantEntitlementSubject => ({
  userId: 'user-test',
  tenantType: 'efeonce_internal',
  roleCodes: [],
  primaryRoleCode: '',
  routeGroups: [],
  authorizedViews: [],
  ...overrides,
})

const withRole = (roleCode: string, tenantType: TenantEntitlementSubject['tenantType'] = 'efeonce_internal') =>
  subject({ roleCodes: [roleCode], primaryRoleCode: roleCode, tenantType })

describe('canAccessHiringCandidateDocument', () => {
  describe('permite a quien opera Hiring', () => {
    it.each([
      ROLE_CODES.EFEONCE_ADMIN,
      ROLE_CODES.HR_MANAGER,
      ROLE_CODES.EFEONCE_OPERATIONS,
      ROLE_CODES.EFEONCE_ACCOUNT,
    ])('permite a %s', roleCode => {
      expect(canAccessHiringCandidateDocument(withRole(roleCode))).toBe(true)
    })

    it('permite por routeGroup interno', () => {
      expect(canAccessHiringCandidateDocument(subject({ routeGroups: ['internal'] }))).toBe(true)
    })
  })

  describe('niega a los tenants cliente — PII de candidatos nunca sale del tenant interno', () => {
    it.each([ROLE_CODES.CLIENT_EXECUTIVE, ROLE_CODES.CLIENT_MANAGER, ROLE_CODES.CLIENT_SPECIALIST])(
      'niega a %s',
      roleCode => {
        expect(canAccessHiringCandidateDocument(withRole(roleCode, 'client'))).toBe(false)
      },
    )

    it('niega a un tenant cliente aunque alguien le grantee routeGroups internos por error', () => {
      // Defensa en profundidad: el guard de tenantType corre ANTES de la capability.
      const misconfigured = subject({ tenantType: 'client', routeGroups: ['internal', 'admin', 'hr'] })

      expect(canAccessHiringCandidateDocument(misconfigured)).toBe(false)
    })
  })

  describe('cierre de over-exposure vs TASK-354', () => {
    it('niega a hr_payroll: tiene routeGroup hr pero ninguna capability de Hiring', () => {
      // Antes de TASK-1362 el predicado era `hasRouteGroup(tenant, 'hr')`, así que
      // nómina podía descargar el CV de cualquier candidato. Ya no.
      expect(canAccessHiringCandidateDocument(withRole(ROLE_CODES.HR_PAYROLL))).toBe(false)
    })

    it.each([ROLE_CODES.FINANCE_ADMIN, ROLE_CODES.PEOPLE_VIEWER, ROLE_CODES.COLLABORATOR, ROLE_CODES.DESIGNER])(
      'niega a %s',
      roleCode => {
        expect(canAccessHiringCandidateDocument(withRole(roleCode))).toBe(false)
      },
    )

    it('niega a un sujeto interno sin rol ni routeGroup', () => {
      expect(canAccessHiringCandidateDocument(subject({}))).toBe(false)
    })
  })
})
