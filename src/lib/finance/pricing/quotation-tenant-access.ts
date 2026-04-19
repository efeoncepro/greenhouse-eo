import 'server-only'

import {
  resolveFinanceQuoteTenantOrganizationIds,
  resolveFinanceQuoteTenantSpaceIds
} from '@/lib/finance/quotation-canonical-store'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import type { QuotationIdentityRow } from './quotation-id-resolver'

export const quotationIdentityHasTenantAnchor = (
  identity: Pick<QuotationIdentityRow, 'organizationId' | 'spaceId'>
) => Boolean(identity.organizationId || identity.spaceId)

export const tenantCanAccessQuotationIdentity = async ({
  tenant,
  identity
}: {
  tenant: TenantContext
  identity: Pick<QuotationIdentityRow, 'organizationId' | 'spaceId'>
}) => {
  const [organizationIds, spaceIds] = await Promise.all([
    resolveFinanceQuoteTenantOrganizationIds(tenant),
    resolveFinanceQuoteTenantSpaceIds(tenant)
  ])

  if (identity.organizationId && organizationIds.includes(identity.organizationId)) {
    return true
  }

  if (identity.spaceId && spaceIds.includes(identity.spaceId)) {
    return true
  }

  return false
}
