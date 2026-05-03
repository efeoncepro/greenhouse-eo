import { hasEntitlement } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import type { EntitlementAction, EntitlementCapabilityKey } from '@/config/entitlements-catalog'

import { PaymentProfileValidationError } from './errors'

export const buildPaymentProfileEntitlementSubject = (
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
  memberId: tenant.memberId
})

export const assertPaymentProfileCapability = ({
  tenant,
  capability,
  action
}: {
  tenant: TenantContext
  capability: EntitlementCapabilityKey
  action: EntitlementAction
}) => {
  const subject = buildPaymentProfileEntitlementSubject(tenant)

  if (!hasEntitlement(subject, capability, action, 'tenant')) {
    throw new PaymentProfileValidationError('Forbidden', 'forbidden', 403)
  }
}
