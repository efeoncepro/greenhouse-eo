import type { Metadata } from 'next'

import ClientDetailView from '@views/greenhouse/finance/ClientDetailView'
import FinanceClientsOrganizationWorkspaceClient from '@views/greenhouse/finance/FinanceClientsOrganizationWorkspaceClient'

import { requireServerSession } from '@/lib/auth/require-server-session'
import { resolveFinanceClientContext } from '@/lib/finance/canonical'
import { isWorkspaceShellEnabledForSubject } from '@/lib/workspace-rollout'
import { resolveOrganizationWorkspaceProjection } from '@/lib/organization-workspace/projection'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cliente — Greenhouse'
}

/**
 * TASK-613 Slice 2 — Finance Clients detail page server-side gate.
 *
 * Patrón canónico (mirror de TASK-612 Slice 5 `agency/organizations/[id]/page.tsx`):
 *
 *  1. requireServerSession (canonical, prerender-safe)
 *  2. isWorkspaceShellEnabledForSubject(subject, 'finance') — flag-gated rollout
 *     vía `organization_workspace_shell_finance` (TASK-780 platform).
 *  3. resolveFinanceClientContext({clientProfileId, organizationId, clientId,
 *     hubspotCompanyId}) — la URL `[id]` puede ser cualquiera de los 4 shapes;
 *     el resolver hace OR-matching internamente. Postgres-first + BigQuery
 *     fallback ya está en la primitiva canónica.
 *  4. Si flag disabled OR organizationId no resoluble → render legacy
 *     `<ClientDetailView />` sin cambios funcionales (zero-risk cutover).
 *  5. Si flag enabled AND organizationId resuelto → render el workspace shell
 *     con projection server-side y entrypointContext='finance'.
 *
 * Resilient defaults: cualquier error en flag resolution o context resolution
 * cae a legacy. Sentry captures via `captureWithDomain('finance', ...)`.
 */

const ClientDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const session = await requireServerSession()

  const subject = {
    userId: session.user.userId,
    tenantId: session.user.clientId ?? null,
    roleCodes: session.user.roleCodes ?? []
  }

  const shellEnabled = await isWorkspaceShellEnabledForSubject(subject, 'finance').catch(error => {
    captureWithDomain(error, 'finance', {
      tags: { source: 'finance_clients_detail_page', stage: 'rollout_flag' },
      extra: { lookupId: id }
    })

    // Resilient default: legacy fallback — nunca crash.
    return false
  })

  if (!shellEnabled) {
    return <ClientDetailView />
  }

  // La URL [id] puede ser clientProfileId | organizationId | clientId | hubspotCompanyId.
  // El resolver canónico hace OR-matching y devuelve el primero que matchea.
  const finance = await resolveFinanceClientContext({
    clientProfileId: id,
    organizationId: id,
    clientId: id,
    hubspotCompanyId: id
  }).catch(error => {
    captureWithDomain(error, 'finance', {
      tags: { source: 'finance_clients_detail_page', stage: 'finance_client_context' },
      extra: { lookupId: id }
    })

    return null
  })

  // Sin organizationId canónica → cae a legacy. ClientDetailView ya tiene su propio
  // honest-empty-state para perfiles sin organización linkeada.
  if (!finance?.organizationId) {
    return <ClientDetailView />
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
    organizationId: finance.organizationId,
    entrypointContext: 'finance'
  })

  return (
    <FinanceClientsOrganizationWorkspaceClient
      organizationId={finance.organizationId}
      projection={projection}
    />
  )
}

export default ClientDetailPage
