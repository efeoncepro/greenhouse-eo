import OrganizationView from '@views/greenhouse/organizations/OrganizationView'
import AgencyOrganizationWorkspaceClient from '@views/greenhouse/organizations/AgencyOrganizationWorkspaceClient'

import { requireServerSession } from '@/lib/auth/require-server-session'
import { isWorkspaceShellEnabledForSubject } from '@/lib/workspace-rollout'
import { resolveOrganizationWorkspaceProjection } from '@/lib/organization-workspace/projection'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

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

  if (!shellEnabled) {
    return <OrganizationView organizationId={id} />
  }

  const projection = await resolveOrganizationWorkspaceProjection({
    subject: {
      userId: session.user.userId,
      tenantType: session.user.tenantType,
      roleCodes: session.user.roleCodes,
      primaryRoleCode: session.user.primaryRoleCode,
      routeGroups: session.user.routeGroups,
      authorizedViews: session.user.authorizedViews,
      projectScopes: session.user.projectScopes,
      campaignScopes: session.user.campaignScopes,
      businessLines: session.user.businessLines,
      serviceModules: session.user.serviceModules
    },
    organizationId: id,
    entrypointContext: 'agency'
  })

  return <AgencyOrganizationWorkspaceClient organizationId={id} projection={projection} />
}

export default OrganizationDetailPage
