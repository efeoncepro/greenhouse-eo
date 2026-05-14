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
      return [
        toBinding(view, 'hr.offboarding_case', ['read', 'create', 'update', 'approve', 'manage']),
        toBinding(view, 'hr.final_settlement', ['read', 'create', 'update', 'approve', 'manage']),
        toBinding(view, 'hr.final_settlement_document', ['read', 'create', 'update', 'approve', 'manage'])
      ]

    case 'equipo.onboarding':
      return [
        toBinding(view, 'hr.onboarding_template', ['read', 'create', 'update', 'manage']),
        toBinding(view, 'hr.onboarding_instance', ['read', 'create', 'update', 'manage'])
      ]

    case 'equipo.workforce_activation':
      return [
        toBinding(view, 'workforce.member.activation_readiness.read', ['read']),
        toBinding(view, 'workforce.member.complete_intake', ['update'])
      ]

    case 'mi_ficha.onboarding':
      return [toBinding(view, 'my.onboarding', ['read', 'update'], 'own')]

    case 'finanzas.inteligencia':
      return [toBinding(view, 'finance.status', ['read'])]

    case 'comercial.pipeline':
      return [toBinding(view, 'commercial.pipeline', ['read'])]

    case 'comercial.cotizaciones':
      return [toBinding(view, 'commercial.quotation', ['read', 'create', 'update', 'approve', 'export'])]

    case 'comercial.contratos':
      return [toBinding(view, 'commercial.contract', ['read', 'create', 'update'])]

    case 'comercial.sow':
      return [toBinding(view, 'commercial.sow', ['read', 'create', 'update'])]

    case 'comercial.acuerdos_marco':
      return [toBinding(view, 'commercial.master_agreement', ['read', 'create', 'update'])]

    case 'comercial.productos':
      return [toBinding(view, 'commercial.product_catalog', ['read', 'create', 'update'])]

    default:
      break
  }

  if (view.routeGroup === 'internal') return [toBinding(view, 'agency.workspace', ['read', 'launch'])]
  if (view.routeGroup === 'commercial') return [toBinding(view, 'commercial.workspace', ['read', 'launch'])]
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
