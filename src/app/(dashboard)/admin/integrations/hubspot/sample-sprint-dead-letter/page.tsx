import { redirect } from 'next/navigation'

import SampleSprintDeadLetterView from '@/views/greenhouse/admin/integrations/sample-sprint-dead-letter/SampleSprintDeadLetterView'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { requireServerSession } from '@/lib/auth/require-server-session'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

const Page = async () => {
  await requireServerSession()
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'commercial.engagement.recover_outbound', 'read', 'tenant')) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return <SampleSprintDeadLetterView />
}

export default Page
