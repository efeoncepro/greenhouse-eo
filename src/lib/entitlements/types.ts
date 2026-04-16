import type { EntitlementAction, EntitlementCapabilityKey, EntitlementScope, GreenhouseEntitlementModule } from '@/config/entitlements-catalog'
import type { PortalHomePolicyKey } from '@/lib/tenant/resolve-portal-home-path'

export type TenantEntitlementSource = 'role' | 'route_group' | 'authorized_view' | 'scope' | 'policy'

export type HomeAudienceKey =
  | 'admin'
  | 'internal'
  | 'hr'
  | 'finance'
  | 'collaborator'
  | 'client'

export type TenantEntitlementSubject = {
  userId: string
  tenantType: 'client' | 'efeonce_internal'
  roleCodes: string[]
  primaryRoleCode: string
  routeGroups: string[]
  authorizedViews: string[]
  projectScopes?: string[]
  campaignScopes?: string[]
  businessLines?: string[]
  serviceModules?: string[]
  portalHomePath?: string
  memberId?: string
}

export type TenantEntitlement = {
  module: GreenhouseEntitlementModule
  capability: EntitlementCapabilityKey
  action: EntitlementAction
  scope: EntitlementScope
  source: TenantEntitlementSource
}

export type TenantEntitlements = {
  audienceKey: HomeAudienceKey
  startupPolicyKey: PortalHomePolicyKey
  moduleKeys: GreenhouseEntitlementModule[]
  entries: TenantEntitlement[]
}
