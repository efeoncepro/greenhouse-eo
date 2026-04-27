import { ROLE_CODES } from '@/config/role-codes'
import { hasEntitlement } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { FinanceValidationError } from '@/lib/finance/shared'
import { query } from '@/lib/db'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import type { EntitlementAction, EntitlementCapabilityKey } from '@/config/entitlements-catalog'

export const buildPaymentInstrumentEntitlementSubject = (
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

export const assertPaymentInstrumentCapability = ({
  tenant,
  capability,
  action
}: {
  tenant: TenantContext
  capability: EntitlementCapabilityKey
  action: EntitlementAction
}) => {
  const subject = buildPaymentInstrumentEntitlementSubject(tenant)

  if (!hasEntitlement(subject, capability, action, 'tenant')) {
    throw new FinanceValidationError('Forbidden', 403)
  }
}

let internalSpaceIdPromise: Promise<string | null> | null = null

const getInternalFinanceSpaceId = async () => {
  internalSpaceIdPromise ??= query<{ space_id: string }>(
    `
      SELECT s.space_id
      FROM greenhouse_core.spaces s
      WHERE s.space_id = 'space-efeonce'
         OR s.client_id = 'space-efeonce'
         OR s.space_type = 'internal_space'
      ORDER BY
        CASE
          WHEN s.space_id = 'space-efeonce' THEN 0
          WHEN s.client_id = 'space-efeonce' THEN 1
          WHEN s.space_type = 'internal_space' THEN 2
          ELSE 3
        END,
        s.updated_at DESC NULLS LAST,
        s.created_at DESC NULLS LAST,
        s.space_id ASC
      LIMIT 1
    `
  ).then(rows => rows[0]?.space_id ?? null).catch(() => {
    internalSpaceIdPromise = null

    return null
  })

  return internalSpaceIdPromise
}

export const resolvePaymentInstrumentSpaceId = async (tenant: TenantContext) => {
  if (tenant.spaceId) return tenant.spaceId

  if (tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)) {
    const internalSpaceId = await getInternalFinanceSpaceId()

    if (internalSpaceId) return internalSpaceId
  }

  throw new FinanceValidationError(
    'Payment instrument administration requires a resolved tenant space.',
    422,
    { userId: tenant.userId },
    'PAYMENT_INSTRUMENT_SPACE_REQUIRED'
  )
}
