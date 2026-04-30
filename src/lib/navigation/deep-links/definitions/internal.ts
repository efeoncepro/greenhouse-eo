import { resolvePortalHomeAlias } from './shared'
import type {
  GreenhouseDeepLinkAccess,
  GreenhouseDeepLinkDefinition,
  GreenhouseDeepLinkReference
} from '../types'

const INTERNAL_AUDIENCE_NOTES = ['Internal deep link backed by existing Next.js portal routes.']

const buildAccess = ({
  planes,
  viewCode,
  routeGroup,
  requiredCapabilities,
  notes
}: Omit<GreenhouseDeepLinkAccess, 'notes'> & { notes?: string[] }): GreenhouseDeepLinkAccess => ({
  planes,
  viewCode,
  routeGroup,
  requiredCapabilities,
  notes
})

const buildRoute = (path: string, searchParams?: URLSearchParams) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const query = searchParams?.toString()

  return query ? `${normalizedPath}?${query}` : normalizedPath
}

const getId = (reference: GreenhouseDeepLinkReference, paramKey?: string) => {
  if (reference.id?.trim()) {
    return reference.id.trim()
  }

  if (paramKey) {
    const candidate = reference.params?.[paramKey]

    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  return null
}

const getRequiredStringParam = (reference: GreenhouseDeepLinkReference, key: string) => {
  const candidate = reference.params?.[key]

  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate.trim()
  }

  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return String(candidate)
  }

  return null
}

