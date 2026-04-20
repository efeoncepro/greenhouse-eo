import 'server-only'

import { resolveFinanceQuoteTenantOrganizationIds, resolveFinanceQuoteTenantSpaceIds } from '@/lib/finance/quotation-canonical-store'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

export interface FinanceContractTenantScope {
  organizationIds: string[]
  spaceIds: string[]
  hasScope: boolean
}

export const resolveFinanceContractTenantScope = async (
  tenant: TenantContext
): Promise<FinanceContractTenantScope> => {
  const [organizationIds, spaceIds] = await Promise.all([
    resolveFinanceQuoteTenantOrganizationIds(tenant),
    resolveFinanceQuoteTenantSpaceIds(tenant)
  ])

  return {
    organizationIds,
    spaceIds,
    hasScope: organizationIds.length > 0 || spaceIds.length > 0
  }
}
