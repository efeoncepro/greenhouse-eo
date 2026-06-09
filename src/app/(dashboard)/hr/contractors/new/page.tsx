import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { ROLE_CODES } from '@/config/role-codes'
import { listOffboardingCases } from '@/lib/workforce/offboarding/store'
import { getOperatingEntityIdentity } from '@/lib/account-360/organization-identity'
import { resolveProfileDisplayNames } from '@/lib/identity/profile-display-names'
import type {
  ExecutedOffboardingItem,
  OperatingEntitySummary
} from '@/lib/contractor-engagements/onboarding-wizard-types'
import ContractorOnboardingWizard from '@/views/greenhouse/contractors/ContractorOnboardingWizard'

export const metadata: Metadata = { title: 'Nuevo contractor | Greenhouse' }
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
    redirect('/401')
  }

  const subject = buildTenantEntitlementSubject(tenant)
  const canCreate = can(subject, 'hr.contractor_engagement', 'create', 'tenant')
  const canManage = can(subject, 'hr.contractor_engagement', 'manage', 'tenant')

  const [executedCases, operatingEntity] = await Promise.all([
    listOffboardingCases({ status: 'executed', limit: 100 }),
    getOperatingEntityIdentity()
  ])

  const names = await resolveProfileDisplayNames(executedCases.map(c => c.profileId)).catch(
    () => new Map<string, string>()
  )

  const initialExecutedCases: ExecutedOffboardingItem[] = executedCases.map(c => ({
    offboardingCaseId: c.offboardingCaseId,
    publicId: c.publicId,
    personName: names.get(c.profileId) ?? 'Colaborador',
    profileId: c.profileId,
    lastWorkingDay: c.lastWorkingDay,
    separationType: c.separationType,
    relationshipType: c.relationshipType
  }))

  const operatingEntitySummary: OperatingEntitySummary | null = operatingEntity
    ? { organizationId: operatingEntity.organizationId, legalName: operatingEntity.legalName }
    : null

  return (
    <ContractorOnboardingWizard
      initialExecutedCases={initialExecutedCases}
      operatingEntity={operatingEntitySummary}
      canCreate={canCreate}
      canManage={canManage}
    />
  )
}

export default Page
