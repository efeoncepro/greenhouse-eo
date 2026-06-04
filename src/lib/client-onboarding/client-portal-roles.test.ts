/**
 * TASK-1001 — heurística de rol de portal cliente por cargo (pura).
 */
import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'

import { CLIENT_PORTAL_ROLES, isClientPortalRole, suggestClientPortalRole } from './client-portal-roles'

describe('suggestClientPortalRole', () => {
  it('mapea C-level / VP / dirección / fundador a client_executive', () => {
    for (const title of ['CMO', 'CFO', 'Chief Marketing Officer', 'VP of Marketing', 'Vice President', 'Marketing Director', 'Directora de Marketing', 'Head of Growth', 'Founder', 'Co-Founder', 'Owner', 'Gerente General']) {
      expect(suggestClientPortalRole(title)).toBe(ROLE_CODES.CLIENT_EXECUTIVE)
    }
  })

  it('mapea jefatura / manager / coordinación a client_manager', () => {
    for (const title of ['Marketing Manager', 'Gerente de Marca', 'Jefe de Proyectos', 'Team Lead', 'Coordinador de Campañas', 'Supervisor', 'Brand Lead']) {
      expect(suggestClientPortalRole(title)).toBe(ROLE_CODES.CLIENT_MANAGER)
    }
  })

  it('cae a client_specialist sin cargo o sin match (fail-safe restringido)', () => {
    expect(suggestClientPortalRole(null)).toBe(ROLE_CODES.CLIENT_SPECIALIST)
    expect(suggestClientPortalRole(undefined)).toBe(ROLE_CODES.CLIENT_SPECIALIST)
    expect(suggestClientPortalRole('   ')).toBe(ROLE_CODES.CLIENT_SPECIALIST)
    expect(suggestClientPortalRole('Diseñador Gráfico')).toBe(ROLE_CODES.CLIENT_SPECIALIST)
    expect(suggestClientPortalRole('Analista de Datos')).toBe(ROLE_CODES.CLIENT_SPECIALIST)
  })

  it('ejecutivo gana sobre manager cuando ambos patrones podrían matchear (head of … es ejecutivo)', () => {
    expect(suggestClientPortalRole('Head of Marketing')).toBe(ROLE_CODES.CLIENT_EXECUTIVE)
  })

  it('NUNCA devuelve un rol fuera de los 3 client_*', () => {
    for (const title of ['CEO', 'Manager', 'Pasante', '', 'collaborator', 'efeonce_admin']) {
      expect(isClientPortalRole(suggestClientPortalRole(title))).toBe(true)
    }
  })
})

describe('CLIENT_PORTAL_ROLES', () => {
  it('contiene exactamente los 3 roles canónicos de portal', () => {
    expect([...CLIENT_PORTAL_ROLES].sort()).toEqual(
      [ROLE_CODES.CLIENT_EXECUTIVE, ROLE_CODES.CLIENT_MANAGER, ROLE_CODES.CLIENT_SPECIALIST].sort()
    )
  })

  it('isClientPortalRole rechaza roles internos', () => {
    expect(isClientPortalRole(ROLE_CODES.COLLABORATOR)).toBe(false)
    expect(isClientPortalRole(ROLE_CODES.EFEONCE_ADMIN)).toBe(false)
    expect(isClientPortalRole('inexistente')).toBe(false)
  })
})
