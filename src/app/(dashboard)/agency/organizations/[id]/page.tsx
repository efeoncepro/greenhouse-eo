import OrganizationView from '@views/greenhouse/organizations/OrganizationView'
import AgencyOrganizationWorkspaceClient from '@views/greenhouse/organizations/AgencyOrganizationWorkspaceClient'

import { requireServerSession } from '@/lib/auth/require-server-session'
import { isWorkspaceShellEnabledForSubject } from '@/lib/workspace-rollout'
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
 * TASK-612 Slice 5 — Agency organization detail page.
 *
 * Server-side decide entre el shell V2 (gated por
 * `organization_workspace_shell_agency` flag) y el legacy `OrganizationView`.
 *
 * Cuando el flag está enabled:
 *  - resolveOrganizationWorkspaceProjection (TASK-611) calcula visibility
 *    server-side y lo pasa al wrapper client.
 *  - Si la projection falla → captureWithDomain('identity') + degraded mode
 *    se renderiza honest desde el shell mismo.
 *
 * Cuando el flag está disabled (default V1):
 *  - render legacy `<OrganizationView>` sin cambios funcionales.
 *
 * Patrón source: src/app/(dashboard)/home/page.tsx (TASK-780).
 */

const OrganizationDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const session = await requireServerSession()

  const subject = {
    userId: session.user.userId,
    tenantId: session.user.clientId ?? null,
    roleCodes: session.user.roleCodes ?? []
  }

  const shellEnabled = await isWorkspaceShellEnabledForSubject(subject, 'agency').catch(error => {
    captureWithDomain(error, 'identity', {
      tags: { source: 'agency_organization_detail_page', stage: 'rollout_flag' },
      extra: { organizationId: id }
    })

    // Resilient default: false (legacy fallback) — nunca crash.
    return false
  })

  const onboardingStatus = await resolveOnboardingStatus(id)

  if (!shellEnabled) {
    return <OrganizationView organizationId={id} onboardingStatus={onboardingStatus} />
  }

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
