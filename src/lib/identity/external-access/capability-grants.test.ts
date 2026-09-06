import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'
import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

/**
 * TASK-1837 — Las rutas de este dominio chequean la capability a través de
 * `requireExternalAccessOperator(capability, action)`, que el guard genérico de cobertura
 * (`capability-grant-coverage.test.ts`, regex sobre `can(x, '…')`) NO ve. Este test cierra ese hueco:
 * cada capability del dominio está granteada a un rol real (TASK-873/935).
 */
const adminSubject: TenantEntitlementSubject = {
  userId: 'grant-probe',
  tenantType: 'efeonce_internal',
  roleCodes: [ROLE_CODES.EFEONCE_ADMIN],
  primaryRoleCode: ROLE_CODES.EFEONCE_ADMIN,
  routeGroups: ['admin'],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  portalHomePath: '/home'
}

const collaboratorSubject: TenantEntitlementSubject = {
  ...adminSubject,
  roleCodes: [ROLE_CODES.COLLABORATOR],
  primaryRoleCode: ROLE_CODES.COLLABORATOR,
  routeGroups: ['my']
}

describe('TASK-1837 — external invitation capabilities are granted to a real role', () => {
  it.each([
    ['identity.external_invitation.issue', 'create'],
    ['identity.external_invitation.reveal_token', 'execute'],
    ['identity.external_invitation.issue_delegated', 'create']
  ] as const)('%s (%s) is granted to efeonce_admin and denied to collaborator', (capability, action) => {
    expect(can(adminSubject, capability, action, 'tenant')).toBe(true)
    expect(can(collaboratorSubject, capability, action, 'tenant')).toBe(false)
  })
})
