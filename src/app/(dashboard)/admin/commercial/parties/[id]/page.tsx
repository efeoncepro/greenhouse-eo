import type { Metadata } from 'next'

import { buildTenantEntitlementSubject } from '@/lib/commercial/party'
import { hasEntitlement } from '@/lib/entitlements/runtime'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import CommercialPartyDetailView from '@/views/greenhouse/admin/commercial-parties/CommercialPartyDetailView'
import { getCommercialPartyDetailData } from '@/views/greenhouse/admin/commercial-parties/data'

export const metadata: Metadata = { title: 'Commercial Party Detail | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const tenant = await getTenantContext()
  const data = await getCommercialPartyDetailData(id)

  const canOverride = tenant
    ? hasEntitlement(
        buildTenantEntitlementSubject(tenant),
        'commercial.party.override_lifecycle',
        'update'
      )
    : false

  return <CommercialPartyDetailView data={data} canOverride={canOverride} />
}

export default Page
