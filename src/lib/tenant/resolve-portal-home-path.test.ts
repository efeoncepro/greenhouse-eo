import { describe, expect, it } from 'vitest'

import { resolvePortalHomePath } from './resolve-portal-home-path'

describe('resolvePortalHomePath', () => {
  it('routes internal legacy dashboard home to /home', () => {
    expect(
      resolvePortalHomePath({
        portalHomePath: '/internal/dashboard',
        tenantType: 'efeonce_internal',
        roleCodes: ['efeonce_operations']
      })
    ).toBe('/home')
  })

  it('routes internal users without explicit path to /home', () => {
    expect(
      resolvePortalHomePath({
        portalHomePath: null,
        tenantType: 'efeonce_internal',
        roleCodes: ['efeonce_operations']
      })
    ).toBe('/home')
  })

  it('preserves explicit internal overrides other than legacy dashboard', () => {
    expect(
      resolvePortalHomePath({
        portalHomePath: '/agency',
        tenantType: 'efeonce_internal',
        roleCodes: ['efeonce_admin']
      })
    ).toBe('/agency')
  })

  it('keeps hr payroll as specialized landing', () => {
    expect(
      resolvePortalHomePath({
        portalHomePath: '/internal/dashboard',
        tenantType: 'efeonce_internal',
        roleCodes: ['hr_payroll']
      })
    ).toBe('/hr/payroll')
  })

  it('keeps finance as specialized landing', () => {
    expect(
      resolvePortalHomePath({
        portalHomePath: '/internal/dashboard',
        tenantType: 'efeonce_internal',
        roleCodes: ['finance_admin']
      })
    ).toBe('/finance')
  })
})
