import { describe, expect, it } from 'vitest'

import { VIEW_REGISTRY } from '@/lib/admin/view-access-catalog'

import { listGreenhouseDeepLinkDefinitions } from '../registry'
import { resolveGreenhouseDeepLink } from '../resolver'

describe('resolveGreenhouseDeepLink', () => {
  it('resolves ops health to a canonical internal route and absolute url', () => {
    const result = resolveGreenhouseDeepLink(
      { kind: 'ops_health', audience: 'teams' },
      { env: { NEXTAUTH_URL: 'https://greenhouse.efeoncepro.com/' } as NodeJS.ProcessEnv }
    )

    expect(result.status).toBe('resolved')
    expect(result.href).toBe('/admin/ops-health')
    expect(result.absoluteUrl).toBe('https://greenhouse.efeoncepro.com/admin/ops-health')
    expect(result.access.viewCode).toBe('administracion.ops_health')
  })

  it('uses portalHomePath for home when provided', () => {
    const result = resolveGreenhouseDeepLink({ kind: 'home' }, { portalHomePath: '/finance' })

    expect(result.href).toBe('/finance')
    expect(result.canonicalPath).toBe('/finance')
  })

  it('encodes path ids safely', () => {
    const result = resolveGreenhouseDeepLink({ kind: 'person', id: 'EO person/01' })

    expect(result.href).toBe('/people/EO%20person%2F01')
  })

  it('resolves quote edit route', () => {
    const result = resolveGreenhouseDeepLink({ kind: 'quote', id: 'EO-QUO-0001', action: 'edit' })

    expect(result.href).toBe('/finance/quotes/EO-QUO-0001/edit')
    expect(result.access.viewCode).toBe('finanzas.cotizaciones')
  })

  it('resolves leave requests with query params', () => {
    const result = resolveGreenhouseDeepLink({ kind: 'leave_request', id: 'leave-123', action: 'review' })

    expect(result.href).toBe('/hr/leave?requestId=leave-123')
    expect(result.access.requiredCapabilities[0]).toEqual({
      capability: 'hr.leave',
      actions: ['approve'],
      scope: 'tenant'
    })
  })

  it('resolves payroll periods to the concrete detail route', () => {
    const result = resolveGreenhouseDeepLink({ kind: 'payroll_period', id: '2026-03' })

    expect(result.href).toBe('/hr/payroll/periods/2026-03')
    expect(result.canonicalPath).toBe('/hr/payroll/periods/2026-03')
  })

  it('returns invalid_reference with safe fallback when required identifiers are missing', () => {
    const result = resolveGreenhouseDeepLink({ kind: 'expense' })

    expect(result.status).toBe('invalid_reference')
    expect(result.href).toBe('/finance/expenses')
    expect(result.fallbackHref).toBe('/finance/expenses')
  })

  it('returns forbidden only when access context is sufficient to evaluate and denies access', () => {
    const result = resolveGreenhouseDeepLink(
      { kind: 'ops_health' },
      {
        access: {
          authorizedViews: ['finanzas.ingresos'],
          capabilityGrants: [{ capability: 'finance.workspace', actions: ['read'] }]
        }
      }
    )

    expect(result.status).toBe('forbidden')
    expect(result.href).toBe('/admin/ops-health')
  })
})

describe('deep-link definition drift guards', () => {
  it('aligns view-backed definitions with VIEW_REGISTRY route ownership', () => {
    const routeByViewCode = new Map(VIEW_REGISTRY.map(entry => [entry.viewCode, entry.routePath]))

    const samples = [
      ['ops_health', 'view'] as const,
      ['person', 'view'] as const,
      ['quote', 'view'] as const,
      ['income', 'view'] as const,
      ['expense', 'view'] as const,
      ['leave_request', 'view'] as const,
      ['payroll_period', 'view'] as const
    ]

    for (const [kind, action] of samples) {
      const definition = listGreenhouseDeepLinkDefinitions().find(item => item.kind === kind)

      expect(definition).toBeTruthy()

      const access = definition!.access({ kind, action })

      expect(access.viewCode).toBeTruthy()

      const viewRoute = routeByViewCode.get(access.viewCode!)

      expect(viewRoute).toBeTruthy()

      const resolved = resolveGreenhouseDeepLink({
        kind,
        action,
        id:
          kind === 'person'
            ? 'member-1'
            : kind === 'quote'
              ? 'quote-1'
              : kind === 'income'
                ? 'income-1'
                : kind === 'expense'
                  ? 'expense-1'
                  : kind === 'leave_request'
                    ? 'leave-1'
                    : kind === 'payroll_period'
                      ? '2026-03'
                      : undefined
      })

      expect(resolved.canonicalPath === viewRoute || resolved.canonicalPath.startsWith(`${viewRoute}/`)).toBe(true)

    }
  })
})