export const INTERNAL_DEEP_LINK_DEFINITIONS: GreenhouseDeepLinkDefinition[] = [
  {
    kind: 'home',
    defaultAction: 'view',
    supportedActions: ['view'],
    fallbackHref: '/home',
    access: () =>
      buildAccess({
        planes: ['startup_policy', 'entitlements'],
        viewCode: null,
        routeGroup: null,
        requiredCapabilities: [{ capability: 'home.view', actions: ['read'], scope: 'own' }],
        notes: ['Home interno se resuelve por startup policy; no existe un viewCode único materializado.']
      }),
    build: (_reference, context) => {
      const resolvedHome = resolvePortalHomeAlias(context.portalHomePath) || '/home'

      return {
        href: resolvedHome,
        canonicalPath: resolvedHome
      }
    }
  },
  {
    kind: 'ops_health',
    defaultAction: 'view',
    supportedActions: ['view'],
    fallbackHref: '/admin/ops-health',
    access: () =>
      buildAccess({
        planes: ['views', 'entitlements'],
        viewCode: 'administracion.ops_health',
        routeGroup: 'admin',
        requiredCapabilities: [{ capability: 'platform.health.read', actions: ['read'], scope: 'tenant' }],
        notes: INTERNAL_AUDIENCE_NOTES
      }),
    build: () => ({
      href: '/admin/ops-health'
    })
  },
  {
    kind: 'person',
    defaultAction: 'view',
    supportedActions: ['view'],
    fallbackHref: '/people',
    access: () =>
      buildAccess({
        planes: ['views', 'entitlements'],
        viewCode: 'equipo.personas',
        routeGroup: 'people',
        requiredCapabilities: [{ capability: 'people.directory', actions: ['read', 'launch'], scope: 'tenant' }],
        notes: INTERNAL_AUDIENCE_NOTES
      }),
    build: reference => {
      const personId = getId(reference, 'personId')

      if (!personId) {
        return null
      }

      return {
        href: `/people/${encodeURIComponent(personId)}`
      }
    }
  },
  {
    kind: 'quote',
    defaultAction: 'view',
    supportedActions: ['view', 'edit'],
    fallbackHref: '/finance/quotes',
    access: () =>
      buildAccess({
        planes: ['views'],
        viewCode: 'finanzas.cotizaciones',
        routeGroup: 'finance',
        requiredCapabilities: [],
        notes: ['Quote links are view-first in the current runtime; no stable fine-grained entitlement exists yet.']
      }),
    build: reference => {
      const quoteId = getId(reference, 'quoteId')

      if (!quoteId) {
        return null
      }

      const encodedId = encodeURIComponent(quoteId)
      const isEdit = reference.action === 'edit'

      return {
        href: isEdit ? `/finance/quotes/${encodedId}/edit` : `/finance/quotes/${encodedId}`
      }
    }
  },
  {
    kind: 'income',
    defaultAction: 'view',
    supportedActions: ['view'],
    fallbackHref: '/finance/income',
    access: () =>
      buildAccess({
        planes: ['views'],
        viewCode: 'finanzas.ingresos',
        routeGroup: 'finance',
        requiredCapabilities: [],
        notes: ['Income links currently resolve through finance views, not a dedicated fine-grained entitlement.']
      }),
    build: reference => {
      const incomeId = getId(reference, 'incomeId')

      if (!incomeId) {
        return null
      }

      return {
        href: `/finance/income/${encodeURIComponent(incomeId)}`
      }
    }
  },
  {
    kind: 'expense',
    defaultAction: 'view',
    supportedActions: ['view'],
    fallbackHref: '/finance/expenses',
    access: () =>
      buildAccess({
        planes: ['views'],
        viewCode: 'finanzas.egresos',
        routeGroup: 'finance',
        requiredCapabilities: [],
        notes: ['Expense links currently resolve through finance views, not a dedicated fine-grained entitlement.']
      }),
    build: reference => {
      const expenseId = getId(reference, 'expenseId')

      if (!expenseId) {
        return null
      }

      return {
        href: `/finance/expenses/${encodeURIComponent(expenseId)}`
      }
    }
  },
  {
    kind: 'leave_request',
    defaultAction: 'view',
    supportedActions: ['view', 'review'],
    fallbackHref: '/hr/leave',
    access: reference =>
      buildAccess({
        planes: ['views', 'entitlements'],
        viewCode: 'equipo.permisos',
        routeGroup: 'hr',
        requiredCapabilities:
          reference.action === 'review'
            ? [{ capability: 'hr.leave', actions: ['approve'], scope: 'tenant' }]
            : [
                { capability: 'hr.leave', actions: ['read'], scope: 'tenant' },
                { capability: 'hr.leave_balance', actions: ['read'], scope: 'tenant' }
              ],
        notes: INTERNAL_AUDIENCE_NOTES
      }),
    build: reference => {
      const requestId = getId(reference, 'requestId')

      if (!requestId) {
        return null
      }

      const searchParams = new URLSearchParams({ requestId })

      return {
        href: buildRoute('/hr/leave', searchParams)
      }
    }
  },
  {
    kind: 'payroll_period',
    defaultAction: 'view',
    supportedActions: ['view'],
    fallbackHref: '/hr/payroll',
    access: () =>
      buildAccess({
        planes: ['views'],
        viewCode: 'equipo.nomina',
        routeGroup: 'hr',
        requiredCapabilities: [],
        notes: ['Payroll period detail currently rides on the payroll surface without a dedicated fine-grained capability.']
      }),
    build: reference => {
      const periodId = getId(reference, 'periodId')

      if (!periodId) {
        return null
      }

      return {
        href: `/hr/payroll/periods/${encodeURIComponent(periodId)}`
      }
    }
  },
  {
    kind: 'public_quote_share',
    defaultAction: 'open',
    supportedActions: ['open'],
    fallbackHref: '/finance/quotes',
    access: () =>
      buildAccess({
        planes: ['public_share'],
        viewCode: null,
        routeGroup: null,
        requiredCapabilities: [],
        notes: ['Public quote share is governed by token/revocation, not internal portal views.']
      }),
    build: reference => {
      const quotationId = getId(reference, 'quotationId')
      const versionNumber = getRequiredStringParam(reference, 'versionNumber')
      const token = getRequiredStringParam(reference, 'token')

      if (!quotationId || !versionNumber || !token) {
        return null
      }

      return {
        href: `/public/quote/${encodeURIComponent(quotationId)}/${encodeURIComponent(versionNumber)}/${encodeURIComponent(token)}`
      }
    }
  }
]
