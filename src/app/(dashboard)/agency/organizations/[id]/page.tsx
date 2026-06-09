import AgencyOrganizationWorkspaceClient from '@views/greenhouse/organizations/AgencyOrganizationWorkspaceClient'

import { requireServerSession } from '@/lib/auth/require-server-session'
import { resolveOrganizationWorkspaceProjection } from '@/lib/organization-workspace/projection'
import { buildOrganizationWorkspaceSubject } from '@/lib/organization-workspace/build-projection-subject'
import { captureWithDomain } from '@/lib/observability/capture'
import { isClientLifecycleOnboardingEnabled } from '@/lib/client-lifecycle/flags'
import { getActiveCaseForOrganization } from '@/lib/client-lifecycle/store'

export const dynamic = 'force-dynamic'

type OnboardingStatus = 'draft' | 'in_progress' | 'blocked'

// TASK-1013 Slice 2 — resolve the in-flight onboarding case status for the org so
// the detail (Account 360) can surface a discoverability banner + timeline link.
// Flag-gated, honest degradation: a read failure just omits the banner (the page
// renders normally).
const resolveOnboardingStatus = async (organizationId: string): Promise<OnboardingStatus | null> => {
  if (!isClientLifecycleOnboardingEnabled()) return null

  try {
    const activeCase = await getActiveCaseForOrganization(organizationId, 'onboarding')

    if (activeCase && (activeCase.status === 'draft' || activeCase.status === 'in_progress' || activeCase.status === 'blocked')) {
      return activeCase.status
    }

    return null
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'agency_organization_detail_page', stage: 'onboarding_status' },
      extra: { organizationId }
    })

    return null
  }
}

/**
 * TASK-1059 — Agency organization detail now cuts over directly to the
 * enterprise Organization Workspace runtime. The projection remains the access
 * gate; the legacy OrganizationView fallback was only for the staged TASK-612
 * rollout and no longer owns this route.
 */

const OrganizationDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const session = await requireServerSession()

  const onboardingStatus = await resolveOnboardingStatus(id)

  const projection = await resolveOrganizationWorkspaceProjection({
    subject: buildOrganizationWorkspaceSubject(session.user),
    organizationId: id,
    entrypointContext: 'agency'
  })

  return (
    <AgencyOrganizationWorkspaceClient organizationId={id} projection={projection} onboardingStatus={onboardingStatus} />
  )
}

export default OrganizationDetailPage
