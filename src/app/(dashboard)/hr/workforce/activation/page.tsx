import { redirect } from 'next/navigation'

import WorkforceActivationView from '@/views/greenhouse/admin/workforce-activation/WorkforceActivationView'
import { requireServerSession } from '@/lib/auth/require-server-session'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { getWorkforceScimMembersPendingProfileCompletionSignal } from '@/lib/reliability/queries/scim-workforce-signals'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import {
  getWorkforceActivationMember,
  listPendingIntakeMembers
} from '@/lib/workforce/intake-queue/list-pending-members'

export const dynamic = 'force-dynamic'

const Page = async ({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) => {
  await requireServerSession()
  const params = searchParams ? await searchParams : {}
  const initialSelectedMemberId = typeof params.memberId === 'string' ? params.memberId : null
  const initialDrawer = typeof params.drawer === 'string' ? params.drawer : null
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'workforce.member.activation_readiness.read', 'read', 'tenant')) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  const [initialPage, pendingSignal, directMember] = await Promise.all([
    listPendingIntakeMembers({ pageSize: 50, includeReadiness: true }).catch(() => ({
      items: [],
      nextCursor: null,
      hasMore: false,
      totalApprox: null
    })),
    getWorkforceScimMembersPendingProfileCompletionSignal().catch(() => null),
    initialSelectedMemberId
      ? getWorkforceActivationMember(initialSelectedMemberId, { includeReadiness: true }).catch(() => null)
      : Promise.resolve(null)
  ])

  const initialItems = directMember && !initialPage.items.some(item => item.memberId === directMember.memberId)
    ? [directMember, ...initialPage.items]
    : [...initialPage.items]

  return (
    <WorkforceActivationView
      initialItems={initialItems}
      initialCursor={initialPage.nextCursor}
      initialHasMore={initialPage.hasMore}
      initialTotalApprox={initialPage.totalApprox}
      pendingSignal={pendingSignal}
      apiPath='/api/hr/workforce/activation'
      completeIntakeApiBasePath='/api/hr/workforce/members'
      intakeApiBasePath='/api/hr/workforce/members'
      initialSelectedMemberId={initialSelectedMemberId}
      initialExternalIdentityOpen={initialDrawer === 'external-identity' && directMember !== null}
    />
  )
}

export default Page
