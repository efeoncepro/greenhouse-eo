import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import { listOverheadAddons } from '@/lib/commercial/overhead-addons-store'
import {
  listCommercialModelMultipliers,
  listCountryPricingFactors,
  listFteHoursGuide,
  listRoleTierMargins,
  listServiceTierMargins
} from '@/lib/commercial/pricing-governance-store'
import { listEmploymentTypes, listSellableRoles } from '@/lib/commercial/sellable-roles-store'
import { listToolCatalog } from '@/lib/commercial/tool-catalog-store'
import { canAdministerPricingCatalog } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

import PricingCatalogHomeView, {
  type PricingCatalogCounts
} from '@/views/greenhouse/admin/pricing-catalog/PricingCatalogHomeView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Catálogo de pricing — Greenhouse'
}

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')
  if (!canAdministerPricingCatalog(tenant)) redirect(tenant.portalHomePath)

  const [
    sellableRoles,
    toolCatalog,
    overheadAddons,
    roleTierMargins,
    serviceTierMargins,
    commercialModelMultipliers,
    countryPricingFactors,
    fteHoursGuide,
    employmentTypes
  ] = await Promise.all([
    listSellableRoles({ activeOnly: false }),
    listToolCatalog({ active: false }),
    listOverheadAddons({ active: false }),
    listRoleTierMargins(),
    listServiceTierMargins(),
    listCommercialModelMultipliers(),
    listCountryPricingFactors(),
    listFteHoursGuide(),
    listEmploymentTypes({ activeOnly: false })
  ])

  const counts: PricingCatalogCounts = {
    roles: sellableRoles.filter(r => r.active).length,
    tools: toolCatalog.filter(t => t.isActive).length,
    overheads: overheadAddons.filter(o => o.active).length,
    tiers: roleTierMargins.length + serviceTierMargins.length,
    commercialModels: commercialModelMultipliers.length,
    countryFactors: countryPricingFactors.length,
    fteHours: fteHoursGuide.length,
    employmentTypes: employmentTypes.filter(e => e.active).length
  }

  return <PricingCatalogHomeView counts={counts} />
}

export default Page
