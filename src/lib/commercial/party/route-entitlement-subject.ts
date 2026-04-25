import 'server-only'

import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

export const buildTenantEntitlementSubject = (
  tenant: TenantContext
): TenantEntitlementSubject => ({
  userId: tenant.userId,
  tenantType: tenant.tenantType,
  roleCodes: tenant.roleCodes,
  primaryRoleCode: tenant.primaryRoleCode,
  routeGroups: tenant.routeGroups,
  authorizedViews: tenant.authorizedViews,
  projectScopes: tenant.projectScopes,
  campaignScopes: tenant.campaignScopes,
  businessLines: tenant.businessLines,
  serviceModules: tenant.serviceModules,
  portalHomePath: tenant.portalHomePath,
  ...(tenant.memberId ? { memberId: tenant.memberId } : {})
})
