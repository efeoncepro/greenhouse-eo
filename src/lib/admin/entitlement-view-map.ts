import {
  ENTITLEMENT_CAPABILITY_MAP,
  type EntitlementAction,
  type EntitlementCapabilityKey,
  type EntitlementScope
} from '@/config/entitlements-catalog'
import { VIEW_REGISTRY, type GovernanceViewRegistryEntry } from '@/lib/admin/view-access-catalog'

export type ViewEntitlementBinding = {
  viewCode: string
  viewLabel: string
  routeGroup: string
  routePath: string
  capability: EntitlementCapabilityKey
  module: (typeof ENTITLEMENT_CAPABILITY_MAP)[EntitlementCapabilityKey]['module']
  actions: EntitlementAction[]
  scope: EntitlementScope
}

const toBinding = (
  view: GovernanceViewRegistryEntry,
  capability: EntitlementCapabilityKey,
  actions: readonly EntitlementAction[] = ENTITLEMENT_CAPABILITY_MAP[capability].actions,
  scope: EntitlementScope = ENTITLEMENT_CAPABILITY_MAP[capability].defaultScope
): ViewEntitlementBinding => ({
  viewCode: view.viewCode,
  viewLabel: view.label,
  routeGroup: view.routeGroup,
  routePath: view.routePath,
  capability,
  module: ENTITLEMENT_CAPABILITY_MAP[capability].module,
  actions: [...actions],
  scope
})

const resolveBindingsForView = (view: GovernanceViewRegistryEntry): ViewEntitlementBinding[] => {
  switch (view.viewCode) {
    case 'equipo.permisos':
      return [
        toBinding(view, 'hr.leave', ['read', 'approve']),
        toBinding(view, 'hr.leave_balance', ['read']),
        toBinding(view, 'hr.leave_backfill', ['create']),
        toBinding(view, 'hr.leave_adjustment', ['create', 'update'])
      ]

    case 'equipo.organigrama':
      return [toBinding(view, 'hr.org_chart', ['read'])]

    case 'equipo.offboarding':
      return [toBinding(view, 'hr.offboarding_case', ['read', 'create', 'update', 'approve', 'manage'])]

    case 'finanzas.inteligencia':
      return [toBinding(view, 'finance.status', ['read'])]

    default:
      break
  }

  if (view.routeGroup === 'internal') return [toBinding(view, 'agency.workspace', ['read', 'launch'])]
  if (view.routeGroup === 'people') return [toBinding(view, 'people.directory', ['read', 'launch'])]
  if (view.routeGroup === 'hr') return [toBinding(view, 'hr.workspace', ['read', 'launch'])]
  if (view.routeGroup === 'finance') return [toBinding(view, 'finance.workspace', ['read', 'launch'])]
  if (view.routeGroup === 'admin') return [toBinding(view, 'admin.workspace', ['read', 'launch', 'manage'], 'all')]
  if (view.routeGroup === 'client') return [toBinding(view, 'client_portal.workspace', ['read', 'launch'], 'space')]
  if (view.routeGroup === 'my') return [toBinding(view, 'my_workspace.workspace', ['read', 'launch'], 'own')]
  if (view.routeGroup === 'ai_tooling') return [toBinding(view, 'ai_tooling.workspace', ['read', 'launch'])]

  return []
}

export const VIEW_ENTITLEMENT_BINDINGS = VIEW_REGISTRY.flatMap(resolveBindingsForView)
