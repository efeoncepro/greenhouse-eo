import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getOwnContractingSummary } from '@/lib/workforce/contracting/readers'
import MyContractingDocumentsView from '@/views/greenhouse/my/workforce-contracting/MyContractingDocumentsView'

export const metadata: Metadata = { title: 'Mis ofertas | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'mi_ficha.mis_contratos',
    fallback: tenant.routeGroups.includes('my')
  })

  if (!hasAccess) {
    redirect('/401')
  }

  const items = tenant.identityProfileId
    ? await getOwnContractingSummary(tenant.identityProfileId, 'offer_letter')
    : []

  return <MyContractingDocumentsView kind='offer_letter' items={items} />
}

export default Page
