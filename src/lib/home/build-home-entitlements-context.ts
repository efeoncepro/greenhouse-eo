import { resolveCapabilityModules } from '@/lib/capabilities/resolve-capabilities'
import { can, canSeeModule, getTenantEntitlements } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject, TenantEntitlements } from '@/lib/entitlements/types'
import type { HomeAccessContext, HomeRecommendedShortcut } from '@/types/home'
import type { ResolvedCapabilityModule } from '@/types/capabilities'

const SHORTCUTS: HomeRecommendedShortcut[] = [
  {
    id: 'admin-center',
    label: 'Administracion',
    route: '/admin',
    icon: 'tabler-shield-lock',
    module: 'admin'
  },
  {
    id: 'agency',
    label: 'Agency',
    route: '/agency',
    icon: 'tabler-building',
    module: 'agency'
  },
  {
    id: 'people',
    label: 'Personas',
    route: '/people',
    icon: 'tabler-address-book',
    module: 'people'
  },
  {
    id: 'hr',
    label: 'Nomina',
    route: '/hr/payroll',
    icon: 'tabler-users-group',
    module: 'hr'
  },
  {
    id: 'finance',
    label: 'Finanzas',
    route: '/finance',
    icon: 'tabler-report-money',
    module: 'finance'
  },
  {
    id: 'my-workspace',
    label: 'Mi espacio',
    route: '/my',
    icon: 'tabler-user-circle',
    module: 'my_workspace'
  },
  {
    id: 'client-portal',
    label: 'Proyectos',
    route: '/proyectos',
    icon: 'tabler-folders',
    module: 'client_portal'
  }
]

const AUDIENCE_SHORTCUT_ORDER = {
  admin: ['admin-center', 'agency', 'finance', 'people', 'hr', 'my-workspace', 'client-portal'],
  internal: ['agency', 'people', 'finance', 'hr', 'admin-center', 'my-workspace', 'client-portal'],
  hr: ['hr', 'people', 'my-workspace', 'agency'],
  finance: ['finance', 'agency', 'my-workspace', 'admin-center'],
  collaborator: ['my-workspace', 'people', 'hr'],
  client: ['client-portal']
} as const

const sortShortcuts = (shortcuts: HomeRecommendedShortcut[], entitlements: TenantEntitlements) => {
  const order = AUDIENCE_SHORTCUT_ORDER[entitlements.audienceKey] as readonly string[]

  return [...shortcuts].sort((left, right) => order.indexOf(left.id) - order.indexOf(right.id))
}

export type HomeEntitlementsContext = {
  entitlements: TenantEntitlements
  accessContext: HomeAccessContext
  recommendedShortcuts: HomeRecommendedShortcut[]
  visibleCapabilityModules: ResolvedCapabilityModule[]
  canSeeFinanceStatus: boolean
}

export const buildHomeEntitlementsContext = (
  subject: TenantEntitlementSubject & {
    businessLines?: string[]
    serviceModules?: string[]
  }
): HomeEntitlementsContext => {
  const entitlements = getTenantEntitlements(subject)

  const visibleCapabilityModules = resolveCapabilityModules({
    businessLines: subject.businessLines || [],
    serviceModules: subject.serviceModules || []
  })

  const recommendedShortcuts = sortShortcuts(
    SHORTCUTS.filter(shortcut => canSeeModule(entitlements, shortcut.module)),
    entitlements
  ).slice(0, 4)

  const canSeeFinanceStatus = can(entitlements, 'finance.status', 'read')

  return {
    entitlements,
    accessContext: {
      audienceKey: entitlements.audienceKey,
      startupPolicyKey: entitlements.startupPolicyKey,
      moduleKeys: entitlements.moduleKeys
    },
    recommendedShortcuts,
    visibleCapabilityModules,
    canSeeFinanceStatus
  }
}
