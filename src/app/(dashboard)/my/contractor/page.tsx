import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import {
  CONTRACTOR_SELF_SERVICE_CONTRACT_VERSION,
  type ContractorSelfServiceProjection
} from '@/lib/contractor-engagements/projection-types'
import { resolveContractorSelfServiceProjection } from '@/lib/contractor-engagements/self-service-projection'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import ContractorSelfServiceView from '@/views/greenhouse/contractors/ContractorSelfServiceView'

export const metadata: Metadata = { title: 'Mis servicios contractor | Greenhouse' }
export const dynamic = 'force-dynamic'

const buildEmptyProjection = (): ContractorSelfServiceProjection => ({
  state: 'no_engagement',
  scenario: null,
  degraded: [],
  generatedAt: new Date().toISOString(),
  contractVersion: CONTRACTOR_SELF_SERVICE_CONTRACT_VERSION
})

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'mi_ficha.mi_contratacion',
    fallback: tenant.routeGroups.includes('my')
  })

  if (!hasAccess) {
    redirect('/401')
  }

  const initialProjection =
    tenant.identityProfileId && tenant.memberId
      ? await resolveContractorSelfServiceProjection({
          identityProfileId: tenant.identityProfileId,
          memberId: tenant.memberId
        })
      : buildEmptyProjection()

  return <ContractorSelfServiceView initialProjection={initialProjection} />
}

export default Page
