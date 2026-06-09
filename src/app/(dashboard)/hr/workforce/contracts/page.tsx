import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { ROLE_CODES } from '@/config/role-codes'
import { getOperatingEntityIdentity } from '@/lib/account-360/organization-identity'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
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
    redirect('/401')
  }

  const subject = buildTenantEntitlementSubject(tenant)
  const canManage = can(subject, 'workforce.contracting.manage', 'create', 'tenant')
  const canApprove = can(subject, 'workforce.contracting.approve', 'approve', 'tenant')
  const canSendSignature = can(subject, 'workforce.contracting.send_signature', 'create', 'tenant')

  const [{ items }, operatingEntity] = await Promise.all([
    listContractingCases({ limit: 200 }),
    getOperatingEntityIdentity()
  ])

  return (
    <WorkforceContractingStudioView
      items={items}
      canManage={canManage}
      canApprove={canApprove}
      canSendSignature={canSendSignature}
      operatingEntityOrganizationId={operatingEntity?.organizationId ?? null}
    />
  )
}

export default Page
