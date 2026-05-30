import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { resolveContractorHrWorkbenchProjection } from '@/lib/contractor-engagements/hr-workbench-projection'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { ROLE_CODES } from '@/config/role-codes'
import ContractorAdminWorkbenchView from '@/views/greenhouse/contractors/ContractorAdminWorkbenchView'

export const metadata: Metadata = { title: 'Gestión contractor | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'equipo.contratistas',
    fallback: tenant.routeGroups.includes('hr') || tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  const initialProjection = await resolveContractorHrWorkbenchProjection()

  return <ContractorAdminWorkbenchView initialProjection={initialProjection} />
}

export default Page
