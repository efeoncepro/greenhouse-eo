import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { ROLE_CODES } from '@/config/role-codes'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { listContractingCases } from '@/lib/workforce/contracting/readers'
import WorkforceContractingStudioView from '@/views/greenhouse/hr/workforce-contracting/WorkforceContractingStudioView'

export const metadata: Metadata = { title: 'Contratos laborales | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'equipo.workforce_contracting',
    fallback: tenant.routeGroups.includes('hr') || tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  const { items } = await listContractingCases({ limit: 200 })

  return <WorkforceContractingStudioView items={items} />
}

export default Page
